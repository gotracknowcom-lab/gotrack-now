import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Shipment } from '../types';
import { sendShipmentStatusEmail } from '../lib/emailService';
import { MapComponent } from '../components/MapComponent';
import { ShipmentTimeline } from '../components/ShipmentTimeline';
import { LiveChatWidget } from '../components/LiveChatWidget';
import { ImageGallery } from '../components/ImageGallery';
import {
  Package, Search, Clock, MapPin, ShieldCheck, AlertTriangle, Truck, Plane, Ship,
  Printer, Share2, RefreshCw, FileText, User, Phone, Mail, ChevronRight, HelpCircle,
  Copy, Check
} from 'lucide-react';

interface TrackingResultPageProps {
  initialTrackingCode?: string;
  onNavigate: (tab: string, trackingCode?: string) => void;
}

export const TrackingResultPage: React.FC<TrackingResultPageProps> = ({
  initialTrackingCode = '',
  onNavigate,
}) => {
  const [searchInput, setSearchInput] = useState(initialTrackingCode);
  const [activeCode, setActiveCode] = useState(initialTrackingCode);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialTrackingCode) {
      setSearchInput(initialTrackingCode);
      setActiveCode(initialTrackingCode);
    }
  }, [initialTrackingCode]);

  useEffect(() => {
    if (!activeCode) {
      setLoading(false);
      setShipment(null);
      return;
    }

    setLoading(true);
    setSearched(true);

    const q = query(
      collection(db, 'shipments'),
      where('trackingCode', '==', activeCode.trim().toUpperCase())
    );

    let isMounted = true;

    // Direct query for immediate fast load
    getDocs(q)
      .then((snapshot) => {
        if (isMounted) {
          if (!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            setShipment({ ...docSnap.data(), id: docSnap.id } as Shipment);
          }
          setLoading(false);
        }
      })
      .catch((err) => console.warn('Fast lookup note:', err));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (isMounted) {
          if (!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            setShipment({ ...docSnap.data(), id: docSnap.id } as Shipment);
          } else {
            setShipment(null);
          }
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching shipment from Firestore:', err);
        if (isMounted) {
          setShipment(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [activeCode]);

  // Check and execute scheduled holds or automated checkpoint arrivals on page view / listener
  useEffect(() => {
    if (!shipment || !shipment.id) return;

    // 1. Check Nigeria Time WAT Scheduled Hold
    if (shipment.scheduledHold && !shipment.scheduledHold.executed && shipment.scheduledHold.holdTimeWAT) {
      const nowMs = Date.now();
      const watDate = new Date(nowMs + 3600000);
      const currentWATISO = watDate.toISOString().slice(0, 16);

      if (currentWATISO >= shipment.scheduledHold.holdTimeWAT) {
        console.log(`[Tracking Page WAT Hold Triggered] Current WAT: ${currentWATISO}`);
        const reason = shipment.scheduledHold.reason || 'Consignment hold for customs and security check.';
        
        let newLocation = shipment.currentLocationName;
        let newCoords = shipment.currentCoords;
        let updatedStops = shipment.stops || [];
        let updatedProgress = shipment.progressPercent;

        if (shipment.scheduledHold.targetCheckpointId) {
          const targetIdx = updatedStops.findIndex((st) => st.id === shipment.scheduledHold?.targetCheckpointId);
          if (targetIdx !== -1) {
            const targetStop = updatedStops[targetIdx];
            newLocation = targetStop.name;
            newCoords = [targetStop.lng, targetStop.lat];
            updatedStops = updatedStops.map((st, i) => {
              if (i <= targetIdx) return { ...st, status: 'completed' as const };
              if (i === targetIdx + 1) return { ...st, status: 'current' as const };
              return st;
            });
            updatedProgress = Math.round(((targetIdx + 1) / (updatedStops.length + 1)) * 100);
          }
        }

        const updatedTimeline = (shipment.timeline || []).map((t) => ({ ...t, current: false }));
        updatedTimeline.push({
          id: 't-shold-' + Date.now(),
          status: 'Delayed',
          title: shipment.scheduledHold.targetCheckpointName
            ? `Arrived at Checkpoint & Held: ${shipment.scheduledHold.targetCheckpointName}`
            : 'Shipment Delayed - Operational Hold',
          location: newLocation,
          timestamp: new Date().toLocaleString(),
          description: reason,
          completed: true,
          current: true,
        });

        const updatePayload = {
          isPaused: true,
          currentStatus: 'Delayed',
          delayReason: reason,
          currentLocationName: newLocation,
          currentCoords: newCoords,
          stops: updatedStops,
          progressPercent: updatedProgress,
          timeline: updatedTimeline,
          scheduledHold: { ...shipment.scheduledHold, executed: true },
        };

        const docRef = doc(db, 'shipments', shipment.id);
        updateDoc(docRef, updatePayload).catch((err) => console.error('Failed to update scheduled hold:', err));
        sendShipmentStatusEmail({ ...shipment, ...updatePayload }, 'Delayed', reason).catch(() => {});
      }
    }
  }, [shipment]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setActiveCode(searchInput.trim().toUpperCase());
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (shipment) {
      const shareUrl = `${window.location.origin}/?code=${shipment.trackingCode}`;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-sky-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Search Header Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter GoTrack Tracking Code (e.g. GT48291584US)..."
                className="w-full bg-slate-950 text-white placeholder-slate-500 pl-11 pr-4 py-3.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500 font-mono tracking-wider text-base font-bold"
                id="tracking-page-search-input"
              />
              <Search className="w-5 h-5 text-sky-400 absolute left-3.5 top-4" />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] flex items-center justify-center gap-2 font-mono"
              id="tracking-page-search-btn"
            >
              <span>Track Freight</span>
            </button>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 font-mono text-xs font-semibold">Locating Shipment & Fetching Live Status...</p>
          </div>
        )}

        {/* NOT FOUND PAGE */}
        {!loading && searched && !shipment && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Tracking Code Not Found</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                No active shipment record matching <span className="font-mono text-sky-400 font-bold">{activeCode}</span> was found in our database.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left space-y-2 text-xs text-slate-300 font-mono">
              <p className="text-white font-bold uppercase">Search Guidance:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Verify code format: GT + 8 Digits + 2 Letters (e.g. GT48291584US)</li>
                <li>Check for typos or extra whitespace</li>
                <li>Ensure shipment was booked within the last 90 days</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setSearchInput('GT48291584US');
                  setActiveCode('GT48291584US');
                }}
                className="w-full sm:w-auto px-6 py-3 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 font-bold text-xs rounded-xl border border-sky-500/30 transition-colors font-mono"
                id="try-sample-code-btn"
              >
                Try Sample Code: GT48291584US
              </button>
              <button
                onClick={() => onNavigate('contact')}
                className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
                id="contact-support-btn"
              >
                Contact Support Desk
              </button>
            </div>
          </div>
        )}

        {/* SHIPMENT FOUND DETAILS */}
        {!loading && shipment && (
          <div className="space-y-8">
            
            {/* Top Summary Banner */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest">
                      {shipment.shipmentType} FREIGHT MANIFEST
                    </span>
                    <span className="px-2.5 py-0.5 text-[11px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/30 rounded-full font-mono">
                      Ref: {shipment.referenceNumber}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                    {shipment.trackingCode}
                  </h1>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopyLink}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors flex items-center gap-2 text-xs font-bold"
                    title="Copy Share Link"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied Link' : 'Share'}</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors flex items-center gap-2 text-xs font-black shadow-md font-mono"
                    title="Print Dispatch Receipt"
                    id="print-dispatch-btn"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">Print Receipt</span>
                  </button>
                </div>
              </div>

              {/* Status Header Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] font-mono uppercase block mb-1 font-bold">Current Status</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${
                      shipment.currentStatus === 'Delivered'
                        ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                        : shipment.currentStatus === 'Delayed' || shipment.isPaused
                        ? 'bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                        : 'bg-sky-400 animate-pulse shadow-[0_0_10px_rgba(56,189,248,0.5)]'
                    }`} />
                    <span className="text-base font-bold text-white">{shipment.currentStatus}</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] font-mono uppercase block mb-1 font-bold">Current Location</span>
                  <p className="text-sm font-bold text-white truncate">{shipment.currentLocationName}</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] font-mono uppercase block mb-1 font-bold">Estimated Delivery</span>
                  <p className="text-sm font-bold text-sky-400 font-mono">{shipment.estimatedDelivery}</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] font-mono uppercase block mb-1 font-bold">Carrier & Courier</span>
                  <p className="text-sm font-bold text-white truncate">{shipment.courier}</p>
                </div>

              </div>

              {/* Delay Warning Banner if Paused or Delayed */}
              {(shipment.isPaused || shipment.currentStatus === 'Delayed') && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-start gap-3 text-amber-300 text-xs leading-relaxed">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-200 block text-sm">Shipment Status Notice</span>
                    <p>{shipment.delayReason || 'This shipment progress is currently under operational check by dispatch controller.'}</p>
                  </div>
                </div>
              )}

            </div>

            {/* LIVE GPS MAP */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-sky-400" />
                  Live Satellite GPS Transit Radar
                </h3>
                <span className="text-xs font-mono text-slate-400 font-medium">Live Map Navigation</span>
              </div>
              <MapComponent shipment={shipment} />
            </div>

            {/* TWO-COLUMN LAYOUT: TIMELINE & DETAILS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left 2 Cols: Milestone Timeline */}
              <div className="lg:col-span-2 space-y-8">
                <ShipmentTimeline timeline={shipment.timeline} currentStatus={shipment.currentStatus} />
                
                {/* Images Gallery */}
                {shipment.images && shipment.images.length > 0 && (
                  <ImageGallery images={shipment.images} />
                )}
              </div>

              {/* Right Col: Full Consignment Manifest Specs */}
              <div className="space-y-6">
                
                {/* Package Specifications Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-sky-400" />
                    Consignment Manifest Specs
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Item Name:</span>
                      <span className="text-white font-bold text-right">{shipment.packageName}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Brand / Model:</span>
                      <span className="text-white font-bold text-right">{shipment.brand} ({shipment.model})</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Gross Weight:</span>
                      <span className="text-white font-bold">{shipment.weight}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Quantity:</span>
                      <span className="text-white font-bold">{shipment.quantity} Units</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Dispatch Date:</span>
                      <span className="text-white font-bold">{shipment.shippingDate}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Origin Terminal:</span>
                      <span className="text-white font-bold text-right">{shipment.origin}</span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Destination:</span>
                      <span className="text-white font-bold text-right">{shipment.destination}</span>
                    </div>
                  </div>
                </div>

                {/* Customer & Consignee Info */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-400" />
                    Shipper & Consignee Details
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] font-bold">CUSTOMER / SHIPPER</span>
                      <span className="text-white font-bold text-sm">{shipment.customerName}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-bold">RECEIVER / DEPT</span>
                      <span className="text-white font-bold">{shipment.receiver}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-bold">CUSTOMER EMAIL</span>
                      <span className="text-sky-400 font-mono font-bold">{shipment.customerEmail}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-bold">CONTACT PHONE</span>
                      <span className="text-slate-300 font-mono font-bold">{shipment.customerPhone}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Instructions */}
                {shipment.deliveryInstructions && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
                    <h3 className="text-xs font-mono font-bold text-slate-400 uppercase">
                      Courier Delivery Notes
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                      {shipment.deliveryInstructions}
                    </p>
                  </div>
                )}

              </div>

            </div>

            {/* Realtime Live Chat Floating Widget for Customer */}
            <LiveChatWidget trackingCode={shipment.trackingCode} customerName={shipment.customerName} />

          </div>
        )}

      </div>
    </div>
  );
};
