export type ShipmentStatus =
  | 'Shipment Created'
  | 'Picked Up'
  | 'Warehouse'
  | 'Processing'
  | 'Airport'
  | 'Customs'
  | 'International Transit'
  | 'Regional Hub'
  | 'Local Hub'
  | 'Out For Delivery'
  | 'Delivered'
  | 'Delayed'
  | 'Paused';

export type ShipmentType = 'Air' | 'Sea' | 'Road' | 'Express';

export interface TimelineEvent {
  id: string;
  status: ShipmentStatus;
  title: string;
  location: string;
  timestamp: string;
  description: string;
  completed: boolean;
  current?: boolean;
}

export interface RouteStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  estimatedArrival: string;
  actualArrival?: string;
  status: 'completed' | 'current' | 'upcoming';
  notes?: string;
}

export interface Shipment {
  id: string; // Firestore document ID
  trackingCode: string; // e.g. GT48291584US
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shipmentType: ShipmentType;
  courier: string;
  packageName: string;
  brand: string;
  model: string;
  weight: string;
  quantity: number;
  receiver: string;
  destination: string;
  destinationCoords: [number, number]; // [lng, lat]
  origin: string;
  originCoords: [number, number]; // [lng, lat]
  currentLocationName: string;
  currentCoords: [number, number]; // [lng, lat]
  currentStatus: ShipmentStatus;
  estimatedDelivery: string;
  shippingDate: string;
  referenceNumber: string;
  deliveryInstructions: string;
  images: string[];
  timeline: TimelineEvent[];
  stops: RouteStop[];
  progressPercent: number; // 0 to 100
  isPaused: boolean;
  delayReason?: string;
  estimatedResume?: string;
  scheduledHold?: {
    holdTimeWAT: string; // ISO string or format e.g. "2026-08-03T18:00"
    reason: string;
    executed?: boolean;
  } | null;
  movementSpeed?: number;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  shipmentId: string;
  trackingCode: string;
  sender: 'customer' | 'admin';
  senderName: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  trackingCode?: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'new' | 'replied' | 'archived';
}

export interface ActivityLog {
  id: string;
  type: string;
  description: string;
  trackingCode?: string;
  timestamp: string;
  user: string;
}

export interface EmailLog {
  id: string;
  trackingCode: string;
  recipientEmail: string;
  subject: string;
  statusTrigger: ShipmentStatus;
  sentAt: string;
  status: 'delivered' | 'failed' | 'sent';
  htmlBody: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'tracking' | 'chat' | 'delay' | 'delivery' | 'system';
  trackingCode?: string;
}
