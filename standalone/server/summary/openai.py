import os
import json
import tomli
from string import Template

from fastapi import FastAPI, Request, HTTPException
from fastapi import APIRouter

from openai import AsyncOpenAI

from . import prev_summaries
router = APIRouter()

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
client = AsyncOpenAI(api_key=OPENAI_API_KEY)

@router.post("/openai_summary")
async def openai_summary(request: Request):
    try:
        body = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from e

    conversation = body.get("conversation")
    if not conversation:
        raise HTTPException(status_code=400, detail="Missing 'conversation' in payload")

    print("--------------------------------")
    print(body)
    print()
    temperature = body.get("temperature", 0.7)
    max_tokens = body.get("max_tokens", 256)
    model = body.get("model", "gpt-4o-mini")
    
    # Get session ID from the request
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing 'session_id' in payload")

    if session_id not in prev_summaries:
        prev_summaries[session_id] = ""

    prev_summary = prev_summaries[session_id]

    with open("../../configs/prompts.toml", "rb") as f:
        prompts = tomli.load(f)

    prompt = Template(prompts["summarization"]["prompt"])
    system_prompt = Template(prompts["summarization"]["system_prompt"])

    latest_conversations = conversation[-2:]

    for i, latest_conversation in enumerate(latest_conversations):
        # if "attachments" in latest_conversation:
        if "attachments" in latest_conversation:
            del latest_conversation["attachments"]
        if "sessionId" in latest_conversation:
            del latest_conversation["sessionId"]
        latest_conversations[i] = latest_conversation

    summary = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt.substitute(persona="professional")},
            {"role": "user", "content": prompt.substitute(previous_summary=prev_summary, latest_conversation=str(latest_conversations))}
        ],
        max_tokens=max_tokens,
        temperature=temperature
    )

    summary_text = summary.choices[0].message.content
    prev_summaries[session_id] = summary_text
    return {"summary": summary_text}  
