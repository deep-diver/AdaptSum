import os
import gradio as gr
import argparse
from functools import partial
from string import Template
from utils import load_prompt, setup_gemini_client

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ai-studio-api-key", type=str, default=os.getenv("GEMINI_API_KEY"))
    parser.add_argument("--vertexai", action="store_true", default=False)
    parser.add_argument("--vertexai-project", type=str, default="gcp-ml-172005")
    parser.add_argument("--vertexai-location", type=str, default="us-central1")
    parser.add_argument("--model", type=str, default="gemini-1.5-flash")

    parser.add_argument("--prompt-tmpl-path", type=str, default="configs/prompts.toml")
    parser.add_argument("--css-path", type=str, default="statics/styles.css")
    args = parser.parse_args()
    return args

def find_attached_file(filename, attached_files):
    for file in attached_files:
        if file['name'] == filename:
            return file
    return None

def echo(message, history, state):
    summary = ""
    attached_file = None
    if message['files']:
        path_local = message['files'][0]
        filename = os.path.basename(path_local)

        attached_file = find_attached_file(filename, state["attached_files"])
        if attached_file is None: 
            path_gcp = client.files.upload(path=path_local)
            state["attached_files"].append({
                "name": filename,
                "path_local": path_local,
                "gcp_entity": path_gcp,
                "path_gcp": path_gcp.name,
                "mime_type=": path_gcp.mime_type,
                "expiration_time": path_gcp.expiration_time,
            })
            attached_file = path_gcp

    # [{'role': 'user', 'metadata': None, 'content': 'asdf', 'options': None}, {'role': 'assistant', 'metadata': None, 'content': 'asdf', 'options': None}]

    user_message = [message['text']]
    if attached_file: user_message.append(attached_file)

    chat_history = state['messages']
    chat_history = chat_history + user_message
    state['messages'] = chat_history

    response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents=state['messages']
    )

    # make summary
    if state['summary'] == "":
        state['summary'] = response.text
    else:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=[
                Template(
                    prompt_tmpl['summarization']['prompt']
                ).safe_substitute(
                    previous_summary=state['summary'], 
                    latest_conversation=str({"user": message['text'], "assistant": response.text})
                )
            ]
        )
        state['summary'] = response.text

    return response.text, state, state['summary']

def main(args):
    style_css = open(args.css_path, "r").read()

    global client, prompt_tmpl
    client = setup_gemini_client(args)
    prompt_tmpl = load_prompt(args)
    
    ## Gradio Blocks
    with gr.Blocks(css=style_css) as demo:
        # State per session
        state = gr.State({
            "messages": [],
            "attached_files": [],
            "summary": ""
        })

        gr.Markdown("# Adaptive Summarization")
        gr.Markdown("AdaptSum stands for Adaptive Summarization. This project focuses on developing an LLM-powered system for dynamic summarization. Instead of generating entirely new summaries with each update, the system intelligently identifies and modifies only the necessary parts of the existing summary. This approach aims to create a more efficient and fluid summarization process within a continuous chat interaction with an LLM.")

        with gr.Row(elem_id="chat-interface"):
            with gr.Column(scale=3, elem_id="summary-window"):
                summary = gr.Markdown(label="Summary so far")

            with gr.Column(scale=7):
                gr.ChatInterface(
                    multimodal=True,
                    type="messages", 
                    fn=echo, 
                    additional_inputs=[state],
                    additional_outputs=[state, summary],
                )

    return demo

if __name__ == "__main__":
    args = parse_args()
    demo = main(args)
    demo.launch()
