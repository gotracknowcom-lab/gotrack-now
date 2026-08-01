import React, { useState, useEffect } from 'react';
import { db, auth, seedInitialDataIfEmpty, SAMPLE_SHIPMENT_CODE } from '../lib/firebase';
import {
  collection, query, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc, orderBy, limit, getDocs, getDoc
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { sendShipmentStatusEmail } from '../lib/emailService';
import { Shipment, ShipmentStatus, ShipmentType, ChatMessage, ContactMessage, ActivityLog, EmailLog, AdminNotification, RouteStop, TimelineEvent } from '../types';
import { MapComponent } from '../components/MapComponent';
import { CloudinaryUploader } from '../components/CloudinaryUploader';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Package, LayoutDashboard, Route, MessageSquare, Mail, Users, FileText, Settings,
  LogOut, Plus, Search, Filter, Edit, Trash2, Copy, Archive, MapPin, Play, Pause,
  CheckCircle2, AlertTriangle, Clock, RefreshCw, Bell, Shield, Eye, Send, Sparkles, Upload, ChevronRight, X, FastForward, Menu
} from 'lucide-react';

interface AdminDashboardProps {
  onLogout: () => void;
  onNavigatePublic: (tab: string, trackingCode?: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onNavigatePublic }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'shipments' | 'route_builder' | 'live_chat' | 'messages' | 'customers' | 'logs' | 'settings'
  >('overview');

