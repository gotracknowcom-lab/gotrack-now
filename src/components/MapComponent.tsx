import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Shipment, ShipmentType } from '../types';
import { Plane, Truck, Ship, MapPin, Navigation, Play, Pause, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface MapComponentProps {
  shipment: Shipment;
  isAdminControl?: boolean;
  onUpdateProgress?: (progress: number) => void;
  onTogglePause?: (isPaused: boolean) => void;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  shipment,
  isAdminControl = false,
  onUpdateProgress,
  onTogglePause,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const originMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);

  // Compute full coordinate path from origin -> stops -> destination
  const getRouteCoordinates = (): [number, number][] => {
    const coords: [number, number][] = [shipment.originCoords];
    if (shipment.stops && shipment.stops.length > 0) {
      shipment.stops.forEach((stop) => {
        coords.push([stop.lng, stop.lat]);
      });
    }
    coords.push(shipment.destinationCoords);
    return coords;
  };

  // Compute interpolated point along path based on progressPercent (0 to 100)
  const calculateCurrentPos = (progressPercent: number): [number, number] => {
    const route = getRouteCoordinates();
    if (route.length === 1) return route[0];
    
    const numSegments = route.length - 1;
    const clampedProgress = Math.max(0, Math.min(100, progressPercent));
    const normalized = (clampedProgress / 100) * numSegments;
    const segmentIndex = Math.min(Math.floor(normalized), numSegments - 1);
    const segmentRatio = normalized - segmentIndex;

    const p1 = route[segmentIndex];
    const p2 = route[segmentIndex + 1];

    const lng = p1[0] + (p2[0] - p1[0]) * segmentRatio;
    const lat = p1[1] + (p2[1] - p1[1]) * segmentRatio;

    return [lng, lat];
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize MapLibre GL map
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', // Clean free vector tiles
      center: shipment.currentCoords || shipment.originCoords,
      zoom: 3,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      setMapLoaded(true);
      mapRef.current = map;

      const routeCoords = getRouteCoordinates();

      // Add route polyline source and layer
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoords,
          },
        },
      });

      // Outline shadow layer for route
      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#0f172a',
          'line-width': 8,
          'line-opacity': 0.3,
        },
      });

      // Primary active route line
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': shipment.currentStatus === 'Delayed' ? '#ef4444' : '#0284c7',
          'line-width': 4,
          'line-dasharray': shipment.isPaused ? [2, 2] : [1],
        },
      });

      // Fit map bounds to encompass full route with margin
      const bounds = new maplibregl.LngLatBounds();
      routeCoords.forEach((coord) => bounds.extend(coord));
      map.fitBounds(bounds, { padding: 60, maxZoom: 8 });

      // Create Custom Origin Pin Element
      const originEl = document.createElement('div');
      originEl.className = 'w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold';
      originEl.innerHTML = '<span title="Origin">ORG</span>';
      originMarkerRef.current = new maplibregl.Marker({ element: originEl })
        .setLngLat(shipment.originCoords)
        .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML(`<strong>Origin:</strong> ${shipment.origin}`))
        .addTo(map);

      // Create Custom Destination Pin Element
      const destEl = document.createElement('div');
      destEl.className = 'w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold';
      destEl.innerHTML = '<span title="Destination font-mono">DST</span>';
      destMarkerRef.current = new maplibregl.Marker({ element: destEl })
        .setLngLat(shipment.destinationCoords)
        .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML(`<strong>Destination:</strong> ${shipment.destination}`))
        .addTo(map);

      // Create Vehicle Live Marker Element
      const activeCoords = calculateCurrentPos(shipment.progressPercent);
      const vehicleEl = document.createElement('div');
      vehicleEl.className = 'relative flex items-center justify-center';

      // Pick icon color and symbol based on shipment type
      let iconSvg = '';
      if (shipment.shipmentType === 'Air') {
        iconSvg = `<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>`;
      } else if (shipment.shipmentType === 'Sea') {
        iconSvg = `<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`;
      } else {
        iconSvg = `<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>`;
      }

      const isDelayed = shipment.currentStatus === 'Delayed' || shipment.isPaused;
      const bgGradient = isDelayed
        ? 'from-amber-500 to-red-600 ring-red-400'
        : 'from-blue-600 via-indigo-600 to-sky-400 ring-sky-300';

      vehicleEl.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-12 h-12 rounded-full bg-sky-400/40 animate-ping"></div>
          <div class="w-10 h-10 rounded-full bg-gradient-to-tr ${bgGradient} ring-4 ring-opacity-50 shadow-2xl flex items-center justify-center z-10 transition-transform hover:scale-110">
            ${iconSvg}
          </div>
        </div>
      `;

      markerRef.current = new maplibregl.Marker({ element: vehicleEl })
        .setLngLat(activeCoords)
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`
          <div style="font-family: sans-serif; padding: 4px;">
            <div style="font-weight: bold; color: #0f172a; font-size: 13px;">${shipment.trackingCode} (${shipment.shipmentType})</div>
            <div style="color: #0284c7; font-size: 12px; font-weight: 600;">Status: ${shipment.currentStatus}</div>
            <div style="color: #64748b; font-size: 11px;">Location: ${shipment.currentLocationName}</div>
          </div>
        `))
        .addTo(map);
    });

    return () => {
      map.remove();
    };
  }, []);

  // Live GPS movement animation loop when active and not paused
  const [animatedProgress, setAnimatedProgress] = useState(shipment.progressPercent);

  useEffect(() => {
    setAnimatedProgress(shipment.progressPercent);
  }, [shipment.progressPercent]);

  useEffect(() => {
    // If paused, delivered, or cancelled, do not animate movement
    const isPausedState = shipment.isPaused || shipment.currentStatus === 'Paused' || shipment.currentStatus === 'Delayed' || shipment.currentStatus === 'Delivered';
    if (isPausedState) return;

    // Micro oscillation / smooth movement along current progress point
    let frameId: number;
    let startTime = performance.now();

    const animateDot = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      // Slight oscillating offset around current progress to simulate real-time GPS ping micro-movement
      const microDelta = Math.sin(elapsed * 2) * 0.4;
      const currentSimulatedProgress = Math.max(0, Math.min(100, shipment.progressPercent + microDelta));
      
      setAnimatedProgress(currentSimulatedProgress);
      frameId = requestAnimationFrame(animateDot);
    };

    frameId = requestAnimationFrame(animateDot);
    return () => cancelAnimationFrame(frameId);
  }, [shipment.progressPercent, shipment.isPaused, shipment.currentStatus]);

  // Update marker position live when progress, status or coords change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !markerRef.current) return;

    const newPos = calculateCurrentPos(animatedProgress);
    markerRef.current.setLngLat(newPos);

    // Pan map smoothly to active position if live tracking
    if (!isAdminControl) {
      mapRef.current.easeTo({ center: newPos, duration: 600 });
    }

    // Update line dash or color if paused/delayed
    if (mapRef.current.getLayer('route-line')) {
      const isPausedOrDelayed = shipment.isPaused || shipment.currentStatus === 'Paused' || shipment.currentStatus === 'Delayed';
      mapRef.current.setPaintProperty(
        'route-line',
        'line-color',
        isPausedOrDelayed ? '#f59e0b' : '#0284c7'
      );
    }
  }, [animatedProgress, shipment.currentStatus, shipment.isPaused, mapLoaded]);

  const isPausedOrHalted = shipment.isPaused || shipment.currentStatus === 'Paused' || shipment.currentStatus === 'Delayed';

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl">
      {/* Top Overlay Banner */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-800 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            isPausedOrHalted
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
          }`}>
            {shipment.shipmentType === 'Air' && <Plane className="w-5 h-5" />}
            {shipment.shipmentType === 'Sea' && <Ship className="w-5 h-5" />}
            {shipment.shipmentType === 'Road' && <Truck className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wide">
                {shipment.shipmentType} Freight GPS Radar
              </span>
              {isPausedOrHalted ? (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 flex items-center gap-1 font-mono animate-pulse">
                  <Pause className="w-3 h-3" /> MOVEMENT HALTED
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30 flex items-center gap-1 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> TRANSMITTING
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>{shipment.currentLocationName}</span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <span className="text-slate-400 block text-[10px] font-mono uppercase">Route Progress</span>
            <span className="text-sky-400 font-bold font-mono text-sm">{Math.round(shipment.progressPercent)}%</span>
          </div>
          <div className="text-right border-l border-slate-800 pl-4">
            <span className="text-slate-400 block text-[10px] font-mono uppercase">ETA</span>
            <span className="text-white font-semibold">{shipment.estimatedDelivery}</span>
          </div>
        </div>
      </div>

      {/* PAUSED / DELAYED REASON OVERLAY BOX */}
      {isPausedOrHalted && (
        <div className="absolute bottom-16 left-4 right-4 z-10 bg-slate-900/95 backdrop-blur-md border-2 border-amber-500/60 p-4 rounded-2xl shadow-2xl text-white space-y-2 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-xs uppercase tracking-wide">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>GPS Vehicle Movement Paused / Operational Hold</span>
          </div>
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs font-sans text-amber-200">
            <strong>Reason for Hold:</strong> {shipment.delayReason || 'Consignment temporarily held at transit hub for customs inspection & clearance.'}
          </div>
        </div>
      )}

      {/* Map Container Element */}
      <div ref={mapContainerRef} className="w-full h-[450px] sm:h-[500px]" id="live-gps-map-canvas" />

      {/* Bottom Control bar for Admin / Live simulation */}
      {isAdminControl && (
        <div className="bg-slate-950 p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 font-mono uppercase flex items-center gap-2">
              <Navigation className="w-4 h-4 text-sky-400" />
              Adjust Vehicle Progress Along Route ({Math.round(shipment.progressPercent)}%)
            </label>
            {onTogglePause && (
              <button
                onClick={() => onTogglePause(!shipment.isPaused)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  shipment.isPaused
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
                id="admin-toggle-pause-btn"
              >
                {shipment.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                {shipment.isPaused ? 'Resume Movement' : 'Pause Shipment'}
              </button>
            )}
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={shipment.progressPercent}
            onChange={(e) => onUpdateProgress && onUpdateProgress(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            id="admin-progress-slider"
          />
        </div>
      )}
    </div>
  );
};
