import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shipment } from '../types';
import {
  Plane, Truck, Ship, Package, Navigation, Play, Pause,
  Layers, RotateCcw, ZoomIn, ZoomOut, Maximize2, Minimize2,
  ShieldAlert, Clock, Compass, Radio, Activity
} from 'lucide-react';

interface MapComponentProps {
  shipment: Shipment;
  isAdminControl?: boolean;
  onUpdateProgress?: (progress: number) => void;
  onTogglePause?: (isPaused: boolean) => void;
  onSetDelayReason?: (reason: string, resumeTime?: string) => void;
  onAdvanceNextCheckpoint?: () => void;
}

// Haversine distance in km between [lng, lat] coords
function haversineDistance(start: [number, number], end: [number, number]): number {
  const R = 6371;
  const dLat = ((end[1] - start[1]) * Math.PI) / 180;
  const dLng = ((end[0] - start[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((start[1] * Math.PI) / 180) *
      Math.cos((end[1] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Bearing angle in degrees (0-360) between [lng, lat] coords (0 = North, 90 = East, 180 = South, 270 = West)
function calculateBearing(start: [number, number], end: [number, number]): number {
  const startLng = (start[0] * Math.PI) / 180;
  const startLat = (start[1] * Math.PI) / 180;
  const endLng = (end[0] * Math.PI) / 180;
  const endLat = (end[1] * Math.PI) / 180;
  const dLng = endLng - startLng;
  const y = Math.sin(dLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// High-precision spherical great circle curve generator for pixel-perfect flight paths
function generateCurvedPoints(
  p1: [number, number],
  p2: [number, number],
  numPoints: number = 60
): [number, number][] {
  const points: [number, number][] = [];
  const startLng = (p1[0] * Math.PI) / 180;
  const startLat = (p1[1] * Math.PI) / 180;
  const endLng = (p2[0] * Math.PI) / 180;
  const endLat = (p2[1] * Math.PI) / 180;

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((startLat - endLat) / 2), 2) +
          Math.cos(startLat) *
            Math.cos(endLat) *
            Math.pow(Math.sin((startLng - endLng) / 2), 2)
      )
    );

  if (d === 0 || isNaN(d)) return [p1, p2];

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(startLat) * Math.cos(startLng) + B * Math.cos(endLat) * Math.cos(endLng);
    const y = A * Math.cos(startLat) * Math.sin(startLng) + B * Math.cos(endLat) * Math.sin(endLng);
    const z = A * Math.sin(startLat) + B * Math.sin(endLat);
    const lat = Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)));
    const lng = Math.atan2(y, x);
    points.push([(lng * 180) / Math.PI, (lat * 180) / Math.PI]);
  }
  return points;
}

// Angular slerp helper for smooth shortest-angle rotation
function lerpAngle(current: number, target: number, t: number): number {
  const diff = ((target - current + 540) % 360) - 180;
  return (current + diff * t + 360) % 360;
}

type MapTheme = 'dark' | 'satellite' | 'streets' | 'terrain';

interface TileConfig {
  url: string;
  subdomains: string;
  maxZoom: number;
  label: string;
  attribution: string;
}

// Zero-API-key, zero-watermark public basemap providers
const TILE_PROVIDERS: Record<MapTheme, TileConfig> = {
  dark: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxZoom: 19,
    label: 'Radar Dark',
    attribution: '&copy; OpenStreetMap contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    subdomains: '',
    maxZoom: 19,
    label: 'Satellite',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
  },
  streets: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxZoom: 19,
    label: 'Streets',
    attribution: '&copy; OpenStreetMap contributors',
  },
  terrain: {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxZoom: 19,
    label: 'Terrain',
    attribution: '&copy; OpenStreetMap contributors, HOT',
  },
};

