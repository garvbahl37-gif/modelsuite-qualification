import { useState } from 'react';
import { reviewSubmission } from '../../api/submissions';
import Spinner from '../Spinner';

const REVIEW_STATUS_CLASS = {
  Pending:  'status-badge-Submitted',
  Approved: 'status-badge-Approved',
  Rejected: 'status-badge-Rejected',
};

const IconFile = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0" aria-hidden="true">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

const SubmissionReviewModal = ({ submission, onClose, onReviewed }) => {
  // Track which decision (if any) is in flight so both buttons lock (#16).
  const [pending, setPending] = useState(null);

  const handleReview = async (status) => {
    if (pending) return;
    setPending(status);
    try {
      await reviewSubmission(submission._id, status);
      onReviewed();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Review action failed');
      setPending(null);
    }
  };

  const task   = submission.taskId   || {};
  const talent = submission.talentId || {};

  // #21 — a submission can carry multiple files. Fall back to the legacy single
  // fileUrl for records created before multi-file support.
  const fileUrls = (submission.fileUrls && submission.fileUrls.length)
    ? submission.fileUrls
    : (submission.fileUrl ? [submission.fileUrl] : []);

  const fileName = (url) => {
    try { return decodeURIComponent(url.split('/').pop()); } catch { return url; }
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-[200] p-6"
      onClick={pending ? undefined : onClose}>
      <div className="bg-bg-card border border-border rounded-xl w-full max-w-lg shadow-[var(--rt-shadow-modal)] animate-modal-in"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="text-[17px] font-semibold text-text-primary">Review Submission</h2>
          <button onClick={onClose} disabled={!!pending}
            className="bg-transparent border-none text-text-muted text-base cursor-pointer px-2 py-1 rounded-md hover:bg-bg-hover hover:text-text-primary transition-all">
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">

          {/* Task info */}
          <div className="bg-bg-surface rounded-lg px-4 py-3.5 border border-border">
            <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-faint mb-1.5">Task</p>
            <p className="text-[15px] font-semibold text-text-primary">{task.title || '—'}</p>
            <div className="flex items-center gap-3 mt-2">
              {task.dueDate && (
                <span className="text-[12px] text-text-faint">Due: {task.dueDate}</span>
              )}
              {typeof submission.attempt === 'number' && (
                <span className="text-[12px] text-text-faint">Attempt #{submission.attempt}</span>
              )}
              {task.status && (
                <span className={`inline-block px-2 py-[2px] rounded-full text-[11px] font-medium status-badge-${task.status}`}>
                  {task.status}
                </span>
              )}
            </div>
          </div>

          {/* Talent info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full avatar-talent flex items-center justify-center text-[13px] font-bold text-white shrink-0">
              {talent.name?.[0] ?? 'T'}
            </div>
            <div>
              <p className="text-[14px] font-medium text-text-primary">{talent.name || 'Unknown Talent'}</p>
              <p className="text-[12px] text-text-faint">{talent.email || '—'}</p>
            </div>
            <div className="ml-auto">
              <span className={`inline-block px-2.5 py-[3px] rounded-full text-[11px] font-semibold ${REVIEW_STATUS_CLASS[submission.reviewStatus] || 'status-badge-Submitted'}`}>
                {submission.reviewStatus || 'Pending'}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-faint mb-2">Notes</p>
            {submission.notes ? (
              <p className="text-[14px] text-text-muted leading-relaxed bg-bg-surface rounded-lg px-4 py-3 border border-border">
                {submission.notes}
              </p>
            ) : (
              <p className="text-[13px] text-text-faint italic">No notes provided.</p>
            )}
          </div>

          {/* Files (#21) */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-faint mb-2">
              Submitted Files {fileUrls.length > 0 && <span className="text-text-muted">({fileUrls.length})</span>}
            </p>
            {fileUrls.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {fileUrls.map((url, i) => (
                  <li key={i}>
                    <a href={url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2.5 bg-bg-surface border border-border rounded-lg px-3 py-2 text-[13px] text-primary font-medium hover:border-primary/40 transition-colors">
                      <IconFile />
                      <span className="underline underline-offset-2 truncate flex-1">{fileName(url)}</span>
                      <span className="text-text-faint text-[11px] shrink-0">open ↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-text-faint italic">No files attached.</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-1 border-t border-border mt-1">
            <button onClick={onClose} disabled={!!pending}
              className="flex-1 py-2.5 bg-bg-input text-text-muted border border-border rounded-lg text-sm font-medium cursor-pointer hover:bg-bg-hover hover:text-text-primary transition-all font-sans">
              Cancel
            </button>
            <button onClick={() => handleReview('Rejected')} disabled={!!pending}
              className="flex-1 py-2.5 bg-danger/10 text-danger border border-danger/30 rounded-lg text-sm font-semibold cursor-pointer hover:bg-danger/20 transition-all font-sans flex items-center justify-center gap-2">
              {pending === 'Rejected' ? (<><Spinner size={14} /> Rejecting...</>) : 'Reject'}
            </button>
            <button onClick={() => handleReview('Approved')} disabled={!!pending}
              className="flex-1 py-2.5 bg-success/10 text-success border border-success/30 rounded-lg text-sm font-semibold cursor-pointer hover:bg-success/20 transition-all font-sans flex items-center justify-center gap-2">
              {pending === 'Approved' ? (<><Spinner size={14} /> Approving...</>) : 'Approve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionReviewModal;
