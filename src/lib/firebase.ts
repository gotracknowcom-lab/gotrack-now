import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { Shipment, ChatMessage, ContactMessage, ActivityLog, EmailLog, AdminNotification } from '../types';

const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || env.NEXT_PUBLIC_FIREBASE_APP_ID || firebaseConfigJson.appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Initialize Firestore targeting the custom database specified in config
const dbId = (firebaseConfigJson as any).firestoreDatabaseId;
export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

// Test connection on boot
(async () => {
  try {
    await getDocs(query(collection(db, 'shipments'), limit(1)));
  } catch (err) {
    console.warn('Firestore connectivity note:', err);
  }
})();

// Default initial shipment for sample / initial database seeding
export const SAMPLE_SHIPMENT_CODE = 'GT48291584US';

export const INITIAL_SAMPLE_SHIPMENT: Shipment = {
  id: 'shipment-gt48291584us',
  trackingCode: 'GT48291584US',
  customerName: 'Marcus Vance',
  customerEmail: 'marcus.vance@techcorp.com',
  customerPhone: '+1 (555) 234-8901',
  shipmentType: 'Air',
  courier: 'GoTrack Air Express',
  packageName: 'High-Precision Microprocessor Chips (Batch A-4)',
  brand: 'Silicon Core Technology',
  model: 'SX-9000 Enterprise Workstation CPU',
  weight: '14.5 kg / 31.9 lbs',
  quantity: 24,
  receiver: 'TechCorp Solutions Labs',
  destination: 'San Francisco, CA, USA',
  destinationCoords: [-122.4194, 37.7749], // [lng, lat]
  origin: 'Frankfurt Airport Hub, Germany',
  originCoords: [8.5706, 50.0379], // [lng, lat]
  currentLocationName: 'JFK Customs & Cargo Center, NY, USA',
  currentCoords: [-73.7781, 40.6413], // [lng, lat]
  currentStatus: 'Customs',
  estimatedDelivery: 'Tomorrow at 03:30 PM (EST)',
  shippingDate: '2026-07-28',
  referenceNumber: 'REF-GT-987421-AIR',
  deliveryInstructions: 'Fragile electronic cargo. Temperature-controlled container. Direct signature required upon delivery at Bay 4.',
  images: [
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1565891741441-6ad965457790?auto=format&fit=crop&w=800&q=80'
  ],
  progressPercent: 55,
  isPaused: false,
  createdAt: new Date('2026-07-28T08:00:00Z').toISOString(),
  updatedAt: new Date().toISOString(),
  stops: [
    {
      id: 'stop-1',
      name: 'Frankfurt Hub, Germany (FRA)',
      lat: 50.0379,
      lng: 8.5706,
      estimatedArrival: 'Jul 28, 08:00 AM',
      actualArrival: 'Jul 28, 08:00 AM',
      status: 'completed',
      notes: 'Departed origin logistics facility.'
    },
    {
      id: 'stop-2',
      name: 'Paris CDG Sort Center, France',
      lat: 49.0097,
      lng: 2.5479,
      estimatedArrival: 'Jul 28, 02:00 PM',
      actualArrival: 'Jul 28, 02:15 PM',
      status: 'completed',
      notes: 'Sort completed and transferred to transatlantic flight.'
    },
    {
      id: 'stop-3',
      name: 'JFK Customs & Cargo Center, NY',
      lat: 40.6413,
      lng: -73.7781,
      estimatedArrival: 'Jul 29, 11:30 AM',
      actualArrival: 'Jul 29, 11:45 AM',
      status: 'current',
      notes: 'Currently undergoing priority import customs inspection.'
    },
    {
      id: 'stop-4',
      name: 'Chicago O\'Hare Regional Hub, IL',
      lat: 41.9742,
      lng: -87.9073,
      estimatedArrival: 'Jul 30, 04:00 AM',
      status: 'upcoming',
      notes: 'Connecting domestic air freight feeder.'
    },
    {
      id: 'stop-5',
      name: 'San Francisco Hub, CA (SFO)',
      lat: 37.6213,
      lng: -122.3790,
      estimatedArrival: 'Jul 30, 01:00 PM',
      status: 'upcoming',
      notes: 'Final regional sorting facility before local dispatch.'
    },
    {
      id: 'stop-6',
      name: 'TechCorp Labs, San Francisco, CA',
      lat: 37.7749,
      lng: -122.4194,
      estimatedArrival: 'Jul 30, 03:30 PM',
      status: 'upcoming',
      notes: 'Final delivery destination.'
    }
  ],
  timeline: [
    {
      id: 't-1',
      status: 'Shipment Created',
      title: 'Shipment Created & Label Generated',
      location: 'Frankfurt Origin Logistics, Germany',
      timestamp: 'Jul 28, 2026 - 08:00 AM',
      description: 'Shipment details registered into GoTrack Global System. Carrier dispatched.',
      completed: true
    },
    {
      id: 't-2',
      status: 'Picked Up',
      title: 'Package Picked Up by Courier',
      location: 'Frankfurt Tech Facility, Germany',
      timestamp: 'Jul 28, 2026 - 10:30 AM',
      description: 'Package received into GoTrack express network with security seals verified.',
      completed: true
    },
    {
      id: 't-3',
      status: 'Warehouse',
      title: 'Arrived at Primary Logistics Hub',
      location: 'Frankfurt Central Sorting Depot',
      timestamp: 'Jul 28, 2026 - 01:15 PM',
      description: 'Scanned, weighed, and queued for international air freight manifest.',
      completed: true
    },
    {
      id: 't-4',
      status: 'Processing',
      title: 'Export Documentation & Security Cleared',
      location: 'Frankfurt Freight Terminal',
      timestamp: 'Jul 28, 2026 - 04:45 PM',
      description: 'Export clearance approved by EU Customs Authorities.',
      completed: true
    },
    {
      id: 't-5',
      status: 'Airport',
      title: 'Loaded onto Flight LH-400',
      location: 'Frankfurt Airport (FRA)',
      timestamp: 'Jul 28, 2026 - 09:20 PM',
      description: 'Pallet loaded into climate-controlled main cargo deck.',
      completed: true
    },
    {
      id: 't-6',
      status: 'Customs',
      title: 'Undergoing US Customs Inspection',
      location: 'JFK International Airport (JFK)',
      timestamp: 'Jul 29, 2026 - 11:45 AM',
      description: 'High-tech customs clearance in progress. Standard security verification.',
      completed: true,
      current: true
    },
    {
      id: 't-7',
      status: 'International Transit',
      title: 'In International Flight Segment',
      location: 'Transatlantic Flight Corridor',
      timestamp: 'Estimated Jul 30 - 02:00 AM',
      description: 'Connecting air transit to west coast hub scheduled.',
      completed: false
    },
    {
      id: 't-8',
      status: 'Regional Hub',
      title: 'Arrived at West Coast Processing Hub',
      location: 'San Francisco Regional Depot',
      timestamp: 'Estimated Jul 30 - 11:00 AM',
      description: 'Final sorting onto express local delivery route.',
      completed: false
    },
    {
      id: 't-9',
      status: 'Local Hub',
      title: 'Dispatched to Bay Area Station',
      location: 'SF Downtown Delivery Depot',
      timestamp: 'Estimated Jul 30 - 01:30 PM',
      description: 'Assigned to dedicated courier driver with temperature verification.',
      completed: false
    },
    {
      id: 't-10',
      status: 'Out For Delivery',
      title: 'Out for Final Delivery',
      location: 'San Francisco, CA',
      timestamp: 'Estimated Jul 30 - 02:15 PM',
      description: 'Courier vehicle on final approach to destination address.',
      completed: false
    },
    {
      id: 't-11',
      status: 'Delivered',
      title: 'Shipment Delivered & Signed',
      location: 'TechCorp Solutions Labs, SF',
      timestamp: 'Estimated Jul 30 - 03:30 PM',
      description: 'Delivery confirmation with recipient signature.',
      completed: false
    }
  ]
};

