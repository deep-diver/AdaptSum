import toml
from google import genai

def load_prompt(args):
    with open(args.prompt_tmpl_path, 'r') as f:
        prompts = toml.load(f)

    return prompts

def setup_gemini_client(args):
    if args.vertexai:
        client = genai.client.AsyncClient(
            genai.client.ApiClient(
                vertexai=args.vertexai, 
                project=args.vertexai_project, 
                location=args.vertexai_location
            )
        )
    else:
        client = genai.client.AsyncClient(
            genai.client.ApiClient(
                api_key=args.ai_studio_api_key
            )
        )

    return client