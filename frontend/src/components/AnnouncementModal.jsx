import React, { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { X, Upload, Pin, Calendar, AlertCircle, AlertTriangle, Loader2, FileCheck, Save, Lock, Bell, Clock, Trash2, Plus, TableProperties } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { uploadFile } from '../services/upload';

export const AnnouncementModal = ({ isOpen, onClose, onSave, initialData = null, courses = [] }) => {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [selectedCommittees, setSelectedCommittees] = useState([]);
  const [isPinned, setIsPinned] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [status, setStatus] = useState('PUBLISHED');
  const [type, setType] = useState('NOTICE');

  const [timetableEntries, setTimetableEntries] = useState([{ subject: '', date: '', time: '', room: '' }]);
  const [selectedYears, setSelectedYears] = useState(['FY', 'SY', 'TY']);
  const [showPasteParser, setShowPasteParser] = useState(false);
  const [pasteData, setPasteData] = useState('');

  const [fileToUpload, setFileToUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');



  // Extract allowed courses for this HOD from Clerk publicMetadata
  const userAllowedCourses = user?.publicMetadata?.allowedCourses;
  const isRestrictedHod = Array.isArray(userAllowedCourses) && !userAllowedCourses.includes('*');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setContent(initialData.content || '');
      // For EVENT type, courseCodes stores committees; otherwise they store courses
      if (initialData.type === 'EVENT') {
        setSelectedCommittees(initialData.courseCodes || []);
        setSelectedCourses([]);
      } else {
        setSelectedCourses(initialData.courseCodes || []);
        setSelectedCommittees([]);
      }
      setIsPinned(initialData.isPinned || false);
      setIsEmergency(initialData.isEmergency || false);
      setEventDate(initialData.eventDate ? new Date(initialData.eventDate).toISOString().split('T')[0] : '');
      setAttachmentUrl(initialData.attachmentUrl || '');
      setExpiresAt(initialData.expiresAt ? new Date(initialData.expiresAt).toISOString().split('T')[0] : '');
      setStatus(initialData.status || 'PUBLISHED');
      setType(initialData.type || 'NOTICE');

      if (initialData.type === 'TIMETABLE' && initialData.timetableEntries?.length > 0) {
        setTimetableEntries(initialData.timetableEntries.map(e => ({
          subject: e.subject || '',
          date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
          time: e.time || '',
          room: e.room || ''
        })));
      } else {
        setTimetableEntries([{ subject: '', date: '', time: '', room: '' }]);
      }
      setSelectedYears(initialData.targetYears && initialData.targetYears.length > 0 ? initialData.targetYears : ['FY', 'SY', 'TY']);
    } else {
      setTitle('');
      setContent('');
      // If HOD is restricted to specific courses, auto-select their allowed courses
      if (isRestrictedHod) {
        setSelectedCourses(userAllowedCourses);
      } else {
        setSelectedCourses([]);
      }
      setSelectedCommittees([]);
      setIsPinned(false);
      setIsEmergency(false);
      setEventDate('');
      setAttachmentUrl('');
      setExpiresAt('');
      setStatus('PUBLISHED');
      setType('NOTICE');
      setTimetableEntries([{ subject: '', date: '', time: '', room: '' }]);
      setSelectedYears(['FY', 'SY', 'TY']);
    }
    setFileToUpload(null);
    setErrorMsg('');
    setShowPasteParser(false);
    setPasteData('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const COMMITTEES = [
    'Placement', 'Cultural', 'Student Council', 'Sports',
    'NCC', 'NSS', 'DLLE', 'Rotaract', 'Literary Committee', 'OBC/SC Cell',
  ];

  const rawCourseList = courses && courses.length > 0
    ? courses
    : [
      { code: 'BCOM' }, { code: 'BAF' }, { code: 'BBI' }, { code: 'BFM' },
      { code: 'BMS' }, { code: 'BSCIT' }, { code: 'BMM' }, { code: 'BA' }, { code: 'BSC' },
      { code: 'BSCCS' }, { code: 'MCOM' }, { code: 'MSCFM' },
    ];

  // Filter available courses based on HOD permissions
  const availableCourseList = isRestrictedHod
    ? rawCourseList.filter((c) => userAllowedCourses.includes(c.code))
    : rawCourseList;

  const toggleCourseSelection = (code) => {
    if (selectedCourses.includes(code)) {
      setSelectedCourses(selectedCourses.filter((c) => c !== code));
    } else {
      setSelectedCourses([...selectedCourses, code]);
    }
  };

  const toggleCommittee = (name) => {
    if (selectedCommittees.includes(name)) {
      setSelectedCommittees(selectedCommittees.filter((c) => c !== name));
    } else {
      setSelectedCommittees([...selectedCommittees, name]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFileToUpload(e.target.files[0]);
    }
  };

  const handleParsePaste = () => {
    if (!pasteData.trim()) return;
    const lines = pasteData.trim().split('\n');
    const newEntries = lines.map(line => {
      const parts = line.split(/\t/);
      return {
        date: parts[0]?.trim() || '',
        subject: parts[1]?.trim() || '',
        time: parts[2]?.trim() || '',
        room: parts[3]?.trim() || '',
      };
    });
    setTimetableEntries(newEntries);
    setShowPasteParser(false);
    setPasteData('');
  };



  const handleSubmit = async (e, forcedStatus = null) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Announcement title is required.');
      return;
    }

    if (type === 'TIMETABLE') {
      for (const entry of timetableEntries) {
        if (!entry.subject.trim() || !entry.date || !entry.time.trim()) {
          setErrorMsg('Subject, Date, and Time are required for all timetable entries.');
          return;
        }
      }
    } else {
      if (!content.trim() || content === '<p><br></p>') {
        setErrorMsg('Announcement content is required.');
        return;
      }
    }

    if (type === 'EVENT') {
      if (selectedCommittees.length === 0) {
        setErrorMsg('Please select at least one committee.');
        return;
      }
    } else if (selectedCourses.length === 0) {
      setErrorMsg('Please select at least one course tag.');
      return;
    }

    // Only validate year selection for non-event and non-emergency types (events and emergencies apply to all years)
    if (type !== 'EVENT' && type !== 'EMERGENCY' && selectedYears.length === 0) {
      setErrorMsg('Please select at least one target year (FY, SY, or TY).');
      return;
    }

    try {
      setIsSubmitting(true);

      let finalAttachmentUrl = attachmentUrl;

      // Handle signed file upload if a new file was selected
      if (fileToUpload) {
        setIsUploading(true);
        finalAttachmentUrl = await uploadFile(fileToUpload, getToken);
        setIsUploading(false);
      }

      const payload = {
        title: title.trim(),
        content: type === 'TIMETABLE' ? ' ' : content.trim(),
        // For events, store the selected committees in courseCodes field
        courseCodes: type === 'EVENT' ? selectedCommittees : selectedCourses,
        isPinned,
        isEmergency: type === 'EMERGENCY',
        eventDate: type === 'EVENT' && eventDate ? new Date(eventDate).toISOString() : null,
        attachmentUrl: finalAttachmentUrl || null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        status: forcedStatus || status,
        type,
        timetableEntries: type === 'TIMETABLE' ? timetableEntries.map(e => ({
          ...e,
          date: new Date(e.date).toISOString()
        })) : undefined,
        // Events and emergencies are visible to all years by default
        targetYears: (type === 'EVENT' || type === 'EMERGENCY') ? ['FY', 'SY', 'TY'] : selectedYears,
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('[Modal Submit Error]:', err);
      const rawMsg = err.response?.data?.error || err.message || 'Failed to save announcement.';
      setErrorMsg(typeof rawMsg === 'string' ? rawMsg : 'Failed to save announcement.');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="bg-college-navy px-4 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <h2 className="font-heading font-bold text-base sm:text-lg">
              {initialData ? 'Edit Post' : 'Post Announcement / Event'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 transition-colors duration-300 overflow-y-auto flex-1">


          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Post Category Selection: Academic Notice vs College Event */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Post Type / Category *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setType('NOTICE');
                  setIsEmergency(false);
                }}
                className={`py-2 px-3 sm:py-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1.5 ${type === 'NOTICE'
                  ? 'bg-college-navy text-college-gold border-college-navy shadow-sm ring-2 ring-college-gold/40'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
              >
                <Bell className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="truncate">Notice</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('EVENT');
                  setIsEmergency(false);
                }}
                className={`py-2 px-3 sm:py-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1.5 ${type === 'EVENT'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-400/40'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
              >
                <Calendar className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="truncate">Event</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('TIMETABLE');
                  setIsEmergency(false);
                }}
                className={`py-2 px-3 sm:py-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1.5 ${type === 'TIMETABLE'
                  ? 'bg-college-navy text-white border-college-navy shadow-sm ring-2 ring-college-navy/40'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
              >
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">Timetable</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('EMERGENCY');
                  setIsEmergency(true);
                  if (selectedCourses.length === 0) {
                    setSelectedCourses(availableCourseList.map((c) => c.code));
                  }
                }}
                className={`py-2 px-3 sm:py-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1.5 ${type === 'EMERGENCY'
                  ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400/50'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 animate-pulse" />
                <span className="truncate">Emergency</span>
              </button>
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Announcement Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === 'EMERGENCY'
                  ? 'e.g. Heavy Rain Red Alert: College Closed on Friday, 11th Sept'
                  : type === 'EVENT'
                  ? 'e.g. Annual Cultural Fest - Talent Hunt 2026'
                  : type === 'TIMETABLE'
                  ? 'e.g. BMS Semester VI Internal Assessment Timetable'
                  : 'e.g. Library Books Return Deadline for All Students'
              }
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-college-navy/40 dark:focus:ring-college-gold/40 focus:border-college-navy dark:focus:border-college-gold text-sm"
              required
            />

            {/* Quick Fill Templates for Emergency */}
            {type === 'EMERGENCY' && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">
                  Quick Fill:
                </span>
                {[
                  {
                    label: '🌧️ Heavy Rain Holiday',
                    title: 'College Closed Due to Heavy Rain / Red Alert Warning',
                    content: '<p>Due to heavy rainfall and the red alert weather warning issued by the authorities, <strong>college will remain closed</strong>. All scheduled lectures and tests stand postponed until further notice. Students are advised to stay safe indoors.</p>',
                  },
                  {
                    label: '⚠️ Exam Postponed',
                    title: 'Urgent: Examination Postponed — Revised Dates to Follow',
                    content: '<p>Please note that the university/college examination scheduled for today has been <strong>postponed</strong>. The revised schedule will be published shortly on this portal.</p>',
                  },
                  {
                    label: '🛑 Campus Closed',
                    title: 'Urgent: Campus Closed Due to Unforeseen Circumstances',
                    content: '<p>The college campus will remain non-operational today due to emergency administrative reasons. Online communication remains active.</p>',
                  },
                ].map((tpl, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => {
                      setTitle(tpl.title);
                      setContent(tpl.content);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Department / Course Tags OR Committee Selection */}
          {type === 'EVENT' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Organising Committee *
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMITTEES.map((committee) => {
                  const isSelected = selectedCommittees.includes(committee);
                  return (
                    <button
                      type="button"
                      key={committee}
                      onClick={() => toggleCommittee(committee)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${isSelected
                          ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400/40 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-500 hover:bg-slate-200 dark:hover:bg-slate-500'
                        }`}
                    >
                      {isSelected ? `✓ ${committee}` : `+ ${committee}`}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Event Date (for Calendar)
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-xs"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Department / Course *
                </label>
                <div className="flex items-center gap-2">
                  {type === 'EMERGENCY' && (
                    <button
                      type="button"
                      onClick={() => {
                        const allCodes = availableCourseList.map((c) => c.code);
                        if (selectedCourses.length === allCodes.length) {
                          setSelectedCourses([]);
                        } else {
                          setSelectedCourses(allCodes);
                        }
                      }}
                      className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      {selectedCourses.length === availableCourseList.length ? 'Clear Selection' : 'Select All Courses'}
                    </button>
                  )}
                  {isRestrictedHod && (
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Restricted to {userAllowedCourses.join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableCourseList.map((course) => {
                  const isSelected = selectedCourses.includes(course.code);
                  return (
                    <button
                      type="button"
                      key={course.code}
                      onClick={() => toggleCourseSelection(course.code)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${isSelected
                          ? 'bg-college-navy text-college-gold border-college-navy ring-2 ring-college-gold/40 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-500 hover:bg-slate-200 dark:hover:bg-slate-500'
                        }`}
                    >
                      {isSelected ? `✓ ${course.code}` : `+ ${course.code}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Target Year Selection — hidden for College Events and Emergencies (applies to all years) */}
          {type !== 'EVENT' && type !== 'EMERGENCY' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Target Year(s) *
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                Select which year's students should see this announcement.
              </p>
              <div className="flex flex-wrap gap-2">
                {['FY', 'SY', 'TY'].map((yr) => {
                  const isSelected = selectedYears.includes(yr);
                  const yearLabels = { FY: 'First Year', SY: 'Second Year', TY: 'Third Year' };
                  return (
                    <button
                      type="button"
                      key={yr}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedYears(selectedYears.filter((y) => y !== yr));
                        } else {
                          setSelectedYears([...selectedYears, yr]);
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${isSelected
                        ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400/40 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-500 hover:bg-slate-200 dark:hover:bg-slate-500'
                        }`}
                    >
                      {isSelected ? `✓ ${yr}` : `+ ${yr}`}
                      <span className="font-normal opacity-70">{yearLabels[yr]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Content Textarea OR Timetable Editor */}
          {type === 'TIMETABLE' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  EXAM SCHEDULE *
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasteParser(!showPasteParser)}
                  className="text-xs text-college-navy dark:text-sky-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <TableProperties className="w-3.5 h-3.5" />
                  Paste from Spreadsheet
                </button>
              </div>

              {showPasteParser && (
                <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Paste columns in order: <strong>Date | Subject | Time | Room</strong> (tab-separated)
                  </p>
                  <textarea
                    value={pasteData}
                    onChange={(e) => setPasteData(e.target.value)}
                    placeholder="Paste rows here..."
                    className="w-full h-24 px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-college-navy/40"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPasteParser(false)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleParsePaste}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-college-navy hover:bg-college-navy/90 rounded-lg"
                    >
                      Import Rows
                    </button>
                  </div>
                </div>
              )}

              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                {/* Desktop Table Header */}
                <div className="hidden sm:grid grid-cols-[1fr_2fr_1.5fr_1fr_auto] gap-2 p-3 border-b border-slate-200 dark:border-slate-700 font-bold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <div>Date</div>
                  <div>Subject / Paper</div>
                  <div>Time</div>
                  <div>Room (Opt)</div>
                  <div className="w-8"></div>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {timetableEntries.map((entry, idx) => (
                    <div key={idx} className="p-3 sm:p-2 bg-white dark:bg-slate-800 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_2fr_1.5fr_1fr_auto] sm:gap-2 sm:items-center relative">
                      <div className="flex items-center justify-between sm:contents">
                        <span className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Date</span>
                        <input
                          type="date"
                          value={entry.date}
                          onChange={(e) => {
                            const newEntries = [...timetableEntries];
                            newEntries[idx].date = e.target.value;
                            setTimetableEntries(newEntries);
                          }}
                          className="w-full sm:w-auto px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div className="space-y-1 sm:space-y-0">
                        <span className="sm:hidden text-[10px] font-bold uppercase text-slate-400 block">Subject / Paper</span>
                        <input
                          type="text"
                          value={entry.subject}
                          placeholder="Subject name"
                          onChange={(e) => {
                            const newEntries = [...timetableEntries];
                            newEntries[idx].subject = e.target.value;
                            setTimetableEntries(newEntries);
                          }}
                          className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:contents gap-2">
                        <div>
                          <span className="sm:hidden text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Time</span>
                          <input
                            type="text"
                            value={entry.time}
                            placeholder="e.g. 10:00 - 12:00"
                            onChange={(e) => {
                              const newEntries = [...timetableEntries];
                              newEntries[idx].time = e.target.value;
                              setTimetableEntries(newEntries);
                            }}
                            className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                          />
                        </div>

                        <div>
                          <span className="sm:hidden text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Room (Opt)</span>
                          <input
                            type="text"
                            value={entry.room}
                            placeholder="Room"
                            onChange={(e) => {
                              const newEntries = [...timetableEntries];
                              newEntries[idx].room = e.target.value;
                              setTimetableEntries(newEntries);
                            }}
                            className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end sm:justify-center pt-1 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => setTimetableEntries(timetableEntries.filter((_, i) => i !== idx))}
                          className="px-2 py-1 sm:p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors text-xs font-bold flex items-center gap-1"
                          title="Remove row"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sm:hidden">Remove Entry</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setTimetableEntries([...timetableEntries, { subject: '', date: '', time: '', room: '' }])}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-college-navy dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Exam Date
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Announcement Content *
              </label>
              <div className="rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  placeholder="Write notice details, instructions, room numbers, or deadline notes..."
                  className="bg-white dark:bg-slate-700 min-h-[150px] dark:[&_.ql-toolbar]:bg-slate-600 dark:[&_.ql-toolbar]:border-slate-600 dark:[&_.ql-container]:border-slate-600 dark:[&_.ql-editor]:text-slate-100 dark:[&_.ql-editor.ql-blank]:before:text-slate-400 dark:[&_.ql-stroke]:stroke-slate-300 dark:[&_.ql-fill]:fill-slate-300 dark:[&_.ql-picker-label]:text-slate-300 dark:[&_.ql-picker-options]:bg-slate-700 dark:[&_.ql-picker-options]:border-slate-600"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                      ['link', 'clean']
                    ],
                  }}
                />
              </div>
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Attachment Document (PDF, Image, Doc)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-college-navy dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-600 transition-colors">
                <Upload className="w-4 h-4 text-college-navy" />
                <span>{fileToUpload ? 'Change File' : 'Choose File to Upload'}</span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                />
              </label>
              {fileToUpload && (
                <div className="flex items-center space-x-1 text-xs text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  <FileCheck className="w-4 h-4" />
                  <span className="truncate max-w-xs">{fileToUpload.name}</span>
                </div>
              )}
              {attachmentUrl && !fileToUpload && (
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 underline truncate max-w-xs"
                >
                  Existing Attachment
                </a>
              )}
            </div>
          </div>

          {/* Options: Pin & Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPinnedCheck"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 text-college-navy rounded border-slate-300 focus:ring-college-navy"
              />
              <label htmlFor="isPinnedCheck" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer">
                <Pin className="w-3.5 h-3.5 text-amber-500" />
                Pin Announcement to Top of Feed
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Optional Expiration Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-college-navy/40 dark:focus:ring-college-gold/40 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors text-center"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'DRAFT')}
                disabled={isSubmitting || isUploading}
                className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs transition-shadow shadow-sm flex items-center justify-center gap-2"
              >
                {(isSubmitting || isUploading) && status === 'DRAFT' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save as Draft</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'PUBLISHED')}
                disabled={isSubmitting || isUploading}
                className="w-full sm:w-auto px-5 py-2 bg-college-navy hover:bg-college-navyLight text-college-gold font-bold rounded-lg text-xs transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {(isSubmitting || isUploading) && status === 'PUBLISHED' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{isUploading ? 'Uploading File...' : isSubmitting ? 'Saving...' : 'Publish Announcement'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementModal;
