import os
import mimetypes
from pathlib import Path
from typing import Optional, List
from dotenv import load_dotenv
from google import genai
from google.genai import types 
from pydantic import BaseModel

# --- DATA STRUCTURE ---
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
    
    temp_path = Path(f"temp_{filename}")
    with open(temp_path, "wb") as f:
        f.write(file_bytes)

    try:
        mime = mimetypes.guess_type(temp_path)[0] or "application/pdf"
        uploaded_file = client.files.upload(file=temp_path, config={'mime_type': mime})
        
        # --- PROMPT WITH "CATCH-ALL" LOGIC ---
        prompt = f"""
        You are a highly logical academic scheduler. Your goal is to map every single assignment to a date or rule, leaving nothing with "No Date".

        CONTEXT:
        - Semester Start: {user_start_date}
        - Semester End: {user_end_date}
        
        LOGIC RULES (FOLLOW STRICTLY):
        
        1. **FIND THE "DEFAULT" BUCKETS**:
           - Syllabi often use rules like: "Pre-lecture stuff is due Monday, EVERYTHING ELSE is due Tuesday."
           - This is a strict logic gate.
           - If you find a task (like "Learning Curve" or "Post-class quiz") and it doesn't say "Monday", **YOU MUST APPLY THE "EVERYTHING ELSE" RULE (Tuesday).**
           - Do not leave it as null. Infer the "Tuesday" rule based on the exclusion principle.

        2. **CONNECT SPECIFIC TASKS TO GENERIC CATEGORIES**:
           - If the syllabus says "Pre-lecture materials due Monday", and you see an assignment "Podcast Assignment", categorize it as "Pre-lecture" -> Due Monday.
           - If the syllabus says "Module Homework due Tuesday", and you see "Learning Curve" listed under the Module section, categorize it as "Homework" -> Due Tuesday.

        3. **IMPLIED TIMES**:
           - "Midnight", "End of Day" -> 11:59 PM (23:59).
           - "Before Class" -> Use the Lecture Start Time.

        4. **RECURRING FIELDS**:
           - For these rule-based items, set:
             * `recurring`: true
             * `recurring_day`: "Monday" or "Tuesday" (based on the rule)
             * `recurring_time`: The time specified in the rule (e.g., 11:59 PM).

        5. **FINAL CHECK**:
           - If an assignment has `due_date: null` and `recurring: false`, LOOK AGAIN.
           - Does it fit the "Everything else" rule? If yes, apply it.
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