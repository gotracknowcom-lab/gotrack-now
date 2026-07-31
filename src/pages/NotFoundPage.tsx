import React, { useState } from 'react';
import { Search, Compass, Home, AlertOctagon } from 'lucide-react';

interface NotFoundPageProps {
  onNavigate: (tab: string, trackingCode?: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  const [code, setCode] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onNavigate('track', code.trim());
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center mx-auto">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white font-mono">404</h1>
          <h2 className="text-xl font-bold text-white">Route Off Radar</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            The requested page or resource coordinate could not be located on the GoTrack network.
          </p>
        </div>

        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter Tracking Code (GT48291584US)..."
            className="w-full bg-slate-950 text-xs text-white placeholder-slate-400 pl-9 pr-16 py-3 rounded-xl border border-slate-700 font-mono"
            id="notfound-search-input"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-3 py-1.5 text-xs font-bold bg-sky-500 text-slate-950 rounded-lg"
            id="notfound-search-submit"
          >
            Track
          </button>
        </form>

        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigate('home')}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors"
            id="notfound-home-btn"
          >
            <Home className="w-4 h-4" /> Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};
