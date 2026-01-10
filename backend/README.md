# CourseCal Backend

A Python backend for extracting structured course information from syllabus files using Google's Gemini API.

## Features

- Uploads syllabus files (PDF, images, text) to Google's Gemini API
- Extracts comprehensive course information including:
  - **Lecture Details**: Day, time, dates, room number, location
  - **Assignments**: Midterms, finals, homeworks, quizzes, projects with deadlines
  - **Course Info**: Name, code, semester, institution
- Returns structured JSON data
- Saves results to a JSON file for easy integration

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Get Gemini API Key

1. Visit [Google AI Studio](https://ai.google.dev/)
2. Create a free API key
3. Save it in a `.env` file:

```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

Or set it as an environment variable:

```bash
export GEMINI_API_KEY="your_api_key_here"
```

## Usage

### Basic Usage

```bash
python main.py /path/to/syllabus.pdf
```

### With API Key as Argument

```bash
python main.py /path/to/syllabus.pdf "your_api_key_here"
```

### Output

The script will:
1. Upload the syllabus file to Gemini
2. Extract course information
3. Print a formatted summary to console
4. Save results to `course_info.json`

### Output Format

```json
{
  "course_name": "Introduction to Computer Science",
  "course_code": "CS101",
  "semester": "Spring 2024",
  "school": "MIT",
  "lectures": [
    {
      "day": "Monday",
      "start_time": "09:00 AM",
      "end_time": "10:30 AM",
      "start_date": "01/15/2024",
      "end_date": "05/10/2024",
      "room_number": "101",
      "location": "Building A",
      "building": "MIT Campus"
    }
  ],
  "assignments": [
    {
      "name": "Midterm Exam",
      "type": "midterm",
      "start_date": "02/20/2024",
      "deadline": "02/20/2024",
      "location": "Room 105",
      "details": "60 minutes, closed book"
    }
  ]
}
```

## File Support

The backend supports:
- **PDF documents** (`.pdf`)
- **Images** (`.jpg`, `.png`, `.gif`, `.webp`)
- **Text documents** (`.txt`, `.doc`, `.docx`)

## API Integration

To integrate with your frontend or other services, import and use the main functions:

```python
from main import extract_course_information, CourseInfo

# Extract information
course_info = extract_course_information("/path/to/syllabus.pdf")

# Access extracted data
print(course_info.course_name)
print(course_info.lectures)
print(course_info.assignments)

# Convert to dict/JSON
data = course_info.model_dump()
```

## Error Handling

The script handles various errors:
- Missing API key
- File not found
- Invalid JSON response
- API connection issues

All errors are printed with descriptive messages.

## Notes

- The first file upload to Gemini may take a few seconds
- The extraction quality depends on the syllabus clarity and format
- Dates are extracted as found in the document (various formats supported)
- All null fields indicate information not found in the syllabus

## License

MIT
