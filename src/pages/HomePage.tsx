import React, { useState } from 'react';
import {
  Package, Search, Globe, ShieldCheck, Zap, Clock, Truck, Plane, Ship, CheckCircle2,
  TrendingUp, Award, ArrowRight, ChevronDown, ChevronUp, MapPin, Sparkles, Building2,
  HelpCircle, Calculator, PhoneCall, Users, Shield, Headphones, Star, ArrowUpRight
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (tab: string, trackingCode?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'track' | 'quote' | 'hub'>('track');
  const [trackingCode, setTrackingCode] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Rate Estimator local state
  const [origin, setOrigin] = useState('New York, USA');
  const [destination, setDestination] = useState('Frankfurt, Germany');
  const [weight, setWeight] = useState('25');
  const [mode, setMode] = useState<'Air' | 'Ocean' | 'Express'>('Air');
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingCode.trim()) {
      onNavigate('track', trackingCode.trim());
    }
  };

  const calculateEstimate = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weight) || 10;
    const rate = mode === 'Express' ? 14.5 : mode === 'Air' ? 9.8 : 4.2;
    setEstimatedCost(Math.round(w * rate + 120));
  };

  const faqs = [
    {
      q: 'How does GoTrack provide real-time GPS tracking?',
      a: 'GoTrack integrates directly with aircraft transponders, maritime AIS satellite beacons, and vehicle telematics units to stream live location coordinates directly to your tracking radar in real-time.'
    },
    {
      q: 'What tracking code format is supported?',
      a: 'GoTrack supports standard enterprise codes formatted as 2 prefix letters, 8 digits, and 2 suffix letters (e.g., GT48291584US) as well as partner carrier reference numbers.'
    },
    {
      q: 'How do I receive instant status email notifications?',
      a: 'Email notifications are automatically dispatched whenever a shipment clears key logistics checkpoints including Origin Pickup, Airport Handling, Customs Clearance, Regional Sorting, and Out for Delivery.'
    },
    {
      q: 'Can I speak with a live dispatcher regarding my consignment?',
      a: 'Yes! Every active tracking page includes a 24/7 Live Dispatcher Chat widget allowing direct real-time communication with our global logistics desk.'
    },
    {
      q: 'What customs clearance documents are managed by GoTrack?',
      a: 'Our trade compliance engine handles automated Electronic Export Information (EEI), Commercial Invoices, Bills of Lading (BOL), Air Waybills (AWB), and Single Administrative Documents (SAD).'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-slate-950">
      
      {/* HERO SECTION */}
      <section className="relative pt-12 pb-24 bg-slate-950 text-white overflow-hidden border-b border-slate-800/80">
        
        {/* Subtle glowing radial background */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1.5px,transparent_1.5px)] [background-size:28px_28px] pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-400 text-xs font-semibold tracking-wide font-mono shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                <Globe className="w-4 h-4 text-sky-400" />
                <span>GLOBAL LOGISTICS & CARGO RADAR NETWORK</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                Global Precision Freight & <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-300">
                  Live Air & Cargo Radar
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                Connect directly into multi-modal carrier transponders, maritime AIS satellite beacons, and customs terminals. Instant real-time GPS flight & vessel telemetry.
              </p>

              {/* Key Trust Signals */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 text-xs font-medium text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Real-time Transponder Sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Customs Auto-Clearance</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>24/7 Live Support Chat</span>
                </div>
              </div>

            </div>

            {/* Right Hero Interactive Freight Card */}
            <div className="lg:col-span-5">
              <div className="bg-slate-900/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-slate-800/80">
                
                {/* Tab selector */}
                <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl mb-6 border border-slate-800">
                  <button
                    onClick={() => setActiveTab('track')}
                    className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                      activeTab === 'track'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Track Cargo
                  </button>
                  <button
                    onClick={() => setActiveTab('quote')}
                    className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                      activeTab === 'quote'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Rate Estimator
                  </button>
                  <button
                    onClick={() => setActiveTab('hub')}
                    className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                      activeTab === 'hub'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Hub Locator
                  </button>
                </div>

                {/* TAB 1: TRACK CARGO */}
                {activeTab === 'track' && (
                  <form onSubmit={handleSearch} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold font-mono text-slate-400 uppercase mb-2">
                        Enter Consignment / Tracking Code
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={trackingCode}
                          onChange={(e) => setTrackingCode(e.target.value)}
                          placeholder="e.g. GT48291584US"
                          className="w-full bg-slate-950 text-white placeholder-slate-500 pl-11 pr-4 py-3.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500 font-mono text-sm tracking-wider font-bold"
                          id="hero-card-tracking-input"
                        />
                        <Search className="w-5 h-5 text-sky-400 absolute left-3.5 top-3.5" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-black text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_25px_rgba(56,189,248,0.5)] flex items-center justify-center gap-2 font-mono"
                      id="hero-card-track-submit"
                    >
                      <span>Track Shipment Live</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                )}

                {/* TAB 2: RATE ESTIMATOR */}
                {activeTab === 'quote' && (
                  <form onSubmit={calculateEstimate} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Origin City</label>
                        <input
                          type="text"
                          value={origin}
                          onChange={(e) => setOrigin(e.target.value)}
                          className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-lg border border-slate-800 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Destination City</label>
                        <input
                          type="text"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-lg border border-slate-800 font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Weight (kg)</label>
                        <input
                          type="number"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-lg border border-slate-800 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Freight Mode</label>
                        <select
                          value={mode}
                          onChange={(e) => setMode(e.target.value as any)}
                          className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-lg border border-slate-800 font-medium"
                        >
                          <option value="Air">Air Express Cargo</option>
                          <option value="Ocean">Maritime Ocean Container</option>
                          <option value="Express">Door-to-Door Courier</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 font-mono"
                    >
                      <Calculator className="w-4 h-4" /> Estimate Freight Cost
                    </button>

                    {estimatedCost !== null && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center space-y-0.5">
                        <span className="text-[11px] text-emerald-400 font-semibold uppercase font-mono">Estimated Freight Total</span>
                        <div className="text-xl font-extrabold text-white font-mono">${estimatedCost} USD</div>
                        <p className="text-[10px] text-emerald-300">Includes fuel surcharge & customs clearance</p>
                      </div>
                    )}
                  </form>
                )}

                {/* TAB 3: HUB LOCATOR */}
                {activeTab === 'hub' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Locate GoTrack airport cargo handling terminals, maritime ocean ports, and customs bonded warehouses worldwide.
                    </p>
                    <div className="space-y-2 text-xs">
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                        <div>
                          <strong className="block text-white">JFK International Cargo Hub</strong>
                          <span className="text-slate-400 text-[11px]">New York, NY, USA</span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/30 font-mono">24/7 OPEN</span>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                        <div>
                          <strong className="block text-white">Frankfurt Airport Terminal 4</strong>
                          <span className="text-slate-400 text-[11px]">Frankfurt am Main, Germany</span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/30 font-mono">24/7 OPEN</span>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                        <div>
                          <strong className="block text-white">Port of Singapore Container Desk</strong>
                          <span className="text-slate-400 text-[11px]">Pasir Panjang Terminal, SG</span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/30 font-mono">24/7 OPEN</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="bg-slate-900/80 border-y border-slate-800/80 py-10 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-white font-mono">180+</div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider font-mono">Countries Covered</div>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-sky-400 font-mono">99.98%</div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider font-mono">GPS Telemetry Uptime</div>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-blue-400 font-mono">4.2M+</div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider font-mono">Annual Consignments</div>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">24/7</div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider font-mono">Live Dispatch Control</div>
            </div>

          </div>
        </div>
      </section>

      {/* SERVICES GRID */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold font-mono tracking-widest text-sky-400 uppercase">Core Logistics Solutions</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Integrated Multi-Modal Transport Solutions</h2>
            <p className="text-slate-400 text-sm">
              From priority air charter cargo to containerized ocean freight and final-mile ground trucking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Service 1: Air Freight */}
            <div className="bg-slate-900/90 rounded-3xl p-8 border border-slate-800 shadow-xl hover:border-sky-500/50 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-400/20 text-sky-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                <Plane className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Air Cargo Express</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                High-priority international air transport backed by automated transponder sync and express customs handling.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Flight Transponder Radar Sync</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Priority Airport Handling</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Temperature Control Option</li>
              </ul>
            </div>

            {/* Service 2: Ocean Freight */}
            <div className="bg-slate-900/90 rounded-3xl p-8 border border-slate-800 shadow-xl hover:border-indigo-500/50 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Ship className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Ocean Maritime Freight</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Full Container Load (FCL) and Less Container Load (LCL) cargo tracked via AIS satellite positioning.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> AIS Marine Satellite Telemetry</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Port Terminal Stacking Logs</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Bill of Lading Auto-Validation</li>
              </ul>
            </div>

            {/* Service 3: Overland Trucking */}
            <div className="bg-slate-900/90 rounded-3xl p-8 border border-slate-800 shadow-xl hover:border-blue-500/50 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-400/20 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <Truck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Overland Heavy Freight</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Regional distribution networks and long-haul interstate trucking equipped with telematics GPS.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Vehicle Telematics GPS Tracking</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Regional Sorting Hub Routing</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Electronic Proof of Delivery (ePOD)</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* 4-STEP DELIVERY PROCESS */}
      <section className="py-24 bg-slate-900/50 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold font-mono tracking-widest text-sky-400 uppercase">Operational Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">How GoTrack Secures Your Shipment</h2>
            <p className="text-slate-400 text-sm">Four seamless stages from consignment origin to verified final destination.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            
            <div className="relative p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500 text-slate-950 font-mono font-black flex items-center justify-center text-sm shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                01
              </div>
              <h4 className="text-lg font-bold text-white">Consignment Booking</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Package registered, assigned a unique 12-character GoTrack code, and fitted with transponder barcode labels.
              </p>
            </div>

            <div className="relative p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500 text-slate-950 font-mono font-black flex items-center justify-center text-sm shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                02
              </div>
              <h4 className="text-lg font-bold text-white">Satellite GPS Sync</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Carrier transponder syncs live location, speed, and ETA directly to your tracking dashboard.
              </p>
            </div>

            <div className="relative p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500 text-slate-950 font-mono font-black flex items-center justify-center text-sm shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                03
              </div>
              <h4 className="text-lg font-bold text-white">Customs Clearance</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automated document verification at airport terminals and border checkpoints with instant status notifications.
              </p>
            </div>

            <div className="relative p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500 text-slate-950 font-mono font-black flex items-center justify-center text-sm shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                04
              </div>
              <h4 className="text-lg font-bold text-white">Final Mile Delivery</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Local courier dispatch, real-time driver ETA updates, and digital signature photo proof upon arrival.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-slate-950 text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold font-mono tracking-widest text-sky-400 uppercase">Client Trust & Compliance</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Trusted by Global Supply Chain Leaders</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="bg-slate-900/90 p-8 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-300 italic leading-relaxed">
                "GoTrack gives our air freight operations 100% transponder visibility across transatlantic hubs. Customer support calls dropped by 65% since launching live GPS tracking."
              </p>
              <div className="pt-2 border-t border-slate-800">
                <strong className="block text-white text-sm">Marcus Vance</strong>
                <span className="text-xs text-sky-400 font-mono">VP Global Supply Chain, Apex Heavy Industry</span>
              </div>
            </div>

            <div className="bg-slate-900/90 p-8 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-300 italic leading-relaxed">
                "The automated status emails and real-time dispatcher chat make customer updates effortless. It's the most reliable logistics platform we've deployed."
              </p>
              <div className="pt-2 border-t border-slate-800">
                <strong className="block text-white text-sm">Elena Rostova</strong>
                <span className="text-xs text-sky-400 font-mono">Logistics Director, EuroNordic Express</span>
              </div>
            </div>

            <div className="bg-slate-900/90 p-8 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-300 italic leading-relaxed">"Cloudinary photo proofs and interactive map routes give our high-value medical shipments complete compliance confidence."</p>
              <div className="pt-2 border-t border-slate-800">
                <strong className="block text-white text-sm">Dr. David Chen</strong>
                <span className="text-xs text-sky-400 font-mono">Head of Cold Chain, PharmaLink Global</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-24 bg-slate-900/50 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-16">
            <span className="text-xs font-bold font-mono tracking-widest text-sky-400 uppercase">Knowledge Base</span>
            <h2 className="text-3xl font-black text-white">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left p-6 flex items-center justify-between text-base font-bold text-white hover:text-sky-400 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-sky-400 shrink-0" />
                    {faq.q}
                  </span>
                  {openFaq === idx ? (
                    <ChevronUp className="w-5 h-5 text-sky-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                  )}
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-6 pt-1 text-sm text-slate-300 leading-relaxed border-t border-slate-800">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="py-16 bg-gradient-to-r from-sky-600 to-blue-700 text-white text-center border-t border-sky-500/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black">Ready to Track Your Consignment?</h2>
          <p className="text-sky-100 text-base max-w-xl mx-auto">
            Experience real-time GPS telemetry and instant milestone alerts on the GoTrack Radar network.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => onNavigate('track')}
              className="px-8 py-4 bg-slate-950 hover:bg-slate-900 text-sky-300 border border-sky-400/40 font-extrabold text-sm rounded-xl transition-all shadow-xl flex items-center gap-2 font-mono"
            >
              <Search className="w-4 h-4 text-sky-400" />
              <span>Track Your Consignment</span>
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
