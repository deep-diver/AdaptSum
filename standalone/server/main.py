import json
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx

app = FastAPI()

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

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
MODEL_NAME = "gpt-4o-mini"

@app.post("/openai_stream")
async def openai_stream(request: Request):
    try:
        body = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from e

    conversation = body.get("conversation")
    if not conversation:
        raise HTTPException(status_code=400, detail="Missing 'conversation' in payload")

    temperature = body.get("temperature", 0.7)
    max_tokens = body.get("max_tokens", 256)
    model = body.get("model", MODEL_NAME)

    # Using OpenAI's SDK instead of direct API calls
    from openai import AsyncOpenAI

    # Initialize the client with the API key
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    async def event_generator():
        try:
            print(f"Starting stream for model: {model}, temperature: {temperature}, max_tokens: {max_tokens}")
            line_count = 0
            
            # Use the SDK to create a streaming completion
            stream = await client.chat.completions.create(
                model=model,
                messages=conversation,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    line_count += 1
                    if line_count % 10 == 0:
                        print(f"Processed {line_count} stream chunks")
                    
                    # Format the response in the same way as before
                    response_json = json.dumps({
                        "choices": [{"delta": {"content": content}}]
                    })
                    yield f"data: {response_json}\n\n"
            
            # Send the [DONE] marker
            print("Stream completed successfully")
            yield "data: [DONE]\n\n"
                
        except Exception as e:
            print(f"Error during streaming: {str(e)}")
            yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"
        finally:
            print(f"Stream ended after processing {line_count if 'line_count' in locals() else 0} chunks")

    print("Returning StreamingResponse to client")
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/gemini_stream")
async def gemini_stream(request: Request):
    """
    Stream responses from Google's Gemini model using the Gemini SDK.
    """
    body = await request.json()
    conversation = body.get("messages", [])
    temperature = body.get("temperature", 0.7)
    max_tokens = body.get("max_tokens", 256)
    model = body.get("model", "gemini-pro")  # Default to gemini-pro model

    # Using Google's Generative AI SDK
    import google.generativeai as genai
    from google.generativeai.types import HarmCategory, HarmBlockThreshold

    # Initialize the client with the API key
    genai.configure(api_key=GOOGLE_API_KEY)

    # Convert OpenAI message format to Gemini format
    gemini_messages = []
    for msg in conversation:
        role = "user" if msg["role"] == "user" else "model"
        gemini_messages.append({"role": role, "parts": [msg["content"]]})

    async def event_generator():
        try:
            print(f"Starting Gemini stream for model: {model}, temperature: {temperature}, max_tokens: {max_tokens}")
            line_count = 0
            
            # Create a Gemini model instance
            gemini_model = genai.GenerativeModel(
                model_name=model,
                generation_config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                    "top_p": 0.95,
                },
                safety_settings={
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                }
            )
            
            # Start the streaming response
            response = gemini_model.generate_content(
                gemini_messages,
                stream=True
            )
            
            # Fix: Use synchronous iteration instead of async for
            for chunk in response:
                if hasattr(chunk, 'text') and chunk.text:
                    content = chunk.text
                    line_count += 1
                    if line_count % 10 == 0:
                        print(f"Processed {line_count} Gemini stream chunks")
                    
                    # Format the response to match OpenAI format for client compatibility
                    response_json = json.dumps({
                        "choices": [{"delta": {"content": content}}]
                    })
                    yield f"data: {response_json}\n\n"
            
            # Send the [DONE] marker
            print("Gemini stream completed successfully")
            yield "data: [DONE]\n\n"
                
        except Exception as e:
            print(f"Error during Gemini streaming: {str(e)}")
            yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"
        finally:
            print(f"Gemini stream ended after processing {line_count if 'line_count' in locals() else 0} chunks")

    print("Returning StreamingResponse from Gemini to client")
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/anthropic_stream")
async def anthropic_stream(request: Request):
    """
    Stream responses from Anthropic's Claude models.
    """
    print("Received request for Anthropic streaming")
    
    # Parse the request body
    body = await request.json()
    messages = body.get("messages", [])
    temperature = body.get("temperature", 0.7)
    max_tokens = body.get("max_tokens", 1024)
    model = body.get("model", "claude-3-opus-20240229")
    
    # Load Anthropic API key from environment
    anthropic_api_key = ANTHROPIC_API_KEY #os.environ.get("ANTHROPIC_API_KEY")
    if not anthropic_api_key:
        return JSONResponse(
            status_code=500,
            content={"error": "ANTHROPIC_API_KEY not found in environment variables"}
        )
    
    # Convert messages to Anthropic format
    anthropic_messages = []
    for msg in messages:
        role = "assistant" if msg.get("role") == "assistant" else "user"
        content = msg.get("content", "")
        anthropic_messages.append({"role": role, "content": content})
    
    line_count = 0
    
    async def event_generator():
        try:
            import anthropic
            
            # Initialize Anthropic client
            client = anthropic.Anthropic(api_key=anthropic_api_key)
            
            # Start the streaming response
            with client.messages.stream(
                model=model,
                messages=anthropic_messages,
                max_tokens=max_tokens,
                temperature=temperature
            ) as stream:
                for chunk in stream:
                    if hasattr(chunk, 'delta') and hasattr(chunk.delta, 'text') and chunk.delta.text:
                        content = chunk.delta.text
                        nonlocal line_count
                        line_count += 1
                        if line_count % 10 == 0:
                            print(f"Processed {line_count} Anthropic stream chunks")
                        
                        # Format the response to match OpenAI format for client compatibility
                        response_json = json.dumps({
                            "choices": [{"delta": {"content": content}}]
                        })
                        yield f"data: {response_json}\n\n"
            
            # Send the [DONE] marker
            print("Anthropic stream completed successfully")
            yield "data: [DONE]\n\n"
                
        except Exception as e:
            print(f"Error during Anthropic streaming: {str(e)}")
            yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"
        finally:
            print(f"Anthropic stream ended after processing {line_count if 'line_count' in locals() else 0} chunks")

    print("Returning StreamingResponse from Anthropic to client")
    return StreamingResponse(event_generator(), media_type="text/event-stream")

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
    with open("configs/prompts.toml", "rb") as f:
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
    with open("configs/prompts.toml", "rb") as f:
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
    with open("configs/prompts.toml", "rb") as f:
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
