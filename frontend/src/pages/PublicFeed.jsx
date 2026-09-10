import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, Layers, RefreshCw, AlertCircle, AlertTriangle, Bookmark, Calendar, GraduationCap, ArrowUp, BellRing, Check, Loader2 } from 'lucide-react';
import { getCourses, getAnnouncements, getVapidPublicKey, subscribeNotifications, unsubscribeNotifications } from '../services/api';
import { getBookmarks } from '../utils/bookmarks';
import CourseFilterChips from '../components/CourseFilterChips';
import AnnouncementCard from '../components/AnnouncementCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { Dock } from '../components/reactbits/Dock';
import { AnimatedBlocks } from '../components/reactbits/AnimatedBlocks';
import EmergencyAlertBanner from '../components/EmergencyAlertBanner';
import CalendarView from '../components/CalendarView';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const PublicFeed = () => {
  const location = useLocation();
  const [courses, setCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [viewMode, setViewMode] = useState('FEED'); // 'FEED' | 'CALENDAR'

  // Push notifications states
  const [swRegistration, setSwRegistration] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notifyCourse, setNotifyCourse] = useState('BCOM');
  const [notifyYear, setNotifyYear] = useState('FY');
  const [savedNotifyCourse, setSavedNotifyCourse] = useState('BCOM');
  const [savedNotifyYear, setSavedNotifyYear] = useState('FY');
  const [isSubmittingPush, setIsSubmittingPush] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState(null);
  const [justSubscribed, setJustSubscribed] = useState(false);

  // Sync selectedType with URL hash / search params when clicking Navbar links
  const applyHashFilter = () => {
    const hash = window.location.hash;
    if (hash === '#emergency' || hash === '#alerts') {
      setSelectedType('EMERGENCY');
    } else if (hash === '#events') {
      setSelectedType('EVENT');
    } else if (hash === '#notices') {
      setSelectedType('NOTICE');
    } else if (hash === '#timetables') {
      setSelectedType('TIMETABLE');
    } else if (!hash || hash === '#') {
      // No hash means "Home" was clicked — reset to ALL
      setSelectedType('ALL');
    }
  };

  useEffect(() => {
    applyHashFilter();
    // Also check search params
    const params = new URLSearchParams(location.search);
    const typeParam = params.get('type');
    if (typeParam && ['NOTICE', 'EVENT', 'TIMETABLE', 'EMERGENCY'].includes(typeParam.toUpperCase())) {
      setSelectedType(typeParam.toUpperCase());
    }
  }, [location.hash, location.search]);

  // Listen for native hashchange events (fired by Navbar's window.location.hash = ...)
  useEffect(() => {
    const handleHashChange = () => applyHashFilter();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Back to Top — show after scrolling 400px
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Push Notifications Setup
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[SW] Service Worker registered:', reg);
          setSwRegistration(reg);
          return reg.pushManager.getSubscription();
        })
        .then((sub) => {
          if (sub && Notification.permission === 'granted') {
            setIsSubscribed(true);
            const savedC = localStorage.getItem('gsc_notify_course') || 'BCOM';
            const savedY = localStorage.getItem('gsc_notify_year') || 'FY';
            setNotifyCourse(savedC);
            setNotifyYear(savedY);
            setSavedNotifyCourse(savedC);
            setSavedNotifyYear(savedY);
          } else {
            setIsSubscribed(false);
          }
        })
        .catch((err) => {
          console.warn('[SW] Registration failed:', err);
        });
    }
  }, []);

  const handleSubscribeToggle = async () => {
    if (!swRegistration) {
      setPushStatusMsg({ type: 'error', text: 'Push notifications are not supported on this browser.' });
      return;
    }
    setIsSubmittingPush(true);
    setPushStatusMsg(null);
    try {
      const hasChanges = isSubscribed && (notifyCourse !== savedNotifyCourse || notifyYear !== savedNotifyYear);

      if (isSubscribed && !hasChanges) {
        // Unsubscribe
        const sub = await swRegistration.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await unsubscribeNotifications(sub.endpoint);
        }
        setIsSubscribed(false);
        setPushStatusMsg({ type: 'success', text: 'Unsubscribed from notifications.' });
      } else {
        // Request Permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Notification permission denied by user.');
        }

        // Fetch Public VAPID key
        const keyRes = await getVapidPublicKey();
        if (!keyRes.success) throw new Error(keyRes.error || 'Failed to fetch public VAPID key');

        // Subscribe browser
        const sub = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyRes.publicKey)
        });

        // Register on backend
        const res = await subscribeNotifications({
          subscription: sub,
          courses: [notifyCourse],
          years: [notifyYear]
        });

        if (res.success) {
          setIsSubscribed(true);
          setJustSubscribed(true);
          setSavedNotifyCourse(notifyCourse);
          setSavedNotifyYear(notifyYear);
          localStorage.setItem('gsc_notify_course', notifyCourse);
          localStorage.setItem('gsc_notify_year', notifyYear);
          setPushStatusMsg({ type: 'success', text: hasChanges ? 'Alert preferences updated successfully!' : 'Successfully subscribed to notice alerts!' });
        } else {
          throw new Error(res.error || 'Failed to register subscription on server.');
        }
      }
    } catch (err) {
      console.error('[Push Setup Error]:', err);
      setPushStatusMsg({ type: 'error', text: err.message || 'Notification configuration failed.' });
    } finally {
      setIsSubmittingPush(false);
    }
  };

  // Fetch initial course options & bookmarked IDs
  useEffect(() => {
    const fetchCourseList = async () => {
      try {
        const res = await getCourses();
        if (res.success) {
          setCourses(res.data);
        }
      } catch (err) {
        console.error('[Fetch Courses Error]:', err);
      }
    };
    fetchCourseList();
    setBookmarkedIds(getBookmarks());
  }, []);

  // Fetch announcements whenever filters change
  const fetchAnnouncementsList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAnnouncements(selectedCourse, searchQuery, startDate, endDate, selectedType, selectedYear);
      if (res.success) {
        setAnnouncements(res.data);
      }
    } catch (err) {
      console.error('[Fetch Announcements Error]:', err);
      setError('Unable to load announcements. Please check server connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAnnouncementsList();
    }, 300); // 300ms debounce for search input

    return () => clearTimeout(timer);
  }, [selectedCourse, selectedType, searchQuery, startDate, endDate, selectedYear]);

  const handleBookmarkToggleInCard = () => {
    setBookmarkedIds(getBookmarks());
  };

  // Filter displayed items if "Bookmarks Only" is selected
  const displayedAnnouncements = showBookmarksOnly
    ? announcements.filter((item) => bookmarkedIds.includes(item._id))
    : announcements;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full relative">
      {/* College Hero Section */}
      <div id="events" className="bg-gradient-to-r from-college-navy via-college-navyLight to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg mb-6 relative overflow-hidden border border-college-gold/20">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-college-gold/20 text-college-gold px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 border border-college-gold/30">
            <Bell className="w-3 h-3" />
            <span>Student Notice Board</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-extrabold tracking-tight mb-2 text-white leading-tight">
            Academic Announcements & Notices
          </h1>
          <p className="text-slate-350 text-xs sm:text-sm leading-normal">
            Official department notices, timetables, and college events.
          </p>

          {/* Interactive Block Grid */}
          <div className="mt-3.5 max-w-xs">
            <AnimatedBlocks count={6} />
          </div>
        </div>

        {/* Decorative background accent */}
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-1/4 translate-y-1/4">
          <Layers className="w-96 h-96 text-white" />
        </div>
      </div>

      {/* MacOS-style Dock Category Navigation */}
      <Dock
        activeTab={selectedType}
        onSelect={(typeId) => setSelectedType(typeId)}
        items={[
          { id: 'ALL', label: 'All Notices', icon: Layers },
          { id: 'EMERGENCY', label: 'Emergencies', icon: AlertTriangle },
          { id: 'NOTICE', label: 'Academic Notices', icon: Bell },
          { id: 'EVENT', label: 'Events', icon: Calendar },
          { id: 'TIMETABLE', label: 'Timetables', icon: RefreshCw },
        ]}
      />


      {/* Emergency Flash Alert Banner */}
      <EmergencyAlertBanner announcements={announcements} />

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-5 mb-8 space-y-4 transition-colors duration-300">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notices by title, exam, timetable, assignment..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-college-navy/30 dark:focus:ring-college-gold text-sm placeholder:text-slate-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Bookmarks Toggle & Refresh */}
          <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                setShowBookmarksOnly(!showBookmarksOnly);
                setBookmarkedIds(getBookmarks());
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border flex-1 sm:flex-initial justify-center ${
                showBookmarksOnly
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40'
              }`}
              title="Filter by saved notices"
            >
              <Bookmark className={`w-3.5 h-3.5 ${showBookmarksOnly ? 'fill-current' : ''}`} />
              <span>Saved ({bookmarkedIds.length})</span>
            </button>

            <button
              onClick={fetchAnnouncementsList}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 shadow-sm flex-1 sm:flex-initial"
              title="Refresh feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Course Filter Chips */}
        <CourseFilterChips
          courses={courses}
          activeCourse={selectedCourse}
          onSelectCourse={(code) => setSelectedCourse(code)}
        />

        {/* Year Filter Chips */}
        <div className="w-full overflow-x-auto py-2 scrollbar-none">
          <div className="flex items-center space-x-2 min-w-max">
            <div className="flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pr-2">
              <GraduationCap className="w-3.5 h-3.5 mr-1 text-emerald-500" />
              Year:
            </div>
            {[{ id: 'ALL', label: 'All Years' }, { id: 'FY', label: 'First Year' }, { id: 'SY', label: 'Second Year' }, { id: 'TY', label: 'Third Year' }].map((yr) => {
              const isActive = selectedYear === yr.id;
              return (
                <button
                  key={yr.id}
                  onClick={() => setSelectedYear(yr.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 shadow-sm border ${
                    isActive
                      ? 'bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-700 dark:border-emerald-400 shadow-md ring-2 ring-emerald-400/40 scale-105'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
                  }`}
                  title={yr.label}
                >
                  {yr.id === 'ALL' ? yr.id : yr.id}
                  <span className="ml-1.5 opacity-60 font-normal hidden lg:inline">
                    • {yr.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Announcements Feed Section */}
      <div id="notices">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-college-textDark dark:text-white flex items-center gap-2">
            <span>{showBookmarksOnly ? 'Saved Announcements' : 'Latest Notices'}</span>
            {selectedCourse !== 'ALL' && !showBookmarksOnly && (
              <span className="text-xs bg-college-navy dark:bg-slate-700 text-college-gold dark:text-amber-300 px-2.5 py-0.5 rounded-full font-sans border border-college-gold/30">
                {selectedCourse}
              </span>
            )}
            {showBookmarksOnly && (
              <span className="text-xs bg-amber-500 text-white px-2.5 py-0.5 rounded-full font-sans">
                Bookmarked
              </span>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
              Showing {displayedAnnouncements.length} {displayedAnnouncements.length === 1 ? 'announcement' : 'announcements'}
            </span>

            {/* View Mode Toggle Switch */}
            <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl border border-slate-200 dark:border-slate-600">
              <button
                type="button"
                onClick={() => setViewMode('FEED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'FEED'
                    ? 'bg-white dark:bg-slate-800 text-college-navy dark:text-college-gold shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Feed View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('CALENDAR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'CALENDAR'
                    ? 'bg-white dark:bg-slate-800 text-college-navy dark:text-college-gold shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Skeleton Loading State */}
        {isLoading && <SkeletonGrid count={6} />}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-center text-rose-700 dark:text-rose-300 max-w-md mx-auto my-8">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-600 dark:text-rose-400" />
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={fetchAnnouncementsList}
              className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && displayedAnnouncements.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center max-w-lg mx-auto my-8 transition-colors">
            <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">
              {showBookmarksOnly ? 'No Saved Announcements Yet' : 'No Announcements Found'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              {showBookmarksOnly
                ? 'Click the bookmark icon on any notice card to save it here for quick access later.'
                : 'There are currently no active announcements matching your selected course filter or search query.'}
            </p>
          </div>
        )}

        {/* Calendar View vs Feed Grid */}
        {viewMode === 'CALENDAR' ? (
          <CalendarView
            announcements={displayedAnnouncements}
            onSelectAnnouncement={(ann) => {
              // Smooth scroll to card when switched back to feed
              setViewMode('FEED');
              setTimeout(() => {
                const el = document.getElementById(`announcement-${ann._id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 150);
            }}
          />
        ) : (
          /* Announcement Grid */
          !isLoading && !error && displayedAnnouncements.length > 0 && (
            <div className="columns-1 md:columns-2 gap-6 [column-fill:_balance] w-full">
              {displayedAnnouncements.map((item) => (
                <div key={item._id} id={`announcement-${item._id}`} className="break-inside-avoid mb-6">
                  <AnnouncementCard
                    announcement={item}
                    onBookmarkToggle={handleBookmarkToggleInCard}
                  />
                </div>
              ))}
            </div>
          )
        )}
      </div>
      {/* Push Notifications Subscription Panel (Footer Part) */}
      {isSubscribed ? (
        justSubscribed ? (
          <div className="mt-8 mb-6 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/20 dark:to-teal-950/20 backdrop-blur-md rounded-2xl border border-emerald-250 dark:border-emerald-900/30 p-5 shadow-sm transition-all duration-300">
            <div className="flex items-center space-x-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-slate-850 dark:text-emerald-100 text-sm sm:text-base">
                  Subscribed Successfully!
                </h3>
                <p className="text-xs text-slate-655 dark:text-slate-300 leading-relaxed mt-0.5 font-bold">
                  You'll Receive Regular updates for the <span className="text-emerald-650 dark:text-emerald-400 font-extrabold">{savedNotifyCourse} ({savedNotifyYear === 'FY' ? 'First Year' : savedNotifyYear === 'SY' ? 'Second Year' : 'Third Year'})</span> department.
                </p>
              </div>
            </div>
          </div>
        ) : null
      ) : (
        <div className="mt-8 mb-6 bg-gradient-to-br from-white/90 to-slate-50/90 dark:from-slate-800/90 dark:to-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm transition-all duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3 w-full">
              <div className="p-2.5 rounded-xl bg-emerald-105 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-455 shrink-0">
                <BellRing className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-extrabold text-slate-850 dark:text-white text-sm sm:text-base">
                  Never Miss a College Notice
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                  Get notified instantly when new notices are published for your year and course.
                </p>

                {/* Inline Selection Dropdowns */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-350">Alerts for:</span>
                  <select
                    value={notifyCourse}
                    onChange={(e) => setNotifyCourse(e.target.value)}
                    disabled={isSubmittingPush}
                    className="px-2 py-1 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {(courses.length > 0 ? courses : [
                      { code: 'BCOM' }, { code: 'BAF' }, { code: 'BBI' }, { code: 'BFM' },
                      { code: 'BMS' }, { code: 'BSCIT' }, { code: 'BMM' }, { code: 'BA' }, { code: 'BSC' }
                    ]).map((c) => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>

                  <select
                    value={notifyYear}
                    onChange={(e) => setNotifyYear(e.target.value)}
                    disabled={isSubmittingPush}
                    className="px-2 py-1 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="FY">First Year (FY)</option>
                    <option value="SY">Second Year (SY)</option>
                    <option value="TY">Third Year (TY)</option>
                  </select>
                </div>

                {pushStatusMsg && (
                  <div className={`p-2 mt-3 rounded-lg text-xs font-bold border flex items-center gap-1.5 max-w-lg ${
                    pushStatusMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-350 border-emerald-150 dark:border-emerald-900/50'
                      : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-355 border-rose-150 dark:border-rose-900/50'
                  }`}>
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{pushStatusMsg.text}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center shrink-0 w-full md:w-auto">
              <button
                onClick={handleSubscribeToggle}
                disabled={isSubmittingPush}
                className="w-full md:w-auto px-5 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm"
              >
                {isSubmittingPush ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Enable Alerts</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Back to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-50 p-3 rounded-full bg-college-navy dark:bg-college-gold text-college-gold dark:text-college-navy shadow-lg shadow-college-navy/30 dark:shadow-college-gold/20 border border-college-gold/30 dark:border-college-navy/30 transition-all duration-300 hover:scale-110 active:scale-95 ${
          showBackToTop ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <ArrowUp className="w-4 h-4" />
      </button>
    </div>
  );
};
export default PublicFeed;
