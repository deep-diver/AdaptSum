import os
import base64
from collections import defaultdict

import PyPDF2

async def extract_text_from_pdf(pdf_path):
    text = ""
    with open(pdf_path, "rb") as pdf_file:
        reader = PyPDF2.PdfReader(pdf_file)
        for page in reader.pages:
            text += page.extract_text() + "\n"
    return text.strip()    

async def handle_attachments(session_id, conversation, remove_content=True):
    """
    Process attachments for each message in the conversation.
    
    Args:
        session_id (str): The unique identifier for the session
        conversation (list): List of message objects containing attachments
        
    Returns:
        None
    """
    # Process attachments for each message in the conversation
    for outer_idx, msg in enumerate(conversation):
        if "attachments" in msg and msg["attachments"]:
            # Create a temporary folder for this session if it doesn't exist
            session_folder = os.path.join("temp_attachments", session_id)
            os.makedirs(session_folder, exist_ok=True)
            
            for inner_idx, attachment in enumerate(msg["attachments"]):
                attachment_name = attachment.get("name", "unknown_file")
                attachment_content = attachment.get("content")
                
                # Check if this attachment already exists in the session
                attachment_exists = False
                file_path = None
                
                for existing_attachment in msg["attachments"]:
                    if existing_attachment.get("name") == attachment_name and existing_attachment.get("file_path"):
                        attachment_exists = True
                        file_path = existing_attachment.get("file_path")
                        break
                
                # Only decode and save if it's a new attachment
                if not attachment_exists and attachment_content:
                    try:
                        file_path = os.path.join(session_folder, attachment_name)
                        # Decode base64 content and write to file
                        with open(file_path, "wb") as f:
                            f.write(base64.b64decode(attachment_content))
                        
                    except Exception as e:
                        print(f"Error saving attachment: {str(e)}")
                
                # Add file_path to the original attachment dict
                if file_path:
                    if remove_content:
                        del attachment["content"]
                    attachment["file_path"] = file_path
                    msg["attachments"][inner_idx] = attachment
                    conversation[outer_idx] = msg

    return conversation