import React, { useState } from 'react';
import { auth, seedInitialDataIfEmpty } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Shield, Lock, Mail, KeyRound, AlertCircle, PackageCheck, Sparkles } from 'lucide-react';
import logoImg from '../assets/logo.png';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onNavigateHome: () => void;
  logoUrl?: string;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onNavigateHome, logoUrl }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide admin email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (signInErr: any) {
        // If account doesn't exist yet, attempt auto-creation for default admin setup
        if (
          signInErr.code === 'auth/user-not-found' ||
          signInErr.code === 'auth/invalid-credential'
        ) {
          try {
            await createUserWithEmailAndPassword(auth, email, password);
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              throw new Error('Incorrect password for this admin account.');
            }
            throw createErr;
          }
        } else {
          throw signInErr;
        }
      }

      // Set loading false on login success
      setLoading(false);
      onLoginSuccess();
    } catch (err: any) {
      console.error('Admin Auth Error:', err);
      let msg = err.message || 'Authentication failed. Please verify credentials.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Incorrect admin credentials. Use admin@gotrack.com and admin123456';
      }
      setError(msg);
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setEmail('admin@gotrack.com');
    setPassword('admin123456');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans selection:bg-sky-500 selection:text-slate-950">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-2 bg-gradient-to-r from-sky-500 via-indigo-500 to-blue-600 rounded-b-full shadow-lg shadow-sky-500/50" />

        <div className="text-center space-y-3 mb-8">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-sky-500/30 mx-auto shadow-xl shadow-sky-500/20 shrink-0 bg-slate-950">
            <img src={logoUrl || logoImg} alt="GoTrack Logo" className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white font-mono tracking-tight">GoTrack Staff Terminal</h1>
            <p className="text-xs text-slate-400 mt-1">Authorized Logistics Dispatch Authentication</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-950/60 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 mb-1">Admin Email *</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gotrack.com"
                className="w-full bg-slate-950 text-sm text-white placeholder-slate-500 pl-10 pr-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500 font-mono"
                id="admin-login-email-input"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 mb-1">Password *</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 text-sm text-white placeholder-slate-500 pl-10 pr-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500 font-mono"
                id="admin-login-password-input"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 mt-2"
            id="admin-login-submit-btn"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Access Admin Control Desk</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Auto-fill Helper */}
        <div className="mt-6 pt-6 border-t border-slate-800 text-center space-y-3">
          <p className="text-[11px] text-slate-500">Authorized Personnel Credentials:</p>
          <button
            type="button"
            onClick={fillDemoAdmin}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2 font-mono"
            id="auto-fill-demo-admin-btn"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Auto-fill Credentials (admin@gotrack.com)
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={onNavigateHome}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Return to Public Tracking Radar
          </button>
        </div>

      </div>
    </div>
  );
};
