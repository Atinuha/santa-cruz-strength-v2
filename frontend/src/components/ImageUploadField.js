import React, { useState, useRef } from 'react';
import { Upload, Link, X, Loader2, ImageIcon, CheckCircle2 } from 'lucide-react';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

/**
 * ImageUploadField
 * Dual-mode image input: paste a URL OR upload a file directly.
 *
 * Props:
 *   value       — current image URL string
 *   onChange    — (url: string) => void
 *   label       — field label (default "Image")
 *   inputClass  — CSS class for the URL input
 *   darkMode    — true = CRM dark theme, false = light theme (default false)
 */
export default function ImageUploadField({ value, onChange, label = 'Image', inputClass = '', darkMode = true }) {
  const [mode, setMode]         = useState('url');   // 'url' | 'upload'
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const token = localStorage.getItem('scs_token');

  const uploadFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Only image files (JPEG, PNG, WebP, GIF) are allowed');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('File too large — max 8MB');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${BACKEND}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      // Build full URL so it works on both preview and production
      const fullUrl = data.url.startsWith('http') ? data.url : `${BACKEND}${data.url}`;
      onChange(fullUrl);
      setMode('url');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const base = darkMode
    ? { bg: 'bg-white/5', border: 'border-white/12', text: 'text-white', muted: 'text-white/45',
        active: 'bg-[#1B7A4A]', activeTxt: 'text-white', inactive: 'text-white/40',
        drop: 'bg-white/5 border-white/15 hover:bg-white/8', dropActive: 'bg-[#1B7A4A]/10 border-[#1B7A4A]/40',
        errBg: 'bg-red-500/10 border-red-500/20', errTxt: 'text-red-400',
        previewBorder: 'border-white/10' }
    : { bg: 'bg-white', border: 'border-[var(--clr-border)]', text: 'text-[var(--clr-text)]',
        muted: 'text-[var(--clr-text-muted)]', active: 'bg-[var(--clr-green)]', activeTxt: 'text-white',
        inactive: 'text-[var(--clr-text-muted)]', drop: 'bg-[var(--clr-bg)] border-[var(--clr-border)] hover:bg-[var(--clr-bg-green)]/50',
        dropActive: 'bg-[var(--clr-bg-green)] border-[var(--clr-green)]/40',
        errBg: 'bg-red-50 border-red-200', errTxt: 'text-red-600',
        previewBorder: 'border-[var(--clr-border)]' };

  return (
    <div>
      {/* Label + mode toggle */}
      <div className="flex items-center justify-between mb-1.5">
        <label className={`text-xs font-semibold uppercase tracking-wider ${base.muted}`}>{label}</label>
        <div className={`flex rounded-lg overflow-hidden border ${base.border} text-[10px] font-bold`}>
          <button type="button" onClick={() => setMode('url')}
            className={`px-2.5 py-1 transition-colors duration-150 ${mode === 'url' ? `${base.active} ${base.activeTxt}` : `${base.bg} ${base.inactive} hover:opacity-80`}`}>
            <Link size={10} className="inline mr-1" />URL
          </button>
          <button type="button" onClick={() => setMode('upload')}
            className={`px-2.5 py-1 transition-colors duration-150 ${mode === 'upload' ? `${base.active} ${base.activeTxt}` : `${base.bg} ${base.inactive} hover:opacity-80`}`}>
            <Upload size={10} className="inline mr-1" />Upload
          </button>
        </div>
      </div>

      {/* URL mode */}
      {mode === 'url' && (
        <div className="relative">
          <input
            type="url"
            value={value || ''}
            onChange={e => { setError(''); onChange(e.target.value); }}
            placeholder="https://example.com/image.jpg"
            className={inputClass || `w-full ${base.bg} border ${base.border} ${base.text} placeholder:${base.muted} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B7A4A]/50`}
          />
          {value && (
            <button type="button" onClick={() => onChange('')}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${base.muted} hover:${base.text} transition-colors duration-150`}>
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Upload mode */}
      {mode === 'upload' && (
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !uploading && fileRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-7 px-4 cursor-pointer transition-all duration-150 ${
            dragOver ? base.dropActive : base.drop
          } ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
          {uploading ? (
            <>
              <Loader2 size={22} className={`animate-spin ${base.muted}`} />
              <p className={`text-xs ${base.muted}`}>Uploading...</p>
            </>
          ) : (
            <>
              <Upload size={22} className={base.muted} />
              <p className={`text-xs font-semibold ${base.text}`}>Drop image here or click to browse</p>
              <p className={`text-[10px] ${base.muted}`}>JPEG, PNG, WebP, GIF — max 8MB</p>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => uploadFile(e.target.files?.[0])} />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className={`text-[10px] mt-1.5 rounded px-2 py-1 border ${base.errBg} ${base.errTxt}`}>{error}</p>
      )}

      {/* Preview */}
      {value && (
        <div className={`mt-2.5 relative rounded-lg overflow-hidden border ${base.previewBorder} group`}
          style={{ maxHeight: '140px' }}>
          <img src={value} alt="preview" className="w-full object-cover" style={{ maxHeight: '140px' }}
            onError={() => setError('Could not load image — check the URL')} />
          <button type="button" onClick={() => onChange('')}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <X size={12} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
