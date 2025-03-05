import json
import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from stream import (
    openai as openai_stream, 
    anthropic as anthropic_stream, 
    google as google_stream,
    huggingface as huggingface_stream, 
    mistral as mistral_stream
)
from summary import (
    openai as openai_summary, 
    google as google_summary,
    # anthropic as anthropic_summary, google as google_summary,
    # huggingface as huggingface_summary, mistral as mistral_summary
)

app = FastAPI()
app.include_router(openai_stream.router)
app.include_router(anthropic_stream.router)
app.include_router(google_stream.router)
app.include_router(huggingface_stream.router)
app.include_router(mistral_stream.router)

app.include_router(openai_summary.router)
app.include_router(google_summary.router)
# Allow all origins for testing (adjust for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/", StaticFiles(directory="../front", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)