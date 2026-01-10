import { useState } from 'react';
import { Upload, FileText, Calendar, Clock, Download, Loader2, AlertCircle, ChevronDown } from 'lucide-react';

export default function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Dates
  const [dates, setDates] = useState({
    start: '2025-09-02',
    end: '2025-12-15'
  });

  // Reminders State
  const [reminders, setReminders] = useState({
    lecture: { value: 15, unit: 1 },
    exam: { value: 1, unit: 1440 },
    assignment: { value: 1, unit: 60 }
  });

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

  const handleSubmit = async () => {
    if (!file) {
      setError("Please select a syllabus PDF first.");
      return;
    }

    setLoading(true);
    setError(null);

    const lectureMins = reminders.lecture.value * reminders.lecture.unit;
    const examMins = reminders.exam.value * reminders.exam.unit;
    const hwMins = reminders.assignment.value * reminders.assignment.unit;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('start_date', dates.start);
    formData.append('end_date', dates.end);
    formData.append('lecture_reminder', lectureMins);
    formData.append('exam_reminder', examMins);
    formData.append('assignment_reminder', hwMins);

    try {
      const response = await fetch('https://coursecal-backend.onrender.com/generate-calendar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Backend error");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'course_schedule.ics');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

    } catch (err) {
      console.error(err);
      setError("Failed to generate. Ensure Backend is running on port 8000!");
    } finally {
      setLoading(false);
    }
  };

  // --- COMPACT REMINDER ROW ---
  const ReminderRow = ({ label, type }) => (
    <div className="flex items-center gap-3 p-2 hover:bg-white/50 rounded-lg transition-all duration-200">
      
      {/* Label: Fixed width & Uppercase for clean alignment */}
      <label className="text-xs font-bold text-gray-600 w-24 shrink-0 uppercase tracking-wide">
        {label}
      </label>
      
      <div className="flex flex-1 gap-2">
        {/* Number Input: Compact width */}
        <input 
          type="number" 
          min="0"
          value={reminders[type].value}
          onChange={(e) => handleReminderChange(type, 'value', e.target.value)}
          className="w-16 p-1.5 text-center border border-purple-200 rounded-md focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-sm font-bold text-gray-700 bg-white transition-all"
        />
        
        {/* Unit Dropdown: Fills space */}
        <div className="relative flex-1">
          <select 
            value={reminders[type].unit}
            onChange={(e) => handleReminderChange(type, 'unit', e.target.value)}
            className="w-full appearance-none p-1.5 pl-2 pr-6 border border-purple-200 rounded-md bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-sm font-medium text-gray-600 cursor-pointer transition-all"
          >
            <option value="1">Minutes</option>
            <option value="60">Hours</option>
            <option value="1440">Days</option>
            <option value="10080">Weeks</option>
          </select>
          <ChevronDown className="absolute right-2 top-2 text-purple-400 pointer-events-none" size={14} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '700ms'}}></div>
      </div>

      <div className="bg-white/95 backdrop-blur-xl w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 relative z-10">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-8 text-center text-white relative">
          <div className="inline-block p-3 bg-white/10 rounded-2xl backdrop-blur-sm mb-3">
            <Calendar className="w-12 h-12 mx-auto drop-shadow-md" />
          </div>
          <h1 className="text-3xl font-black tracking-tight drop-shadow-md">Syllabus to Calendar</h1>
          <p className="text-purple-100 mt-1 text-sm font-medium opacity-90">Upload PDF. Get organized.</p>
        </div>

        <div className="p-8 space-y-8">
          
          {/* File Upload */}
          <div className="relative group">
            <label className="block text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 mb-2 uppercase tracking-wide flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-black">1</span>
              Upload Syllabus
            </label>
            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer relative overflow-hidden
              ${file ? 'border-emerald-400 bg-emerald-50/50' : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/50'}
            `}>
              <input 
                type="file" 
                accept=".pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              
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
            
            {/* Dates */}
            <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 mb-4 text-blue-700 border-b border-blue-200 pb-2">
                <Calendar size={16} />
                <h3 className="font-black uppercase text-xs tracking-wide">Dates</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">Start</label>
                  <input 
                    type="date" 
                    value={dates.start}
                    onChange={e => setDates({...dates, start: e.target.value})}
                    className="w-full p-2 border border-blue-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">End</label>
                  <input 
                    type="date" 
                    value={dates.end}
                    onChange={e => setDates({...dates, end: e.target.value})}
                    className="w-full p-2 border border-blue-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Reminders */}
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

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 text-sm font-medium">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button 
            onClick={handleSubmit}
            disabled={loading || !file}
            className={`w-full py-4 rounded-xl font-black text-lg shadow-xl flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-[0.98]
              ${loading || !file 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-indigo-200 hover:scale-[1.01]'}
            `}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} /> 
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Download size={20} /> 
                <span>Download Schedule</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}