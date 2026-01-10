from fastapi import FastAPI, UploadFile, Form, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from extractor import process_syllabus
from scheduler import generate_ics

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for dev
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/generate-calendar")
async def generate_calendar(
    file: UploadFile = File(...),
    start_date: str = Form(...),
    end_date: str = Form(...),
    lecture_reminder: int = Form(...),
    exam_reminder: int = Form(...),
    assignment_reminder: int = Form(...)
):
    print(f"📂 Processing: {file.filename}")
    
    file_bytes = await file.read()
    
    # 1. Run the "Perfect" Extractor
    course_data = process_syllabus(file_bytes, file.filename, start_date, end_date)
    
    # 2. Run the "Perfect" Scheduler
    reminders = {
        'lecture': lecture_reminder,
        'exam': exam_reminder,
        'assignment': assignment_reminder
    }
    ics_content = generate_ics(course_data, reminders)
    
    # 3. Return the file
    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename=syllabus_schedule.ics"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)