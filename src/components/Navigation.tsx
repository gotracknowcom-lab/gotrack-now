import React, { useState, useRef } from 'react';
import {
  Search, Menu, X, Compass, Home, PhoneCall,
  FileText, Globe, ShieldCheck, Lock
} from 'lucide-react';
import logoImg from '../assets/logo.png';

interface NavigationProps {
  currentTab: string;
  onNavigate: (tab: string, trackingCode?: string) => void;
  logoUrl?: string;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onNavigate, logoUrl }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navSearchCode, setNavSearchCode] = useState('');
  const [secretToast, setSecretToast] = useState(false);
  const lastLogoTapRef = useRef<number>(0);

  // Secret Double-Tap detector on Logo (both touch & mouse)
  const handleLogoInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const diff = now - lastLogoTapRef.current;

    if (diff < 400 && diff > 30) {
      // Secret Double Tap!
      e.preventDefault();
      e.stopPropagation();
      setSecretToast(true);
      setTimeout(() => {
        setSecretToast(false);
        onNavigate('admin_login');
      }, 350);
    } else {
      lastLogoTapRef.current = now;
      // Normal single tap navigates to home
      onNavigate('home');
    }
  };

  const handleNavSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (navSearchCode.trim()) {
      onNavigate('track', navSearchCode.trim());
      setNavSearchCode('');
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Secret Toast feedback */}
      {secretToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-sky-400 text-slate-950 font-mono text-xs font-black px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
          <Lock className="w-4 h-4" />
          <span>Staff Access Unlocked — Redirecting...</span>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 shadow-2xl font-sans text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Zone 1: Brand Wordmark with Secret Double-Tap */}
            <div
              onClick={handleLogoInteraction}
              onTouchEnd={handleLogoInteraction}
              onDoubleClick={() => onNavigate('admin_login')}
              className="flex items-center gap-3 cursor-pointer group select-none"
              title="GoTrack Express"
              id="nav-logo"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden border border-sky-500/30 text-sky-400 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.25)] group-hover:border-sky-400 transition-all duration-300 shrink-0 bg-slate-900">
                <img src={logoUrl || logoImg} alt="GoTrack Logo" className="w-full h-full object-contain p-0.5" />
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono">
                  GO<span className="text-sky-400">TRACK</span>
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase bg-sky-500/10 text-sky-300 border border-sky-500/30 rounded font-mono">
                  EXPRESS
                </span>
              </div>
            </div>

            {/* Quick Header Search (Desktop) */}
            <form onSubmit={handleNavSearch} className="hidden lg:flex items-center relative max-w-xs w-full">
              <input
                type="text"
                value={navSearchCode}
                onChange={(e) => setNavSearchCode(e.target.value)}
                placeholder="Track code (e.g. GT48291584US)..."
                className="w-full bg-slate-900/90 text-xs text-white placeholder-slate-400 pl-9 pr-16 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500 focus:bg-slate-900 font-mono transition-all"
                id="header-search-input"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <button
                type="submit"
                className="absolute right-1 top-1 px-3 py-1 text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg transition-colors font-mono"
                id="header-search-submit"
              >
                Track
              </button>
            </form>

            {/* Zone 2: Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 font-medium text-sm">
              <button
                onClick={() => onNavigate('home')}
                className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 ${
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
                className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  currentTab === 'track'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
                id="nav-link-track"
              >
                Live Radar
              </button>

              <button
                onClick={() => onNavigate('contact')}
                className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  currentTab === 'contact'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
                id="nav-link-contact"
              >
                Support
              </button>

              <button
                onClick={() => onNavigate('privacy')}
                className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 ${
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
                className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  currentTab === 'terms'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
                id="nav-link-terms"
              >
                Terms
              </button>
            </nav>

            {/* Zone 3: Primary Action + Mobile Hamburger */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('track')}
                className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all font-mono whitespace-nowrap shrink-0"
                id="nav-btn-track-now"
              >
                <Compass className="w-4 h-4" />
                <span>Track Cargo</span>
              </button>

              {/* Mobile Menu Toggle Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-900 focus:outline-none"
                id="mobile-menu-toggle"
                aria-label="Open navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6 text-sky-400" /> : <Menu className="w-6 h-6 text-slate-300" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Sideways Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex justify-end md:hidden">
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            <div className="relative w-full max-w-xs bg-slate-950 text-white h-screen shadow-2xl z-10 flex flex-col justify-between p-6 overflow-y-auto border-l border-slate-800">
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                  <div
                    onClick={handleLogoInteraction}
                    onTouchEnd={handleLogoInteraction}
                    className="flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl overflow-hidden border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 bg-slate-900 shadow-md">
                      <img src={logoUrl || logoImg} alt="GoTrack Logo" className="w-full h-full object-contain p-0.5" />
                    </div>
                    <div>
                      <span className="font-mono font-black text-white text-lg tracking-tight">GO<span className="text-sky-400">TRACK</span></span>
                      <span className="block text-[9px] font-mono text-sky-400 uppercase font-bold">Express Global</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-slate-400 hover:text-white bg-slate-900 rounded-xl border border-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Quick Search */}
                <form onSubmit={handleNavSearch} className="relative w-full my-6">
                  <input
                    type="text"
                    value={navSearchCode}
                    onChange={(e) => setNavSearchCode(e.target.value)}
                    placeholder="Enter Tracking Code..."
                    className="w-full bg-slate-900 text-xs text-white placeholder-slate-400 pl-9 pr-16 py-3 rounded-xl border border-slate-800 font-mono focus:outline-none focus:border-sky-500"
                  />
                  <Search className="w-4 h-4 text-sky-400 absolute left-3 top-3.5" />
                  <button
                    type="submit"
                    className="absolute right-1 top-1 px-3 py-1.5 text-xs font-bold bg-sky-500 text-slate-950 rounded-lg hover:bg-sky-400 transition-colors font-mono"
                  >
                    Track
                  </button>
                </form>

                {/* Links */}
                <nav className="space-y-1.5">
                  <button
                    onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold font-mono transition-colors flex items-center gap-3 ${
                      currentTab === 'home' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <Home className="w-4 h-4 text-sky-400" />
                    <span>Home Landing</span>
                  </button>

                  <button
                    onClick={() => { onNavigate('track'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold font-mono transition-colors flex items-center gap-3 ${
                      currentTab === 'track' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <Compass className="w-4 h-4 text-sky-400" />
                    <span>Track Cargo</span>
                  </button>

                  <button
                    onClick={() => { onNavigate('contact'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold font-mono transition-colors flex items-center gap-3 ${
                      currentTab === 'contact' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <PhoneCall className="w-4 h-4 text-sky-400" />
                    <span>Support & Contact</span>
                  </button>

                  <button
                    onClick={() => { onNavigate('privacy'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold font-mono transition-colors flex items-center gap-3 ${
                      currentTab === 'privacy' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    <span>Privacy Policy</span>
                  </button>

                  <button
                    onClick={() => { onNavigate('terms'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold font-mono transition-colors flex items-center gap-3 ${
                      currentTab === 'terms' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-sky-400" />
                    <span>Terms of Service</span>
                  </button>
                </nav>
              </div>

              <div className="pt-6 border-t border-slate-800 text-center">
                <p className="text-[10px] text-slate-500 font-mono">
                  GoTrack Express Global Network © 2026
                </p>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
