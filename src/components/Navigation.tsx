import React, { useState } from 'react';
import {
  Package, Search, Menu, X, ShieldCheck, Compass, Lock,
  Building2, ArrowRight
} from 'lucide-react';

interface NavigationProps {
  currentTab: string;
  onNavigate: (tab: string, trackingCode?: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navSearchCode, setNavSearchCode] = useState('');

  const handleNavSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (navSearchCode.trim()) {
      onNavigate('track', navSearchCode.trim());
      setNavSearchCode('');
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 shadow-2xl font-sans text-white">
      
      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo */}
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3.5 cursor-pointer group"
            id="nav-logo"
          >
            <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.25)] group-hover:bg-sky-500 group-hover:text-slate-950 transition-all duration-300">
              <Package className="w-6 h-6 transition-colors" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black tracking-tight text-white font-mono">GO<span className="text-sky-400">TRACK</span></span>
                <span className="px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase bg-sky-500/10 text-sky-300 border border-sky-500/30 rounded font-mono">EXPRESS</span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5 font-medium hidden sm:block">Global Logistics & Live Radar</p>
            </div>
          </div>

          {/* Quick Header Search (Desktop) */}
          <form onSubmit={handleNavSearch} className="hidden lg:flex items-center relative max-w-xs w-full">
            <input
              type="text"
              value={navSearchCode}
              onChange={(e) => setNavSearchCode(e.target.value)}
              placeholder="Track code (e.g. GT48291584US)..."
              className="w-full bg-slate-900/90 text-xs text-white placeholder-slate-400 pl-9 pr-16 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500 focus:bg-slate-900 font-mono transition-all"
              id="header-search-input"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <button
              type="submit"
              className="absolute right-1 top-1 px-3 py-1.5 text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg transition-colors font-mono"
              id="header-search-submit"
            >
              Track
            </button>
          </form>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 font-medium text-sm">
            <button
              onClick={() => onNavigate('home')}
              className={`px-4 py-2 rounded-lg transition-all ${
                currentTab === 'home'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
              }`}
              id="nav-link-home"
            >
              Home
            </button>

            <button
              onClick={() => onNavigate('track')}
              className={`px-4 py-2 rounded-lg transition-all ${
                currentTab === 'track'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
              }`}
              id="nav-link-track"
            >
              Track Cargo
            </button>

            <button
              onClick={() => onNavigate('contact')}
              className={`px-4 py-2 rounded-lg transition-all ${
                currentTab === 'contact'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
              }`}
              id="nav-link-contact"
            >
              Support & Contact
            </button>

            <button
              onClick={() => onNavigate('privacy')}
              className={`px-4 py-2 rounded-lg transition-all ${
                currentTab === 'privacy'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
              }`}
              id="nav-link-privacy"
            >
              Privacy
            </button>

            <button
              onClick={() => onNavigate('terms')}
              className={`px-4 py-2 rounded-lg transition-all ${
                currentTab === 'terms'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
              }`}
              id="nav-link-terms"
            >
              Terms
            </button>
          </nav>

          {/* Primary CTA */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => onNavigate('track')}
              className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-black text-sm px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_25px_rgba(56,189,248,0.5)] transition-all font-mono"
              id="nav-btn-track-now"
            >
              <Compass className="w-4 h-4" />
              <span>Live Radar</span>
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:bg-slate-900 focus:outline-none"
              id="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-sky-400" /> : <Menu className="w-6 h-6 text-slate-300" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Sideways Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden">
          {/* Semi-transparent Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Sideways Drawer Panel */}
          <div className="relative w-full max-w-xs bg-slate-950 text-white h-full shadow-2xl z-10 flex flex-col justify-between p-6 overflow-y-auto transform transition-transform duration-300 ease-in-out border-l border-slate-800">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                  <span className="font-mono font-black text-white text-lg">GO<span className="text-sky-400">TRACK</span></span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Search Form */}
              <form onSubmit={handleNavSearch} className="relative w-full my-6">
                <input
                  type="text"
                  value={navSearchCode}
                  onChange={(e) => setNavSearchCode(e.target.value)}
                  placeholder="Tracking Code (e.g. GT48291584US)"
                  className="w-full bg-slate-900 text-xs text-white placeholder-slate-400 pl-9 pr-16 py-3 rounded-xl border border-slate-800 font-mono focus:outline-none focus:border-sky-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <button
                  type="submit"
                  className="absolute right-1 top-1 px-3 py-1.5 text-xs font-bold bg-sky-500 text-slate-950 rounded-lg hover:bg-sky-400 transition-colors font-mono"
                >
                  Track
                </button>
              </form>

              {/* Navigation Items */}
              <nav className="space-y-1">
                <button
                  onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-between ${
                    currentTab === 'home' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <span>Home Landing</span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => { onNavigate('track'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-between ${
                    currentTab === 'track' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <span>Track Cargo</span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => { onNavigate('contact'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-between ${
                    currentTab === 'contact' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <span>Support & Contact</span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => { onNavigate('privacy'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-between ${
                    currentTab === 'privacy' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <span>Privacy Policy</span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => { onNavigate('terms'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-between ${
                    currentTab === 'terms' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <span>Terms of Service</span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </button>
              </nav>
            </div>

            {/* Drawer Footer CTA */}
            <div className="pt-6 border-t border-slate-800 space-y-3">
              <button
                onClick={() => { onNavigate('admin'); setMobileMenuOpen(false); }}
                className="w-full py-3 px-4 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-sky-300 border border-sky-500/20 flex items-center justify-center gap-2 shadow-sm"
              >
                <Lock className="w-4 h-4 text-sky-400" />
                <span>Staff Terminal Portal</span>
              </button>
              <p className="text-[10px] text-center text-slate-500 font-mono">GoTrack Express Global Network © 2026</p>
            </div>
          </div>
        </div>
      )}

    </header>
  );
};
