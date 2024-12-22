from pydantic import BaseModel

class QARequest(BaseModel):
    question: str

class TTSRequest(BaseModel):
    text: str