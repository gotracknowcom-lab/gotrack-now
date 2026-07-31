import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Shipment, ShipmentType } from '../types';
import {
  Plane, Truck, Ship, Package, MapPin, Navigation, Play, Pause, AlertTriangle,
  CheckCircle2, Sun, Moon, Maximize2, Minimize2, ZoomIn, ZoomOut, FastForward,
  RotateCcw, ShieldAlert, Clock
} from 'lucide-react';

interface MapComponentProps {
  shipment: Shipment;
  isAdminControl?: boolean;
  onUpdateProgress?: (progress: number) => void;
  onTogglePause?: (isPaused: boolean) => void;
  onSetDelayReason?: (reason: string, resumeTime?: string) => void;
  onAdvanceNextCheckpoint?: () => void;
}

// Calculate bearing angle (heading 0-360 deg) between two [lng, lat] coordinates
function calculateBearing(start: [number, number], end: [number, number]): number {
  const startLngRad = (start[0] * Math.PI) / 180;
  const startLatRad = (start[1] * Math.PI) / 180;
  const endLngRad = (end[0] * Math.PI) / 180;
  const endLatRad = (end[1] * Math.PI) / 180;

  const dLng = endLngRad - startLngRad;
  const y = Math.sin(dLng) * Math.cos(endLatRad);
  const x = Math.cos(startLatRad) * Math.sin(endLatRad) - Math.sin(startLatRad) * Math.cos(endLatRad) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  shipment,
  isAdminControl = false,
  onUpdateProgress,
  onTogglePause,
  onSetDelayReason,
  onAdvanceNextCheckpoint,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const vehicleMarkerRef = useRef<maplibregl.Marker | null>(null);
  const vehicleInnerElRef = useRef<HTMLDivElement | null>(null);
  const originMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);
  const stopMarkersRef = useRef<maplibregl.Marker[]>([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('dark');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(shipment.progressPercent || 0);

  // Compute full coordinate path from origin -> stops -> destination
  const getRouteCoordinates = (): [number, number][] => {
    const coords: [number, number][] = [shipment.originCoords];
    if (shipment.stops && shipment.stops.length > 0) {
      shipment.stops.forEach((stop) => {
        if (typeof stop.lng === 'number' && typeof stop.lat === 'number') {
          coords.push([stop.lng, stop.lat]);
        }
      });
    }
    coords.push(shipment.destinationCoords);
    return coords;
  };

  // Compute interpolated point [lng, lat] and heading angle along path based on progressPercent (0 to 100)
  const calculatePositionAndHeading = (progressPercent: number): { pos: [number, number]; heading: number } => {
    const route = getRouteCoordinates();
    if (route.length <= 1) return { pos: route[0] || [0, 0], heading: 0 };

    const clampedProgress = Math.max(0, Math.min(100, progressPercent));
    const numSegments = route.length - 1;
    const normalized = (clampedProgress / 100) * numSegments;
    const segmentIndex = Math.min(Math.floor(normalized), numSegments - 1);
    const segmentRatio = normalized - segmentIndex;

    const p1 = route[segmentIndex];
    const p2 = route[segmentIndex + 1];

    const lng = p1[0] + (p2[0] - p1[0]) * segmentRatio;
    const lat = p1[1] + (p2[1] - p1[1]) * segmentRatio;
    const heading = calculateBearing(p1, p2);

    return { pos: [lng, lat], heading };
  };

  // Synchronize internal animated progress state when shipment prop changes
  useEffect(() => {
    setAnimatedProgress(shipment.progressPercent || 0);
  }, [shipment.progressPercent]);

  // Smooth 60 FPS animation loop for micro-motion along route
  useEffect(() => {
    const isPausedState = shipment.isPaused || shipment.currentStatus === 'Paused' || shipment.currentStatus === 'Delayed' || shipment.currentStatus === 'Delivered';
    if (isPausedState) return;

    let frameId: number;
    let startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      // Slight smooth oscillation around progress to reflect live satellite GPS ping activity
      const microDelta = Math.sin(elapsed * 1.5) * 0.25;
      const currentSimulatedProgress = Math.max(0, Math.min(100, (shipment.progressPercent || 0) + microDelta));

      setAnimatedProgress(currentSimulatedProgress);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [shipment.progressPercent, shipment.isPaused, shipment.currentStatus]);

  // Initialize MapLibre GL map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const styleUrl = mapTheme === 'dark'
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: shipment.currentCoords || shipment.originCoords,
      zoom: 3,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on('load', () => {
      setMapLoaded(true);
      renderMapLayersAndMarkers(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapTheme]);

  // Re-render polyline and pins when shipment coordinates or stops change
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      renderMapLayersAndMarkers(mapRef.current);
    }
  }, [shipment.originCoords, shipment.destinationCoords, shipment.stops, shipment.shipmentType, mapLoaded]);

  // Update vehicle position & rotation live on animatedProgress change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !vehicleMarkerRef.current) return;

    const { pos, heading } = calculatePositionAndHeading(animatedProgress);
    vehicleMarkerRef.current.setLngLat(pos);

    // Apply rotation transform to vehicle icon
    if (vehicleInnerElRef.current) {
      vehicleInnerElRef.current.style.transform = `rotate(${Math.round(heading)}deg)`;
    }

    // Pan map smoothly to active position if tracking
    if (!isAdminControl) {
      mapRef.current.easeTo({ center: pos, duration: 400 });
    }

    // Update polyline line color or dash if paused
    if (mapRef.current.getLayer('route-line')) {
      const isPausedOrDelayed = shipment.isPaused || shipment.currentStatus === 'Paused' || shipment.currentStatus === 'Delayed';
      mapRef.current.setPaintProperty(
        'route-line',
        'line-color',
        isPausedOrDelayed ? '#f59e0b' : mapTheme === 'dark' ? '#38bdf8' : '#0284c7'
      );
    }
  }, [animatedProgress, shipment.currentStatus, shipment.isPaused, mapLoaded, mapTheme]);

  // Function to build layers, polyline, origin/destination pins, and animated vehicle marker
  const renderMapLayersAndMarkers = (map: maplibregl.Map) => {
    const routeCoords = getRouteCoordinates();

    // Update or add route GeoJSON source
    if (map.getSource('route')) {
      (map.getSource('route') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: routeCoords },
      });
    } else {
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: routeCoords },
        },
      });

      // Route Casing Outer Glow
      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#0284c7',
          'line-width': 8,
          'line-opacity': 0.35,
          'line-blur': 4,
        },
      });

      // Route Primary Line
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': shipment.currentStatus === 'Delayed' || shipment.isPaused ? '#f59e0b' : '#38bdf8',
          'line-width': 4,
        },
      });
    }

    // Fit map bounds to encompass full route
    if (routeCoords.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      routeCoords.forEach((coord) => bounds.extend(coord));
      map.fitBounds(bounds, { padding: 70, maxZoom: 7, duration: 1000 });
    }

    // Clean existing markers
    if (originMarkerRef.current) originMarkerRef.current.remove();
    if (destMarkerRef.current) destMarkerRef.current.remove();
    if (vehicleMarkerRef.current) vehicleMarkerRef.current.remove();
    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current = [];

    // 1. ORIGIN MARKER
    const originEl = document.createElement('div');
    originEl.className = 'flex flex-col items-center group cursor-pointer';
    originEl.innerHTML = `
      <div class="px-2 py-0.5 bg-emerald-600 text-white font-mono text-[10px] font-bold rounded shadow-lg border border-emerald-400 mb-1 tracking-wider whitespace-nowrap">
        ORIGIN
      </div>
      <div class="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_12px_rgba(16,185,129,0.8)] flex items-center justify-center text-white">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
      </div>
    `;
    originMarkerRef.current = new maplibregl.Marker({ element: originEl, anchor: 'bottom' })
      .setLngLat(shipment.originCoords)
      .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(`
        <div style="font-family: sans-serif; padding: 4px;">
          <div style="color: #10b981; font-weight: bold; font-size: 12px; text-transform: uppercase;">Dispatch Origin</div>
          <div style="color: #0f172a; font-weight: 700; font-size: 13px;">${shipment.origin}</div>
        </div>
      `))
      .addTo(map);

    // 2. DESTINATION MARKER
    const destEl = document.createElement('div');
    destEl.className = 'flex flex-col items-center group cursor-pointer';
    destEl.innerHTML = `
      <div class="px-2 py-0.5 bg-rose-600 text-white font-mono text-[10px] font-bold rounded shadow-lg border border-rose-400 mb-1 tracking-wider whitespace-nowrap">
        DESTINATION
      </div>
      <div class="w-7 h-7 rounded-full bg-rose-500 border-2 border-white shadow-[0_0_12px_rgba(244,63,94,0.8)] flex items-center justify-center text-white">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/></svg>
      </div>
    `;
    destMarkerRef.current = new maplibregl.Marker({ element: destEl, anchor: 'bottom' })
      .setLngLat(shipment.destinationCoords)
      .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(`
        <div style="font-family: sans-serif; padding: 4px;">
          <div style="color: #f43f5e; font-weight: bold; font-size: 12px; text-transform: uppercase;">Final Destination</div>
          <div style="color: #0f172a; font-weight: 700; font-size: 13px;">${shipment.destination}</div>
          <div style="color: #64748b; font-size: 11px;">Consignee: ${shipment.receiver}</div>
        </div>
      `))
      .addTo(map);

    // 3. INTERMEDIATE CHECKPOINT STOPS
    if (shipment.stops && shipment.stops.length > 0) {
      shipment.stops.forEach((stop, idx) => {
        if (typeof stop.lng !== 'number' || typeof stop.lat !== 'number') return;
        const stopEl = document.createElement('div');
        stopEl.className = 'flex flex-col items-center cursor-pointer';
        const isCurrentStop = stop.status === 'current';
        const isCompleted = stop.status === 'completed';

        const badgeColor = isCompleted
          ? 'bg-emerald-600 border-emerald-400 text-white'
          : isCurrentStop
          ? 'bg-amber-500 border-amber-300 text-slate-950 font-black animate-pulse'
          : 'bg-slate-700 border-slate-500 text-slate-200';

        stopEl.innerHTML = `
          <div class="px-1.5 py-0.5 ${badgeColor} font-mono text-[9px] font-bold rounded shadow-md border mb-0.5 whitespace-nowrap">
            Stop #${idx + 1}
          </div>
          <div class="w-4 h-4 rounded-full ${isCurrentStop ? 'bg-amber-400 ring-4 ring-amber-400/40' : isCompleted ? 'bg-emerald-400' : 'bg-slate-500'} border-2 border-white shadow-md"></div>
        `;

        const marker = new maplibregl.Marker({ element: stopEl, anchor: 'bottom' })
          .setLngLat([stop.lng, stop.lat])
          .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML(`
            <div style="font-family: sans-serif; padding: 4px;">
              <div style="font-weight: bold; color: #0284c7; font-size: 12px;">Checkpoint #${idx + 1}: ${stop.name}</div>
              <div style="color: #64748b; font-size: 11px;">Status: <strong style="color: ${isCompleted ? '#10b981' : isCurrentStop ? '#f59e0b' : '#64748b'};">${stop.status.toUpperCase()}</strong></div>
              <div style="color: #64748b; font-size: 11px;">ETA: ${stop.estimatedArrival}</div>
              ${stop.notes ? `<div style="color: #334155; font-size: 10px; margin-top: 2px;">${stop.notes}</div>` : ''}
            </div>
          `))
          .addTo(map);

        stopMarkersRef.current.push(marker);
      });
    }

    // 4. ANIMATED VEHICLE LIVE MARKER WITH SVG ROTATION
    const { pos, heading } = calculatePositionAndHeading(animatedProgress);
    const vehicleEl = document.createElement('div');
    vehicleEl.className = 'relative flex items-center justify-center cursor-pointer';

    // Pick SVG icon and style based on shipmentType
    let vehicleSvg = '';
    let shadowColor = '';

    if (shipment.shipmentType === 'Air') {
      vehicleSvg = `
        <svg class="w-7 h-7 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>`;
      shadowColor = 'shadow-[0_0_20px_rgba(56,189,248,0.8)] bg-gradient-to-tr from-sky-600 via-blue-600 to-cyan-400';
    } else if (shipment.shipmentType === 'Sea') {
      vehicleSvg = `
        <svg class="w-6 h-6 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.64 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.04-.78s-.28-.42-.52-.51L20 10.4V6c0-.55-.45-1-1-1h-3V3c0-.55-.45-1-1-1h-2c-.55 0-1 .45-1 1v2H9c-.55 0-1 .45-1 1v4.4l-1.38.53c-.24.09-.42.27-.52.51s-.12.52-.04.78L3.95 19zM15 5h-2V4h2v1z"/>
        </svg>`;
      shadowColor = 'shadow-[0_0_20px_rgba(14,165,233,0.8)] bg-gradient-to-tr from-cyan-600 via-teal-600 to-sky-400';
    } else if (shipment.shipmentType === 'Road') {
      vehicleSvg = `
        <svg class="w-6 h-6 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
        </svg>`;
      shadowColor = 'shadow-[0_0_20px_rgba(99,102,241,0.8)] bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-400';
    } else {
      // Express Delivery
      vehicleSvg = `
        <svg class="w-6 h-6 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>`;
      shadowColor = 'shadow-[0_0_20px_rgba(245,158,11,0.8)] bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400';
    }

    const isDelayed = shipment.currentStatus === 'Delayed' || shipment.isPaused;
    if (isDelayed) {
      shadowColor = 'shadow-[0_0_20px_rgba(239,68,68,0.9)] bg-gradient-to-tr from-red-600 via-amber-600 to-rose-500';
    }

    vehicleEl.innerHTML = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-12 h-12 rounded-full ${isDelayed ? 'bg-rose-500/40' : 'bg-sky-400/40'} animate-ping"></div>
        <div class="vehicle-inner w-11 h-11 rounded-full ${shadowColor} border-2 border-white flex items-center justify-center z-10 transition-transform duration-300" style="transform: rotate(${Math.round(heading)}deg);">
          ${vehicleSvg}
        </div>
      </div>
    `;

    vehicleInnerElRef.current = vehicleEl.querySelector('.vehicle-inner');

    vehicleMarkerRef.current = new maplibregl.Marker({ element: vehicleEl })
      .setLngLat(pos)
      .setPopup(new maplibregl.Popup({ offset: 16 }).setHTML(`
        <div style="font-family: sans-serif; padding: 6px;">
          <div style="font-weight: 800; color: #0284c7; font-size: 13px;">${shipment.trackingCode} (${shipment.shipmentType} Freight)</div>
          <div style="color: #0f172a; font-weight: 700; font-size: 12px; margin-top: 2px;">Status: ${shipment.currentStatus}</div>
          <div style="color: #475569; font-size: 11px;">Current Terminal: ${shipment.currentLocationName}</div>
          <div style="color: #0284c7; font-size: 11px; font-weight: bold; margin-top: 2px;">Progress: ${Math.round(shipment.progressPercent || 0)}%</div>
        </div>
      `))
      .addTo(map);
  };

  // Fullscreen map toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const isPausedOrHalted = shipment.isPaused || shipment.currentStatus === 'Paused' || shipment.currentStatus === 'Delayed';

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : ''
      }`}
    >
      {/* Top Overlay Logistics Banner */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800/80 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${
            isPausedOrHalted
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              : 'bg-sky-500/20 text-sky-400 border-sky-500/40'
          }`}>
            {shipment.shipmentType === 'Air' && <Plane className="w-5 h-5 animate-pulse" />}
            {shipment.shipmentType === 'Sea' && <Ship className="w-5 h-5 animate-pulse" />}
            {shipment.shipmentType === 'Road' && <Truck className="w-5 h-5 animate-pulse" />}
            {shipment.shipmentType === 'Express' && <Package className="w-5 h-5 animate-pulse" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider">
                {shipment.shipmentType} Freight GPS Telemetry
              </span>
              {isPausedOrHalted ? (
                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/40 flex items-center gap-1 font-mono animate-pulse">
                  <Pause className="w-3 h-3" /> TRANSIT PAUSED
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/40 flex items-center gap-1 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> LIVE TRANSMITTING
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
              <span>{shipment.currentLocationName}</span>
            </h3>
          </div>
        </div>

        {/* Map Control Buttons (Theme, Fit Bounds, Zoom, Fullscreen) */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={() => setMapTheme(mapTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
            title="Toggle Light / Dark Map Vector Theme"
          >
            {mapTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />}
          </button>

          {/* Fit Route Bounds */}
          <button
            onClick={() => {
              if (mapRef.current) {
                const routeCoords = getRouteCoordinates();
                const bounds = new maplibregl.LngLatBounds();
                routeCoords.forEach((c) => bounds.extend(c));
                mapRef.current.fitBounds(bounds, { padding: 70, maxZoom: 7, duration: 800 });
              }
            }}
            className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors text-xs font-mono font-bold flex items-center gap-1"
            title="Fit Entire Shipment Route"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fit Route</span>
          </button>

          {/* Zoom In */}
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
            title="Toggle Fullscreen Mode"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* PAUSED / DELAY REASON OVERLAY BOX BANNER */}
      {isPausedOrHalted && (
        <div className="absolute top-28 left-4 right-4 z-10 bg-slate-950/95 backdrop-blur-lg border-2 border-amber-500/80 p-4 sm:p-5 rounded-2xl shadow-2xl text-white space-y-3 max-w-xl mx-auto animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-amber-500/30 pb-2.5">
            <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
              <span>Shipment Temporarily Delayed</span>
            </div>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold rounded uppercase">
              Operational Hold
            </span>
          </div>

          <div className="space-y-2 text-xs font-sans text-amber-100">
            <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/30 space-y-1">
              <span className="text-[11px] font-bold text-amber-300 font-mono uppercase block">Reason for Hold:</span>
              <p className="font-semibold text-white leading-relaxed">
                {shipment.delayReason || 'Consignment temporarily held at transit hub for customs inspection & security verification.'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1 text-slate-300 font-mono text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Estimated Resume Clearance:
              </span>
              <span className="font-bold text-sky-400">{shipment.estimatedResume || '2:30 PM UTC'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Map Container Element */}
      <div
        ref={mapContainerRef}
        className={`w-full ${isFullscreen ? 'h-screen' : 'h-[480px] sm:h-[550px]'}`}
        id="live-gps-map-canvas"
      />

      {/* Bottom Route Progress Stats Bar */}
      <div className="bg-slate-950/90 border-t border-slate-800 p-3.5 px-6 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-300">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-slate-500 text-[10px] uppercase block font-bold">Origin Terminal</span>
            <span className="text-white font-bold">{shipment.origin}</span>
          </div>
          <span className="text-slate-600">➔</span>
          <div>
            <span className="text-slate-500 text-[10px] uppercase block font-bold">Destination</span>
            <span className="text-white font-bold">{shipment.destination}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div>
            <span className="text-slate-500 text-[10px] uppercase block font-bold">Route Progress</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.round(shipment.progressPercent || 0)}%` }}
                />
              </div>
              <span className="text-sky-400 font-bold">{Math.round(shipment.progressPercent || 0)}%</span>
            </div>
          </div>

          <div>
            <span className="text-slate-500 text-[10px] uppercase block font-bold">Estimated Delivery</span>
            <span className="text-white font-bold">{shipment.estimatedDelivery}</span>
          </div>
        </div>
      </div>

      {/* Admin Panel Controls Hook (when isAdminControl === true) */}
      {isAdminControl && (
        <div className="bg-slate-900 p-4 sm:p-5 border-t border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-sky-400 uppercase">
              <Navigation className="w-4 h-4 text-sky-400" />
              <span>Admin GPS Real-Time Movement Engine</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Advance to Next Checkpoint Button */}
              {onAdvanceNextCheckpoint && (
                <button
                  onClick={onAdvanceNextCheckpoint}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all font-mono"
                  title="Jump vehicle position to the next checkpoint stop"
                  id="admin-advance-checkpoint-btn"
                >
                  <FastForward className="w-3.5 h-3.5" /> Next Checkpoint
                </button>
              )}

              {/* Start / Pause Movement Toggle */}
              {onTogglePause && (
                <button
                  onClick={() => onTogglePause(!shipment.isPaused)}
                  className={`px-4 py-2 rounded-xl text-xs font-black font-mono flex items-center gap-2 transition-all shadow-md ${
                    shipment.isPaused
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                  id="admin-toggle-pause-btn"
                >
                  {shipment.isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
                  {shipment.isPaused ? 'Resume Movement' : 'Pause Shipment Movement'}
                </button>
              )}
            </div>
          </div>

          {/* Progress Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400 font-bold">Adjust Manual Progress Position:</span>
              <span className="text-sky-400 font-black">{Math.round(shipment.progressPercent || 0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={shipment.progressPercent || 0}
              onChange={(e) => onUpdateProgress && onUpdateProgress(parseFloat(e.target.value))}
              className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-400 border border-slate-800"
              id="admin-progress-slider"
            />
          </div>
        </div>
      )}
    </div>
  );
};
