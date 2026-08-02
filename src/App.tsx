import React, { useState, useEffect } from 'react';
import { db, auth, seedInitialDataIfEmpty } from './lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { TrackingResultPage } from './pages/TrackingResultPage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AdminLogin } from './admin/AdminLogin';
import { AdminDashboard } from './admin/AdminDashboard';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [activeTrackingCode, setActiveTrackingCode] = useState<string>('');
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [customLogo, setCustomLogo] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Check Firebase Auth state for admin user
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAdminUser(user);
      setAuthChecking(false);
    });

    // Subscribe to system settings for custom logo & favicon
    const unsubSettings = onSnapshot(doc(db, 'system_settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.logoUrl) {
          setCustomLogo(data.logoUrl);
        } else {
          setCustomLogo(undefined);
        }

        if (data.faviconUrl) {
          // Dynamically update favicon in document head
          const faviconUrl = data.faviconUrl;
          let favEl = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
          if (!favEl) {
            favEl = document.createElement('link');
            favEl.rel = 'icon';
            document.head.appendChild(favEl);
          }
          favEl.href = faviconUrl;

          let appleEl = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
          if (!appleEl) {
            appleEl = document.createElement('link');
            appleEl.rel = 'apple-touch-icon';
            document.head.appendChild(appleEl);
          }
          appleEl.href = faviconUrl;
        }
      }
    }, (err) => console.warn('System settings listener note:', err));

    // Sync tab based on URL path and query parameters
    const syncRouteFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('code') || params.get('tracking') || params.get('gt');
      if (codeParam) {
        setActiveTrackingCode(codeParam.toUpperCase());
      }

      const pathname = window.location.pathname.toLowerCase();
      if (pathname.includes('/admin/login')) {
        setCurrentTab('admin_login');
      } else if (pathname.includes('/admin')) {
        setCurrentTab('admin');
      } else if (pathname.includes('/tracking') || pathname.includes('/track') || codeParam) {
        setCurrentTab('track');
      } else if (pathname.includes('/contact')) {
        setCurrentTab('contact');
      } else if (pathname.includes('/privacy')) {
        setCurrentTab('privacy');
      } else if (pathname.includes('/terms')) {
        setCurrentTab('terms');
      } else {
        setCurrentTab('home');
      }
    };

    syncRouteFromUrl();

    // Listen to browser Back / Forward buttons
    window.addEventListener('popstate', syncRouteFromUrl);

    return () => {
      unsubscribe();
      unsubSettings();
      window.removeEventListener('popstate', syncRouteFromUrl);
    };
  }, []);

  const handleNavigate = (tab: string, trackingCode?: string) => {
    if (trackingCode) {
      setActiveTrackingCode(trackingCode.toUpperCase());
    }
    setCurrentTab(tab);

    // Sync browser address bar URL seamlessly
    let path = '/';
    if (tab === 'admin_login') {
      path = '/admin/login';
    } else if (tab === 'admin') {
      path = '/admin';
    } else if (tab === 'track') {
      const code = trackingCode || activeTrackingCode;
      path = code ? `/tracking?code=${encodeURIComponent(code)}` : '/tracking';
    } else if (tab === 'contact') {
      path = '/contact';
    } else if (tab === 'privacy') {
      path = '/privacy';
    } else if (tab === 'terms') {
      path = '/terms';
    }

    if (window.location.pathname + window.location.search !== path) {
      window.history.pushState({}, '', path);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Loading GoTrack System...</p>
        </div>
      </div>
    );
  }

  // Admin Login Screen
  if (currentTab === 'admin_login' || (currentTab === 'admin' && !adminUser)) {
    return (
      <AdminLogin
        onLoginSuccess={() => setCurrentTab('admin')}
        onNavigateHome={() => handleNavigate('home')}
        logoUrl={customLogo}
      />
    );
  }

  // Protected Admin Dashboard
  if (currentTab === 'admin' && adminUser) {
    return (
      <AdminDashboard
        onLogout={() => setCurrentTab('admin_login')}
        onNavigatePublic={(tab, code) => handleNavigate(tab, code)}
        logoUrl={customLogo}
      />
    );
  }

  // Public Website Flow (Wrapped in Navigation and Footer)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navigation currentTab={currentTab} onNavigate={handleNavigate} logoUrl={customLogo} />

      <main className="flex-1">
        {currentTab === 'home' && <HomePage onNavigate={handleNavigate} />}
        {currentTab === 'track' && (
          <TrackingResultPage
            initialTrackingCode={activeTrackingCode}
            onNavigate={handleNavigate}
          />
        )}
        {currentTab === 'contact' && <ContactPage />}
        {currentTab === 'privacy' && <PrivacyPage />}
        {currentTab === 'terms' && <TermsPage />}
        {currentTab === '404' && <NotFoundPage onNavigate={handleNavigate} />}
      </main>

      <Footer onNavigate={handleNavigate} logoUrl={customLogo} />
    </div>
  );
}
