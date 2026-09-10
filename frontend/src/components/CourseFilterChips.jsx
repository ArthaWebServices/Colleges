import React from 'react';
import { Layers } from 'lucide-react';

export const CourseFilterChips = ({ courses = [], activeCourse, onSelectCourse }) => {
  const defaultList = [
    { code: 'BCOM', name: 'Bachelor of Commerce' },
    { code: 'BAF', name: 'BCom Accounting & Finance' },
    { code: 'BBI', name: 'BCom Banking & Insurance' },
    { code: 'BFM', name: 'BCom Financial Markets' },
    { code: 'BMS', name: 'Bachelor of Management Studies' },
    { code: 'BSCIT', name: 'BSc Information Technology' },
    { code: 'BMM', name: 'Bachelor of Mass Media' },
    { code: 'BA', name: 'Bachelor of Arts' },
    { code: 'BSC', name: 'Bachelor of Science' },
  ];

  const courseList = courses && courses.length > 0 ? courses : defaultList;
  const allCourses = [{ code: 'ALL', name: 'All Departments' }, ...courseList];

  return (
    <div className="w-full overflow-x-auto py-2 scrollbar-none">
      <div className="flex items-center space-x-2 min-w-max">
        <div className="flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pr-2">
          <Layers className="w-3.5 h-3.5 mr-1 text-college-gold" />
          Filter:
        </div>
        {allCourses.map((course) => {
          const isSelected = activeCourse === course.code;
          return (
            <button
              key={course.code}
              onClick={() => onSelectCourse(course.code)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 shadow-sm border ${
                isSelected
                  ? 'bg-college-navy dark:bg-college-gold text-college-gold dark:text-college-navy border-college-navy dark:border-college-gold shadow-md ring-2 ring-college-gold/40 scale-105'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
              }`}
              title={course.name}
            >
              {course.code}
              {course.code !== 'ALL' && (
                <span className="ml-1.5 opacity-60 font-normal hidden lg:inline">
                  • {course.name}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CourseFilterChips;
