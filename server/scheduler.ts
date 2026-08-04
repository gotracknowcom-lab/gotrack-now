import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json' with { type: 'json' };

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: process.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const dbId = (firebaseConfigJson as any).firestoreDatabaseId || undefined;
const db = getFirestore(app, dbId);

// Send Resend Email directly from server
async function sendServerHoldEmail(shipment: any, delayReason: string) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || !shipment.customerEmail) return;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b;">
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">GoTrack Logistics Express</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #e0f2fe;">Automated Operational Notice</p>
        </div>
        
        <div style="padding: 24px;">
          <div style="background: #ef444415; border: 1px solid #ef444440; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0; color: #fca5a5; font-size: 14px; font-weight: bold;">⚠️ Operational Hold Status Notice</p>
            <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 13px;">Tracking Reference: <strong>${shipment.trackingCode}</strong></p>
          </div>

          <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">Dear <strong>${shipment.customerName || 'Valued Customer'}</strong>,</p>
          
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
            Your shipment <strong>${shipment.packageName || 'Consignment'}</strong> (#${shipment.trackingCode}) has encountered a scheduled operational delay at <strong>${shipment.currentLocationName || 'Transit Terminal'}</strong>.
          </p>

          <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">Hold Reason:</p>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: #fef08a; font-weight: 600;">${delayReason}</p>
          </div>

          <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
            Our logistics support team is actively managing this clearance procedure to ensure safe transit. Further updates will be reflected live on your tracking portal.
          </p>

          <div style="text-align: center; margin-top: 28px; padding-top: 20px; border-top: 1px solid #334155;">
            <p style="font-size: 12px; color: #64748b; margin: 0;">GoTrack Global Logistics Operations © 2026</p>
          </div>
        </div>
      </div>
    `;

    const primarySender = 'GoTrack Express <tracking@gotrack-now.com>';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: primarySender,
        reply_to: 'tracking@gotrack-now.com',
        to: [shipment.customerEmail],
        subject: `⚠️ Operational Hold Alert: Shipment #${shipment.trackingCode}`,
        html: htmlContent,
      }),
    });
    console.log(`[24/7 Server Worker Email Dispatched] Sent hold alert for #${shipment.trackingCode} to ${shipment.customerEmail}`);
  } catch (err) {
    console.error('[24/7 Server Worker Email Error]', err);
  }
}

export function start247ServerScheduler() {
  console.log('[24/7 Server Worker] GoTrack 24/7 Background Hold Scheduler Active');

  // Check every 20 seconds
  setInterval(async () => {
    try {
      // Calculate current Nigeria Time (WAT = UTC+1)
      const nowMs = Date.now();
      const watDate = new Date(nowMs + 3600000);
      const currentWATISO = watDate.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"

      const querySnapshot = await getDocs(collection(db, 'shipments'));
      
      for (const docSnap of querySnapshot.docs) {
        const shipment = { id: docSnap.id, ...docSnap.data() } as any;

        if (shipment.scheduledHold && !shipment.scheduledHold.executed && shipment.scheduledHold.holdTimeWAT) {
          if (currentWATISO >= shipment.scheduledHold.holdTimeWAT) {
            console.log(`[24/7 Server Hold Triggered] Shipment: ${shipment.trackingCode} | Current WAT: ${currentWATISO} >= Scheduled: ${shipment.scheduledHold.holdTimeWAT}`);

            const reason = shipment.scheduledHold.reason || 'Consignment hold for customs and security check.';
            let newLocation = shipment.currentLocationName;
            let newCoords = shipment.currentCoords;
            let updatedStops = shipment.stops || [];
            let updatedProgress = shipment.progressPercent;

            if (shipment.scheduledHold.targetCheckpointId) {
              const targetIdx = updatedStops.findIndex((st: any) => st.id === shipment.scheduledHold?.targetCheckpointId);
              if (targetIdx !== -1) {
                const targetStop = updatedStops[targetIdx];
                newLocation = targetStop.name;
                newCoords = [targetStop.lng, targetStop.lat];
                updatedStops = updatedStops.map((st: any, i: number) => {
                  if (i <= targetIdx) return { ...st, status: 'completed' };
                  if (i === targetIdx + 1) return { ...st, status: 'current' };
                  return st;
                });
                updatedProgress = Math.round(((targetIdx + 1) / (updatedStops.length + 1)) * 100);
              }
            }

            const updatedTimeline = (shipment.timeline || []).map((t: any) => ({ ...t, current: false }));
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

            const docRef = doc(db, 'shipments', shipment.id);
            await updateDoc(docRef, {
              isPaused: true,
              currentStatus: 'Delayed',
              delayReason: reason,
              currentLocationName: newLocation,
              currentCoords: newCoords,
              stops: updatedStops,
              progressPercent: updatedProgress,
              timeline: updatedTimeline,
              scheduledHold: { ...shipment.scheduledHold, executed: true },
            });

            // Dispatch Email Notification from 24/7 Server
            await sendServerHoldEmail(shipment, reason);
          }
        }
      }
    } catch (err) {
      console.error('[24/7 Server Scheduler Error]', err);
    }
  }, 20000);
}
