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
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200/80 shadow-sm font-sans">
      
      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo */}
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3.5 cursor-pointer group"
            id="nav-logo"
          >
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md group-hover:bg-blue-600 transition-colors duration-300">
              <Package className="w-6 h-6 text-sky-400 group-hover:text-white transition-colors" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black tracking-tight text-slate-900 font-mono">GO<span className="text-blue-600">TRACK</span></span>
                <span className="px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono">EXPRESS</span>
              </div>
              <p className="text-[11px] text-slate-500 -mt-0.5 font-medium hidden sm:block">Global Logistics & Supply Chain</p>
            </div>
          </div>

          {/* Quick Header Search (Desktop) */}
          <form onSubmit={handleNavSearch} className="hidden lg:flex items-center relative max-w-xs w-full">
            <input
              type="text"
              value={navSearchCode}
              onChange={(e) => setNavSearchCode(e.target.value)}
              placeholder="Track code (e.g. GT48291584US)..."
              className="w-full bg-slate-50 text-xs text-slate-900 placeholder-slate-400 pl-9 pr-16 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white font-mono transition-all"
              id="header-search-input"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <button
              type="submit"
              className="absolute right-1 top-1 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              id="header-search-submit"
            >
              Track
            </button>
          </form>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 font-medium text-sm">
            <button
              onClick={() => onNavigate('home')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentTab === 'home'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              id="nav-link-home"
            >
              Home
            </button>

            <button
              onClick={() => onNavigate('track')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentTab === 'track'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              id="nav-link-track"
            >
              Track Cargo
            </button>

            <button
              onClick={() => onNavigate('contact')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentTab === 'contact'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              id="nav-link-contact"
            >
              Support & Contact
            </button>

            <button
              onClick={() => onNavigate('privacy')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentTab === 'privacy'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              id="nav-link-privacy"
            >
              Privacy
            </button>

            <button
              onClick={() => onNavigate('terms')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentTab === 'terms'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all"
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
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
              id="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Sideways Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden">
          {/* Semi-transparent Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Sideways Drawer Panel */}
          <div className="relative w-full max-w-xs bg-white h-full shadow-2xl z-10 flex flex-col justify-between p-6 overflow-y-auto transform transition-transform duration-300 ease-in-out border-l border-slate-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <Package className="w-4 h-4 text-sky-400" />
                  </div>
                  <span className="font-mono font-black text-slate-900 text-lg">GO<span className="text-blue-600">TRACK</span></span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
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
                  className="w-full bg-slate-50 text-xs text-slate-900 placeholder-slate-400 pl-9 pr-16 py-3 rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-blue-600 focus:bg-white"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <button
                  type="submit"
                  className="absolute right-1 top-1 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Track
                </button>
              </form>

              {/* Navigation Items */}
              <nav className="space-y-1">
                <button
                  onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-between ${
                    currentTab === 'home' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>Home Landing</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => { onNavigate('track'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-between ${
                    currentTab === 'track' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>Track Cargo</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => { onNavigate('contact'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-between ${
                    currentTab === 'contact' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>Support & Contact</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => { onNavigate('privacy'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-between ${
                    currentTab === 'privacy' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>Privacy Policy</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => { onNavigate('terms'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-between ${
                    currentTab === 'terms' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>Terms of Service</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              </nav>
            </div>

            {/* Drawer Footer CTA */}
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <button
                onClick={() => { onNavigate('admin'); setMobileMenuOpen(false); }}
                className="w-full py-3 px-4 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 shadow-sm"
              >
                <Lock className="w-4 h-4 text-sky-400" />
                <span>Staff Terminal Portal</span>
              </button>
              <p className="text-[10px] text-center text-slate-400 font-mono">GoTrack Express Global Network © 2026</p>
            </div>
          </div>
        </div>
      )}

    </header>
  );
};