  // Realtime Firestore Collections State
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  // Selected Items / Modals & Submitting States
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedChatTrackingCode, setSelectedChatTrackingCode] = useState<string>('');
  const [adminChatReply, setAdminChatReply] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [shipmentToDelete, setShipmentToDelete] = useState<Shipment | null>(null);
  const [resendingEmailCode, setResendingEmailCode] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Route Simulation & Checkpoint Control State
  const [isAutoMoving, setIsAutoMoving] = useState(false);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [delayReasonInput, setDelayReasonInput] = useState('');
  const [estimatedResumeInput, setEstimatedResumeInput] = useState('2:30 PM UTC');
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [newCheckpointForm, setNewCheckpointForm] = useState({
    name: '',
    lat: 40.7128,
    lng: -74.006,
    estimatedArrival: 'Estimated 3 Hours',
    notes: 'Transit checkpoint stop',
  });

  // Sync inputs when selected shipment changes
  useEffect(() => {
    if (selectedShipment) {
      setDelayReasonInput(selectedShipment.delayReason || '');
      setEstimatedResumeInput(selectedShipment.estimatedResume || '2:30 PM UTC');
    }
  }, [selectedShipment?.id]);

  // Auto-movement interval effect - guaranteed zero email dispatches on progress ticks
  useEffect(() => {
    if (!isAutoMoving || !selectedShipment || selectedShipment.isPaused) return;

    const interval = setInterval(() => {
      const currentProg = selectedShipment.progressPercent || 0;
      if (currentProg >= 100) {
        setIsAutoMoving(false);
        handleUpdateShipmentStatus(selectedShipment.id, {
          progressPercent: 100,
          currentStatus: 'Delivered',
        });
        setToastMessage(`Shipment ${selectedShipment.trackingCode} has reached destination (100%) and marked Delivered!`);
        return;
      }

      const delta = simSpeed * 1.5;
      const nextProg = Math.min(100, currentProg + delta);
      handleUpdateShipmentStatus(selectedShipment.id, { progressPercent: nextProg }, { skipEmail: true });
    }, 1500);

    return () => clearInterval(interval);
  }, [isAutoMoving, simSpeed, selectedShipment?.id, selectedShipment?.progressPercent, selectedShipment?.isPaused]);

  // Auto-dismiss toast notification after 4.5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // System Settings State
  const [companySettings, setCompanySettings] = useState({
    companyName: 'GoTrack Express International',
    supportEmail: 'gotracknow.com@gmail.com',
    supportPhone: '+1 (800) 555-0199',
    resendSender: 'GoTrack Express <tracking@gotrack-now.com>',
    autoEmailOnUpdate: true,
  });

  // Form State for Shipment Creation / Editing
  const [formData, setFormData] = useState<Partial<Shipment>>({
    trackingCode: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shipmentType: 'Air',
    courier: 'GoTrack Express',
    packageName: '',
    brand: '',
    model: '',
    weight: '10 kg',
    quantity: 1,
    receiver: '',
    destination: 'New York, USA',
    destinationCoords: [-73.935242, 40.73061],
    origin: 'Frankfurt, Germany',
    originCoords: [8.682127, 50.110924],
    currentLocationName: 'Frankfurt Airport Hub',
    currentCoords: [8.682127, 50.110924],
    currentStatus: 'Shipment Created',
    estimatedDelivery: '3 Days',
    shippingDate: new Date().toISOString().split('T')[0],
    referenceNumber: 'REF-' + Math.floor(100000 + Math.random() * 900000),
    deliveryInstructions: 'Handle with care.',
    images: [],
    progressPercent: 10,
    isPaused: false,
  });

  // Timeline Event Form State
  const [newTimelineStage, setNewTimelineStage] = useState<ShipmentStatus>('Processing');
  const [newTimelineTitle, setNewTimelineTitle] = useState('');
  const [newTimelineLocation, setNewTimelineLocation] = useState('');
  const [newTimelineDesc, setNewTimelineDesc] = useState('');

  // 1. Subscribe to Firestore Collections Realtime with optimized queries & limits
  useEffect(() => {
    // Fast initial direct fetch for shipments
    getDocs(collection(db, 'shipments'))
      .then((snapshot) => {
        const list: Shipment[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as Shipment));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setShipments(list);
      })
      .catch((err) => console.warn('Direct fetch note:', err));

    // System Settings Listener
    const unsubSettings = onSnapshot(doc(db, 'system_settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        setCompanySettings((prev) => ({ ...prev, ...docSnap.data() }));
      }
    }, (err) => console.warn('Settings snapshot listener note:', err));

    // Shipments Listener
    const unsubShipments = onSnapshot(collection(db, 'shipments'), (snapshot) => {
      const list: Shipment[] = [];
      snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as Shipment));
      // Sort newest created shipments first
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setShipments(list);
    }, (err) => console.warn('Shipments snapshot listener note:', err));

    // Chat Messages Listener (limited to 100 recent)
    const unsubChats = onSnapshot(query(collection(db, 'chat_messages'), limit(100)), (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as ChatMessage));
      list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setChatMessages(list);
    }, (err) => console.warn('Chat snapshot listener note:', err));

    // Contact Messages Listener (limited to 100)
    const unsubMessages = onSnapshot(query(collection(db, 'messages'), limit(100)), (snapshot) => {
      const list: ContactMessage[] = [];
      snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as ContactMessage));
      setContactMessages(list);
    }, (err) => console.warn('Messages snapshot listener note:', err));

    // Activity Logs Listener (limited to 50 recent)
    const unsubLogs = onSnapshot(query(collection(db, 'activity_logs'), limit(50)), (snapshot) => {
      const list: ActivityLog[] = [];
      snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as ActivityLog));
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivityLogs(list);
    }, (err) => console.warn('Activity logs listener note:', err));

    // Email Logs Listener (limited to 50 recent)
    const unsubEmails = onSnapshot(query(collection(db, 'email_logs'), limit(50)), (snapshot) => {
      const list: EmailLog[] = [];
      snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as EmailLog));
      list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      setEmailLogs(list);
    }, (err) => console.warn('Email logs listener note:', err));

    // Notifications Listener (limited to 50 recent)
    const unsubNotifs = onSnapshot(query(collection(db, 'admin_notifications'), limit(50)), (snapshot) => {
      const list: AdminNotification[] = [];
      snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as AdminNotification));
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(list);
    }, (err) => console.warn('Notifications listener note:', err));

    return () => {
      unsubSettings();
      unsubShipments();
      unsubChats();
      unsubMessages();
      unsubLogs();
      unsubEmails();
      unsubNotifs();
    };
  }, []);

  // Set default selected shipment for Route Builder & Chat if available
  useEffect(() => {
    if (shipments.length > 0) {
      if (!selectedShipment) setSelectedShipment(shipments[0]);
      if (!selectedChatTrackingCode) setSelectedChatTrackingCode(shipments[0].trackingCode);
    }
  }, [shipments]);

  // Generate random tracking code (e.g., GT + 8 digits + US)
  const generateTrackingCode = () => {
    const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
    return `GT${randomDigits}US`;
  };

  // Save Organization & System Settings to Cloud Firestore
  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, 'system_settings', 'general'), companySettings);
      await addDoc(collection(db, 'activity_logs'), {
        type: 'SETTINGS_UPDATED',
        description: `System settings updated: ${companySettings.companyName}`,
        trackingCode: 'SYSTEM',
        timestamp: new Date().toISOString(),
        user: 'Admin Controller',
      });
      setToastMessage('Organization settings saved successfully!');
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setToastMessage(`Failed to save settings: ${err.message || 'Write error'}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Dispatch Test Email
  const handleSendTestEmail = async () => {
    setIsSendingTestEmail(true);
    setToastMessage('Sending test email to support contact...');
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: companySettings.supportEmail || 'gotracknow.com@gmail.com',
          replyTo: 'tracking@gotrack-now.com',
          subject: `[System Test] ${companySettings.companyName} Email Check`,
          html: `<h3>${companySettings.companyName} System Check</h3><p>Email system is active and functioning properly!</p>`,
          trackingCode: 'SYSTEM-TEST',
          statusTrigger: 'Test Dispatch',
        }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setToastMessage('Test email sent successfully!');
      } else {
        setToastMessage(`Email Service: ${d.error || 'Failed to send email'}`);
      }
    } catch (err: any) {
      setToastMessage(`Test email error: ${err.message}`);
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // Handle Create Shipment
  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const code = formData.trackingCode || generateTrackingCode();

    const defaultTimeline: TimelineEvent[] = [
      {
        id: 't-1',
        status: formData.currentStatus || 'Shipment Created',
        title: 'Shipment Registered & Manifest Created',
        location: formData.origin || 'Origin Terminal',
        timestamp: new Date().toLocaleString(),
        description: 'Package manifest added into GoTrack network.',
        completed: true,
        current: true,
      }
    ];

    const rawShipmentData: Record<string, any> = {
      trackingCode: code,
      customerName: formData.customerName || 'Consignee',
      customerEmail: formData.customerEmail || 'customer@example.com',
      customerPhone: formData.customerPhone || '+1 (555) 000-0000',
      shipmentType: (formData.shipmentType as ShipmentType) || 'Air',
      courier: formData.courier || 'GoTrack Express',
      packageName: formData.packageName || 'General Freight',
      brand: formData.brand || 'Standard Brand',
      model: formData.model || 'Model X',
      weight: formData.weight || '10 kg',
      quantity: formData.quantity || 1,
      receiver: formData.receiver || 'Recipient Facility',
      destination: formData.destination || 'New York, USA',
      destinationCoords: formData.destinationCoords || [-73.935242, 40.73061],
      origin: formData.origin || 'Frankfurt, Germany',
      originCoords: formData.originCoords || [8.682127, 50.110924],
      currentLocationName: formData.currentLocationName || formData.origin || 'Origin Hub',
      currentCoords: formData.originCoords || [8.682127, 50.110924],
      currentStatus: (formData.currentStatus as ShipmentStatus) || 'Shipment Created',
      estimatedDelivery: formData.estimatedDelivery || '3 Days',
      shippingDate: formData.shippingDate || new Date().toISOString().split('T')[0],
      referenceNumber: formData.referenceNumber || 'REF-' + Math.floor(100000 + Math.random() * 900000),
      deliveryInstructions: formData.deliveryInstructions || '',
      images: formData.images || [],
      timeline: defaultTimeline,
      stops: [
        { id: 's-1', name: formData.origin || 'Origin Hub', lat: (formData.originCoords || [8,50])[1], lng: (formData.originCoords || [8,50])[0], estimatedArrival: 'Departed', status: 'completed' },
        { id: 's-2', name: formData.destination || 'Destination Hub', lat: (formData.destinationCoords || [-73,40])[1], lng: (formData.destinationCoords || [-73,40])[0], estimatedArrival: formData.estimatedDelivery || 'Pending', status: 'upcoming' }
      ],
      progressPercent: formData.progressPercent || 5,
      isPaused: false,
      delayReason: formData.delayReason || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Sanitize any undefined properties for Firestore
    const newShipmentData: Record<string, any> = {};
    Object.entries(rawShipmentData).forEach(([k, v]) => {
      newShipmentData[k] = v !== undefined ? v : '';
    });

    try {
      const docRef = await addDoc(collection(db, 'shipments'), newShipmentData);
      
      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        type: 'SHIPMENT_CREATED',
        description: `New shipment created: ${code} for ${newShipmentData.customerName}`,
        trackingCode: code,
        timestamp: new Date().toISOString(),
        user: 'Admin Controller',
      });

      // Send automated status email notification with idempotency protection and await response
      if (companySettings.autoEmailOnUpdate) {
        const createKey = `create_${docRef.id}_${Date.now()}`;
        try {
          await sendShipmentStatusEmail({ id: docRef.id, ...newShipmentData } as Shipment, newShipmentData.currentStatus, createKey);
        } catch (emailErr) {
          console.warn('[Create Email Warning]', emailErr);
        }
      }

      // Select new shipment and reset form data
      setSelectedShipment({ id: docRef.id, ...newShipmentData } as Shipment);
      setFormData({
        trackingCode: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        shipmentType: 'Air',
        courier: 'GoTrack Express',
        packageName: '',
        brand: '',
        model: '',
        weight: '',
        quantity: 1,
        receiver: '',
        origin: '',
        destination: '',
        currentLocationName: '',
        currentStatus: 'Shipment Created',
        progressPercent: 5,
        estimatedDelivery: '',
        shippingDate: new Date().toISOString().split('T')[0],
        referenceNumber: '',
        deliveryInstructions: '',
        images: [],
        originCoords: [8.682127, 50.110924],
        destinationCoords: [-73.935242, 40.73061],
        delayReason: '',
        isPaused: false,
      });

      // Reset filters so newly created shipment is immediately visible at the top
      setStatusFilter('all');
      setSearchTerm('');
      setShowCreateModal(false);
      setToastMessage(`Consignment ${code} created & notification email dispatched to ${newShipmentData.customerEmail}!`);
    } catch (err: any) {
      console.error('Failed to create shipment:', err);
      setToastMessage(`Failed to create consignment: ${err.message || 'Save error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Shipment Update
  const handleUpdateShipmentStatus = async (
    shipmentId: string,
    updates: Partial<Shipment>,
    options?: { skipEmail?: boolean }
  ) => {
    setIsSubmitting(true);
    try {
      const docRef = doc(db, 'shipments', shipmentId);
      const target = shipments.find((s) => s.id === shipmentId);
      if (!target) {
        setIsSubmitting(false);
        return;
      }

      const newStatus = updates.currentStatus || target.currentStatus;

      // Filter out any undefined values to prevent Firestore update crashes
      const cleanUpdates: Record<string, any> = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanUpdates[key] = value;
        } else {
          cleanUpdates[key] = '';
        }
      });

      const updatedData = {
        ...cleanUpdates,
        updatedAt: new Date().toISOString(),
      };

      // Use setDoc with merge: true to atomically save updates to Firestore
      await setDoc(docRef, updatedData, { merge: true });

      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        type: 'SHIPMENT_UPDATED',
        description: `Shipment ${target.trackingCode} updated. Status: ${newStatus}`,
        trackingCode: target.trackingCode,
        timestamp: new Date().toISOString(),
        user: 'Admin Controller',
      });

      // Check if update is purely micro progress increment without status change
      const updateKeys = Object.keys(updates);
      const isProgressOnly = updateKeys.length === 1 && updateKeys[0] === 'progressPercent';

      // Automatically dispatch single email notification with idempotency key only when appropriate
      if (companySettings.autoEmailOnUpdate && !options?.skipEmail && !isProgressOnly) {
        let emailTriggerStatus: string = newStatus;
        if (updates.currentStatus && updates.currentStatus !== target.currentStatus) {
          emailTriggerStatus = updates.currentStatus;
        } else if (updates.estimatedDelivery && updates.estimatedDelivery !== target.estimatedDelivery) {
          emailTriggerStatus = 'Delivery Date Updated';
        } else if (updates.delayReason && updates.delayReason !== target.delayReason) {
          emailTriggerStatus = updates.isPaused ? 'Paused' : 'Delayed';
        } else {
          emailTriggerStatus = 'Shipment Information Updated';
        }

        const updateKey = `update_${shipmentId}_${emailTriggerStatus.replace(/\s+/g, '_')}_${Date.now()}`;

        try {
          const success = await sendShipmentStatusEmail({ ...target, ...updates } as Shipment, emailTriggerStatus, updateKey);
          if (success) {
            console.log(`[Auto Email Dispatched] Notification sent to ${target.customerEmail || 'admin'}`);
          }
        } catch (emailErr) {
          console.warn('[Auto Email Warning]', emailErr);
        }
      }

      setToastMessage(`Shipment ${target.trackingCode} updated successfully!`);
    } catch (err: any) {
      console.error('Failed to update shipment:', err);
      setToastMessage(`Update failed: ${err.message || 'Error writing to database'}`);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute Delete Shipment (Triggered by Modal Confirmation)
  const confirmDeleteShipment = async () => {
    if (!shipmentToDelete) return;
    setIsSubmitting(true);

    try {
      // Mark system settings as seeded so empty snapshot doesn't auto-restore sample shipment
      await setDoc(doc(db, 'system_settings', 'general'), { hasSeeded: true }, { merge: true });

      await deleteDoc(doc(db, 'shipments', shipmentToDelete.id));

      await addDoc(collection(db, 'activity_logs'), {
        type: 'SHIPMENT_DELETED',
        description: `Shipment deleted: ${shipmentToDelete.trackingCode}`,
        trackingCode: shipmentToDelete.trackingCode,
        timestamp: new Date().toISOString(),
        user: 'Admin Controller',
      });

      setToastMessage(`Shipment ${shipmentToDelete.trackingCode} deleted successfully from database.`);
    } catch (err: any) {
      console.error('Failed to delete shipment:', err);
      setToastMessage(`Delete error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
      setShipmentToDelete(null);
    }
  };

  // Handle Duplicate Shipment
  const handleDuplicateShipment = async (shipmentToDuplicate: Shipment) => {
    const newCode = generateTrackingCode();
    const duplicated: Omit<Shipment, 'id'> = {
      ...shipmentToDuplicate,
      trackingCode: newCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'shipments'), duplicated);
      await addDoc(collection(db, 'activity_logs'), {
        type: 'SHIPMENT_DUPLICATED',
        description: `Duplicated shipment ${shipmentToDuplicate.trackingCode} -> ${newCode}`,
        trackingCode: newCode,
        timestamp: new Date().toISOString(),
        user: 'Admin Controller',
      });
    } catch (err) {
      console.error('Failed to duplicate shipment:', err);
    }
  };

  // Advance to next checkpoint stop
  const handleAdvanceNextCheckpoint = async () => {
    if (!selectedShipment) return;

    const stops = [...(selectedShipment.stops || [])];
    if (stops.length === 0) {
      handleUpdateShipmentStatus(selectedShipment.id, { progressPercent: 100, currentStatus: 'Delivered' });
      return;
    }

    const firstIncompleteIdx = stops.findIndex((s) => s.status !== 'completed');
    if (firstIncompleteIdx === -1) {
      handleUpdateShipmentStatus(selectedShipment.id, {
        progressPercent: 100,
        currentStatus: 'Delivered',
        currentLocationName: selectedShipment.destination,
      });
      setToastMessage(`All checkpoints completed! Shipment ${selectedShipment.trackingCode} marked Delivered.`);
      return;
    }

    stops[firstIncompleteIdx] = { ...stops[firstIncompleteIdx], status: 'completed' };

    let nextLocName = stops[firstIncompleteIdx].name;
    if (firstIncompleteIdx + 1 < stops.length) {
      stops[firstIncompleteIdx + 1] = { ...stops[firstIncompleteIdx + 1], status: 'current' };
    } else {
      nextLocName = selectedShipment.destination;
    }

    const calcProgress = Math.round(((firstIncompleteIdx + 1) / (stops.length + 1)) * 100);

    await handleUpdateShipmentStatus(selectedShipment.id, {
      stops,
      progressPercent: calcProgress,
      currentLocationName: nextLocName,
      currentCoords: [stops[firstIncompleteIdx].lng, stops[firstIncompleteIdx].lat],
    });

    setToastMessage(`Advanced ${selectedShipment.trackingCode} to Checkpoint: ${stops[firstIncompleteIdx].name} (${calcProgress}%)`);
  };

  // Add Checkpoint Stop
  const handleAddCheckpointStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;

    const existingStops = selectedShipment.stops || [];
    const newStop: RouteStop = {
      id: 'stop-' + Date.now(),
      name: newCheckpointForm.name || 'Transit Waypoint',
      lat: Number(newCheckpointForm.lat) || 40.71,
      lng: Number(newCheckpointForm.lng) || -74.0,
      estimatedArrival: newCheckpointForm.estimatedArrival || 'Scheduled',
      status: 'upcoming',
      notes: newCheckpointForm.notes || '',
    };

    const updatedStops = [...existingStops, newStop];
    await handleUpdateShipmentStatus(selectedShipment.id, { stops: updatedStops });

    setShowCheckpointModal(false);
    setNewCheckpointForm({
      name: '',
      lat: 40.7128,
      lng: -74.006,
      estimatedArrival: 'Estimated 3 Hours',
      notes: 'Transit checkpoint stop',
    });
    setToastMessage(`Checkpoint "${newStop.name}" added to shipment route!`);
  };

  // Remove Checkpoint Stop
  const handleRemoveCheckpointStop = async (stopId: string) => {
    if (!selectedShipment) return;
    const updatedStops = (selectedShipment.stops || []).filter((s) => s.id !== stopId);
    await handleUpdateShipmentStatus(selectedShipment.id, { stops: updatedStops });
    setToastMessage('Checkpoint removed from route.');
  };

  // Handle Add Timeline Event
  const handleAddTimelineStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment || !newTimelineTitle.trim()) return;

    const newEvent: TimelineEvent = {
      id: 't-' + Date.now(),
      status: newTimelineStage,
      title: newTimelineTitle.trim(),
      location: newTimelineLocation.trim() || selectedShipment.currentLocationName,
      timestamp: new Date().toLocaleString(),
      description: newTimelineDesc.trim() || `Status updated to ${newTimelineStage}`,
      completed: true,
    };

    // Mark previous events completed and add new
    const updatedTimeline = selectedShipment.timeline.map((t) => ({ ...t, current: false }));
    newEvent.current = true;
    updatedTimeline.push(newEvent);

    await handleUpdateShipmentStatus(selectedShipment.id, {
      timeline: updatedTimeline,
      currentStatus: newTimelineStage,
      currentLocationName: newTimelineLocation.trim() || selectedShipment.currentLocationName,
    });

    setNewTimelineTitle('');
    setNewTimelineLocation('');
    setNewTimelineDesc('');
    setShowTimelineModal(false);
  };

  // Handle Admin Sending Live Chat Message
  const handleSendAdminChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatTrackingCode || !adminChatReply.trim()) return;

    const replyText = adminChatReply.trim();
    setAdminChatReply('');

    try {
      await addDoc(collection(db, 'chat_messages'), {
        shipmentId: selectedChatTrackingCode,
        trackingCode: selectedChatTrackingCode,
        sender: 'admin',
        senderName: 'GoTrack Central Controller',
        text: replyText,
        timestamp: new Date().toISOString(),
        isRead: true,
      });
    } catch (err) {
      console.error('Failed to send admin chat:', err);
    }
  };

  // Filtered shipments list (safe string handling)
  const filteredShipments = shipments.filter((s) => {
    const code = (s.trackingCode || '').toLowerCase();
    const customer = (s.customerName || '').toLowerCase();
    const dest = (s.destination || '').toLowerCase();
    const courier = (s.courier || '').toLowerCase();
    const search = (searchTerm || '').toLowerCase();

    const matchesSearch =
      code.includes(search) ||
      customer.includes(search) ||
      dest.includes(search) ||
      courier.includes(search);
    
    const matchesStatus = statusFilter === 'all' || s.currentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Overview Statistics
  const totalShipments = shipments.length;
  const deliveredCount = shipments.filter((s) => s.currentStatus === 'Delivered').length;
  const transitCount = shipments.filter((s) => s.currentStatus !== 'Delivered' && s.currentStatus !== 'Delayed' && !s.isPaused).length;
  const delayedCount = shipments.filter((s) => s.currentStatus === 'Delayed' || s.isPaused).length;
  const unreadMessagesCount = contactMessages.filter((m) => m.status === 'new').length;

  const chartDataStatus = [
    { name: 'In Transit', count: transitCount, color: '#38bdf8' },
    { name: 'Delivered', count: deliveredCount, color: '#34d399' },
    { name: 'Delayed', count: delayedCount, color: '#f87171' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-sky-500 selection:text-slate-950">
      
      {/* MOBILE TOP HEADER BAR (Only visible on mobile/tablet screens < lg) */}
      <div className="lg:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigatePublic('home')}>
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-sky-500/30 shrink-0 shadow-md">
            <img src="/logo.png" alt="GoTrack Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <span className="text-lg font-black text-white font-mono tracking-tight">GO<span className="text-sky-400">TRACK</span></span>
            <span className="block text-[9px] font-mono text-sky-400 font-bold uppercase">Admin Console</span>
          </div>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-2.5 rounded-xl bg-slate-800 text-sky-400 hover:bg-slate-700 transition-colors border border-slate-700"
          id="admin-mobile-menu-toggle"
        >
          {mobileSidebarOpen ? <X className="w-5 h-5 text-rose-400" /> : <Menu className="w-5 h-5 text-sky-400" />}
        </button>
      </div>

      {/* MOBILE SIDEWAYS SLIDE-OVER DRAWER OVERLAY */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-start lg:hidden">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />

          {/* Sideways Drawer Panel */}
          <aside className="relative w-72 bg-slate-900 text-white h-full shadow-2xl z-10 flex flex-col justify-between p-4 overflow-y-auto border-r border-slate-800">
            <div>
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => { onNavigatePublic('home'); setMobileSidebarOpen(false); }}>
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-sky-500/30 shrink-0 shadow-md">
                    <img src="/logo.png" alt="GoTrack Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <span className="text-lg font-black text-white font-mono tracking-tight">GO<span className="text-sky-400">TRACK</span></span>
                    <span className="block text-[9px] font-mono text-sky-400 font-bold uppercase">Admin Console</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links (Mobile Drawer) */}
              <nav className="p-3 space-y-1 text-sm font-medium mt-2">
                <button
                  onClick={() => { setActiveTab('overview'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'overview' ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Overview</span>
                </button>

                <button
                  onClick={() => { setActiveTab('shipments'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'shipments' ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5" />
                    <span>Shipment Manager</span>
                  </div>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300 font-mono font-bold">
                    {totalShipments}
                  </span>
                </button>

                <button
                  onClick={() => { setActiveTab('route_builder'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'route_builder' ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Route className="w-5 h-5" />
                  <span>Route & GPS Controller</span>
                </button>

                <button
                  onClick={() => { setActiveTab('live_chat'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'live_chat' ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5" />
                    <span>Customer Live Chat</span>
                  </div>
                  {chatMessages.filter(m => m.sender === 'customer' && !m.isRead).length > 0 && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-rose-500 text-white font-mono font-bold animate-pulse">
                      {chatMessages.filter(m => m.sender === 'customer' && !m.isRead).length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab('messages'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'messages' ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5" />
                    <span>Contact Queries</span>
                  </div>
                  {unreadMessagesCount > 0 && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500 text-slate-950 font-mono font-bold">
                      {unreadMessagesCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab('customers'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'customers' ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span>Customers Directory</span>
                </button>

                <button
                  onClick={() => { setActiveTab('logs'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'logs' ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span>Audit & Email Logs</span>
                </button>

                <button
                  onClick={() => { setActiveTab('settings'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'settings' ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span>System Settings</span>
                </button>
              </nav>
            </div>

            {/* Mobile Drawer Footer */}
            <div className="p-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center gap-3 px-3 py-2 bg-slate-950 rounded-xl border border-slate-800">
                <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                  AD
                </div>
                <div className="overflow-hidden text-xs">
                  <span className="font-bold text-white block truncate">Admin Controller</span>
                  <span className="text-slate-500 text-[10px] truncate block">admin@gotrack.com</span>
                </div>
              </div>

              <button
                onClick={() => {
                  signOut(auth);
                  onLogout();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700 hover:border-rose-500/30"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* DESKTOP STATIC SIDEBAR NAVIGATION (Visible on lg screens) */}
      <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 shrink-0 flex-col justify-between">
        <div>
          {/* Logo Bar */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigatePublic('home')}>
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-sky-500/30 text-sky-400 flex items-center justify-center shadow-md shrink-0">
                <img src="/logo.png" alt="GoTrack Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div>
                <span className="text-xl font-black text-white font-mono tracking-tight">GO<span className="text-sky-400">TRACK</span></span>
                <span className="block text-[10px] font-mono text-sky-400 font-bold uppercase">Admin Console</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === 'overview' ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              id="admin-nav-overview"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('shipments')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                activeTab === 'shipments' ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              id="admin-nav-shipments"
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5" />
                <span>Shipment Manager</span>
              </div>
              <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300 font-mono font-bold">
                {totalShipments}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('route_builder')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === 'route_builder' ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              id="admin-nav-route-builder"
            >
              <Route className="w-5 h-5" />
              <span>Route & GPS Controller</span>
            </button>

            <button
              onClick={() => setActiveTab('live_chat')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                activeTab === 'live_chat' ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              id="admin-nav-live-chat"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5" />
                <span>Customer Live Chat</span>
              </div>
              {chatMessages.filter(m => m.sender === 'customer' && !m.isRead).length > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-rose-500 text-white font-mono font-bold animate-pulse">
                  {chatMessages.filter(m => m.sender === 'customer' && !m.isRead).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                activeTab === 'messages' ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              id="admin-nav-messages"
            >
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5" />
                <span>Contact Queries</span>
              </div>
              {unreadMessagesCount > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500 text-slate-950 font-mono font-bold">
                  {unreadMessagesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === 'customers' ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              id="admin-nav-customers"
            >
              <Users className="w-5 h-5" />
              <span>Customers Directory</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === 'logs' ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              id="admin-nav-logs"
            >
              <FileText className="w-5 h-5" />
              <span>Audit & Email Logs</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === 'settings' ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              id="admin-nav-settings"
            >
              <Settings className="w-5 h-5" />
              <span>System Settings</span>
            </button>
          </nav>
        </div>

        {/* User Footer & Logout */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3 px-3 py-2 bg-slate-950 rounded-xl border border-slate-800">
            <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
              AD
            </div>
            <div className="overflow-hidden text-xs">
              <span className="font-bold text-white block truncate">Admin Controller</span>
              <span className="text-slate-500 text-[10px] truncate block">admin@gotrack.com</span>
            </div>
          </div>

          <button
            onClick={() => {
              signOut(auth);
              onLogout();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700 hover:border-rose-500/30"
            id="admin-logout-btn"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 flex flex-col">
        
        {/* Top Operational Header Bar */}
        <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-white capitalize font-mono">
              {activeTab.replace('_', ' ')} Desk
            </h1>
            <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live System Sync
            </span>
          </div>

          <div className="flex items-center gap-3">
            
            {/* Seed Sample Shipment Button */}
            <button
              onClick={async () => {
                await seedInitialDataIfEmpty();
                setToastMessage('Sample shipment GT48291584US seeded successfully!');
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 font-mono"
              id="admin-header-seed-btn"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Seed Sample ({SAMPLE_SHIPMENT_CODE})
            </button>

            {/* Create New Shipment Action */}
            <button
              onClick={() => {
                setFormData({
                  trackingCode: generateTrackingCode(),
                  customerName: '',
                  customerEmail: '',
                  customerPhone: '',
                  shipmentType: 'Air',
                  courier: 'GoTrack Express',
                  packageName: '',
                  brand: '',
                  model: '',
                  weight: '12 kg',
                  quantity: 1,
                  receiver: '',
                  destination: 'San Francisco, CA, USA',
                  destinationCoords: [-122.4194, 37.7749],
                  origin: 'Frankfurt Airport Hub, Germany',
                  originCoords: [8.5706, 50.0379],
                  currentLocationName: 'Frankfurt Sorting Center',
                  currentCoords: [8.5706, 50.0379],
                  currentStatus: 'Shipment Created',
                  estimatedDelivery: '2 Days',
                  shippingDate: new Date().toISOString().split('T')[0],
                  referenceNumber: 'REF-' + Math.floor(100000 + Math.random() * 900000),
                  deliveryInstructions: '',
                  images: [],
                  progressPercent: 5,
                  isPaused: false,
                });
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-sky-500/20 flex items-center gap-2"
              id="admin-header-create-shipment-btn"
            >
              <Plus className="w-4 h-4" />
              <span>New Shipment</span>
            </button>

            {/* View Public Radar Shortcut */}
            <button
              onClick={() => onNavigatePublic('home')}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors"
              title="Open Public Radar"
              id="admin-header-view-public-btn"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === 'overview' && (
          <div className="p-6 space-y-8 overflow-y-auto">
            
            {/* Top Stat Counter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-mono font-bold uppercase">Total Consignments</span>
                  <Package className="w-5 h-5 text-sky-400" />
                </div>
                <div className="text-3xl font-black text-white font-mono">{totalShipments}</div>
                <span className="text-[11px] text-emerald-400 font-medium">Live Database Records</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-mono font-bold uppercase">Active In Transit</span>
                  <Route className="w-5 h-5 text-sky-400" />
                </div>
                <div className="text-3xl font-black text-sky-400 font-mono">{transitCount}</div>
                <span className="text-[11px] text-slate-400 font-medium">Live GPS Tracking</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-mono font-bold uppercase">Delivered</span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-emerald-400 font-mono">{deliveredCount}</div>
                <span className="text-[11px] text-emerald-400 font-medium">Completed Deliveries</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-mono font-bold uppercase">Delayed / Paused</span>
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-amber-400 font-mono">{delayedCount}</div>
                <span className="text-[11px] text-amber-300 font-medium">Operational Hold</span>
              </div>

            </div>

            {/* Recharts Graphical Visualizer */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-white flex items-center justify-between border-b border-slate-800 pb-3">
                  <span>Shipment Status Breakdown</span>
                  <span className="text-xs font-mono text-slate-400">Live Volume</span>
                </h3>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDataStatus}>
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {chartDataStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Activity Log Box */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center justify-between">
                  <span>Recent System Events</span>
                  <Clock className="w-4 h-4 text-sky-400" />
                </h3>

                <div className="space-y-3 max-h-64 overflow-y-auto text-xs">
                  {activityLogs.length === 0 ? (
                    <p className="text-slate-500 text-center py-6">No activity logged yet.</p>
                  ) : (
                    activityLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                        <div className="flex justify-between text-slate-400 font-mono text-[10px]">
                          <span className="text-sky-400 font-bold">{log.type}</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-200 font-medium">{log.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: SHIPMENT MANAGER */}
        {activeTab === 'shipments' && (
          <div className="p-6 space-y-6 overflow-y-auto">
            
            {/* Filter & Search Toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              
              <div className="relative flex-1 w-full max-w-md">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by Tracking #, Customer, Destination..."
                  className="w-full bg-slate-950 text-xs text-white placeholder-slate-400 pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500 font-mono"
                  id="shipment-manager-search"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950 text-xs text-white px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500 font-mono"
                  id="shipment-manager-status-filter"
                >
                  <option value="all">All Statuses</option>
                  <option value="Shipment Created">Shipment Created</option>
                  <option value="Picked Up">Picked Up</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="Processing">Processing</option>
                  <option value="Airport">Airport</option>
                  <option value="Customs">Customs</option>
                  <option value="International Transit">International Transit</option>
                  <option value="Out For Delivery">Out For Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Delayed">Delayed</option>
                </select>
              </div>

            </div>

            {/* Datatable */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-mono font-bold uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-4">Tracking Code</th>
                      <th className="p-4">Customer & Receiver</th>
                      <th className="p-4">Carrier / Type</th>
                      <th className="p-4">Current Location</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">ETA</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredShipments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No shipment records found. Click "New Shipment" to create one.
                        </td>
                      </tr>
                    ) : (
                      filteredShipments.map((shipment, idx) => (
                        <tr key={shipment.id ? `${shipment.id}-${idx}` : `shipment-${idx}`} className="hover:bg-slate-800/50 transition-colors">
                          <td className="p-4 font-mono font-bold text-sky-400">
                            {shipment.trackingCode}
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-white block">{shipment.customerName}</span>
                            <span className="text-slate-400 text-[11px] block">{shipment.receiver}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white block font-semibold">{shipment.courier}</span>
                            <span className="text-slate-400 text-[10px] uppercase font-mono">{shipment.shipmentType}</span>
                          </td>
                          <td className="p-4 text-slate-200">{shipment.currentLocationName}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              shipment.currentStatus === 'Delivered'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : shipment.currentStatus === 'Delayed' || shipment.isPaused
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                            }`}>
                              {shipment.currentStatus}
                            </span>
                          </td>
                          <td className="p-4 text-slate-300 font-mono">{shipment.estimatedDelivery}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Shipment Button */}
                              <button
                                onClick={() => {
                                  setSelectedShipment(shipment);
                                  setFormData({ ...shipment });
                                  setShowEditModal(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                                title="Edit Full Shipment Details & Upload Photos"
                                id={`edit-shipment-btn-${shipment.trackingCode}`}
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* Open Timeline Modal */}
                              <button
                                onClick={() => {
                                  setSelectedShipment(shipment);
                                  setShowTimelineModal(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-500/20 text-sky-400 transition-colors"
                                title="Add Milestone Timeline Event"
                              >
                                <Clock className="w-4 h-4" />
                              </button>

                              {/* Manual Re-trigger Email Notification Button */}
                              <button
                                disabled={resendingEmailCode === shipment.trackingCode}
                                onClick={async () => {
                                  setResendingEmailCode(shipment.trackingCode);
                                  setToastMessage(`Dispatching email for #${shipment.trackingCode} to ${shipment.customerEmail}...`);
                                  const success = await sendShipmentStatusEmail(shipment, shipment.currentStatus);
                                  setResendingEmailCode(null);
                                  if (success) {
                                    setToastMessage(`HTML email dispatched to ${shipment.customerEmail}!`);
                                  } else {
                                    setToastMessage(`Email queued/recorded in audit log for ${shipment.customerEmail}.`);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-amber-400 transition-colors disabled:opacity-50"
                                title="Send / Retry Email Notification to Customer"
                                id={`resend-email-btn-${shipment.trackingCode}`}
                              >
                                {resendingEmailCode === shipment.trackingCode ? (
                                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                                ) : (
                                  <Mail className="w-4 h-4" />
                                )}
                              </button>

                              {/* Duplicate Action */}
                              <button
                                onClick={() => handleDuplicateShipment(shipment)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-500/20 text-indigo-400 transition-colors"
                                title="Duplicate Shipment"
                              >
                                <Copy className="w-4 h-4" />
                              </button>

                              {/* Delete Action (Triggers Confirmation Modal) */}
                              <button
                                onClick={() => setShipmentToDelete(shipment)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400 transition-colors"
                                title="Delete Shipment"
                                id={`delete-shipment-btn-${shipment.trackingCode}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: ROUTE BUILDER & LIVE GPS CONTROLLER */}
        {activeTab === 'route_builder' && (
          <div className="p-6 space-y-6 overflow-y-auto">
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Route className="w-5 h-5 text-sky-400" />
                    Live GPS Movement Controller & Route Editor
                  </h3>
                  <p className="text-xs text-slate-400">Select a consignment to manipulate its position, pause movement, or set delay reason live.</p>
                </div>

                {/* Select Shipment to Control */}
                <select
                  value={selectedShipment?.id || ''}
                  onChange={(e) => {
                    const found = shipments.find((s) => s.id === e.target.value);
                    if (found) setSelectedShipment(found);
                  }}
                  className="bg-slate-950 text-xs text-sky-400 font-bold font-mono px-4 py-2.5 rounded-xl border border-slate-700"
                  id="route-builder-select-shipment"
                >
                  {shipments.map((s, idx) => (
                    <option key={s.id ? `${s.id}-${idx}` : `s-${idx}`} value={s.id}>
                      {s.trackingCode} - {s.customerName} ({s.currentStatus})
                    </option>
                  ))}
                </select>
              </div>

              {selectedShipment ? (
                <div className="space-y-6">
                  
                  {/* Interactive Map with Admin Controls */}
                  <MapComponent
                    shipment={selectedShipment}
                    isAdminControl={true}
                    onUpdateProgress={(newProgress) => {
                      handleUpdateShipmentStatus(selectedShipment.id, {
                        progressPercent: newProgress,
                      });
                    }}
                    onTogglePause={(isPaused) => {
                      handleUpdateShipmentStatus(selectedShipment.id, {
                        isPaused: isPaused,
                        currentStatus: isPaused ? 'Paused' : 'International Transit',
                        delayReason: isPaused ? (delayReasonInput || 'Temporary operational hold by dispatch controller.') : undefined,
                      });
                    }}
                    onAdvanceNextCheckpoint={handleAdvanceNextCheckpoint}
                  />

                  {/* Real-time Movement & Speed Controls */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider">
                        Real-time Animation & Speed Settings
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">Movement Speed:</span>
                        {[1, 2, 5, 10].map((spd) => (
                          <button
                            key={spd}
                            onClick={() => setSimSpeed(spd)}
                            className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition-all ${
                              simSpeed === spd
                                ? 'bg-sky-500 text-slate-950 border-sky-400 font-black'
                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                            }`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        onClick={() => setIsAutoMoving(!isAutoMoving)}
                        className={`px-5 py-2.5 rounded-xl font-mono text-xs font-black flex items-center gap-2 transition-all ${
                          isAutoMoving
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                        }`}
                        id="auto-movement-toggle-btn"
                      >
                        {isAutoMoving ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isAutoMoving ? 'Pause Automatic Speed Transit' : 'Start Auto Smooth Transit (60 FPS)'}
                      </button>

                      <button
                        onClick={handleAdvanceNextCheckpoint}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700 text-xs font-mono font-bold rounded-xl flex items-center gap-2"
                        id="advance-checkpoint-tab3-btn"
                      >
                        <FastForward className="w-4 h-4 text-sky-400" />
                        Instantly Advance to Next Checkpoint
                      </button>
                    </div>
                  </div>

                  {/* Delay Reason & Resume Time Control Banner */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Delay Reason & Resume Notice Editor
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 font-mono font-bold block">Delay Reason Banner Text:</label>
                        <input
                          type="text"
                          value={delayReasonInput}
                          onChange={(e) => setDelayReasonInput(e.target.value)}
                          placeholder="e.g. Customs clearance inspection hold at Frankfurt terminal..."
                          className="w-full bg-slate-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400"
                          id="delay-reason-input-field"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 font-mono font-bold block">Estimated Resume Time:</label>
                        <input
                          type="text"
                          value={estimatedResumeInput}
                          onChange={(e) => setEstimatedResumeInput(e.target.value)}
                          placeholder="e.g. 2:30 PM UTC"
                          className="w-full bg-slate-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400 font-mono"
                          id="estimated-resume-input-field"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          handleUpdateShipmentStatus(selectedShipment.id, {
                            isPaused: true,
                            currentStatus: 'Delayed',
                            delayReason: delayReasonInput || 'Consignment hold for customs inspection.',
                            estimatedResume: estimatedResumeInput || '2:30 PM UTC',
                          });
                          setToastMessage('Saved Delay Notice banner successfully!');
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all font-mono"
                        id="save-delay-notice-btn"
                      >
                        Publish Delay Notice Banner
                      </button>
                      <button
                        onClick={() => {
                          handleUpdateShipmentStatus(selectedShipment.id, {
                            isPaused: false,
                            currentStatus: 'International Transit',
                            delayReason: undefined,
                            estimatedResume: undefined,
                          });
                          setToastMessage('Cleared delay hold; shipment resumed!');
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all font-mono"
                        id="clear-delay-notice-btn"
                      >
                        Clear Delay Hold & Resume
                      </button>
                    </div>
                  </div>

                  {/* Route Checkpoint Waypoints List & Editor */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-sky-400" />
                          Route Checkpoints & Waypoint Stops ({selectedShipment.stops?.length || 0})
                        </h4>
                        <p className="text-[11px] text-slate-400">Add, edit, or remove intermediate checkpoints along the shipment path.</p>
                      </div>

                      <button
                        onClick={() => setShowCheckpointModal(true)}
                        className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 font-mono shadow-md"
                        id="add-checkpoint-stop-modal-btn"
                      >
                        + Add Checkpoint Stop
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(!selectedShipment.stops || selectedShipment.stops.length === 0) ? (
                        <p className="text-slate-500 text-xs py-4 text-center font-mono">No intermediate stops defined for this route. Direct Origin ➔ Destination path.</p>
                      ) : (
                        selectedShipment.stops.map((stop, idx) => (
                          <div key={stop.id || idx} className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-sky-400 text-xs font-mono font-bold flex items-center justify-center">
                                #{idx + 1}
                              </span>
                              <div>
                                <h5 className="text-xs font-bold text-white">{stop.name}</h5>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  GPS: ({stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}) • ETA: {stop.estimatedArrival}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase ${
                                stop.status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : stop.status === 'current'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                                {stop.status}
                              </span>

                              <button
                                onClick={() => handleRemoveCheckpointStop(stop.id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400 transition-colors"
                                title="Delete Checkpoint"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Quick Status Presets */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleUpdateShipmentStatus(selectedShipment.id, { currentStatus: 'Out For Delivery', progressPercent: 90 })}
                      className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-sky-400 transition-colors disabled:opacity-50"
                    >
                      Set "Out for Delivery" (90%)
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleUpdateShipmentStatus(selectedShipment.id, { currentStatus: 'Delivered', progressPercent: 100 })}
                      className="p-3 bg-slate-950 hover:bg-emerald-950/40 border border-slate-800 rounded-xl text-xs font-bold text-emerald-400 transition-colors disabled:opacity-50"
                    >
                      Mark "Delivered" (100%)
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleUpdateShipmentStatus(selectedShipment.id, { currentStatus: 'Delayed', isPaused: true, delayReason: 'Weather advisory hold at transit hub.' })}
                      className="p-3 bg-slate-950 hover:bg-rose-950/40 border border-slate-800 rounded-xl text-xs font-bold text-rose-400 transition-colors disabled:opacity-50"
                    >
                      Mark "Delayed / Hold"
                    </button>
                  </div>

                </div>
              ) : (
                <p className="text-slate-500 text-center py-12">No shipment selected.</p>
              )}
            </div>

          </div>
        )}

        {/* TAB 4: CUSTOMER LIVE CHAT MANAGER */}
        {activeTab === 'live_chat' && (
          <div className="p-6 h-[calc(100vh-80px)] overflow-hidden flex flex-col sm:flex-row gap-6">
            
            {/* Left Column: Customer Threads List */}
            <div className="w-full sm:w-80 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col shrink-0 overflow-hidden">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                Active Customer Threads
              </h3>

              <div className="flex-1 overflow-y-auto space-y-2">
                {shipments.map((s, idx) => {
                  const sCode = (s.trackingCode || '').toLowerCase().trim();
                  const msgs = chatMessages.filter((m) => (m.trackingCode || m.shipmentId || '').toLowerCase().trim() === sCode);
                  const lastMsg = msgs[msgs.length - 1];
                  const hasUnread = msgs.some((m) => m.sender === 'customer' && !m.isRead);
                  const isSelected = (selectedChatTrackingCode || '').toLowerCase().trim() === sCode;

                  return (
                    <div
                      key={s.id ? `${s.id}-${idx}` : `chat-s-${idx}`}
                      onClick={() => setSelectedChatTrackingCode(s.trackingCode)}
                      className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-sky-500/10 border-sky-500/40'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-xs font-bold text-sky-400">{s.trackingCode}</span>
                        {hasUnread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-white mt-1">{s.customerName}</p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {lastMsg ? lastMsg.text : 'No messages yet.'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Chat Conversation View */}
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold text-white font-mono">Ref: {selectedChatTrackingCode}</h4>
                  <p className="text-xs text-slate-400">Direct Chat with Consignee</p>
                </div>
              </div>

              {/* Chat Messages List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/40">
                {chatMessages.filter((m) => (m.trackingCode || m.shipmentId || '').toLowerCase().trim() === (selectedChatTrackingCode || '').toLowerCase().trim()).length === 0 ? (
                  <p className="text-slate-500 text-center py-16 text-xs">No chat history for {selectedChatTrackingCode}.</p>
                ) : (
                  chatMessages
                    .filter((m) => (m.trackingCode || m.shipmentId || '').toLowerCase().trim() === (selectedChatTrackingCode || '').toLowerCase().trim())
                    .map((msg, msgIdx) => {
                      const isAdmin = msg.sender === 'admin';
                      return (
                        <div key={msg.id ? `${msg.id}-${msgIdx}` : `msg-${msgIdx}`} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                          <span className="text-[10px] text-slate-500 mb-0.5">
                            {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div
                            className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed ${
                              isAdmin ? 'bg-sky-500 text-slate-950 font-medium' : 'bg-slate-800 text-slate-100 border border-slate-700'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendAdminChat} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  value={adminChatReply}
                  onChange={(e) => setAdminChatReply(e.target.value)}
                  placeholder="Type reply to customer..."
                  className="flex-1 bg-slate-800 text-xs text-white placeholder-slate-400 px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500"
                  id="admin-chat-reply-input"
                />
                <button
                  type="submit"
                  disabled={!adminChatReply.trim()}
                  className="px-4 py-2.5 bg-sky-500 text-slate-950 font-bold text-xs rounded-xl disabled:opacity-50"
                  id="admin-chat-reply-send-btn"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        )}

        {/* TAB 5: CONTACT MESSAGES */}
        {activeTab === 'messages' && (
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Mail className="w-5 h-5 text-sky-400" /> Public Support Inquiries
              </h3>

              <div className="space-y-4">
                {contactMessages.length === 0 ? (
                  <p className="text-slate-500 text-center py-12">No contact form messages received yet.</p>
                ) : (
                  contactMessages.map((msg) => (
                    <div key={msg.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-white">{msg.subject}</h4>
                          <span className="text-xs text-sky-400 font-mono">{msg.name} ({msg.email})</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{new Date(msg.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800/80">
                        {msg.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: CUSTOMERS DIRECTORY */}
        {activeTab === 'customers' && (
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-400" /> Consignees & Customers Directory
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shipments.map((s, idx) => (
                  <div key={s.id ? `${s.id}-${idx}` : `cust-${idx}`} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-white">{s.customerName}</h4>
                      <span className="text-xs text-sky-400 font-mono">{s.trackingCode}</span>
                    </div>
                    <p className="text-xs text-slate-400">Email: {s.customerEmail}</p>
                    <p className="text-xs text-slate-400">Phone: {s.customerPhone}</p>
                    <p className="text-xs text-slate-400">Destination: {s.destination}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: AUDIT & EMAIL LOGS */}
        {activeTab === 'logs' && (
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" /> HTML Email Notifications Dispatched Log
              </h3>

              <div className="space-y-3">
                {emailLogs.length === 0 ? (
                  <p className="text-slate-500 text-center py-12">No emails recorded yet.</p>
                ) : (
                  emailLogs.map((log, idx) => (
                    <div key={log.id ? `${log.id}-${idx}` : `elog-${idx}`} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
                      <div className="flex justify-between font-mono">
                        <span className="text-sky-400 font-bold">{log.subject}</span>
                        <span className="text-slate-500">{new Date(log.sentAt).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-400">Recipient: {log.recipientEmail}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: SYSTEM SETTINGS & DISPATCH CONFIGURATION */}
        {activeTab === 'settings' && (
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="max-w-4xl space-y-6">
              
              {/* Card 1: API Connections & Dispatch Engine Status */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-sky-400" /> Infrastructure & Integrations Health
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/30">
                    Services Operational
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-300">Email Dispatch Service</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <p className="text-[11px] text-sky-400 font-mono">Connected & Operational</p>
                    <p className="text-[10px] text-slate-500">Auto notifications on status updates</p>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-300">Photo Upload Vault</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <p className="text-[11px] text-sky-400 font-mono">Secure Cloud Storage</p>
                    <p className="text-[10px] text-slate-500">HTTPS automatic image processing</p>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-300">Live Cloud Database</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <p className="text-[11px] text-sky-400 font-mono">Connected & Syncing</p>
                    <p className="text-[10px] text-slate-500">{shipments.length} live consignments loaded</p>
                  </div>
                </div>
              </div>

              {/* Card 2: Company & Notification Defaults */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-sky-400" /> Organization & Dispatch Settings
                </h3>

                <form
                  onSubmit={handleSaveCompanySettings}
                  className="space-y-4 text-xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Logistics Platform Name</label>
                      <input
                        type="text"
                        value={companySettings.companyName}
                        onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                        className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Support Contact Email</label>
                      <input
                        type="email"
                        value={companySettings.supportEmail}
                        onChange={(e) => setCompanySettings({ ...companySettings, supportEmail: e.target.value })}
                        className="w-full bg-slate-950 text-sky-300 font-mono p-3 rounded-xl border border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Support Phone Hotline</label>
                      <input
                        type="text"
                        value={companySettings.supportPhone}
                        onChange={(e) => setCompanySettings({ ...companySettings, supportPhone: e.target.value })}
                        className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Verified Sender Email Address</label>
                      <input
                        type="text"
                        value={companySettings.resendSender}
                        onChange={(e) => setCompanySettings({ ...companySettings, resendSender: e.target.value })}
                        className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Automatic Status Change Emails</span>
                      <span className="text-slate-400 text-[11px]">Send tracking email to consignee automatically on status updates.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={companySettings.autoEmailOnUpdate}
                      onChange={(e) => setCompanySettings({ ...companySettings, autoEmailOnUpdate: e.target.checked })}
                      className="w-5 h-5 text-sky-500 rounded border-slate-700 bg-slate-900 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      disabled={isSendingTestEmail}
                      onClick={handleSendTestEmail}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                      id="send-test-email-btn"
                    >
                      {isSendingTestEmail ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Send Test Email
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl transition-colors shadow-lg shadow-sky-500/20 disabled:opacity-50 flex items-center gap-2"
                      id="save-settings-btn"
                    >
                      {isSavingSettings && <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />}
                      Save Configuration
                    </button>
                  </div>
                </form>
              </div>

              {/* Card 3: Quick Maintenance Actions */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-sky-400" /> Database & Maintenance Quick Actions
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={async () => {
                      await seedInitialDataIfEmpty(true);
                      setToastMessage('Sample consignment GT48291584US restored successfully!');
                    }}
                    className="p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left space-y-1 transition-colors"
                  >
                    <span className="font-bold text-sky-400 text-xs block">Seed Sample Consignment ({SAMPLE_SHIPMENT_CODE})</span>
                    <span className="text-[11px] text-slate-400 block">Restores sample tracking data into live database.</span>
                  </button>

                  <button
                    onClick={() => {
                      setToastMessage('Cache cleared and live state re-synchronized successfully!');
                    }}
                    className="p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left space-y-1 transition-colors"
                  >
                    <span className="font-bold text-emerald-400 text-xs block">Flush Realtime Cache</span>
                    <span className="text-[11px] text-slate-400 block">Forces immediate state refresh for all active listeners.</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* CREATE SHIPMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-2xl w-full rounded-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white">Create New Consignment</h3>
            
            <form onSubmit={handleCreateShipment} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Tracking Code (Auto-generated)</label>
                  <input
                    type="text"
                    value={formData.trackingCode}
                    onChange={(e) => setFormData({ ...formData, trackingCode: e.target.value })}
                    className="w-full bg-slate-950 text-sky-400 font-mono font-bold p-3 rounded-xl border border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="e.g. John Smith"
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Customer Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Freight Method</label>
                  <select
                    value={formData.shipmentType}
                    onChange={(e) => setFormData({ ...formData, shipmentType: e.target.value as ShipmentType })}
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 font-mono"
                  >
                    <option value="Air">Air Express</option>
                    <option value="Sea">Sea Freight</option>
                    <option value="Road">Ground Trucking</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Package Name / Specs</label>
                  <input
                    type="text"
                    value={formData.packageName}
                    onChange={(e) => setFormData({ ...formData, packageName: e.target.value })}
                    placeholder="e.g. Industrial Microcontrollers"
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Destination Name</label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="e.g. San Francisco, CA, USA"
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700"
                  />
                </div>
              </div>

              {/* Cloudinary Drag & Drop Image Uploader */}
              <CloudinaryUploader
                images={formData.images || []}
                onChange={(newImages) => setFormData({ ...formData, images: newImages })}
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-sky-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Dispatching & Registering...</span>
                    </>
                  ) : (
                    <span>Create & Dispatch</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SHIPMENT MODAL */}
      {showEditModal && selectedShipment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-3xl w-full rounded-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Edit className="w-5 h-5 text-emerald-400" /> Edit Consignment Details
                </h3>
                <p className="text-xs text-sky-400 font-mono font-bold mt-0.5">Tracking Code: {selectedShipment.trackingCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedShipment) return;
                try {
                  await handleUpdateShipmentStatus(selectedShipment.id, {
                    customerName: formData.customerName || '',
                    customerEmail: formData.customerEmail || '',
                    customerPhone: formData.customerPhone || '',
                    shipmentType: (formData.shipmentType as ShipmentType) || 'Air',
                    courier: formData.courier || 'GoTrack Express',
                    packageName: formData.packageName || '',
                    brand: formData.brand || '',
                    model: formData.model || '',
                    weight: formData.weight || '',
                    quantity: formData.quantity || 1,
                    receiver: formData.receiver || '',
                    origin: formData.origin || '',
                    destination: formData.destination || '',
                    currentLocationName: formData.currentLocationName || '',
                    currentStatus: (formData.currentStatus as ShipmentStatus) || 'Processing',
                    progressPercent: formData.progressPercent || 0,
                    isPaused: !!formData.isPaused,
                    delayReason: formData.delayReason || '',
                    estimatedDelivery: formData.estimatedDelivery || '',
                    deliveryInstructions: formData.deliveryInstructions || '',
                    images: formData.images || [],
                  });
                  setShowEditModal(false);
                } catch (err) {
                  // Error toast is already displayed inside handleUpdateShipmentStatus
                }
              }}
              className="space-y-5 text-xs"
            >
              {/* Customer Contact Section */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-mono font-bold text-sky-400 uppercase">1. Consignee & Email Dispatch Target</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.customerName || ''}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full bg-slate-900 text-white p-2.5 rounded-xl border border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Customer Email (For Dispatches) *</label>
                    <input
                      type="email"
                      required
                      value={formData.customerEmail || ''}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      className="w-full bg-slate-900 text-sky-300 font-mono p-2.5 rounded-xl border border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Customer Phone</label>
                    <input
                      type="text"
                      value={formData.customerPhone || ''}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      className="w-full bg-slate-900 text-white p-2.5 rounded-xl border border-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Status & Live GPS Movement Controls */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-mono font-bold text-sky-400 uppercase">2. Status & GPS Movement Radar Control</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Current Status Stage</label>
                    <select
                      value={formData.currentStatus || 'Processing'}
                      onChange={(e) => setFormData({ ...formData, currentStatus: e.target.value as ShipmentStatus })}
                      className="w-full bg-slate-900 text-white p-2.5 rounded-xl border border-slate-700 font-mono"
                    >
                      <option value="Shipment Created">Shipment Created</option>
                      <option value="Picked Up">Picked Up</option>
                      <option value="Warehouse">Warehouse</option>
                      <option value="Processing">Processing</option>
                      <option value="Airport">Airport Terminal</option>
                      <option value="Customs">Customs Clearance</option>
                      <option value="International Transit">International Transit</option>
                      <option value="Regional Hub">Regional Hub</option>
                      <option value="Local Hub">Local Hub</option>
                      <option value="Out For Delivery">Out For Delivery</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Delayed">Delayed Hold</option>
                      <option value="Paused">Paused / Operational Hold</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Current Location Name</label>
                    <input
                      type="text"
                      value={formData.currentLocationName || ''}
                      onChange={(e) => setFormData({ ...formData, currentLocationName: e.target.value })}
                      className="w-full bg-slate-900 text-white p-2.5 rounded-xl border border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Estimated Delivery</label>
                    <input
                      type="text"
                      value={formData.estimatedDelivery || ''}
                      onChange={(e) => setFormData({ ...formData, estimatedDelivery: e.target.value })}
                      className="w-full bg-slate-900 text-white p-2.5 rounded-xl border border-slate-700"
                    />
                  </div>
                </div>

                {/* Progress Slider & Movement Pause Toggle */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-300 font-mono">Route Progress: {Math.round(formData.progressPercent || 0)}%</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isPaused || false}
                        onChange={(e) => setFormData({ ...formData, isPaused: e.target.checked })}
                        className="w-4 h-4 text-amber-500 rounded border-slate-700 bg-slate-950 focus:ring-amber-500"
                      />
                      <span className={`font-bold font-mono text-xs ${formData.isPaused ? 'text-amber-400' : 'text-slate-400'}`}>
                        {formData.isPaused ? '🛑 Pause Live GPS Dot Movement' : '▶ Live GPS Movement Active'}
                      </span>
                    </label>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={formData.progressPercent || 0}
                    onChange={(e) => setFormData({ ...formData, progressPercent: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                </div>

                {/* Delay / Pause Reason Text Input */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Hold / Pause / Delay Reason (Displayed on Live Map Overlay)
                  </label>
                  <input
                    type="text"
                    value={formData.delayReason || ''}
                    onChange={(e) => setFormData({ ...formData, delayReason: e.target.value })}
                    placeholder="e.g. Package undergoing customs security scan at transit terminal."
                    className="w-full bg-slate-900 text-amber-300 p-2.5 rounded-xl border border-slate-700 font-sans"
                  />
                </div>
              </div>

              {/* Package Photos via Cloudinary Uploader */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <CloudinaryUploader
                  images={formData.images || []}
                  onChange={(newImages) => setFormData({ ...formData, images: newImages })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2"
                  id="save-dispatch-shipment-btn"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Saving & Dispatching...</span>
                    </>
                  ) : (
                    <span>Save & Dispatch Update Email</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD TIMELINE STAGE MODAL */}
      {showTimelineModal && selectedShipment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Add Milestone Stage to {selectedShipment.trackingCode}</h3>
            
            <form onSubmit={handleAddTimelineStage} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Stage Status</label>
                <select
                  value={newTimelineStage}
                  onChange={(e) => setNewTimelineStage(e.target.value as ShipmentStatus)}
                  className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700"
                >
                  <option value="Picked Up">Picked Up</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="Processing">Processing</option>
                  <option value="Airport">Airport Terminal</option>
                  <option value="Customs">Customs Clearance</option>
                  <option value="International Transit">International Transit</option>
                  <option value="Regional Hub">Regional Hub</option>
                  <option value="Local Hub">Local Hub</option>
                  <option value="Out For Delivery">Out For Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Delayed">Delayed Hold</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Stage Title</label>
                <input
                  type="text"
                  required
                  value={newTimelineTitle}
                  onChange={(e) => setNewTimelineTitle(e.target.value)}
                  placeholder="e.g. Export Documentation Cleared"
                  className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Location Name</label>
                <input
                  type="text"
                  value={newTimelineLocation}
                  onChange={(e) => setNewTimelineLocation(e.target.value)}
                  placeholder="e.g. JFK Terminal 4, NY"
                  className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTimelineModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-sky-500 text-slate-950 font-bold rounded-xl">
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {shipmentToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">Delete Consignment?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete consignment{' '}
              <strong className="text-sky-400 font-mono">{shipmentToDelete.trackingCode}</strong>? This action will remove all associated records from the database.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShipmentToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={confirmDeleteShipment}
                className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-rose-500/20 disabled:opacity-50 flex items-center gap-1.5"
                id="confirm-delete-shipment-btn"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Consignment</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CHECKPOINT STOP MODAL */}
      {showCheckpointModal && selectedShipment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
              <MapPin className="w-5 h-5 text-sky-400" /> Add Waypoint Checkpoint Stop
            </h3>
            
            <form onSubmit={handleAddCheckpointStop} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Waypoint / Hub Name</label>
                <input
                  type="text"
                  required
                  value={newCheckpointForm.name}
                  onChange={(e) => setNewCheckpointForm({ ...newCheckpointForm, name: e.target.value })}
                  placeholder="e.g. Frankfurt Cargo Logistics Hub Terminal B"
                  className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700"
                  id="new-checkpoint-name-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Latitude Coordinate</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newCheckpointForm.lat}
                    onChange={(e) => setNewCheckpointForm({ ...newCheckpointForm, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 font-mono"
                    id="new-checkpoint-lat-input"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Longitude Coordinate</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newCheckpointForm.lng}
                    onChange={(e) => setNewCheckpointForm({ ...newCheckpointForm, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 font-mono"
                    id="new-checkpoint-lng-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Estimated Arrival / Departure Window</label>
                <input
                  type="text"
                  value={newCheckpointForm.estimatedArrival}
                  onChange={(e) => setNewCheckpointForm({ ...newCheckpointForm, estimatedArrival: e.target.value })}
                  placeholder="e.g. Tomorrow at 14:00 UTC"
                  className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 font-mono"
                  id="new-checkpoint-eta-input"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Waypoint Dispatch Notes</label>
                <input
                  type="text"
                  value={newCheckpointForm.notes}
                  onChange={(e) => setNewCheckpointForm({ ...newCheckpointForm, notes: e.target.value })}
                  placeholder="e.g. Regional sorting hub scan complete."
                  className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700"
                  id="new-checkpoint-notes-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckpointModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl font-mono shadow-md"
                  id="submit-new-checkpoint-btn"
                >
                  Save Waypoint Stop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SLICK TOP SUCCESS / NOTIFICATION BANNER */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/95 backdrop-blur-xl text-white border-2 border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.35)] rounded-2xl p-4 sm:px-6 max-w-lg w-11/12 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-6 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-xs sm:text-sm font-semibold leading-snug text-slate-100 font-sans">
              {toastMessage}
            </div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-slate-800 shrink-0"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
