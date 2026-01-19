from fastapi import FastAPI, UploadFile, Form, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
# Ensure these imports match your file structure
from extractor import process_syllabus, CourseData 
from scheduler import generate_ics 

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- STEP 1: Analyze the file and return JSON ---
@app.post("/analyze-syllabus")
async def analyze_syllabus(
    file: UploadFile = File(...),
    start_date: str = Form(...),
    end_date: str = Form(...)
):
    print(f"📂 Analyzing: {file.filename}")
    file_bytes = await file.read()
    
    # Run the extractor
    course_data = process_syllabus(file_bytes, file.filename, start_date, end_date)
    return course_data

# --- STEP 2: Receive reviewed data and generate ICS ---
class GenerateRequest(BaseModel):
    course_data: CourseData
    reminders: dict
    # We now need TWO timezones to calculate the "Frozen" time
    school_timezone: str = "America/Chicago" 
    user_timezone: str = "America/New_York"

@app.post("/generate-ics")
async def generate_ics_endpoint(request: GenerateRequest):
    print(f"kb Generating ICS. School: {request.school_timezone} -> User: {request.user_timezone}")
    
    # Pass BOTH timezones to the scheduler
    ics_content = generate_ics(
        request.course_data, 
        request.reminders, 
        request.school_timezone,
        request.user_timezone
    )
    
    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename=syllabus_schedule.ics"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)