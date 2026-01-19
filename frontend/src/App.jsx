import { useState } from 'react';
import { Upload, FileText, Calendar, Clock, Download, Loader2, AlertCircle, ChevronDown, CheckCircle2, ArrowLeft, ListTodo, Globe, Pencil, Save, X } from 'lucide-react';

export default function App() {
  const [step, setStep] = useState('upload'); 
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Data State
  const [analyzedData, setAnalyzedData] = useState(null);
  const [selectedLectures, setSelectedLectures] = useState({});
  const [selectedAssignments, setSelectedAssignments] = useState({});
  
  // Edit Mode State
  const [editingIndex, setEditingIndex] = useState(null);

  // Dates & Timezone
  const [dates, setDates] = useState({
    start: '2025-09-02',
    end: '2025-12-15',
    timezone: 'America/Chicago'
  });

  const [reminders, setReminders] = useState({
    lecture: { value: 15, unit: 1 },
    exam: { value: 1, unit: 1440 },
    assignment: { value: 1, unit: 60 }
  });

  // --- HELPERS ---
  const formatTime = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${suffix}`;
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleReminderChange = (type, field, val) => {
    setReminders(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: parseFloat(val) }
    }));
  };

  // --- DATA UPDATE HANDLER ---
  const updateAssignment = (index, field, value) => {
    const updatedAssignments = [...analyzedData.assignments];
    updatedAssignments[index] = { ...updatedAssignments[index], [field]: value };
    setAnalyzedData({ ...analyzedData, assignments: updatedAssignments });
  };

  // Toggle Recurring Mode
  const toggleRecurring = (index) => {
    const updatedAssignments = [...analyzedData.assignments];
    const item = updatedAssignments[index];
    updatedAssignments[index] = { 
        ...item, 
        recurring: !item.recurring,
        due_date: !item.recurring ? null : item.due_date, 
        exam_date: !item.recurring ? null : item.exam_date,
        recurring_day: item.recurring ? null : (item.recurring_day || 'Monday')
    };
    setAnalyzedData({ ...analyzedData, assignments: updatedAssignments });
  };

  const handleAnalyze = async () => {
    if (!file) return setError("Please select a syllabus PDF first.");
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('start_date', dates.start);
    formData.append('end_date', dates.end);

    try {
      // UPDATED URL HERE
      const response = await fetch('https://coursecal.onrender.com/analyze-syllabus', { 
        method: 'POST', 
        body: formData 
      });
      
      if (!response.ok) throw new Error("Analysis failed. Backend error.");
      const data = await response.json();
      
      setAnalyzedData(data);
      setSelectedLectures(Object.fromEntries(data.lectures.map((_, i) => [i, true])));
      setSelectedAssignments(Object.fromEntries(data.assignments.map((_, i) => [i, true])));
      setStep('review');
    } catch (err) {
      console.error(err);
      setError("Failed to analyze syllabus. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    setEditingIndex(null);
    
    const filteredData = {
      ...analyzedData,
      lectures: analyzedData.lectures.filter((_, i) => selectedLectures[i]),
      assignments: analyzedData.assignments.filter((_, i) => selectedAssignments[i])
    };

    const payload = {
      course_data: filteredData,
      timezone: dates.timezone,
      reminders: {
        lecture: reminders.lecture.value * reminders.lecture.unit,
        exam: reminders.exam.value * reminders.exam.unit,
        assignment: reminders.assignment.value * reminders.assignment.unit
      }
    };

    try {
      // UPDATED URL HERE
      const response = await fetch('https://coursecal.onrender.com/generate-ics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Generation failed.");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'syllabus_schedule.ics');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(err);
      setError("Failed to generate file.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (setFunc, index) => setFunc(prev => ({ ...prev, [index]: !prev[index] }));

  const ReminderRow = ({ label, type }) => (
    <div className="flex items-center gap-3 p-2 hover:bg-white/50 rounded-lg transition-all duration-200">
      <label className="text-xs font-bold text-gray-600 w-24 shrink-0 uppercase tracking-wide">{label}</label>
      <div className="flex flex-1 gap-2">
        <input 
          type="number" min="0" value={reminders[type].value}
          onChange={(e) => handleReminderChange(type, 'value', e.target.value)}
          className="w-16 p-1.5 text-center border border-purple-200 rounded-md focus:border-purple-500 outline-none text-sm font-bold text-gray-700 bg-white"
        />
        <div className="relative flex-1">
          <select 
            value={reminders[type].unit}
            onChange={(e) => handleReminderChange(type, 'unit', e.target.value)}
            className="w-full appearance-none p-1.5 pl-2 pr-6 border border-purple-200 rounded-md bg-white focus:border-purple-500 outline-none text-sm font-medium text-gray-600 cursor-pointer"
          >
            <option value="1">Minutes</option>
            <option value="60">Hours</option>
            <option value="1440">Days</option>
          </select>
          <ChevronDown className="absolute right-2 top-3 text-purple-400 pointer-events-none" size={14} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '700ms'}}></div>
      </div>

      <div className="bg-white/95 backdrop-blur-xl w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 relative z-10 transition-all duration-500">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-8 text-center text-white relative">
          {step === 'review' && (
             <button onClick={() => setStep('upload')} className="absolute left-6 top-8 p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
               <ArrowLeft size={20} />
             </button>
          )}
          <div className="inline-block p-3 bg-white/10 rounded-2xl backdrop-blur-sm mb-3">
            {step === 'upload' ? <Calendar className="w-12 h-12" /> : <ListTodo className="w-12 h-12" />}
          </div>
          <h1 className="text-3xl font-black tracking-tight drop-shadow-md">
            {step === 'upload' ? 'CourseCal' : 'Review Schedule'}
          </h1>
          <p className="text-purple-100 mt-1 text-sm font-medium opacity-90">
            {step === 'upload' ? 'Upload PDF. Get organized.' : 'Select the items you want to import.'}
          </p>
        </div>

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative group">
              <label className="block text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 mb-2 uppercase tracking-wide flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-black">1</span>
                Upload Syllabus
              </label>
              <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer relative overflow-hidden
                ${file ? 'border-emerald-400 bg-emerald-50/50' : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/50'}
              `}>
                <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                {file ? (
                  <div className="flex flex-col items-center text-emerald-700">
                    <FileText className="w-8 h-8 mb-2" />
                    <span className="font-bold text-sm">{file.name}</span>
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-violet-400" />
                    <div className="font-semibold text-gray-600 text-sm">Click to browse or drag PDF</div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 mb-4 text-blue-700 border-b border-blue-200 pb-2">
                  <Calendar size={16} />
                  <h3 className="font-black uppercase text-xs tracking-wide">Course Details</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">Start</label>
                    <input type="date" value={dates.start} onChange={e => setDates({...dates, start: e.target.value})} className="w-full p-2 border border-blue-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">End</label>
                    <input type="date" value={dates.end} onChange={e => setDates({...dates, end: e.target.value})} className="w-full p-2 border border-blue-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase flex items-center gap-1"><Globe size={10} /> Timezone</label>
                    <div className="relative">
                        <select 
                        value={dates.timezone} 
                        onChange={e => setDates({...dates, timezone: e.target.value})} 
                        className="w-full p-2 border border-blue-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none appearance-none"
                        >
                        <option value="America/New_York">Eastern Time (New York)</option>
                        <option value="America/Chicago">Central Time (Chicago)</option>
                        <option value="America/Denver">Mountain Time (Denver)</option>
                        <option value="America/Los_Angeles">Pacific Time (LA)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Asia/Dubai">Dubai (GST)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-3 text-blue-400 pointer-events-none" size={14} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50/50 p-5 rounded-xl border border-purple-100">
                <div className="flex items-center gap-2 mb-4 text-purple-700 border-b border-purple-200 pb-2">
                  <Clock size={16} />
                  <h3 className="font-black uppercase text-xs tracking-wide">Reminders</h3>
                </div>
                <div className="space-y-1">
                  <ReminderRow label="Lectures" type="lecture" />
                  <ReminderRow label="Exams" type="exam" />
                  <ReminderRow label="Homework" type="assignment" />
                </div>
              </div>
            </div>

            <button 
              onClick={handleAnalyze} disabled={loading || !file}
              className={`w-full py-4 rounded-xl font-black text-lg shadow-xl flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-[0.98]
                ${loading || !file ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-indigo-200 hover:scale-[1.01]'}
              `}
            >
              {loading ? <><Loader2 className="animate-spin" size={20} /> <span>Analyzing...</span></> : <><CheckCircle2 size={20} /> <span>Review & Download</span></>}
            </button>
          </div>
        )}

        {/* STEP 2: REVIEW VIEW */}
        {step === 'review' && analyzedData && (
          <div className="flex flex-col h-[500px] animate-in fade-in slide-in-from-right-4 duration-500">
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                <h2 className="font-bold text-gray-800 text-lg">{analyzedData.course_name}</h2>
                <p className="text-gray-500 text-sm">{analyzedData.school_name} • {analyzedData.course_code}</p>
              </div>

              {/* LECTURES */}
              {analyzedData.lectures.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 ml-1">Lectures</h3>
                  <div className="space-y-2">
                    {analyzedData.lectures.map((lec, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${selectedLectures[i] ? 'bg-violet-50 border-violet-200' : 'bg-white border-gray-100 opacity-60'}`} onClick={() => toggleSelection(setSelectedLectures, i)}>
                        <input type="checkbox" checked={!!selectedLectures[i]} onChange={() => {}} className="mt-1 w-4 h-4 text-violet-600 rounded focus:ring-violet-500 cursor-pointer" />
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{lec.day} @ {formatTime(lec.start_time)}</p>
                          <p className="text-xs text-gray-500">{lec.location || lec.building || 'Location TBA'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ASSIGNMENTS */}
              {analyzedData.assignments.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 ml-1">Assignments</h3>
                  <div className="space-y-2">
                    {analyzedData.assignments.map((ass, i) => (
                      <div key={i} className={`relative p-3 rounded-lg border transition-colors 
                        ${selectedAssignments[i] ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100 opacity-60'}
                        ${editingIndex === i ? 'ring-2 ring-indigo-400 bg-white shadow-lg z-10' : ''}
                      `}>
                        
                        {/* NORMAL VIEW */}
                        {editingIndex !== i && (
                          <div className="flex items-start gap-3">
                             <div className="pt-1" onClick={() => toggleSelection(setSelectedAssignments, i)}>
                                <input type="checkbox" checked={!!selectedAssignments[i]} onChange={() => {}} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer" />
                             </div>
                             <div className="flex-1" onClick={() => toggleSelection(setSelectedAssignments, i)}>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-800 text-sm">{ass.title}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${ass.type.toLowerCase().includes('exam') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {ass.type}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {ass.recurring && ass.recurring_day ? (
                                      <span className="text-purple-600 font-medium">
                                      Repeats {ass.recurring_day}s @ {formatTime(ass.recurring_time)}
                                      </span>
                                  ) : (
                                      <span>
                                      Due: {ass.due_date || ass.exam_date || 'No Date'} {ass.start_time ? `@ ${formatTime(ass.start_time)}` : ''}
                                      </span>
                                  )}
                                </p>
                             </div>
                             {/* EDIT BUTTON */}
                             <button onClick={() => setEditingIndex(i)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition">
                               <Pencil size={14} />
                             </button>
                          </div>
                        )}

                        {/* EDIT VIEW */}
                        {editingIndex === i && (
                          <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                             <div className="flex justify-between items-center mb-2">
                               <span className="text-xs font-black text-indigo-600 uppercase">Editing Event</span>
                               <button onClick={() => setEditingIndex(null)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                             </div>
                             
                             {/* Title Edit */}
                             <div>
                               <label className="text-[10px] font-bold text-gray-500 uppercase">Title</label>
                               <input 
                                 type="text" 
                                 value={ass.title} 
                                 onChange={(e) => updateAssignment(i, 'title', e.target.value)}
                                 className="w-full p-1.5 text-sm border rounded bg-gray-50 focus:bg-white focus:ring-2 ring-indigo-200 outline-none"
                               />
                             </div>

                             {/* Recurring Toggle */}
                             <div className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded">
                                <input 
                                  type="checkbox" 
                                  checked={!!ass.recurring} 
                                  onChange={() => toggleRecurring(i)}
                                  className="w-4 h-4 text-indigo-600 rounded"
                                />
                                <span className="text-xs font-bold text-indigo-800">Repeats Weekly?</span>
                             </div>

                             {/* CONDITIONAL INPUTS */}
                             <div className="grid grid-cols-2 gap-2">
                               {ass.recurring ? (
                                 // RECURRING INPUTS
                                 <>
                                   <div>
                                      <label className="text-[10px] font-bold text-gray-500 uppercase">Day</label>
                                      <select 
                                        value={ass.recurring_day} 
                                        onChange={(e) => updateAssignment(i, 'recurring_day', e.target.value)}
                                        className="w-full p-1.5 text-sm border rounded bg-white"
                                      >
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                                          <option key={d} value={d}>{d}</option>
                                        ))}
                                      </select>
                                   </div>
                                   <div>
                                      <label className="text-[10px] font-bold text-gray-500 uppercase">Time</label>
                                      <input 
                                        type="time" 
                                        value={ass.recurring_time || ''} 
                                        onChange={(e) => updateAssignment(i, 'recurring_time', e.target.value)}
                                        className="w-full p-1.5 text-sm border rounded bg-white"
                                      />
                                   </div>
                                 </>
                               ) : (
                                 // ONE-TIME INPUTS
                                 <>
                                   <div>
                                      <label className="text-[10px] font-bold text-gray-500 uppercase">Date</label>
                                      <input 
                                        type="date" 
                                        value={ass.due_date || ass.exam_date || ''} 
                                        onChange={(e) => updateAssignment(i, ass.type.includes('Exam') ? 'exam_date' : 'due_date', e.target.value)}
                                        className="w-full p-1.5 text-sm border rounded bg-white"
                                      />
                                   </div>
                                   <div>
                                      <label className="text-[10px] font-bold text-gray-500 uppercase">Time</label>
                                      <input 
                                        type="time" 
                                        value={ass.start_time || ''} 
                                        onChange={(e) => updateAssignment(i, 'start_time', e.target.value)}
                                        className="w-full p-1.5 text-sm border rounded bg-white"
                                      />
                                   </div>
                                 </>
                               )}
                             </div>

                             <button onClick={() => setEditingIndex(null)} className="w-full py-2 bg-indigo-600 text-white rounded font-bold text-xs hover:bg-indigo-700 flex items-center justify-center gap-1">
                               <Save size={12} /> Save Changes
                             </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-white">
              <button 
                onClick={handleDownload} disabled={loading}
                className="w-full py-4 rounded-xl font-black text-lg shadow-xl flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-indigo-200 hover:scale-[1.01] transition-all"
              >
                {loading ? <><Loader2 className="animate-spin" size={20} /> <span>Generating...</span></> : <><Download size={20} /> <span>Download Calendar</span></>}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute bottom-4 left-4 right-4 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 text-sm font-bold shadow-lg">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}