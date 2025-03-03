import json
import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from stream import openai, anthropic, google, huggingface

app = FastAPI()
app.include_router(openai.router)
app.include_router(anthropic.router)
app.include_router(google.router)
app.include_router(huggingface.router)

# Allow all origins for testing (adjust for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Replace these with secure methods in production
import os
from collections import defaultdict

@app.post("/summarize_openai")
async def summarize_openai(request: Request):
    try:
        body = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from e

    previous_summary = body.get("previous_summary", "")
    latest_conversation = body.get("latest_conversation", "")
    persona = body.get("persona", "helpful assistant")
    temperature = body.get("temperature", 0.7)
    max_tokens = body.get("max_tokens", 1024)
    model = body.get("model", MODEL_NAME)

    # Load the prompt from prompts.toml
    import tomli
    with open("../../configs/prompts.toml", "rb") as f:
        prompts_config = tomli.load(f)
    
    # Get the prompt and system prompt
    prompt_template = prompts_config["summarization"]["prompt"]
    system_prompt = prompts_config["summarization"]["system_prompt"]
    
    # Replace variables in the prompt
    prompt = prompt_template.replace("$previous_summary", previous_summary).replace("$latest_conversation", latest_conversation)
    system_prompt = system_prompt.replace("$persona", persona)
    
    # Using OpenAI's SDK
    from openai import AsyncOpenAI

    # Initialize the client with the API key
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    try:
        print(f"Starting OpenAI summarization for model: {model}")
        
        # Use the SDK to create a completion
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        summary = response.choices[0].message.content
        print("OpenAI summarization completed successfully")
        
        return {"summary": summary}
            
    except Exception as e:
        print(f"Error during OpenAI summarization: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error during summarization: {str(e)}")

@app.post("/summarize_anthropic")
async def summarize_anthropic(request: Request):
    try:
        body = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from e

    previous_summary = body.get("previous_summary", "")
    latest_conversation = body.get("latest_conversation", "")
    persona = body.get("persona", "helpful assistant")
    temperature = body.get("temperature", 0.7)
    max_tokens = body.get("max_tokens", 1024)
    model = body.get("model", "claude-3-opus-20240229")

    # Load the prompt from prompts.toml
    import tomli
    with open("../../configs/prompts.toml", "rb") as f:
        prompts_config = tomli.load(f)
    
    # Get the prompt and system prompt
    prompt_template = prompts_config["summarization"]["prompt"]
    system_prompt = prompts_config["summarization"]["system_prompt"]
    
    # Replace variables in the prompt
    prompt = prompt_template.replace("$previous_summary", previous_summary).replace("$latest_conversation", latest_conversation)
    system_prompt = system_prompt.replace("$persona", persona)
    
    try:
        import anthropic
        
        # Initialize Anthropic client
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        
        print(f"Starting Anthropic summarization for model: {model}")
        
        # Create the response
        response = client.messages.create(
            model=model,
            messages=[
                {"role": "user", "content": prompt}
            ],
            system=system_prompt,
            max_tokens=max_tokens,
            temperature=temperature
        )
        
        summary = response.content[0].text
        print("Anthropic summarization completed successfully")
        
        return {"summary": summary}
            
    except Exception as e:
        print(f"Error during Anthropic summarization: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error during summarization: {str(e)}")

@app.post("/summarize_google")
async def summarize_google(request: Request):
    try:
        body = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from e

    previous_summary = body.get("previous_summary", "")
    latest_conversation = body.get("latest_conversation", "")
    persona = body.get("persona", "helpful assistant")
    temperature = body.get("temperature", 0.7)
    max_tokens = body.get("max_tokens", 1024)
    model = body.get("model", "gemini-1.5-pro")

    # Load the prompt from prompts.toml
    import tomli
    with open("../../configs/prompts.toml", "rb") as f:
        prompts_config = tomli.load(f)
    
    # Get the prompt and system prompt
    prompt_template = prompts_config["summarization"]["prompt"]
    system_prompt = prompts_config["summarization"]["system_prompt"]
    
    # Replace variables in the prompt
    prompt = prompt_template.replace("$previous_summary", previous_summary).replace("$latest_conversation", latest_conversation)
    system_prompt = system_prompt.replace("$persona", persona)
    
    try:
        import google.generativeai as genai
        
        # Configure the Google API
        genai.configure(api_key=GOOGLE_API_KEY)
        
        # Initialize the model
        model_obj = genai.GenerativeModel(model_name=model)
        
        print(f"Starting Google summarization for model: {model}")
        
        # Combine system prompt and user prompt for Google's API
        combined_prompt = f"{system_prompt}\n\n{prompt}"
        
        # Generate the response
        response = model_obj.generate_content(
            contents=combined_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens
            )
        )
        
        summary = response.text
        print("Google summarization completed successfully")
        
        return {"summary": summary}
            
    except Exception as e:
        print(f"Error during Google summarization: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error during summarization: {str(e)}")
