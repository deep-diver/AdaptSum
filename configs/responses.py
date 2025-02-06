from pydantic import BaseModel

class SummaryResponses(BaseModel):
    previous_summary: str
    updated_summary: str