import React, { useRef, useState } from 'react';
import { Home, Compass, PhoneCall, Shield, Lock } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  onNavigate: (tab: string, trackingCode?: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentTab, onNavigate }) => {
  const [doubleTapFeedback, setDoubleTapFeedback] = useState(false);
  const lastTapRef = useRef<number>(0);

  const handleAdminDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      e.preventDefault();
      setDoubleTapFeedback(true);
      setTimeout(() => {
        setDoubleTapFeedback(false);
        onNavigate('admin_login');
      }, 300);
    } else {
      lastTapRef.current = now;
    }
  };

  return (
    <>
      {/* Visual Toast Notification on Secret Unlock */}
      {doubleTapFeedback && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-500 text-slate-950 px-4 py-2 rounded-full font-mono text-xs font-black shadow-2xl flex items-center gap-2 animate-bounce">
          <Lock className="w-4 h-4" />
          <span>Staff Access Unlocked</span>
        </div>
      )}

      {/* Floating Bottom Nav for Mobile Screens */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 px-3 py-2 flex items-center justify-around shadow-[0_-10px_25px_rgba(0,0,0,0.5)] safe-area-bottom"
      >
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            currentTab === 'home'
              ? 'text-sky-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight font-mono">Home</span>
        </button>

        <button
          onClick={() => onNavigate('track')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
            currentTab === 'track'
              ? 'text-sky-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Compass className="w-5 h-5 mb-0.5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          </div>
          <span className="text-[10px] tracking-tight font-mono">Live Radar</span>
        </button>

        <button
          onClick={() => onNavigate('contact')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            currentTab === 'contact'
              ? 'text-sky-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PhoneCall className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight font-mono">Support</span>
        </button>

        <button
          onClick={() => onNavigate('privacy')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            currentTab === 'privacy'
              ? 'text-sky-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight font-mono">Privacy</span>
        </button>
      </nav>
    </>
  );
};
