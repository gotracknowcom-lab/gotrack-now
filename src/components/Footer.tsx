import React from 'react';
import { Package, Shield, Globe, Lock, Mail, MapPin, Phone } from 'lucide-react';

interface FooterProps {
  onNavigate: (tab: string, trackingCode?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-900">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-sky-500/30 shrink-0 shadow-md">
                <img src="/logo.png" alt="GoTrack Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <span className="text-2xl font-black text-white font-mono tracking-tight">GO<span className="text-sky-400">TRACK</span></span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              GoTrack provides next-generation real-time GPS freight and parcel tracking for global enterprises, multi-modal carriers, and individual consignments worldwide.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500 pt-2">
              <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-sky-400" /> 180+ Countries</span>
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-emerald-400" /> ISO-27001 Certified</span>
              <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-amber-400" /> 256-Bit Encrypted</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Logistics Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-sky-400 transition-colors">
                  Home Landing
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('track')} className="hover:text-sky-400 transition-colors">
                  Live Track Radar
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-sky-400 transition-colors">
                  Contact Support
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Legal & Compliance</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => onNavigate('privacy')} className="hover:text-sky-400 transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('terms')} className="hover:text-sky-400 transition-colors">
                  Terms of Service
                </button>
              </li>
              <li>
                <span className="text-slate-500 text-xs">Customs Declaration Standards</span>
              </li>
              <li>
                <span className="text-slate-500 text-xs">IATA & IMO Compliance</span>
              </li>
            </ul>
          </div>

          {/* Global Operations */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Global Dispatch</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-sky-400" /> International Cargo Hub, FRA-JFK Corridor</p>
              <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-sky-400" /> +1 (800) GOTRACK-EXPRESS</p>
              <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-sky-400" /> tracking@gotrack-now.com</p>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} GoTrack Global Logistics Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 transition-colors cursor-pointer" onClick={() => onNavigate('privacy')}>Security Standards</span>
            <span className="hover:text-slate-400 transition-colors cursor-pointer" onClick={() => onNavigate('terms')}>Service Level Agreement</span>
            
            {/* Discreet Admin Link */}
            <button
              onClick={() => onNavigate('admin')}
              className="text-slate-600 hover:text-slate-400 transition-colors font-mono flex items-center gap-1"
              id="footer-admin-login-link"
            >
              <Lock className="w-3 h-3" />
              Staff Terminal
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
