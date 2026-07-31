import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Shipment } from '../types';
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

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          setShipment({ ...docSnap.data(), id: docSnap.id } as Shipment);
        } else {
          setShipment(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching shipment from Firestore:', err);
        setShipment(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeCode]);

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
    <div className="min-h-screen bg-slate-50 text-slate-900 py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-600 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Search Header Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter GoTrack Tracking Number (e.g. GT48291584US)..."
                className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white font-mono tracking-wider text-base font-bold"
                id="tracking-page-search-input"
              />
              <Search className="w-5 h-5 text-blue-600 absolute left-3.5 top-4" />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
              id="tracking-page-search-btn"
            >
              <span>Track Freight</span>
            </button>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-600 font-mono text-xs font-semibold">Querying GoTrack Global Radar & Firestore Database...</p>
          </div>
        )}

        {/* NOT FOUND PAGE */}
        {!loading && searched && !shipment && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Tracking Code Not Found</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                No active shipment record matching <span className="font-mono text-blue-600 font-bold">{activeCode}</span> was found in our database.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-2 text-xs text-slate-700 font-mono">
              <p className="text-slate-900 font-bold uppercase">Search Guidance:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
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
                className="w-full sm:w-auto px-6 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-xl border border-blue-200 transition-colors font-mono"
                id="try-sample-code-btn"
              >
                Try Sample Code: GT48291584US
              </button>
              <button
                onClick={() => onNavigate('contact')}
                className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
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
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-widest">
                      {shipment.shipmentType} FREIGHT MANIFEST
                    </span>
                    <span className="px-2.5 py-0.5 text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-mono">
                      Ref: {shipment.referenceNumber}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                    {shipment.trackingCode}
                  </h1>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopyLink}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-2 text-xs font-bold"
                    title="Copy Share Link"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied Link' : 'Share'}</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2 text-xs font-bold shadow-sm"
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
                
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-slate-500 text-[11px] font-mono uppercase block mb-1 font-bold">Current Status</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${
                      shipment.currentStatus === 'Delivered'
                        ? 'bg-emerald-500 animate-pulse'
                        : shipment.currentStatus === 'Delayed' || shipment.isPaused
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-blue-600 animate-pulse'
                    }`} />
                    <span className="text-base font-bold text-slate-900">{shipment.currentStatus}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-slate-500 text-[11px] font-mono uppercase block mb-1 font-bold">Current Location</span>
                  <p className="text-sm font-bold text-slate-900 truncate">{shipment.currentLocationName}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-slate-500 text-[11px] font-mono uppercase block mb-1 font-bold">Estimated Delivery</span>
                  <p className="text-sm font-bold text-blue-700">{shipment.estimatedDelivery}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-slate-500 text-[11px] font-mono uppercase block mb-1 font-bold">Carrier & Courier</span>
                  <p className="text-sm font-bold text-slate-900 truncate">{shipment.courier}</p>
                </div>

              </div>

              {/* Delay Warning Banner if Paused or Delayed */}
              {(shipment.isPaused || shipment.currentStatus === 'Delayed') && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-amber-900 text-xs leading-relaxed">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-950 block text-sm">Shipment Status Notice</span>
                    <p>{shipment.delayReason || 'This shipment progress is currently under operational check by dispatch controller.'}</p>
                  </div>
                </div>
              )}

            </div>

            {/* LIVE GPS MAP */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Live Satellite GPS Transit Radar
                </h3>
                <span className="text-xs font-mono text-slate-500 font-medium">Carto & OpenStreetMap Vector Telemetry</span>
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
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Consignment Manifest Specs
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Item Name:</span>
                      <span className="text-slate-900 font-bold text-right">{shipment.packageName}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Brand / Model:</span>
                      <span className="text-slate-900 font-bold text-right">{shipment.brand} ({shipment.model})</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Gross Weight:</span>
                      <span className="text-slate-900 font-bold">{shipment.weight}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Quantity:</span>
                      <span className="text-slate-900 font-bold">{shipment.quantity} Units</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Dispatch Date:</span>
                      <span className="text-slate-900 font-bold">{shipment.shippingDate}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Origin Terminal:</span>
                      <span className="text-slate-900 font-bold text-right">{shipment.origin}</span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Destination:</span>
                      <span className="text-slate-900 font-bold text-right">{shipment.destination}</span>
                    </div>
                  </div>
                </div>

                {/* Customer & Consignee Info */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-600" />
                    Shipper & Consignee Details
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px] font-bold">CUSTOMER / SHIPPER</span>
                      <span className="text-slate-900 font-bold text-sm">{shipment.customerName}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px] font-bold">RECEIVER / DEPT</span>
                      <span className="text-slate-900 font-bold">{shipment.receiver}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px] font-bold">CUSTOMER EMAIL</span>
                      <span className="text-blue-600 font-mono font-bold">{shipment.customerEmail}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px] font-bold">CONTACT PHONE</span>
                      <span className="text-slate-800 font-mono font-bold">{shipment.customerPhone}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Instructions */}
                {shipment.deliveryInstructions && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-2">
                    <h3 className="text-xs font-mono font-bold text-slate-500 uppercase">
                      Courier Delivery Notes
                    </h3>
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
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
