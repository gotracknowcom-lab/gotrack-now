import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, Link, Plus, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface SingleImageUploaderProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  aspectHint?: string;
  accept?: string;
}

export const SingleImageUploader: React.FC<SingleImageUploaderProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select image file or paste URL',
  aspectHint = 'PNG, JPG, SVG, WebP, or ICO',
  accept = 'image/*',
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setError(null);
    setUploading(true);

    if (!file.type.startsWith('image/') && !file.name.endsWith('.ico')) {
      setError('Please select a valid image file (PNG, JPG, WebP, ICO, SVG).');
      setUploading(false);
      return;
    }

    // Attempt upload via API endpoint first, fallback to FileReader base64 DataURL
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        // Try uploading to server endpoint
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, folder: 'gotrack_branding' }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            onChange(data.url);
            setUploading(false);
            return;
          }
        }
        // Fallback to data URL directly if server endpoint returns error or non-JSON
        onChange(base64);
        setUploading(false);
      } catch (err) {
        // Safe fallback to data URL
        if (reader.result) {
          onChange(reader.result as string);
        }
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    onChange(urlInput.trim());
    setUrlInput('');
    setShowUrlInput(false);
    setError(null);
  };

  return (
    <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-200 uppercase font-mono">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-xs text-sky-400 hover:text-sky-300 font-mono font-bold flex items-center gap-1"
        >
          <Link className="w-3.5 h-3.5" />
          {showUrlInput ? 'Use File Upload' : 'Paste Image Link URL'}
        </button>
      </div>

      {showUrlInput && (
        <form onSubmit={handleUrlSubmit} className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="flex-1 bg-slate-900 text-white text-xs p-2.5 rounded-xl border border-slate-700 font-mono focus:outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Apply
          </button>
        </form>
      )}

      {/* Main Upload Box & Preview */}
      {value ? (
        <div className="flex items-center gap-4 p-3 bg-slate-900 rounded-xl border border-slate-800">
          <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0 p-1 shadow-inner">
            <img src={value} alt="Uploaded Graphic" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
                Uploaded & Active
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono truncate mt-1">{value}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl text-xs font-mono font-bold transition-colors"
              title="Change Image File"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-2 bg-rose-950/50 hover:bg-rose-900 text-rose-400 rounded-xl text-xs font-mono font-bold transition-colors border border-rose-500/30"
              title="Remove Custom Image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-sky-400 bg-sky-500/10 scale-[1.01]'
              : 'border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-900'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
            }}
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
                <p className="text-xs font-mono font-bold text-sky-400">Processing image file...</p>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-white font-mono">
                  Drag & drop image file here, or <span className="text-sky-400 underline">browse computer</span>
                </p>
                <p className="text-[10px] text-slate-400 font-mono">{aspectHint}</p>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-2.5 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
