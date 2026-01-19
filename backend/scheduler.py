import os
from datetime import datetime, timedelta, time, date
try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo
from dateutil import parser
from dateutil.rrule import rrule, WEEKLY, MO, TU, WE, TH, FR, SA, SU
from ics import Calendar, Event
from ics.grammar.parse import ContentLine, Container

DAY_MAP = {
    "mon": MO, "tue": TU, "wed": WE, "thu": TH, "fri": FR, "sat": SA, "sun": SU
}

TYPE_MAP = {
    "Lecture": "LEC", "Laboratory": "LAB", "Discussion": "DIS",
    "Quiz": "QZ", "Homework": "HW", "Exam": "EXAM", "Midterm": "MID", "Final": "FIN"
}

# --- HELPERS ---
def parse_days_from_string(day_str):
    found = []
    clean_str = day_str.lower().replace(",", " ").replace("/", " ")
    parts = clean_str.split()
    for part in parts:
        for key, val in DAY_MAP.items():
            if part.startswith(key):
                if (key.title(), val) not in found:
                    found.append((key.title(), val))
    return found

def get_next_weekday(start_date, day_rrule):
    rule = rrule(WEEKLY, dtstart=datetime.combine(start_date, time(0,0)), byweekday=day_rrule, count=1)
    return list(rule)[0].date()

def parse_time_robustly(time_str):
    try:
        return parser.parse(time_str).time()
    except:
        return time(0, 0)

def create_calendar_event(title, start_dt, end_dt, loc, desc, rrule_end=None, reminder_mins=0):
    e = Event()
    e.name = title
    
    # --- THE FIX: FLOATING TIME ---
    # We strip the timezone info (.replace(tzinfo=None))
    # This creates a "Floating" event. 
    # If the calculated time is 10:30, it stays 10:30 forever.
    e.begin = start_dt.replace(tzinfo=None)
    e.end = end_dt.replace(tzinfo=None)
    
    e.location = loc
    e.description = desc
    
    if rrule_end:
        # RRULE UNTIL must also be floating (YYYYMMDDTHHMMSS)
        end_floating = datetime.combine(rrule_end, time(23,59,59))
        until_str = end_floating.strftime('%Y%m%dT%H%M%S')
        e.extra.append(ContentLine(name='RRULE', value=f"FREQ=WEEKLY;UNTIL={until_str}"))

    if reminder_mins > 0:
        alarm = Container("VALARM")
        alarm.append(ContentLine(name='ACTION', value='DISPLAY'))
        if reminder_mins % 1440 == 0:
            days = reminder_mins // 1440
            trigger_val = f"-P{days}D"
        else:
            trigger_val = f"-PT{reminder_mins}M"
        alarm.append(ContentLine(name='TRIGGER', value=trigger_val))
        alarm.append(ContentLine(name='DESCRIPTION', value=f"Reminder: {title}"))
        e.extra.append(alarm)
        
    return e

