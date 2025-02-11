import os
import argparse
import asyncio
import gradio as gr
from difflib import Differ
from string import Template
from utils import load_prompt, setup_gemini_client
from configs.responses import SummaryResponses
from google.genai import types

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ai-studio-api-key", type=str, default=os.getenv("GEMINI_API_KEY"))
    parser.add_argument("--vertexai", action="store_true", default=False)
    parser.add_argument("--vertexai-project", type=str, default="gcp-ml-172005")
    parser.add_argument("--vertexai-location", type=str, default="us-central1")
    parser.add_argument("--model", type=str, default="gemini-2.0-flash", choices=["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-001"])
    parser.add_argument("--seed", type=int, default=2025)
    parser.add_argument("--prompt-tmpl-path", type=str, default="configs/prompts.toml")
    parser.add_argument("--css-path", type=str, default="statics/styles.css")
    args = parser.parse_args()
    return args

def find_attached_file(filename, attached_files):
    for file in attached_files:
        if file['name'] == filename:
            return file
    return None

async def echo(message, history, state, persona):
    attached_file = None
    system_instruction = Template(prompt_tmpl['summarization']['system_prompt']).safe_substitute(persona=persona)
    
    if message['files']:
        path_local = message['files'][0]
        filename = os.path.basename(path_local)

        attached_file = find_attached_file(filename, state["attached_files"])
        if attached_file is None: 
            path_gcp = await client.files.upload(path=path_local)
            state["attached_files"].append({
                "name": filename,
                "path_local": path_local,
                "gcp_entity": path_gcp,
                "path_gcp": path_gcp.name,
                "mime_type=": path_gcp.mime_type,
                "expiration_time": path_gcp.expiration_time,
            })
            attached_file = path_gcp

    user_message = [message['text']]
    if attached_file: user_message.append(attached_file)

    chat_history = state['messages']
    chat_history = chat_history + user_message
    state['messages'] = chat_history

    response_chunks = ""
    model_content_stream = await client.models.generate_content_stream(
    model=args.model, 
    contents=state['messages'], 
    config=types.GenerateContentConfig(
        system_instruction=system_instruction, seed=args.seed
    ),
)
    async for chunk in model_content_stream:
        response_chunks += chunk.text
        # when model generates too fast, Gradio does not respond that in real-time.
        await asyncio.sleep(0.1)
        yield (
            response_chunks, 
            state, 
            state['summary_diff_history'][-1] if len(state['summary_diff_history']) > 1 else "",
            state['summary_history'][-1] if len(state['summary_history']) > 1 else "",
            gr.Slider(
                visible=False if len(state['summary_history']) <= 1 else True, 
                interactive=False if len(state['summary_history']) <= 1 else True, 
            ),
        )        
    
    # make summary
    response = await client.models.generate_content(
        model=args.model,
        contents=[
            Template(
                prompt_tmpl['summarization']['prompt']
            ).safe_substitute(
                previous_summary=state['summary'], 
                latest_conversation=str({"user": message['text'], "assistant": response_chunks})
            )
        ],
        config=types.GenerateContentConfig(
            system_instruction=system_instruction, 
            seed=args.seed,
            response_mime_type='application/json', 
            response_schema=SummaryResponses
        )
    )

    prev_summary = state['summary_history'][-1] if len(state['summary_history']) >= 1 else ""

    state['summary'] = (
        response.parsed.summary 
        if getattr(response.parsed, "summary", None) is not None 
        else response.text
    )
    state['summary_history'].append(
        response.parsed.summary 
        if getattr(response.parsed, "summary", None) is not None 
        else response.text
    )
    state['summary_diff_history'].append(
        [
            (token[2:], token[0] if token[0] != " " else None)
            for token in Differ().compare(prev_summary, state['summary'])
        ]
    )

    yield (
        response_chunks, 
        state, 
        state['summary_diff_history'][-1],
        state['summary_history'][-1],
        gr.Slider(
            maximum=len(state['summary_history']),
            value=len(state['summary_history']),
            visible=False if len(state['summary_history']) == 1 else True, interactive=True
        ),
    )

def change_view_toggle(view_toggle):
    if view_toggle == "Diff":
        return (
            gr.HighlightedText(visible=True),
            gr.Markdown(visible=False)
        )
    else:
        return (
            gr.HighlightedText(visible=False),
            gr.Markdown(visible=True)
        )        

def navigate_to_summary(summary_num, state):
    return (
        state['summary_diff_history'][summary_num-1],
        state['summary_history'][summary_num-1]
    )

def main(args):
    style_css = open(args.css_path, "r").read()

    global client, prompt_tmpl, system_instruction
    client = setup_gemini_client(args)
    prompt_tmpl = load_prompt(args)
    
    ## Gradio Blocks
    with gr.Blocks(css=style_css) as demo:
        # State per session
        state = gr.State({
            "messages": [],
            "attached_files": [],
            "summary": "",
            "summary_history": [],
            "summary_diff_history": []
        })

        with gr.Column():
            gr.Markdown("# Adaptive Summarization")
            gr.Markdown("AdaptSum stands for Adaptive Summarization. This project focuses on developing an LLM-powered system for dynamic summarization. Instead of generating entirely new summaries with each update, the system intelligently identifies and modifies only the necessary parts of the existing summary. This approach aims to create a more efficient and fluid summarization process within a continuous chat interaction with an LLM.")

        with gr.Column():
            with gr.Accordion("Adaptively Summarized Conversation", elem_id="adaptive-summary-accordion", open=False):
                with gr.Row(elem_id="view-toggle-btn-container"):
                    view_toggle_btn = gr.Radio(
                        choices=["Diff", "Markdown"],
                        value="Markdown",
                        interactive=True,
                        elem_id="view-toggle-btn"
                    )

                summary_diff = gr.HighlightedText(
                    label="Summary so far",
                    # value="No summary yet. As you chat with the assistant, the summary will be updated automatically.",
                    combine_adjacent=True,
                    show_legend=True,
                    color_map={"-": "red", "+": "green"},
                    elem_classes=["summary-window"],
                    visible=False
                )

                summary_md = gr.Markdown(
                    label="Summary so far",
                    value="No summary yet. As you chat with the assistant, the summary will be updated automatically.",
                    elem_classes=["summary-window"],
                    visible=True
                )

                summary_num = gr.Slider(label="summary history", minimum=1, maximum=1, step=1, show_reset_button=False, visible=False)

            view_toggle_btn.change(change_view_toggle, inputs=[view_toggle_btn], outputs=[summary_diff, summary_md])
            summary_num.release(navigate_to_summary, inputs=[summary_num, state], outputs=[summary_diff, summary_md])
        
        with gr.Column("persona-dropdown-container", elem_id="persona-dropdown-container"):
            persona = gr.Dropdown(
                ["expert", "novice", "regular practitioner", "high schooler"], 
                label="Summary Persona", 
                info="Control the tonality of the conversation.",
                min_width="auto",
            )        

        with gr.Column("chat-window", elem_id="chat-window"):
            gr.ChatInterface(
                multimodal=True,
                type="messages", 
                fn=echo, 
                additional_inputs=[state, persona],
                additional_outputs=[state, summary_diff, summary_md, summary_num],
            )

    return demo

if __name__ == "__main__":
    args = parse_args()
    demo = main(args)
    demo.launch()
