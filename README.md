# AdaptSum

AdaptSum stands for Adaptive Summarization. This project focuses on developing an LLM-powered system for dynamic summarization. Instead of generating entirely new summaries with each update, the system intelligently identifies and modifies only the necessary parts of the existing summary. This approach aims to create a more efficient and fluid summarization process within a continuous chat interaction with an LLM.

# Instructions

1. Install dependencies
```shell
$ pip install requirements.txt
```

2. Setup Gemini API Key
```shell
$ export GEMINI_API_KEY=xxxxx
```
> note that GEMINI API KEY should be obtained from Google AI Studio. Vertex AI is not supported at the moment (this is because Gemini SDK does not provide file uploading functionality for Vertex AI usage now).

3. Run Gradio app
```shell
$ python main.py # or gradio main.py
```

# Acknowledgments
This is a project built during the Vertex sprints held by Google's ML Developer Programs team. We are thankful to be granted good amount of GCP credits to do this project. 
