import React from 'react';
import { Scale, FileText, Globe, CheckCircle2 } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8 bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl">
        
        <div className="flex items-center gap-3 border-b border-slate-800 pb-6">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
            <Scale className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Terms of Service</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">GoTrack International Freight & Radar Service Agreement</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" /> 1. Scope of Tracking Services
            </h3>
            <p className="text-slate-400">
              GoTrack provides real-time shipment radar tracking, waypoint milestone mapping, and dispatcher live chat services for air, ocean, and ground freight consignments. Estimated delivery times are generated using automated transit schedules and telemetry models.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" /> 2. Tracking Code Authorization
            </h3>
            <p className="text-slate-400">
              Users must only query tracking numbers for which they are the sender, recipient, or authorized logistics agent. Unauthorized bulk querying or automated scraping of tracking endpoints is prohibited.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" /> 3. Customs & Regulatory Disclaimers
            </h3>
            <p className="text-slate-400">
              Customs inspection durations and international border holds are governed by local customs authorities. GoTrack updates milestone statuses immediately upon receipt of official terminal clearance events.
            </p>
          </section>

          <div className="pt-6 border-t border-slate-800 text-xs text-slate-500 flex justify-between items-center">
            <span>Effective Date: July 2026</span>
            <span>GoTrack Enterprise Global Contract Terms</span>
          </div>
        </div>

      </div>
    </div>
  );
};
