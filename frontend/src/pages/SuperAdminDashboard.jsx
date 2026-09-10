import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  Clock,
  LogOut,
  FileText,
  Tag,
  ExternalLink,
  BookOpen,
  Save,
  Check,
  XCircle,
  Sparkles,
  Trash2,
  AlertTriangle,
  X,
  Loader2
} from 'lucide-react';
import { getHodList, toggleHodApproval, getAllAnnouncementsAudit, assignHodCourses, deleteHodAccount, getCourses } from '../services/api';

const AVAILABLE_COURSES = ['BCOM', 'BAF', 'BBI', 'BFM', 'BMS', 'BSCIT', 'BMM', 'BA', 'BSC', 'BSCCS', 'MCOM', 'MSCFM'];

export const SuperAdminDashboard = () => {
  const [adminSecret, setAdminSecret] = useState(
    () => sessionStorage.getItem('gsc_admin_secret') || ''
  );
  const [inputSecret, setInputSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [activeTab, setActiveTab] = useState('hods'); // 'hods' | 'announcements'

  const [hods, setHods] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [savingCoursesId, setSavingCoursesId] = useState(null);
  const [editingHodCourses, setEditingHodCourses] = useState({}); // { [userId]: string[] }
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null); // hod to delete
  const [deleteNoticesWithUser, setDeleteNoticesWithUser] = useState(true);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  const fetchDashboardData = async (secret) => {
    setIsLoading(true);
    setError(null);
    try {
      const [hodRes, annRes] = await Promise.all([
        getHodList(secret),
        getAllAnnouncementsAudit(secret),
      ]);

      if (hodRes.success) {
        setHods(hodRes.data);
        // Initialize editing state for course permissions
        const courseMap = {};
        hodRes.data.forEach((h) => {
          courseMap[h.id] = Array.isArray(h.allowedCourses) ? h.allowedCourses : ['*'];
        });
        setEditingHodCourses(courseMap);
      }
      if (annRes.success) {
        setAnnouncements(annRes.data);
      }

      setIsAuthenticated(true);
      sessionStorage.setItem('gsc_admin_secret', secret);
    } catch (err) {
      console.error('[Super Admin Fetch Error]:', err);
      const msg = err.response?.data?.error || err.message;
      setError(typeof msg === 'string' ? msg : 'Authentication failed: Invalid Admin Secret key.');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (adminSecret) {
      fetchDashboardData(adminSecret);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!inputSecret.trim()) return;
    setAdminSecret(inputSecret.trim());
    fetchDashboardData(inputSecret.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem('gsc_admin_secret');
    setAdminSecret('');
    setIsAuthenticated(false);
    setHods([]);
    setAnnouncements([]);
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleApprovalToggle = async (userId, targetStatus) => {
    setActionLoadingId(userId);
    try {
      const res = await toggleHodApproval(userId, targetStatus, adminSecret);
      if (res.success) {
        showToast(targetStatus ? 'HOD Account APPROVED successfully!' : 'HOD Account access REVOKED.');
        setHods((prev) =>
          prev.map((h) => (h.id === userId ? { ...h, isApproved: targetStatus } : h))
        );
      }
    } catch (err) {
      console.error('[Approval Error]:', err);
      const msg = err.response?.data?.error || err.message;
      setError(typeof msg === 'string' ? msg : 'Failed to update approval status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleCoursePermission = async (userId, courseCode) => {
    setSavingCoursesId(userId);
    try {
      const current = editingHodCourses[userId] || hods.find((h) => h.id === userId)?.allowedCourses || ['*'];
      let updated;

      if (courseCode === '*') {
        updated = current.includes('*') ? [] : ['*'];
      } else if (current.includes('*')) {
        // If switching from "All Courses" (*), select only the target course
        updated = [courseCode];
      } else if (current.includes(courseCode)) {
        // Deselect target course
        updated = current.filter((c) => c !== courseCode);
      } else {
        // Add target course to existing selection list
        updated = [...current, courseCode];
      }

      if (updated.length === 0) {
        updated = ['*'];
      }

      setEditingHodCourses((prev) => ({ ...prev, [userId]: updated }));

      const res = await assignHodCourses(userId, updated, adminSecret);
      if (res.success) {
        const displayList = res.allowedCourses.includes('*') ? 'All Courses' : res.allowedCourses.join(', ');
        showToast(`Course permissions updated to: ${displayList}`);
        setHods((prev) =>
          prev.map((h) => (h.id === userId ? { ...h, allowedCourses: res.allowedCourses } : h))
        );
      }
    } catch (err) {
      console.error('[Course Permission Save Error]:', err);
      const msg = err.response?.data?.error || err.message;
      setError(typeof msg === 'string' ? msg : 'Failed to update course permissions.');
    } finally {
      setSavingCoursesId(null);
    }
  };

  const handleSaveCourses = async (userId) => {
    setSavingCoursesId(userId);
    try {
      const allowedCourses = editingHodCourses[userId] || hods.find((h) => h.id === userId)?.allowedCourses || ['*'];
      const res = await assignHodCourses(userId, allowedCourses, adminSecret);
      if (res.success) {
        const displayList = res.allowedCourses.includes('*') ? 'All Courses' : res.allowedCourses.join(', ');
        showToast(`Departmental course permissions saved: ${displayList}`);
        setHods((prev) =>
          prev.map((h) => (h.id === userId ? { ...h, allowedCourses: res.allowedCourses } : h))
        );
      }
    } catch (err) {
      console.error('[Course Permission Save Error]:', err);
      const msg = err.response?.data?.error || err.message;
      setError(typeof msg === 'string' ? msg : 'Failed to update course permissions.');
    } finally {
      setSavingCoursesId(null);
    }
  };

  const handleDeleteHod = async () => {
    if (!deleteConfirmUser) return;
    setIsDeletingUser(true);
    try {
      const res = await deleteHodAccount(deleteConfirmUser.id, adminSecret, deleteNoticesWithUser);
      if (res.success) {
        showToast(res.message || `Account for ${deleteConfirmUser.fullName} permanently deleted.`);
        setHods((prev) => prev.filter((h) => h.id !== deleteConfirmUser.id));
        if (deleteNoticesWithUser) {
          setAnnouncements((prev) => prev.filter((a) => a.postedBy !== deleteConfirmUser.id));
        }
        setDeleteConfirmUser(null);
      }
    } catch (err) {
      console.error('[Delete HOD Error]:', err);
      const msg = err.response?.data?.error || err.message;
      setError(typeof msg === 'string' ? msg : 'Failed to delete account.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const totalHodCount = hods.length;
  const approvedHodCount = hods.filter((h) => h.isApproved).length;
  const pendingHodCount = totalHodCount - approvedHodCount;

  // Secret Prompt Dialog if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 max-w-md w-full transition-colors duration-300 relative overflow-hidden">
          {/* Subtle Reactbits style glowing background blur */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-400/20 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center mb-6 relative z-10">
            <div className="w-16 h-16 bg-college-navy dark:bg-slate-900 text-college-gold rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg border border-college-gold/40 transform hover:scale-105 transition-transform">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <h1 className="text-xl font-heading font-extrabold text-college-navy dark:text-white">
              Super Admin Authentication
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter Master Admin Secret to access HOD Governance & Notice Auditing
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300 font-semibold mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Admin Secret Key *
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={inputSecret}
                  onChange={(e) => setInputSecret(e.target.value)}
                  placeholder="Enter ADMIN_SECRET..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-college-gold text-sm transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-college-navy hover:bg-college-navyLight dark:bg-college-gold dark:hover:bg-college-goldHover text-college-gold dark:text-college-navy font-extrabold rounded-xl text-xs transition-all shadow-md flex items-center justify-center space-x-2 active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Unlock Admin Portal</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full transition-colors duration-300">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 dark:bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl border border-emerald-400 text-xs font-bold flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden transition-colors duration-300">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>Super-Admin Control Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-college-navy dark:text-white">
            HOD Permissions & College Notice Audit
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review HOD sign-ups, map departmental course permissions, and audit notice activity across all streams.
          </p>
        </div>

        <div className="flex items-center space-x-3 relative z-10">
          <button
            onClick={() => fetchDashboardData(adminSecret)}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-sm"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold rounded-xl text-xs transition-colors flex items-center space-x-1.5 shadow-sm"
            title="Lock Panel"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock Dashboard</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-6 border-b border-slate-200 dark:border-slate-700 pb-3">
        <button
          onClick={() => setActiveTab('hods')}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'hods'
              ? 'bg-college-navy dark:bg-slate-700 text-college-gold dark:text-amber-300 shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>HOD Accounts & Permissions ({totalHodCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'announcements'
              ? 'bg-college-navy dark:bg-slate-700 text-college-gold dark:text-amber-300 shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Notice Audit Feed ({announcements.length})</span>
        </button>
      </div>

      {/* TAB 1: HOD Approvals & Permission Mapping */}
      {activeTab === 'hods' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4 transition-colors">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalHodCount}</div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Registered HODs
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/10 dark:bg-emerald-950/10 shadow-sm flex items-center space-x-4 transition-colors">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">{approvedHodCount}</div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Approved HODs
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-amber-200 dark:border-amber-800/50 bg-amber-50/10 dark:bg-amber-950/10 shadow-sm flex items-center space-x-4 transition-colors">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-400">{pendingHodCount}</div>
                <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Pending Approvals
                </div>
              </div>
            </div>
          </div>

          {/* HOD Table with Department Permission Mapping */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-slate-800 dark:text-white text-sm">
                  HOD Accounts & Departmental Permissions
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select allowed courses per HOD to enforce posting boundaries.
                </p>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Clerk User Sync</span>
            </div>

            {isLoading ? (
              <div className="py-16 text-center">
                <div className="w-10 h-10 border-4 border-college-navy dark:border-college-gold border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading HOD accounts...</p>
              </div>
            ) : hods.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                No HOD accounts registered in Clerk yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3.5 px-6">HOD Profile</th>
                      <th className="py-3.5 px-6">Approval Status</th>
                      <th className="py-3.5 px-6">Assigned Department / Courses</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                    {hods.map((hod) => {
                      const regDate = hod.createdAt ? new Date(hod.createdAt).toLocaleDateString('en-IN') : 'N/A';
                      const isProcessing = actionLoadingId === hod.id;
                      const isSavingCourses = savingCoursesId === hod.id;
                      const currentAssigned = editingHodCourses[hod.id] || hod.allowedCourses || ['*'];
                      const isFullAccess = currentAssigned.includes('*');

                      return (
                        <tr key={hod.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors">
                          {/* Profile */}
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-3">
                              {hod.imageUrl ? (
                                <img src={hod.imageUrl} alt="" className="w-9 h-9 rounded-full border border-slate-300 dark:border-slate-600" />
                              ) : (
                                <div className="w-9 h-9 bg-college-navy dark:bg-slate-900 text-college-gold font-bold rounded-full flex items-center justify-center text-xs shadow-sm">
                                  {hod.fullName.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">{hod.fullName}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 break-all">{hod.email}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 break-all">ID: {hod.id}</div>
                              </div>
                            </div>
                          </td>

                          {/* Approval Status */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            {hod.isApproved ? (
                              <span className="inline-flex items-center space-x-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approved</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full text-[11px] font-bold border border-amber-200 dark:border-amber-800">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Pending Approval</span>
                              </span>
                            )}
                          </td>

                          {/* Department / Course Permission Mapping */}
                          <td className="py-4 px-6 min-w-[280px]">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => toggleCoursePermission(hod.id, '*')}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all border ${
                                    isFullAccess
                                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                                  }`}
                                >
                                  ✨ All Courses
                                </button>
                                {AVAILABLE_COURSES.map((code) => {
                                  const isSelected = !isFullAccess && currentAssigned.includes(code);
                                  return (
                                    <button
                                      key={code}
                                      type="button"
                                      onClick={() => toggleCoursePermission(hod.id, code)}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all border ${
                                        isSelected
                                          ? 'bg-college-navy dark:bg-college-gold text-college-gold dark:text-college-navy border-college-navy dark:border-college-gold shadow-sm'
                                          : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-400'
                                      }`}
                                    >
                                      {code}
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleSaveCourses(hod.id)}
                                  disabled={isSavingCourses}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition-all flex items-center space-x-1 shadow-sm disabled:opacity-50"
                                >
                                  {isSavingCourses ? (
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <>
                                      <Save className="w-3 h-3" />
                                      <span>Save Permissions</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Actions: Approve/Suspend and Delete */}
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-2">
                              {hod.isApproved ? (
                                <button
                                  onClick={() => handleApprovalToggle(hod.id, false)}
                                  disabled={isProcessing}
                                  className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-xl font-bold text-[11px] transition-colors border border-amber-200 dark:border-amber-800"
                                >
                                  {isProcessing ? 'Suspending...' : 'Suspend / Revoke'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleApprovalToggle(hod.id, true)}
                                  disabled={isProcessing}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-xl font-bold text-[11px] transition-all shadow-md flex items-center space-x-1"
                                >
                                  {isProcessing ? (
                                    <span>Approving...</span>
                                  ) : (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>1-Click Approve</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Delete Fake/Unauthorized Account Button */}
                              <button
                                onClick={() => setDeleteConfirmUser(hod)}
                                disabled={isProcessing || isDeletingUser}
                                title="Permanently delete fake or unauthorized account from Clerk"
                                className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 text-rose-700 dark:text-rose-300 rounded-xl font-bold text-[11px] transition-all border border-rose-200 dark:border-rose-800 flex items-center space-x-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: All Announcements & Author Audit Log */}
      {activeTab === 'announcements' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
            <div>
              <h2 className="font-heading font-bold text-slate-800 dark:text-white text-sm">
                College Announcements Master Audit Log ({announcements.length})
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Track all notices posted across departments with author verification.
              </p>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Audit Feed</span>
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <div className="w-10 h-10 border-4 border-college-navy dark:border-college-gold border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading master announcement logs...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
              No announcements posted in the database yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3.5 px-6">Notice Title</th>
                    <th className="py-3.5 px-6">Target Course(s)</th>
                    <th className="py-3.5 px-6">Posted By (Author HOD)</th>
                    <th className="py-3.5 px-6">Posted On</th>
                    <th className="py-3.5 px-6">Attachment</th>
                    <th className="py-3.5 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                  {announcements.map((ann) => {
                    const postDate = new Date(ann.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    const matchedHod = hods.find((h) => h.id === ann.postedBy);
                    const authorName = ann.postedByName !== 'HOD' ? ann.postedByName : matchedHod?.fullName || 'HOD';
                    const authorEmail = ann.postedByEmail || matchedHod?.email || ann.postedBy;

                    return (
                      <tr key={ann._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="py-4 px-6 max-w-xs">
                          <div className="font-bold text-slate-900 dark:text-white truncate" title={ann.title}>
                            {ann.title}
                          </div>
                          {ann.isPinned && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                              Pinned
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1">
                            {ann.courseCodes?.map((code) => (
                              <span
                                key={code}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-college-navy/10 dark:bg-slate-700 text-college-navy dark:text-college-gold border border-college-navy/20 dark:border-slate-600 flex items-center gap-0.5"
                              >
                                <Tag className="w-2.5 h-2.5" />
                                {code}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{authorName}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono break-all">{authorEmail}</div>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                          {postDate}
                        </td>

                        <td className="py-4 px-6">
                          {ann.attachmentUrl ? (
                            <a
                              href={ann.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline font-bold text-[11px]"
                            >
                              <span>View File</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 italic">None</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              ann.status === 'PUBLISHED'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {ann.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Delete Fake/Unauthorized Account Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md border border-rose-200 dark:border-rose-900/60 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-rose-50 dark:bg-rose-950/40 px-6 py-4 border-b border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-600 text-white shadow-sm">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-rose-950 dark:text-rose-200">
                    Delete User Account
                  </h3>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                    Permanent Clerk Account Removal
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isDeletingUser && setDeleteConfirmUser(null)}
                disabled={isDeletingUser}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete this account? This will remove the user from Clerk and they will no longer be able to log in.
              </p>

              {/* Target User Info Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center space-x-3">
                {deleteConfirmUser.imageUrl ? (
                  <img src={deleteConfirmUser.imageUrl} alt="" className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-college-navy dark:bg-slate-900 text-college-gold font-bold rounded-full flex items-center justify-center text-sm shadow-sm shrink-0">
                    {deleteConfirmUser.fullName?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {deleteConfirmUser.fullName}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {deleteConfirmUser.email}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                    ID: {deleteConfirmUser.id}
                  </div>
                </div>
              </div>

              {/* Dangerous warning */}
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/40 text-[11px] text-rose-800 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Irreversible:</strong> This will completely delete the user from Clerk. If this is a fake or spam registration, deleting prevents any unauthorized access.
                </span>
              </div>

              {/* Option to delete notices */}
              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={deleteNoticesWithUser}
                  onChange={(e) => setDeleteNoticesWithUser(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                />
                <span>Also delete all announcements posted by this user from the portal</span>
              </label>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                disabled={isDeletingUser}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteHod}
                disabled={isDeletingUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingUser ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
