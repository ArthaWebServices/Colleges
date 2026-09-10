import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Tag, MapPin, AlertTriangle, Sparkles, BookOpen, ExternalLink } from 'lucide-react';

export const CalendarView = ({ announcements = [], onSelectAnnouncement }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Helper: Format date as YYYY-MM-DD in local time
  const formatLocalDateKey = (d) => {
    if (!d) return null;
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return null;
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Map all activities (exams, events, emergencies) by date key
  const activitiesByDate = useMemo(() => {
    const map = new Map();

    const addActivity = (dateStr, item) => {
      if (!dateStr) return;
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr).push(item);
    };

    announcements.forEach((ann) => {
      // 1. Timetable entries (Exams)
      if (ann.type === 'TIMETABLE' && Array.isArray(ann.timetableEntries)) {
        ann.timetableEntries.forEach((entry) => {
          const key = formatLocalDateKey(entry.date);
          if (key) {
            addActivity(key, {
              id: `${ann._id}-${entry._id || entry.subject}`,
              parentAnnouncement: ann,
              kind: 'EXAM',
              title: entry.subject,
              time: entry.time,
              room: entry.room,
              courseCodes: ann.courseCodes || [],
              targetYears: ann.targetYears || [],
              announcementTitle: ann.title,
            });
          }
        });
      }

      // 2. College Events
      if (ann.type === 'EVENT') {
        // Use eventDate if set, else fallback to expiresAt or createdAt
        const targetDate = ann.eventDate || ann.expiresAt || ann.createdAt;
        const key = formatLocalDateKey(targetDate);
        if (key) {
          addActivity(key, {
            id: `${ann._id}-event`,
            parentAnnouncement: ann,
            kind: 'EVENT',
            title: ann.title,
            courseCodes: ann.courseCodes || [],
            announcementTitle: ann.title,
            content: ann.content,
            attachmentUrl: ann.attachmentUrl,
          });
        }
      }

      // 3. Emergency Alerts
      if (ann.isEmergency || ann.type === 'EMERGENCY') {
        const key = formatLocalDateKey(ann.eventDate || ann.createdAt);
        if (key) {
          addActivity(key, {
            id: `${ann._id}-emergency`,
            parentAnnouncement: ann,
            kind: 'EMERGENCY',
            title: ann.title,
            courseCodes: ann.courseCodes || [],
            announcementTitle: ann.title,
          });
        }
      }
    });

    return map;
  }, [announcements]);

  // Compute calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const dateObj = new Date(year, month - 1, d);
      days.push({
        dateObj,
        dayNum: d,
        isCurrentMonth: false,
        dateKey: formatLocalDateKey(dateObj),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      days.push({
        dateObj,
        dayNum: d,
        isCurrentMonth: true,
        dateKey: formatLocalDateKey(dateObj),
      });
    }

    // Next month padding to complete 35 or 42 cells grid
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(year, month + 1, d);
      days.push({
        dateObj,
        dayNum: d,
        isCurrentMonth: false,
        dateKey: formatLocalDateKey(dateObj),
      });
    }

    return days;
  }, [year, month]);

  const selectedDateKey = formatLocalDateKey(selectedDate);
  const selectedActivities = activitiesByDate.get(selectedDateKey) || [];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const todayKey = formatLocalDateKey(new Date());

  return (
    <div className="space-y-6">
      {/* Calendar Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-college-navy/10 dark:bg-slate-700 flex items-center justify-center text-college-navy dark:text-college-gold">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 dark:text-white">
                {monthNames[month]} {year}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Exam timetables and college events calendar
              </p>
            </div>
          </div>

          {/* Month Nav Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
            >
              Today
            </button>
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Exam Paper</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>College Event</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Emergency / Notice</span>
          </div>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-4 pb-2">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Calendar Day Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((day, idx) => {
            const activities = activitiesByDate.get(day.dateKey) || [];
            const isSelected = day.dateKey === selectedDateKey;
            const isToday = day.dateKey === todayKey;

            const hasExam = activities.some((a) => a.kind === 'EXAM');
            const hasEvent = activities.some((a) => a.kind === 'EVENT');
            const hasEmergency = activities.some((a) => a.kind === 'EMERGENCY');

            return (
              <button
                key={`${day.dateKey}-${idx}`}
                type="button"
                onClick={() => setSelectedDate(day.dateObj)}
                className={`min-h-[64px] sm:min-h-[85px] p-1.5 sm:p-2 rounded-2xl flex flex-col justify-between text-left transition-all duration-200 border cursor-pointer ${
                  isSelected
                    ? 'bg-college-navy text-white border-college-navy ring-2 ring-college-gold/60 shadow-md'
                    : isToday
                    ? 'bg-amber-50/70 dark:bg-slate-700/60 border-amber-300 dark:border-amber-600/60 text-slate-900 dark:text-white'
                    : day.isCurrentMonth
                    ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-150 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700/40 text-slate-800 dark:text-slate-200'
                    : 'bg-transparent border-transparent text-slate-350 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900/20'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs sm:text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isSelected
                        ? 'bg-college-gold text-college-navy'
                        : isToday
                        ? 'bg-amber-500 text-white font-extrabold'
                        : ''
                    }`}
                  >
                    {day.dayNum}
                  </span>
                  {activities.length > 0 && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {activities.length}
                    </span>
                  )}
                </div>

                {/* Activity Dots / Preview */}
                <div className="w-full space-y-1 mt-1">
                  <div className="flex items-center gap-1">
                    {hasExam && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>}
                    {hasEvent && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>}
                    {hasEmergency && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>}
                  </div>

                  {/* Desktop preview of first activity */}
                  {activities.length > 0 && (
                    <p
                      className={`text-[10px] font-medium truncate hidden sm:block ${
                        isSelected ? 'text-slate-200' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {activities[0].title}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Agenda Details */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-5">
          <div>
            <h3 className="text-base sm:text-lg font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-college-gold" />
              <span>
                Schedule for {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {selectedActivities.length} {selectedActivities.length === 1 ? 'activity' : 'activities'} scheduled
            </p>
          </div>
        </div>

        {selectedActivities.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No exams or events scheduled for this day
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Select a date with colored dots above to inspect scheduled sessions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedActivities.map((act) => {
              const isExam = act.kind === 'EXAM';
              const isEvent = act.kind === 'EVENT';
              const isEmergency = act.kind === 'EMERGENCY';

              return (
                <div
                  key={act.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    isEmergency
                      ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                      : isExam
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
                      : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          isEmergency
                            ? 'bg-rose-600 text-white'
                            : isExam
                            ? 'bg-blue-600 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {isEmergency ? 'Emergency Notice' : isExam ? 'Exam Paper' : 'College Event'}
                      </span>

                      {act.courseCodes && act.courseCodes.length > 0 && (
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {act.courseCodes.join(', ')}
                        </span>
                      )}
                    </div>

                    <h4 className="font-heading font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                      {act.title}
                    </h4>

                    {act.announcementTitle && act.announcementTitle !== act.title && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        Notice: {act.announcementTitle}
                      </p>
                    )}

                    {/* Meta info: Time / Room */}
                    {isExam && (
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {act.time && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>{act.time}</span>
                          </div>
                        )}
                        {act.room && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>Room: {act.room}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(`announcement-${act.parentAnnouncement?._id}`) || document.getElementById('notices');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth' });
                        }
                        if (onSelectAnnouncement) {
                          onSelectAnnouncement(act.parentAnnouncement);
                        }
                      }}
                      className="text-xs font-bold text-college-navy dark:text-college-gold hover:underline flex items-center gap-1"
                    >
                      <span>View Full Notice</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
