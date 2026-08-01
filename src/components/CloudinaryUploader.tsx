import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, Link, Plus, Loader2, AlertCircle } from 'lucide-react';

interface CloudinaryUploaderProps {
  images: string[];
  onChange: (newImages: string[]) => void;
  maxFiles?: number;
}

export const CloudinaryUploader: React.FC<CloudinaryUploaderProps> = ({
  images,
  onChange,
  maxFiles = 12,
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process and upload a file via /api/upload endpoint
  const uploadFile = async (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Image = reader.result as string;
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image, folder: 'gotrack_shipments' }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to upload photo');
          }

          resolve(data.url);
        } catch (err: any) {
          console.error('Upload error:', err);
          setUploadError(err.message || 'Error uploading image');
          resolve(null);
        }
      };
      reader.onerror = () => {
        setUploadError('Failed to read selected image file.');
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (files: FileList | File[]) => {
    setUploadError(null);
    setUploading(true);

    const validFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));

    if (validFiles.length === 0) {
      setUploadError('Please select valid image files (JPG, PNG, WebP, etc.).');
      setUploading(false);
      return;
    }

    const newUrls: string[] = [];
    for (const file of validFiles) {
      if (images.length + newUrls.length >= maxFiles) break;
      const uploadedUrl = await uploadFile(file);
      if (uploadedUrl) {
        newUrls.push(uploadedUrl);
      }
    }

    if (newUrls.length > 0) {
      onChange([...images, ...newUrls]);
    }
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrlInput.trim()) return;
    if (images.length >= maxFiles) {
      setUploadError(`Maximum limit of ${maxFiles} images reached.`);
      return;
    }

    const trimmed = imageUrlInput.trim();
    onChange([...images, trimmed]);
    setImageUrlInput('');
    setShowUrlInput(false);
    setUploadError(null);
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-300 uppercase font-mono">
          Shipment Cargo Photos ({images.length}/{maxFiles})
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-xs text-sky-400 hover:text-sky-300 font-mono font-bold flex items-center gap-1"
        >
          <Link className="w-3.5 h-3.5" />
          {showUrlInput ? 'Hide URL Input' : 'Add Image URL Link'}
        </button>
      </div>

      {showUrlInput && (
        <form onSubmit={handleAddUrl} className="flex gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl">
          <input
            type="url"
            value={imageUrlInput}
            onChange={(e) => setImageUrlInput(e.target.value)}
            placeholder="Paste direct image URL (https://...)"
            className="flex-1 bg-slate-950 text-white text-xs p-2 rounded-lg border border-slate-700 font-mono focus:outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>
      )}

      {/* Drag & Drop Box */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-sky-400 bg-sky-500/10 scale-[1.01]'
            : 'border-slate-700 bg-slate-950 hover:border-slate-500 hover:bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
              <p className="text-xs font-mono font-bold text-sky-400">
                Uploading photo(s) to cloud...
              </p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-white font-mono">
                Drag & drop multiple shipment images here, or <span className="text-sky-400 underline">browse files</span>
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                Select multiple JPG, PNG, WebP files • Up to {maxFiles} images
              </p>
            </>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Uploaded Images List Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {images.map((url, idx) => (
            <div
              key={idx}
              className="group relative aspect-video bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-md"
            >
              <img
                src={url}
                alt={`Shipment photo ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(idx);
                  }}
                  className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition-colors shadow-lg"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[9px] bg-slate-950/80 text-sky-300 font-mono rounded">
                Photo #{idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
