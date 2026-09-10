import React from 'react';
import { X, Download, FileText, ExternalLink, Maximize2 } from 'lucide-react';

export const FileViewerModal = ({ isOpen, onClose, fileUrl, filename }) => {
  if (!isOpen || !fileUrl) return null;

  const ext = (filename || fileUrl.split('/').pop() || '').split('.').pop().toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  const isPdf = ext === 'pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-college-navy text-white px-5 py-3.5 flex items-center justify-between shrink-0 border-b border-college-navyLight">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <FileText className="w-5 h-5 text-college-gold shrink-0" />
            <span className="font-heading font-bold text-sm truncate max-w-md" title={filename || 'Document Preview'}>
              {filename || 'Attachment Document Preview'}
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
              title="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open New Tab</span>
            </a>

            <a
              href={fileUrl}
              download={filename || 'document'}
              className="px-3 py-1.5 bg-college-gold hover:bg-amber-400 text-college-navy font-bold rounded-lg text-xs transition-colors flex items-center space-x-1 shadow-sm"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 text-slate-300 hover:text-white rounded-lg transition-colors ml-2"
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer Content */}
        <div className="flex-1 bg-slate-100 relative overflow-auto flex items-center justify-center p-4">
          {isPdf ? (
            <iframe
              src={fileUrl}
              title={filename || 'PDF Preview'}
              className="w-full h-full rounded-xl border border-slate-300 shadow-inner bg-white"
            />
          ) : isImage ? (
            <div className="max-w-full max-h-full flex items-center justify-center">
              <img
                src={fileUrl}
                alt={filename || 'Document Attachment'}
                className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-md border border-slate-200"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200 max-w-md">
              <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-base font-bold text-slate-800 mb-1">Inline Preview Unavailable</h3>
              <p className="text-xs text-slate-500 mb-6">
                This document format (<strong>.{ext}</strong>) cannot be rendered inline. Click below to download or view it externally.
              </p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-college-navy text-college-gold font-bold text-xs rounded-xl shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Download Attachment</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileViewerModal;