export const MapComponent: React.FC<MapComponentProps> = ({
  shipment,
  isAdminControl = false,
  onUpdateProgress,
  onTogglePause,
  onAdvanceNextCheckpoint,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Markers and Polylines
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const checkpointMarkersRef = useRef<L.Marker[]>([]);
  
  // Polyline layers: Traveled (solid neon) and Projected (tactical dashed)
  const traveledLineRef = useRef<L.Polyline | null>(null);
  const traveledCasingRef = useRef<L.Polyline | null>(null);
  const projectedLineRef = useRef<L.Polyline | null>(null);

  const [mapTheme, setMapTheme] = useState<MapTheme>('dark');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [isLiveCruising, setIsLiveCruising] = useState(true);
  const [isSimulatingFlight, setIsSimulatingFlight] = useState(false);

  // Internal smooth progress (0-100) and heading angle (0-360)
  const currentProgressRef = useRef<number>(shipment.progressPercent || 0);
  const targetProgressRef = useRef<number>(shipment.progressPercent || 0);
  const currentHeadingRef = useRef<number>(0);
  const [displayProgress, setDisplayProgress] = useState<number>(shipment.progressPercent || 0);

  // Sync target progress with shipment prop
  useEffect(() => {
    if (!isSimulatingFlight) {
      targetProgressRef.current = Math.max(0, Math.min(100, shipment.progressPercent || 0));
    }
  }, [shipment.progressPercent, isSimulatingFlight]);

  // Normalize full route waypoints: Origin -> Stops -> Destination
  const waypoints = useMemo<[number, number][]>(() => {
    const list: [number, number][] = [];
    if (shipment.originCoords && shipment.originCoords.length === 2) {
      list.push(shipment.originCoords);
    }
    if (shipment.stops && shipment.stops.length > 0) {
      shipment.stops.forEach((s) => {
        if (typeof s.lng === 'number' && typeof s.lat === 'number') {
          list.push([s.lng, s.lat]);
        }
      });
    }
    if (shipment.destinationCoords && shipment.destinationCoords.length === 2) {
      list.push(shipment.destinationCoords);
    }
    return list.length >= 2 ? list : [[-73.7781, 40.6413], [-122.4194, 37.7749]];
  }, [shipment.originCoords, shipment.destinationCoords, shipment.stops]);

  // Generate high-density interpolated route path for buttery-smooth vehicle movement
  const detailedPath = useMemo<[number, number][]>(() => {
    const fullPath: [number, number][] = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      const arc = shipment.shipmentType === 'Air'
        ? generateCurvedPoints(p1, p2, 60)
        : shipment.shipmentType === 'Sea'
        ? generateCurvedPoints(p1, p2, 40)
        : [p1, p2];
      
      if (i > 0) arc.shift();
      fullPath.push(...arc);
    }
    return fullPath;
  }, [waypoints, shipment.shipmentType]);

  // Precompute cumulative distances along detailed path for precision sub-pixel traversal
  const pathMetrics = useMemo(() => {
    if (detailedPath.length < 2) {
      return { totalDistance: 1, segmentDistances: [1], cumulativeDistances: [0, 1] };
    }
    const segmentDistances: number[] = [];
    const cumulativeDistances: number[] = [0];
    let total = 0;

    for (let i = 0; i < detailedPath.length - 1; i++) {
      const d = haversineDistance(detailedPath[i], detailedPath[i + 1]);
      const valid = d > 0.0001 ? d : 0.0001;
      segmentDistances.push(valid);
      total += valid;
      cumulativeDistances.push(total);
    }

    return { totalDistance: total || 1, segmentDistances, cumulativeDistances };
  }, [detailedPath]);

  // Calculate position, heading, and split paths at exact progress percent (0-100)
  const getInterpolatedTelemetry = useCallback(
    (progress: number) => {
      if (detailedPath.length === 0) {
        return {
          latLng: [40.6413, -73.7781] as [number, number],
          heading: 0,
          traveledCoords: [] as [number, number][],
          remainingCoords: [] as [number, number][],
          altitudeFt: 36000,
          speedKts: 510,
        };
      }
      if (detailedPath.length === 1) {
        return {
          latLng: [detailedPath[0][1], detailedPath[0][0]] as [number, number],
          heading: 0,
          traveledCoords: [[detailedPath[0][1], detailedPath[0][0]] as [number, number]],
          remainingCoords: [] as [number, number][],
          altitudeFt: 0,
          speedKts: 0,
        };
      }

      const clamped = Math.max(0, Math.min(100, progress));
      const targetDist = (clamped / 100) * pathMetrics.totalDistance;
      const { cumulativeDistances } = pathMetrics;

      let segIdx = 0;
      for (let i = 0; i < cumulativeDistances.length - 1; i++) {
        if (targetDist >= cumulativeDistances[i] && targetDist <= cumulativeDistances[i + 1]) {
          segIdx = i;
          break;
        }
        if (i === cumulativeDistances.length - 2) {
          segIdx = i;
        }
      }

      const segStartDist = cumulativeDistances[segIdx];
      const segLen = pathMetrics.segmentDistances[segIdx] || 0.0001;
      const t = Math.max(0, Math.min(1, (targetDist - segStartDist) / segLen));

      const p1 = detailedPath[segIdx];
      const p2 = detailedPath[segIdx + 1] || p1;

      const lng = p1[0] + (p2[0] - p1[0]) * t;
      const lat = p1[1] + (p2[1] - p1[1]) * t;
      const heading = calculateBearing(p1, p2);

      // Traveled points up to current position
      const traveled: [number, number][] = [];
      for (let i = 0; i <= segIdx; i++) {
        traveled.push([detailedPath[i][1], detailedPath[i][0]]);
      }
      traveled.push([lat, lng]);

      // Remaining points from current position
      const remaining: [number, number][] = [[lat, lng]];
      for (let i = segIdx + 1; i < detailedPath.length; i++) {
        remaining.push([detailedPath[i][1], detailedPath[i][0]]);
      }

      // Realistic flight telemetry based on flight phase (takeoff, cruise, descent)
      let altitudeFt = 36000;
      let speedKts = 510;
      if (shipment.shipmentType === 'Air') {
        if (clamped < 10) {
          altitudeFt = Math.round((clamped / 10) * 36000);
          speedKts = Math.round(180 + (clamped / 10) * 330);
        } else if (clamped > 90) {
          const descRatio = (100 - clamped) / 10;
          altitudeFt = Math.round(descRatio * 36000);
          speedKts = Math.round(180 + descRatio * 330);
        }
      } else if (shipment.shipmentType === 'Sea') {
        altitudeFt = 0;
        speedKts = 19;
      } else {
        altitudeFt = 680;
        speedKts = 65;
      }

      return {
        latLng: [lat, lng] as [number, number],
        heading,
        traveledCoords: traveled,
        remainingCoords: remaining,
        altitudeFt,
        speedKts,
      };
    },
    [detailedPath, pathMetrics, shipment.shipmentType]
  );

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapElementRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const initialTelemetry = getInterpolatedTelemetry(currentProgressRef.current);

      const map = L.map(mapElementRef.current, {
        center: initialTelemetry.latLng,
        zoom: 3,
        zoomControl: false,
        attributionControl: false,
        worldCopyJump: true,
      });

      mapInstanceRef.current = map;

      // Base tile layer
      const selected = TILE_PROVIDERS[mapTheme];
      const tiles = L.tileLayer(selected.url, {
        subdomains: selected.subdomains ? selected.subdomains.split('') : undefined,
        maxZoom: selected.maxZoom,
        attribution: selected.attribution,
      });

      tiles.on('tileerror', (errorEvent: any) => {
        const tile = errorEvent.tile as HTMLImageElement;
        if (tile && !tile.dataset.fallbackTried) {
          tile.dataset.fallbackTried = 'true';
          tile.src = `https://tile.openstreetmap.org/${errorEvent.coords.z}/${errorEvent.coords.x}/${errorEvent.coords.y}.png`;
        }
      });

      tiles.addTo(map);
      tileLayerRef.current = tiles;

      map.whenReady(() => {
        setMapReady(true);
        setTimeout(() => map.invalidateSize(), 150);
        setTimeout(() => map.invalidateSize(), 500);
      });

      const ro = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      ro.observe(mapElementRef.current);

      return () => {
        ro.disconnect();
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch (err) {
      console.error('[Leaflet Map Init Error]', err);
    }
  }, []);

  // Update Tile Layer smoothly when Theme Changes without map destruction
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const selected = TILE_PROVIDERS[mapTheme];
    tileLayerRef.current.setUrl(selected.url);
  }, [mapTheme]);

  // Static Landmarks: Origin, Destination, Checkpoints
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    // 1. ORIGIN MARKER
    if (originMarkerRef.current) originMarkerRef.current.remove();
    const originLatLng: [number, number] = [shipment.originCoords[1], shipment.originCoords[0]];
    const originIcon = L.divIcon({
      className: 'custom-origin-icon',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
          <div style="background: #10b981; color: #ffffff; font-family: monospace; font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 5px; border: 1px solid #34d399; box-shadow: 0 4px 10px rgba(0,0,0,0.6); white-space: nowrap; margin-bottom: 3px; letter-spacing: 0.5px;">
            DEP: ORIGIN
          </div>
          <div style="width: 28px; height: 28px; border-radius: 50%; background: #10b981; border: 2.5px solid #ffffff; box-shadow: 0 0 18px rgba(16,185,129,0.95); display: flex; align-items: center; justify-content: center; color: white;">
            <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
          </div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
    originMarkerRef.current = L.marker(originLatLng, { icon: originIcon })
      .bindPopup(`
        <div style="padding: 6px; font-family: system-ui, sans-serif;">
          <div style="color: #10b981; font-weight: 800; font-size: 11px; text-transform: uppercase;">Departure Origin Hub</div>
          <div style="color: #ffffff; font-weight: 700; font-size: 13px;">${shipment.origin}</div>
          <div style="color: #94a3b8; font-size: 10px; margin-top: 2px;">Shipper: ${shipment.sender}</div>
        </div>
      `)
      .addTo(map);

    // 2. DESTINATION MARKER
    if (destMarkerRef.current) destMarkerRef.current.remove();
    const destLatLng: [number, number] = [shipment.destinationCoords[1], shipment.destinationCoords[0]];
    const destIcon = L.divIcon({
      className: 'custom-dest-icon',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
          <div style="background: #f43f5e; color: #ffffff; font-family: monospace; font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 5px; border: 1px solid #fb7185; box-shadow: 0 4px 10px rgba(0,0,0,0.6); white-space: nowrap; margin-bottom: 3px; letter-spacing: 0.5px;">
            ARR: FINAL DEST
          </div>
          <div style="width: 28px; height: 28px; border-radius: 50%; background: #f43f5e; border: 2.5px solid #ffffff; box-shadow: 0 0 18px rgba(244,63,94,0.95); display: flex; align-items: center; justify-content: center; color: white;">
            <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/></svg>
          </div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
    destMarkerRef.current = L.marker(destLatLng, { icon: destIcon })
      .bindPopup(`
        <div style="padding: 6px; font-family: system-ui, sans-serif;">
          <div style="color: #f43f5e; font-weight: 800; font-size: 11px; text-transform: uppercase;">Final Destination Hub</div>
          <div style="color: #ffffff; font-weight: 700; font-size: 13px;">${shipment.destination}</div>
          <div style="color: #94a3b8; font-size: 11px; margin-top: 2px;">Consignee: ${shipment.receiver}</div>
        </div>
      `)
      .addTo(map);

    // 3. INTERMEDIATE CHECKPOINT STOPS
    checkpointMarkersRef.current.forEach((m) => m.remove());
    checkpointMarkersRef.current = [];

    if (shipment.stops && shipment.stops.length > 0) {
      shipment.stops.forEach((stop, idx) => {
        if (typeof stop.lat !== 'number' || typeof stop.lng !== 'number') return;
        const isCompleted = stop.status === 'completed';
        const isCurrent = stop.status === 'current';

        const bg = isCompleted ? '#10b981' : isCurrent ? '#f59e0b' : '#64748b';
        const stopIcon = L.divIcon({
          className: 'custom-stop-icon',
          html: `
            <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
              <div style="background: ${bg}; color: white; font-family: monospace; font-size: 8px; font-weight: bold; padding: 1px 5px; border-radius: 4px; margin-bottom: 2px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.5);">
                WPT #${idx + 1}
              </div>
              <div style="width: 18px; height: 18px; border-radius: 50%; background: ${bg}; border: 2px solid #ffffff; box-shadow: 0 0 10px rgba(0,0,0,0.6);"></div>
            </div>
          `,
          iconSize: [18, 18],
          iconAnchor: [9, 18],
        });

        const stopMarker = L.marker([stop.lat, stop.lng], { icon: stopIcon })
          .bindPopup(`
            <div style="padding: 6px; font-family: system-ui, sans-serif;">
              <div style="font-weight: 800; color: #38bdf8; font-size: 12px;">Waypoint #${idx + 1}: ${stop.name}</div>
              <div style="color: #cbd5e1; font-size: 11px; margin-top: 2px;">Status: <strong style="color: ${bg}; text-transform: uppercase;">${stop.status}</strong></div>
              <div style="color: #94a3b8; font-size: 10px;">ETA: ${stop.estimatedArrival}</div>
              ${stop.notes ? `<div style="color: #64748b; font-size: 10px; margin-top: 2px;">${stop.notes}</div>` : ''}
            </div>
          `)
          .addTo(map);

        checkpointMarkersRef.current.push(stopMarker);
      });
    }

    // Initial fit bounds
    const allLatLngs: L.LatLngExpression[] = detailedPath.map((p) => [p[1], p[0]]);
    if (allLatLngs.length >= 2) {
      map.fitBounds(L.latLngBounds(allLatLngs), { padding: [55, 55], maxZoom: 6 });
    }
  }, [detailedPath, shipment.originCoords, shipment.destinationCoords, shipment.stops, mapReady]);

  // Build the high-fidelity vector vehicle HTML
  const buildVehicleIconHtml = (heading: number, altitudeFt: number, speedKts: number) => {
    const isDelayed = shipment.currentStatus === 'Delayed' || shipment.isPaused;
    const type = shipment.shipmentType;

    // Vector Airplane: Pixel-Perfect Widebody Jet silhouette with engines, winglets, strobe lights, and contrails
    let vehicleSvg = '';
    let hudTagText = '';

    if (type === 'Air') {
      hudTagText = `✈ FL${Math.round(altitudeFt / 100)} • ${speedKts} KTS`;
      vehicleSvg = `
        <svg viewBox="0 0 64 64" width="46" height="46" style="filter: drop-shadow(0 0 10px rgba(56,189,248,0.7)); display: block;">
          <defs>
            <linearGradient id="fuselageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" />
              <stop offset="50%" stop-color="#e0f2fe" />
              <stop offset="100%" stop-color="#38bdf8" />
            </linearGradient>
            <linearGradient id="wingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#f8fafc" />
              <stop offset="100%" stop-color="#0284c7" />
            </linearGradient>
            <linearGradient id="contrailGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="rgba(56,189,248,0.85)" />
              <stop offset="100%" stop-color="rgba(56,189,248,0)" />
            </linearGradient>
          </defs>

          <!-- Supersonic Jet Contrails streaming from twin engines -->
          <line x1="22" y1="42" x2="22" y2="62" stroke="url(#contrailGrad)" stroke-width="2.5" stroke-linecap="round" class="contrail-glow" />
          <line x1="42" y1="42" x2="42" y2="62" stroke="url(#contrailGrad)" stroke-width="2.5" stroke-linecap="round" class="contrail-glow" />

          <!-- Swept Main Wings -->
          <polygon points="32,24 62,37 60,40 36,34" fill="url(#wingGrad)" stroke="#38bdf8" stroke-width="0.75" />
          <polygon points="32,24 2,37 4,40 28,34" fill="url(#wingGrad)" stroke="#38bdf8" stroke-width="0.75" />

          <!-- Winglets -->
          <polygon points="62,37 63,33 60,37" fill="#38bdf8" />
          <polygon points="2,37 1,33 4,37" fill="#38bdf8" />

          <!-- Twin Underslung Turbofan Nacelles -->
          <rect x="20" y="32" width="4.5" height="10" rx="2" fill="#0369a1" stroke="#38bdf8" stroke-width="0.75" />
          <rect x="39.5" y="32" width="4.5" height="10" rx="2" fill="#0369a1" stroke="#38bdf8" stroke-width="0.75" />

          <!-- Horizontal Tail Stabilizers -->
          <polygon points="32,50 48,58 46,60 32,54" fill="#0284c7" stroke="#38bdf8" stroke-width="0.5" />
          <polygon points="32,50 16,58 18,60 32,54" fill="#0284c7" stroke="#38bdf8" stroke-width="0.5" />

          <!-- Fuselage Body (Aerodynamic dart) -->
          <path d="M32 4 C30 10, 29 20, 29 48 C29 55, 30.5 58, 32 60 C33.5 58, 35 55, 35 48 C35 20, 34 10, 32 4 Z" fill="url(#fuselageGrad)" stroke="#0284c7" stroke-width="0.8" />

          <!-- Cockpit Glint -->
          <ellipse cx="32" cy="14" rx="2" ry="3.5" fill="#0369a1" />

          <!-- Vertical Tail Fin (Rudder) -->
          <polygon points="31,46 33,46 32.5,58 31.5,58" fill="#38bdf8" />

          <!-- FAA/ICAO Standard Navigation Strobes -->
          <!-- Red port wing light -->
          <circle cx="2" cy="37" r="2" fill="#ef4444" class="strobe-left-red" />
          <!-- Green starboard wing light -->
          <circle cx="62" cy="37" r="2" fill="#10b981" class="strobe-right-green" />
          <!-- White anti-collision tail strobe -->
          <circle cx="32" cy="59" r="2" fill="#ffffff" class="strobe-tail-white" />
        </svg>
      `;
    } else if (type === 'Sea') {
      hudTagText = `⚓ 19.4 KTS • AIS LIVE`;
      vehicleSvg = `
        <svg viewBox="0 0 64 64" width="44" height="44" style="filter: drop-shadow(0 0 10px rgba(56,189,248,0.7)); display: block;">
          <!-- Vessel Hull -->
          <path d="M32 4 C38 12, 42 24, 42 54 C38 58, 26 58, 22 54 C22 24, 26 12, 32 4 Z" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5" />
          <!-- Container Stacks -->
          <rect x="26" y="20" width="12" height="6" fill="#38bdf8" rx="1" />
          <rect x="26" y="28" width="12" height="6" fill="#0ea5e9" rx="1" />
          <rect x="26" y="36" width="12" height="6" fill="#0284c7" rx="1" />
          <!-- Bridge Navigation Deck -->
          <rect x="27" y="44" width="10" height="5" fill="#ffffff" rx="1" />
          <!-- Mast beacon -->
          <circle cx="32" cy="46" r="1.5" fill="#10b981" class="strobe-right-green" />
        </svg>
      `;
    } else {
      hudTagText = type === 'Road' ? `🚛 65 MPH • GPS LOCK` : `📦 EXPRESS • GPS SYNC`;
      vehicleSvg = `
        <svg viewBox="0 0 64 64" width="40" height="40" style="filter: drop-shadow(0 0 10px rgba(56,189,248,0.7)); display: block;">
          <!-- Vehicle Cab & Trailer -->
          <rect x="24" y="6" width="16" height="36" rx="3" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5" />
          <rect x="26" y="8" width="12" height="10" rx="2" fill="#38bdf8" />
          <!-- Windshield -->
          <rect x="27" y="10" width="10" height="4" fill="#ffffff" />
          <!-- Wheels -->
          <rect x="21" y="14" width="3" height="7" rx="1" fill="#0f172a" />
          <rect x="40" y="14" width="3" height="7" rx="1" fill="#0f172a" />
          <rect x="21" y="30" width="3" height="8" rx="1" fill="#0f172a" />
          <rect x="40" y="30" width="3" height="8" rx="1" fill="#0f172a" />
          <!-- Headlights -->
          <circle cx="28" cy="7" r="1.5" fill="#fef08a" class="strobe-tail-white" />
          <circle cx="36" cy="7" r="1.5" fill="#fef08a" class="strobe-tail-white" />
        </svg>
      `;
    }

    const ringColor = isDelayed ? 'rgba(239, 68, 68, 0.45)' : 'rgba(56, 189, 248, 0.45)';
    const ringBorder = isDelayed ? 'rgba(239, 68, 68, 0.9)' : 'rgba(56, 189, 248, 0.9)';

    return `
      <div style="position: relative; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
        
        <!-- Radar Expanding Sonar Ping Ring -->
        <div style="position: absolute; width: 64px; height: 64px; border-radius: 50%; background: ${ringColor}; border: 1.5px solid ${ringBorder}; pointer-events: none;" class="radar-beacon-ripple"></div>

        <!-- Rotating Vehicle Container (Plane / Vessel / Truck) -->
        <div class="radar-vehicle-rotor" style="position: relative; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; transform: rotate(${Math.round(heading)}deg); transform-origin: center center; will-change: transform;">
          ${vehicleSvg}
        </div>

        <!-- Upright Live Flight Telemetry HUD Tag (Counter-rotated / upright above aircraft) -->
        <div class="radar-hud-tag" style="position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: rgba(2, 6, 23, 0.92); border: 1px solid #38bdf8; color: #38bdf8; font-family: monospace; font-size: 9px; font-weight: 800; padding: 1.5px 6px; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.8), 0 0 10px rgba(56,189,248,0.3); white-space: nowrap; pointer-events: none; z-index: 10;">
          ${hudTagText}
        </div>

      </div>
    `;
  };

  // Continuous Buttery-Smooth Animation Loop
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    let animFrameId: number;
    let lastTimestamp = performance.now();

    // 1. Initialize Polylines
    if (!traveledCasingRef.current) {
      traveledCasingRef.current = L.polyline([], {
        color: '#0284c7',
        weight: 7,
        opacity: 0.4,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }

    if (!traveledLineRef.current) {
      traveledLineRef.current = L.polyline([], {
        color: shipment.isPaused || shipment.currentStatus === 'Delayed' ? '#f59e0b' : '#38bdf8',
        weight: 3.5,
        opacity: 0.98,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }

    if (!projectedLineRef.current) {
      projectedLineRef.current = L.polyline([], {
        color: '#0369a1',
        weight: 2.5,
        opacity: 0.55,
        dashArray: '5, 8',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }

    // 2. Initialize Vehicle Marker once
    const initTelemetry = getInterpolatedTelemetry(currentProgressRef.current);
    currentHeadingRef.current = initTelemetry.heading;

    if (!vehicleMarkerRef.current) {
      const icon = L.divIcon({
        className: 'custom-vehicle-radar-icon',
        html: buildVehicleIconHtml(initTelemetry.heading, initTelemetry.altitudeFt, initTelemetry.speedKts),
        iconSize: [64, 64],
        iconAnchor: [32, 32],
      });

      vehicleMarkerRef.current = L.marker(initTelemetry.latLng, {
        icon,
        zIndexOffset: 1000,
      }).addTo(map);

      vehicleMarkerRef.current.bindPopup(`
        <div style="padding: 6px; font-family: system-ui, sans-serif; min-width: 170px;">
          <div style="font-weight: 800; color: #38bdf8; font-size: 13px;">${shipment.trackingCode}</div>
          <div style="color: #cbd5e1; font-size: 11px; margin-top: 2px;">Type: <strong style="color: #38bdf8;">${shipment.shipmentType} Cargo</strong></div>
          <div style="color: #cbd5e1; font-size: 11px;">Status: <strong style="color: ${shipment.isPaused ? '#f59e0b' : '#34d399'};">${shipment.currentStatus}</strong></div>
          <div style="color: #94a3b8; font-size: 11px;">Current: ${shipment.currentLocationName}</div>
          <div style="color: #38bdf8; font-size: 11px; font-weight: bold; margin-top: 3px;" id="popup-progress-val">Progress: ${Math.round(currentProgressRef.current)}%</div>
        </div>
      `);
    }

    // 3. Animation Tick Function
    const tick = (now: number) => {
      const deltaSec = Math.min((now - lastTimestamp) / 1000, 0.1);
      lastTimestamp = now;

      // In-flight autonomous live cruise mode: smooth realistic forward drift when in transit
      const isHalted = shipment.isPaused || shipment.currentStatus === 'Delayed' || shipment.currentStatus === 'Delivered';

      if (isSimulatingFlight) {
        // Fast forward simulation loop (takes ~16s to fly full route)
        currentProgressRef.current += deltaSec * 6.0;
        if (currentProgressRef.current >= 100) {
          currentProgressRef.current = 100;
          setIsSimulatingFlight(false);
        }
      } else if (!isHalted && isLiveCruising) {
        // Normal live cruise micro-advancement (~0.04% per sec)
        const target = targetProgressRef.current;
        const diff = target - currentProgressRef.current;
        if (Math.abs(diff) > 0.05) {
          // Lerp toward target smoothly
          currentProgressRef.current += diff * Math.min(1, deltaSec * 4);
        } else {
          // Subtle authentic flight drift along the active airway
          currentProgressRef.current = Math.min(99.5, currentProgressRef.current + deltaSec * 0.035);
        }
      } else {
        // Static or paused: smoothly reach target
        const diff = targetProgressRef.current - currentProgressRef.current;
        if (Math.abs(diff) > 0.01) {
          currentProgressRef.current += diff * Math.min(1, deltaSec * 5);
        }
      }

      // Calculate current coordinates and heading
      const telemetry = getInterpolatedTelemetry(currentProgressRef.current);

      // Smooth heading angle via shortest-angle interpolation
      currentHeadingRef.current = lerpAngle(currentHeadingRef.current, telemetry.heading, Math.min(1, deltaSec * 8));

      // Update Leaflet marker position
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.setLatLng(telemetry.latLng);

        // Hardware-accelerated direct DOM element transform update (zero DOM thrash / no setIcon overhead)
        const markerElement = vehicleMarkerRef.current.getElement();
        if (markerElement) {
          const rotor = markerElement.querySelector('.radar-vehicle-rotor') as HTMLElement;
          if (rotor) {
            rotor.style.transform = `rotate(${Math.round(currentHeadingRef.current)}deg)`;
          }
          const hudTag = markerElement.querySelector('.radar-hud-tag') as HTMLElement;
          if (hudTag) {
            if (shipment.shipmentType === 'Air') {
              hudTag.textContent = `✈ FL${Math.round(telemetry.altitudeFt / 100)} • ${telemetry.speedKts} KTS`;
            } else if (shipment.shipmentType === 'Sea') {
              hudTag.textContent = `⚓ 19.4 KTS • AIS LIVE`;
            } else {
              hudTag.textContent = shipment.shipmentType === 'Road' ? `🚛 65 MPH • GPS` : `📦 EXPRESS • GPS`;
            }
          }
        }
      }

      // Update Polylines: Traveled (solid neon) & Remaining (projected dashed)
      if (traveledLineRef.current && traveledCasingRef.current) {
        traveledLineRef.current.setLatLngs(telemetry.traveledCoords);
        traveledCasingRef.current.setLatLngs(telemetry.traveledCoords);
      }
      if (projectedLineRef.current) {
        projectedLineRef.current.setLatLngs(telemetry.remainingCoords);
      }

      // Sync display state occasionally
      setDisplayProgress(currentProgressRef.current);

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [
    mapReady,
    isLiveCruising,
    isSimulatingFlight,
    shipment.shipmentType,
    shipment.currentStatus,
    shipment.isPaused,
    getInterpolatedTelemetry,
  ]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
      }).catch(() => {});
    }
  };

  const fitFullRoute = () => {
    if (!mapInstanceRef.current) return;
    const allLatLngs: L.LatLngExpression[] = detailedPath.map((p) => [p[1], p[0]]);
    if (allLatLngs.length >= 2) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(allLatLngs), { padding: [55, 55], maxZoom: 6 });
    }
  };

  const focusVehicle = () => {
    if (!mapInstanceRef.current) return;
    const tele = getInterpolatedTelemetry(currentProgressRef.current);
    mapInstanceRef.current.panTo(tele.latLng, { animate: true, duration: 0.8 });
  };

  const isPausedOrHalted =
    shipment.isPaused || shipment.currentStatus === 'Paused' || shipment.currentStatus === 'Delayed';

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : ''
      }`}
    >
      {/* Top Overlay Logistics Radar Banner */}
      <div className="absolute top-2 left-2 right-2 sm:top-4 sm:left-4 sm:right-4 z-20 flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-md p-2.5 sm:p-3 rounded-xl border border-slate-800/90 text-white shadow-xl">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl border ${
              isPausedOrHalted
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-sky-500/20 text-sky-400 border-sky-500/40'
            }`}
          >
            {shipment.shipmentType === 'Air' && <Plane className="w-4 h-4 sm:w-5 sm:h-5" />}
            {shipment.shipmentType === 'Sea' && <Ship className="w-4 h-4 sm:w-5 sm:h-5" />}
            {shipment.shipmentType === 'Road' && <Truck className="w-4 h-4 sm:w-5 sm:h-5" />}
            {shipment.shipmentType === 'Express' && <Package className="w-4 h-4 sm:w-5 sm:h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                {shipment.shipmentType} Radar Telemetry
              </span>
              {isPausedOrHalted ? (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/40 font-mono">
                  HOLD ACTIVE
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40 font-mono flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>TRANSPONDER SYNC</span>
                </span>
              )}
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
              {shipment.currentLocationName || 'In Flight Corridor'}
            </h3>
          </div>
        </div>

        {/* Map Actions & Flight Simulation Controls */}
        <div className="flex items-center gap-1.5">
          
          {/* Live Flight Cruise Mode Toggle */}
          <button
            onClick={() => setIsLiveCruising(!isLiveCruising)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
              isLiveCruising
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                : 'bg-slate-950/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle autonomous radar cruise movement"
          >
            <Activity className={`w-3.5 h-3.5 ${isLiveCruising ? 'text-sky-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">{isLiveCruising ? 'Cruise: Active' : 'Cruise: Paused'}</span>
          </button>

          {/* Simulate Full Flight Button */}
          <button
            onClick={() => {
              currentProgressRef.current = 0;
              setIsSimulatingFlight(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-sky-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors"
            title="Simulate full flight from takeoff to landing"
          >
            <Play className="w-3 h-3 fill-current text-sky-400" />
            <span className="hidden sm:inline">Sim Flight</span>
          </button>

          {/* Focus on Aircraft */}
          <button
            onClick={focusVehicle}
            className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
            title="Center Camera on Aircraft"
          >
            <Compass className="w-3.5 h-3.5 text-sky-400" />
          </button>

          {/* Theme Switcher: Radar Dark -> Satellite -> Streets -> Terrain */}
          <button
            onClick={() => {
              const sequence: MapTheme[] = ['dark', 'satellite', 'streets', 'terrain'];
              const nextIdx = (sequence.indexOf(mapTheme) + 1) % sequence.length;
              setMapTheme(sequence[nextIdx]);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors"
            title="Switch Map Tile Layer (100% Free, Zero API Keys Required)"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span className="capitalize hidden sm:inline">{TILE_PROVIDERS[mapTheme].label}</span>
          </button>

          {/* Reset View / Fit Full Route */}
          <button
            onClick={fitFullRoute}
            className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
            title="Fit Full Route Bounds"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Controls */}
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* OPERATIONAL DELAY BANNER */}
      {isPausedOrHalted && (
        <div className="absolute top-20 sm:top-24 left-3 right-3 sm:left-6 sm:right-6 z-20 bg-slate-950/95 backdrop-blur-md border border-amber-500/60 p-3.5 sm:p-4 rounded-xl shadow-2xl text-white space-y-2 max-w-lg mx-auto">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Consignment Operational Hold</span>
            </div>
            <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded">
              CUSTOMS & INSPECTION
            </span>
          </div>
          <p className="text-xs text-amber-100 leading-relaxed">
            {shipment.delayReason ||
              'Consignment temporarily held at transit hub for customs inspection & security verification.'}
          </p>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" /> Resumption Estimate:
            </span>
            <span className="font-bold text-sky-400">{shipment.estimatedResume || '2:30 PM UTC'}</span>
          </div>
        </div>
      )}

      {/* The Leaflet Map Canvas */}
      <div
        ref={mapElementRef}
        className={`w-full relative z-0 theme-${mapTheme === 'dark' ? 'radar-dark' : mapTheme} ${
          isFullscreen ? 'h-screen' : 'h-[380px] sm:h-[480px] md:h-[540px]'
        }`}
        style={{ minHeight: '350px' }}
      />

      {/* Bottom Route Progress Stats Bar */}
      <div className="bg-slate-950 border-t border-slate-800/90 p-3 px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-300">
        <div className="flex items-center gap-2 sm:gap-4 truncate">
          <div className="truncate">
            <span className="text-slate-500 text-[10px] uppercase block font-bold">Origin Terminal</span>
            <span className="text-white font-semibold truncate block max-w-[120px] sm:max-w-none">
              {shipment.origin}
            </span>
          </div>
          <span className="text-sky-400 font-black shrink-0">➔</span>
          <div className="truncate">
            <span className="text-slate-500 text-[10px] uppercase block font-bold">Destination Hub</span>
            <span className="text-white font-semibold truncate block max-w-[120px] sm:max-w-none">
              {shipment.destination}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <div>
            <span className="text-slate-500 text-[10px] uppercase block font-bold">Route Progress</span>
            <div className="flex items-center gap-2">
              <div className="w-20 sm:w-28 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-150"
                  style={{ width: `${Math.round(displayProgress)}%` }}
                />
              </div>
              <span className="text-sky-400 font-bold">{Math.round(displayProgress)}%</span>
            </div>
          </div>

          <div className="hidden sm:block">
            <span className="text-slate-500 text-[10px] uppercase block font-bold">Estimated Arrival</span>
            <span className="text-white font-semibold">{shipment.estimatedDelivery}</span>
          </div>
        </div>
      </div>

      {/* Admin Panel Controls Hook (when isAdminControl === true) */}
      {isAdminControl && (
        <div className="bg-slate-900 p-3.5 sm:p-4 border-t border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-sky-400 uppercase">
              <Navigation className="w-3.5 h-3.5 text-sky-400" />
              <span>Admin GPS Dispatcher Control</span>
            </div>

            <div className="flex items-center gap-2">
              {onAdvanceNextCheckpoint && (
                <button
                  onClick={onAdvanceNextCheckpoint}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-bold font-mono"
                  title="Advance vehicle to the next checkpoint"
                >
                  Next Checkpoint
                </button>
              )}

              {onTogglePause && (
                <button
                  onClick={() => onTogglePause(!shipment.isPaused)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
                    shipment.isPaused
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {shipment.isPaused ? (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  )}
                  {shipment.isPaused ? 'Resume Movement' : 'Pause Movement'}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Manual Progress Override:</span>
              <span className="text-sky-400 font-bold">{Math.round(shipment.progressPercent || 0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={shipment.progressPercent || 0}
              onChange={(e) => onUpdateProgress && onUpdateProgress(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-400 border border-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
};