let seedPromise: Promise<boolean> | null = null;

// Seed sample data in Firestore if shipments collection is empty
export async function seedInitialDataIfEmpty(): Promise<boolean> {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      const shipmentsRef = collection(db, 'shipments');
      const q = query(shipmentsRef, limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Seed sample shipment GT48291584US
        const sampleDocRef = doc(db, 'shipments', INITIAL_SAMPLE_SHIPMENT.id);
        await setDoc(sampleDocRef, INITIAL_SAMPLE_SHIPMENT);

        // Seed initial company system settings
        const settingsDocRef = doc(db, 'system_settings', 'general');
        const settingsSnap = await getDoc(settingsDocRef);
        if (!settingsSnap.exists()) {
          await setDoc(settingsDocRef, {
            companyName: 'GoTrack Global Logistics',
            companyPhone: '+1 (800) 555-0199',
            supportEmail: 'support@gotrack-now.com',
            emergencyPhone: '+1 (800) 555-9111',
            resendSender: 'GoTrack Dispatch <tracking@gotrack-now.com>',
            autoEmailOnStatusChange: true,
          });
        }

        // Create initial activity log
        await addDoc(collection(db, 'activity_logs'), {
          type: 'INITIAL_SEED',
          description: `Database initialized with primary sample shipment ${SAMPLE_SHIPMENT_CODE}`,
          trackingCode: SAMPLE_SHIPMENT_CODE,
          timestamp: new Date().toISOString(),
          user: 'System Admin'
        });

        // Create initial welcome message in chat
        await addDoc(collection(db, 'chat_messages'), {
          shipmentId: INITIAL_SAMPLE_SHIPMENT.id,
          trackingCode: SAMPLE_SHIPMENT_CODE,
          sender: 'admin',
          senderName: 'GoTrack Logistics Support',
          text: `Hello Mr. Vance! Your shipment ${SAMPLE_SHIPMENT_CODE} is currently undergoing US Customs processing at JFK. If you need any assistance, feel free to reply directly here!`,
          timestamp: new Date().toISOString(),
          isRead: true
        });

        console.log('Successfully seeded initial Firestore shipment data!');
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Seed initial data notice:', err);
      return false;
    }
  })();

  return seedPromise;
}
