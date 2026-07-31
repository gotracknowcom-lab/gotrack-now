import React, { useState } from 'react';
import { Image as ImageIcon, X, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

interface ImageGalleryProps {
  images: string[];
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-sky-400" />
          Package Inspection & Cargo Images
        </h3>
        <span className="text-xs font-mono text-slate-400">{images.length} Verified Photos</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((imgUrl, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedIndex(idx)}
            className="group relative aspect-video rounded-xl overflow-hidden border border-slate-800 cursor-pointer bg-slate-950"
          >
            <img
              src={imgUrl}
              alt={`Package Inspection Photo ${idx + 1}`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="p-2 rounded-full bg-slate-900/80 text-sky-400">
                <Eye className="w-5 h-5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative max-w-4xl w-full flex items-center justify-center">
            {images.length > 1 && (
              <button
                onClick={() => setSelectedIndex((selectedIndex - 1 + images.length) % images.length)}
                className="absolute left-2 p-2 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={images[selectedIndex]}
              alt="Inspection Lightbox View"
              className="max-h-[80vh] w-auto rounded-xl object-contain border border-slate-800 shadow-2xl"
            />

            {images.length > 1 && (
              <button
                onClick={() => setSelectedIndex((selectedIndex + 1) % images.length)}
                className="absolute right-2 p-2 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
