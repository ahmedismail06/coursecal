import os
import mimetypes
from pathlib import Path
from typing import Optional, List
from dotenv import load_dotenv
from google import genai
from google.genai import types 
from pydantic import BaseModel

# --- DATA STRUCTURE (EXACTLY AS BEFORE) ---
class Lecture(BaseModel):
    day: str            
    start_time: str     
    end_time: str       
    building: Optional[str] = None
    room: Optional[str] = None
    section: Optional[str] = None 
    full_address: Optional[str] = None 

class Assignment(BaseModel):
    title: str
    type: str           
    due_date: Optional[str] = None 
    exam_date: Optional[str] = None 
    start_time: Optional[str] = None 
    end_time: Optional[str] = None   
    details: Optional[str] = None
    location: Optional[str] = None 
    recurring: bool = False
    recurring_day: Optional[str] = None 
    recurring_time: Optional[str] = None 

class CourseData(BaseModel):
    school_name: str    
    course_code: str    
    course_name: str    
    semester_start: str 
    semester_end: str   
    lectures: List[Lecture]
    assignments: List[Assignment]

# --- MAIN FUNCTION ---
def process_syllabus(file_bytes: bytes, filename: str, user_start_date: str, user_end_date: str):
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key: raise ValueError("GEMINI_API_KEY missing")

    client = genai.Client(api_key=api_key)
    
    # Save temp file because Gemini Client likes file paths
    temp_path = Path(f"temp_{filename}")
    with open(temp_path, "wb") as f:
        f.write(file_bytes)

    try:
        mime = mimetypes.guess_type(temp_path)[0] or "application/pdf"
        uploaded_file = client.files.upload(file=temp_path, config={'mime_type': mime})
        
        # --- YOUR PERFECT PROMPT ---
        prompt = f"""
        Extract course data from this syllabus into strict JSON.
        
        CONTEXT:
        - Semester Start: {user_start_date}
        - Semester End: {user_end_date}
        
        INSTRUCTIONS:
        1. **School**: Extract the university name.
        2. **Lectures**: Split multiple days into separate objects. Find the address.
        3. **Exams & Quizzes (CRITICAL)**: 
           - If an exam has a specific TIME WINDOW (e.g., "Midterm: Oct 15, 7:00 PM - 9:00 PM"), you MUST fill in:
             * `exam_date`: "2025-10-15"
             * `start_time`: "19:00"
             * `end_time`: "21:00"
           - Do NOT put this in `due_date`. `due_date` is only for homework deadlines.
        4. **Assignments**: If an item repeats, set `recurring=True`.
        """
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_uri(file_uri=uploaded_file.uri, mime_type=uploaded_file.mime_type),
                        types.Part.from_text(text=prompt),
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=CourseData, 
            ),
        )
        return response.parsed
    finally:
        if temp_path.exists():
            os.remove(temp_path)