# --- MAIN GENERATOR ---
def generate_ics(course_data, reminders, school_tz_str="America/Chicago", user_tz_str="America/New_York"):
    
    # 1. Setup Timezones
    try:
        SCHOOL_TZ = ZoneInfo(school_tz_str)
        USER_TZ = ZoneInfo(user_tz_str)
    except:
        SCHOOL_TZ = ZoneInfo("America/Chicago")
        USER_TZ = ZoneInfo("America/New_York")

    cal = Calendar()
    data = course_data.dict() 

    sem_start = parser.parse(data['semester_start']).date()
    sem_end = parser.parse(data['semester_end']).date()
    school = data.get('school_name', '')

    # Helper to convert School Time -> User Time
    def convert_to_user_time(base_date, time_obj):
        # 1. Create datetime in School Time
        dt_school = datetime.combine(base_date, time_obj).replace(tzinfo=SCHOOL_TZ)
        # 2. Convert to User Time
        dt_user = dt_school.astimezone(USER_TZ)
        # 3. Return the datetime (we will strip tz later in create_calendar_event)
        return dt_user

    # 1. PROCESS LECTURES
    for lec in data.get('lectures', []):
        days_found = parse_days_from_string(lec['day'])
        for day_name_abbr, day_rule in days_found:
            first_date = get_next_weekday(sem_start, day_rule)
            t_start = parse_time_robustly(lec['start_time'])
            t_end = parse_time_robustly(lec['end_time'])
            
            # Convert logic
            start_dt = convert_to_user_time(first_date, t_start)
            end_dt = convert_to_user_time(first_date, t_end)
            
            if t_end < t_start: 
                end_dt += timedelta(days=1)

            title = f"{data.get('course_code')} {TYPE_MAP.get('Lecture', 'LEC')}"
            if lec.get('section'): title += f" {lec.get('section')}"
            
            loc = lec.get('full_address') if lec.get('full_address') else f"{lec.get('building', '')}, {school}".strip()
            desc = f"Type: Lecture\nRoom: {lec.get('room', 'N/A')}\nSection: {lec.get('section', 'N/A')}"
            
            event = create_calendar_event(title, start_dt, end_dt, loc, desc, rrule_end=sem_end, reminder_mins=reminders['lecture'])
            cal.events.add(event)

    # 2. PROCESS ASSIGNMENTS / EXAMS
    for task in data.get('assignments', []):
        t_type = task.get('type', 'Assignment')
        title = f"{data.get('course_code')} {TYPE_MAP.get(t_type, 'HW')}: {task['title']}"
        loc = task.get('location', "")
        if loc and "online" not in loc.lower() and school not in loc:
            loc += f", {school}"
        desc = f"Type: {t_type}\nDetails: {task.get('details', '')}"

        is_exam = any(x in t_type.lower() for x in ["exam", "midterm", "final", "test"])
        mins = reminders['exam'] if is_exam else reminders['assignment']

        # CASE A: EXAM WITH SPECIFIC TIMES
        if task.get('exam_date') and task.get('start_time'):
            ex_date = parser.parse(task['exam_date']).date()
            t_start = parse_time_robustly(task['start_time'])
            
            start_dt = convert_to_user_time(ex_date, t_start)
            
            if task.get('end_time'):
                t_end = parse_time_robustly(task['end_time'])
                end_dt = convert_to_user_time(ex_date, t_end)
            else:
                end_dt = start_dt + timedelta(minutes=120)
                
            event = create_calendar_event(title, start_dt, end_dt, loc, desc, reminder_mins=mins)
            cal.events.add(event)

        # CASE B: RECURRING
        elif task.get('recurring') and task.get('recurring_day'):
            days_found = parse_days_from_string(task['recurring_day'])
            for _, day_rule in days_found:
                first_date = get_next_weekday(sem_start, day_rule)
                t_due = parse_time_robustly(task.get('recurring_time') or '23:59')
                
                end_dt = convert_to_user_time(first_date, t_due)
                start_dt = end_dt - timedelta(minutes=30)
                
                event = create_calendar_event(title, start_dt, end_dt, loc, desc, rrule_end=sem_end, reminder_mins=mins)
                cal.events.add(event)
        
        # CASE C: DEADLINE ONLY
        elif task.get('due_date'):
            # Parse strictly as School Time first
            raw_dt = parser.parse(task['due_date'])
            if raw_dt.tzinfo is None:
                raw_dt = raw_dt.replace(tzinfo=SCHOOL_TZ)
            
            # Convert to User Time
            end_dt = raw_dt.astimezone(USER_TZ)
            start_dt = end_dt - timedelta(minutes=120 if is_exam else 30)
            
            event = create_calendar_event(title, start_dt, end_dt, loc, desc, reminder_mins=mins)
            cal.events.add(event)

    return "".join(cal.serialize_iter())