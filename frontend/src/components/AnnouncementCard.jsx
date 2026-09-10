import React, { useState, useEffect } from 'react';
import { Pin, Calendar, FileText, Download, Edit3, Trash2, Tag, AlertCircle, AlertTriangle, Bookmark, ExternalLink, Bell, Clock, User, Building2, ChevronDown, ChevronUp, Share2 } from 'lucide-react';
import { isBookmarked as checkIsBookmarked, toggleBookmark } from '../utils/bookmarks';
import { TiltedCard } from './reactbits/TiltedCard';
import { MagneticButton } from './reactbits/MagneticButton';

export const AnnouncementCard = ({ announcement, isAdminView = false, onEdit, onDelete, onBookmarkToggle }) => {
  const {
    _id,
    title,
    content,
    courseCodes = [],
    isPinned,
    isEmergency = announcement.isEmergency,
    eventDate = announcement.eventDate,
    attachmentUrl,
    expiresAt,
    createdAt,
    postedByName,
    postedByEmail,
  } = announcement;

  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setSaved(checkIsBookmarked(_id));
  }, [_id]);

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    const newState = toggleBookmark(_id);
    setSaved(newState);
    if (onBookmarkToggle) {
      onBookmarkToggle(_id, newState);
    }
  };

  // Format date strings
  const createdDate = new Date(createdAt);
  const formattedDate = createdDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = createdDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const isExpired = expiresAt && new Date(expiresAt) < new Date();
  const formattedExpires = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    : null;

  const isEvent = announcement.type === 'EVENT';
  const isTimetable = announcement.type === 'TIMETABLE';
  const authorName = postedByName || 'HOD';

  let nearestUpcomingIdx = -1;
  let sortedTimetable = [];
  if (isTimetable && announcement.timetableEntries) {
    const today = new Date();
    today.setHours(0,0,0,0);
    sortedTimetable = [...announcement.timetableEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
    nearestUpcomingIdx = sortedTimetable.findIndex(e => new Date(e.date) >= today);
  }

  // Check if attachment is an image
  const isImageAttachment = attachmentUrl && /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(attachmentUrl);

  // Auto-linkify: convert raw URLs in HTML content to clickable <a> tags
  const autoLinkify = (html) => {
    if (!html) return html;
    // Match URLs that are NOT already inside an href="..." or <a> tag
    return html.replace(
      /(?<!="|'>)(https?:\/\/[^\s<"']+)/gi,
      (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-sky-600 dark:text-sky-400 underline underline-offset-2 break-all hover:text-sky-800 dark:hover:text-sky-300 font-semibold">${url}</a>`
    );
  };
  const processedContent = autoLinkify(content);

  return (
    <TiltedCard maxTilt={8} scale={1.01} className="h-full">
      <div
        className={`group bg-white dark:bg-slate-800 rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full relative ${
          isEmergency
            ? 'border-rose-500 dark:border-rose-600 shadow-rose-500/10 ring-2 ring-rose-500/30'
            : isPinned
            ? 'border-amber-400 dark:border-amber-500 shadow-amber-500/10'
            : isEvent
            ? 'border-amber-200 dark:border-amber-900/60'
            : 'border-slate-200 dark:border-slate-700'
        } ${announcement.status === 'DRAFT' ? 'opacity-80 border-dashed' : ''}`}
      >
      {/* ── Top Bar: College Branding + Type Badge ── */}
      <div className={`px-5 py-3 flex items-center justify-between ${
        isEmergency
          ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700'
          : isEvent
          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
          : 'bg-gradient-to-r from-college-navy to-slate-800'
      }`}>
        {/* <div className="flex items-center space-x-2.5">
          <div className={`p-1.5 rounded-lg ${isEvent ? 'bg-white/20' : 'bg-white/10'}`}>
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-heading font-bold text-xs sm:text-sm leading-tight tracking-tight">
              Ghanshyamdas Saraf College
            </p>
            <p className="text-white/70 text-[10px] font-semibold uppercase tracking-wider">
              {isEvent ? 'College Event' : 'Officil Notice'}
            </p>
          </div>
        </div> */}

        <div className="flex items-center space-x-2">
          {/* Type Badge */}
          {isEmergency ? (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-white text-rose-700 flex items-center gap-1 shadow-sm animate-pulse">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              EMERGENCY ALERT
            </span>
          ) : isEvent ? (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-white/20 text-white border border-white/30 flex items-center gap-1 backdrop-blur-sm">
              <Calendar className="w-3 h-3" />
              EVENT
            </span>
          ) : isTimetable ? (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-white/20 text-white border border-white/30 flex items-center gap-1 backdrop-blur-sm">
              <Clock className="w-3 h-3" />
              EXAM TIMETABLE
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-white/20 text-white border border-white/30 flex items-center gap-1 backdrop-blur-sm">
              <Bell className="w-3 h-3" />
              NOTICE
            </span>
          )}

          {/* Pinned / Draft Ribbon */}
          {isAdminView && announcement.status === 'DRAFT' && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-600 text-white">Draft</span>
          )}
          {isPinned && (!isAdminView || announcement.status !== 'DRAFT') && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-300 text-amber-900 flex items-center gap-0.5">
              <Pin className="w-2.5 h-2.5 fill-current" />
              Pinned
            </span>
          )}
        </div>
      </div>

      {/* ── Poster Image ── */}
      {attachmentUrl && (isImageAttachment || isEvent) && (
        isEvent ? (
          <div className="w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
            <img
              src={attachmentUrl}
              alt={title}
              className={`w-full transition-all duration-300 ${
                expanded
                  ? 'max-h-none object-contain'
                  : 'max-h-72 sm:max-h-80 object-cover object-top'
              }`}
              loading="lazy"
            />
          </div>
        ) : (
          <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={attachmentUrl}
              alt={title}
              className={`w-full bg-slate-100 dark:bg-slate-900 hover:opacity-95 transition-all duration-300 ${
                expanded
                  ? 'max-h-none object-contain'
                  : 'max-h-72 sm:max-h-80 object-cover object-top'
              }`}
              loading="lazy"
            />
          </a>
        )
      )}

      {/* ── Main Content Body ── */}
      <div className="bg-white dark:bg-slate-800 flex-1 flex flex-col">
        {/* Department Tags + Date Row */}
        <div className="px-5 pt-4 pb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5 items-center">
            {courseCodes.map((code, index) => (
              <span
                key={`${code}-${index}`}
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-college-navy/10 dark:bg-slate-700 text-college-navy dark:text-college-gold border border-college-navy/20 dark:border-slate-600 flex items-center gap-1"
              >
                <Tag className="w-3 h-3" />
                {code}
              </span>
            ))}
            {announcement.targetYears && announcement.targetYears.length > 0 && announcement.targetYears.length < 3 && (
              announcement.targetYears.map((yr, index) => (
                <span
                  key={`yr-${yr}-${index}`}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"
                >
                  {yr}
                </span>
              ))
            )}
          </div>

          <div className="flex items-center space-x-3">
            <MagneticButton onClick={handleBookmarkClick}>
              <div
                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold ${
                  saved
                    ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800'
                    : 'text-slate-400 hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                title={saved ? 'Remove from Saved' : 'Bookmark Announcement'}
              >
                <Bookmark className={`w-4 h-4 ${saved ? 'fill-current text-amber-500' : ''}`} />
              </div>
            </MagneticButton>
          </div>
        </div>

        {/* Title */}
        <div className="px-5 pb-2">
          <h3 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white leading-snug group-hover:text-college-navyLight dark:group-hover:text-amber-300 transition-colors">
            {title}
          </h3>
        </div>

        {/* Date / Time Metadata Row */}
        <div className="px-5 pb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            <span className="font-semibold">{formattedDate}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 border-t border-slate-100 dark:border-slate-700/60" />

        {/* Rich HTML Content or Timetable Table */}
        <div className="px-5 pt-3 pb-2">
          {isTimetable && sortedTimetable.length > 0 ? (
            <div className="mt-1 mb-3">
              {/* Universal Clean Table View across all viewports */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shadow-inner">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                      <th className="px-3 py-2.5 whitespace-nowrap">Date</th>
                      <th className="px-3 py-2.5">Subject / Paper</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">Time</th>
                      <th className="px-3 py-2.5 text-right whitespace-nowrap">Room</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                    {sortedTimetable.map((entry, idx) => {
                      const entryDate = new Date(entry.date);
                      const isPast = entryDate < new Date(new Date().setHours(0,0,0,0));
                      const isNearest = idx === nearestUpcomingIdx;
                      
                      return (
                        <tr key={idx} className={`
                          ${isPast ? 'opacity-60 bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors'}
                          ${isNearest ? 'ring-2 ring-inset ring-amber-400 dark:ring-amber-500/50 bg-amber-50/30 dark:bg-amber-900/20' : ''}
                        `}>
                          <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {entryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {isNearest && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 uppercase tracking-wider">Upcoming</span>}
                          </td>
                          <td className="px-3 py-3 text-slate-900 dark:text-white font-bold">{entry.subject}</td>
                          <td className="px-3 py-3 text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap text-right">{entry.time}</td>
                          <td className="px-3 py-3 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap text-right">{entry.room || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <>
              <div
                className={`prose prose-sm text-slate-700 dark:text-slate-300 max-w-none leading-relaxed break-words prose-a:break-all dark:prose-invert prose-headings:font-heading prose-strong:text-slate-900 dark:prose-strong:text-white prose-a:text-sky-600 dark:prose-a:text-sky-400 ${
                  !expanded ? 'line-clamp-6' : ''
                }`}
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />

              {/* Read more / Read less toggle - Only show when plain text is long (over 350 characters) */}
              {(() => {
                const plainText = content ? content.replace(/<[^>]+>/g, '').trim() : '';
                if (plainText.length <= 350) return null;

                return (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200/80 dark:border-sky-800/60 transition-all shadow-xs active:scale-95 cursor-pointer"
                  >
                    {expanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        <span>Read less</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        <span>Read more</span>
                      </>
                    )}
                  </button>
                );
              })()}
            </>
          )}
        </div>

        {/* Non-image Attachment */}
        {attachmentUrl && !isImageAttachment && !isEvent && (
          <div className="px-5 pb-3">
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-xs font-bold bg-college-navy dark:bg-college-gold hover:bg-college-navyLight dark:hover:bg-college-goldHover text-college-gold dark:text-college-navy px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95"
              title="Open document"
            >
              <FileText className="w-4 h-4" />
              <span>View Attached Document</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          </div>
        )}

        {/* Expiration Notice */}
        {formattedExpires && (
          <div className="px-5 pb-3">
            <div
              className={`text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 font-semibold ${
                isExpired
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{isExpired ? `Expired on ${formattedExpires}` : `Expires: ${formattedExpires}`}</span>
            </div>
          </div>
        )}

        {/* ── Footer: Admin Actions (only in admin view) ── */}
        {isAdminView && (
          <div className={`mt-auto px-5 py-3 border-t flex items-center justify-end gap-2 ${
            isEvent
              ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-700/60'
          }`}>
              <button
                onClick={() => onEdit(announcement)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1"
                title="Edit Announcement"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => onDelete(announcement)}
                className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1"
                title="Delete Announcement"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
          </div>
        )}
      </div>
    </div>
  </TiltedCard>
);
};

export default AnnouncementCard;

