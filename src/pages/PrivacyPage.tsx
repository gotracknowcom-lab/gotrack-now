import React from 'react';
import { ShieldCheck, Lock, Eye, FileText } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8 bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl">
        
        <div className="flex items-center gap-3 border-b border-slate-800 pb-6">
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Privacy Policy</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">GoTrack Enterprise Logistics Data & Security Standard</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-sky-400" /> 1. Information Collection & Telemetry Usage
            </h3>
            <p className="text-slate-400">
              GoTrack Global Logistics ("GoTrack", "We", "Us") collects shipment telemetry data, GPS coordinates, consignee contact information, and delivery milestone logs strictly to fulfill consignment transport and live tracking requirements.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" /> 2. Data Protection & Firestore Security
            </h3>
            <p className="text-slate-400">
              All customer tracking records and chat communications stored within our Google Cloud Firestore infrastructure are protected under enterprise security rules. Administrative routing features require authenticated Firebase credentials. Public tracking is restricted to direct tracking code lookups.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" /> 3. Automated Email Notifications
            </h3>
            <p className="text-slate-400">
              When a shipment milestone status updates (such as Customs Clearance or Out for Delivery), system automated email notifications are generated to update the specified consignee. Recipient email addresses are never shared with unauthorized third-party advertisers.
            </p>
          </section>

          <div className="pt-6 border-t border-slate-800 text-xs text-slate-500 flex justify-between items-center">
            <span>Last Updated: July 2026</span>
            <span>GoTrack ISO/IEC 27001 Certified Compliance</span>
          </div>
        </div>

      </div>
    </div>
  );
};
