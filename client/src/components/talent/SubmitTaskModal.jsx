import { useState } from 'react';
import { submitTask } from '../../api/submissions';
import Spinner from '../Spinner';

const MAX_FILES = 10;

const fmtSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const SubmitTaskModal = ({ task, onClose, onSubmitted }) => {
  const [files, setFiles]   = useState([]);
  const [notes, setNotes]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]   = useState('');

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList);
    setError('');
    setFiles((prev) => {
      // Merge, de-duplicating by name+size, and cap at MAX_FILES.
      const merged = [...prev];
      for (const f of incoming) {
        if (!merged.some((e) => e.name === f.name && e.size === f.size)) merged.push(f);
      }
      if (merged.length > MAX_FILES) {
        setError(`You can attach at most ${MAX_FILES} files.`);
        return merged.slice(0, MAX_FILES);
      }
      return merged;
    });
  };

  const handleFileChange = (e) => {
    addFiles(e.target.files);
    e.target.value = ''; // allow re-selecting the same file after removal
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('notes', notes);
    try {
      await submitTask(task._id, formData);
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-[200] p-6"
      onClick={submitting ? undefined : onClose}>
      <div className="bg-bg-card border border-border rounded-xl w-full max-w-lg shadow-[var(--rt-shadow-modal)] animate-modal-in"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="text-[17px] font-semibold text-text-primary">Submit Task</h2>
          <button onClick={onClose} disabled={submitting}
            className="bg-transparent border-none text-text-muted text-base cursor-pointer px-2 py-1 rounded-md hover:bg-bg-hover hover:text-text-primary transition-all">✕</button>
        </div>

        {/* Task info strip */}
        <div className="px-6 py-3.5 bg-bg-surface border-b border-border">
          <p className="text-[14px] font-semibold text-text-primary">{task.title || 'Untitled Task'}</p>
          {task.dueDate && (
            <p className="text-[12px] text-text-faint mt-0.5">Due: {task.dueDate}</p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

          {/* File upload (multiple — #21) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-muted">
              Upload Files <span className="text-text-faint normal-case tracking-normal">(up to {MAX_FILES})</span>
            </label>

            <input id="sub-file" type="file" multiple onChange={handleFileChange} className="file-input-hidden" disabled={submitting} />
            <label htmlFor="sub-file"
              className="flex flex-col items-center justify-center gap-2 py-6 px-4 bg-bg-input border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                <path d="M12 16V4M7 9l5-5 5 5" />
                <path d="M4 20h16" />
              </svg>
              <span className="text-[13px] text-text-muted">
                {files.length ? 'Add more files' : 'Click to choose one or more files'}
              </span>
            </label>

            {/* Selected files list */}
            {files.length > 0 && (
              <ul className="flex flex-col gap-1.5 mt-1">
                {files.map((file, i) => (
                  <li key={`${file.name}-${file.size}-${i}`}
                    className="flex items-center gap-2.5 bg-bg-input border border-border rounded-lg px-3 py-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                      strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    <span className="text-[13px] text-text-primary truncate flex-1">{file.name}</span>
                    <span className="text-[11px] text-text-faint shrink-0">{fmtSize(file.size)}</span>
                    <button type="button" onClick={() => removeFile(i)} disabled={submitting}
                      title="Remove file"
                      className="text-text-faint hover:text-danger transition-colors text-sm px-1 cursor-pointer shrink-0">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-muted">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} disabled={submitting}
              placeholder="Describe what you've done, include any relevant links..."
              className="w-full bg-bg-input border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-primary focus:ring-[3px] focus:ring-primary/15 transition-all font-sans resize-y" />
          </div>

          {error && (
            <p className="text-[13px] text-danger bg-danger/10 border border-danger/25 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2.5 pt-1 border-t border-border mt-1">
            <button type="button" onClick={onClose} disabled={submitting}
              className="px-5 py-2.5 bg-bg-input text-text-muted border border-border rounded-lg text-sm font-medium cursor-pointer hover:bg-bg-hover hover:text-text-primary transition-all font-sans">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer btn-gradient border-none font-sans flex items-center justify-center gap-2 min-w-[130px]">
              {submitting ? (<><Spinner size={15} /> Submitting...</>) : 'Submit Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitTaskModal;
