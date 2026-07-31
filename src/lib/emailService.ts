import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Shipment, ShipmentStatus } from '../types';

/**
 * Returns a tailored professional message for each shipment status trigger
 */
export function getStatusDescription(status: string, shipment: Shipment): string {
  switch (status) {
    case 'Shipment Created':
      return 'Your shipment has been created successfully and is now being prepared for dispatch. You can track its progress at any time using your tracking number.';
    case 'Picked Up':
      return 'Your shipment has been collected from the sender and is currently en route to our logistics processing facility.';
    case 'Processing':
      return 'Your package is being processed at our logistics hub and prepared for international sorting and export manifest clearance.';
    case 'Warehouse':
      return 'Your shipment has arrived at our central warehouse and is allocated for shipment container loading.';
    case 'Airport':
      return 'Your shipment has arrived at the air freight cargo terminal and is awaiting flight departure.';
    case 'Customs':
      return 'Good news! Your shipment has passed all customs inspection and regulatory clearance procedures successfully.';
    case 'International Transit':
    case 'In Transit':
      return 'Great news! Your shipment is currently in transit and moving toward its next destination. We will notify you again when another milestone is reached.';
    case 'Regional Hub':
      return 'Your shipment has safely arrived at the regional distribution hub for final destination sorting.';
    case 'Local Hub':
      return 'Your package has arrived at the local dispatch facility for final delivery route scheduling.';
    case 'Out For Delivery':
      return 'Exciting news! Your shipment is out for final delivery with our local driver today.';
    case 'Delivered':
      return 'Your shipment has been successfully delivered. Thank you for choosing GoTrack Express.';
    case 'Delayed':
      return 'Your shipment has experienced a temporary delay. We are working to resume its journey as quickly as possible. We appreciate your patience.';
    case 'Paused':
      return 'Your shipment is currently on an operational hold. Our dispatch team is actively monitoring the route.';
    case 'Shipment Resumed':
      return 'Your shipment is moving again following a temporary operational hold. Transit has resumed normally.';
    case 'Delivery Date Updated':
      return 'The estimated delivery schedule for your shipment has been updated by our dispatch team. Please review the updated details below.';
    case 'Shipment Information Updated':
      return 'The details for your shipment have been updated by our dispatch controllers. Please see the summary below for the latest tracking information.';
    default:
      return `Your shipment status has been updated to "${status}". You can view live movement details online anytime.`;
  }
}

/**
 * Generates modern, responsive, email-client compliant HTML for GoTrack Express status notifications
 */
export function generateShipmentEmailHTML(shipment: Shipment, statusTrigger: string): string {
  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    'Shipment Created': { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
    'Picked Up': { bg: '#e0f2fe', text: '#0284c7', border: '#38bdf8' },
    'Warehouse': { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
    'Processing': { bg: '#ecfdf5', text: '#047857', border: '#6ee7b7' },
    'Airport': { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
    'Customs': { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
    'International Transit': { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
    'In Transit': { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
    'Regional Hub': { bg: '#e0f2fe', text: '#075985', border: '#7dd3fc' },
    'Local Hub': { bg: '#e0f2fe', text: '#0284c7', border: '#38bdf8' },
    'Out For Delivery': { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
    'Delivered': { bg: '#dcfce7', text: '#15803d', border: '#4ade80' },
    'Delayed': { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
    'Paused': { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
    'Shipment Resumed': { bg: '#e0f2fe', text: '#0369a1', border: '#38bdf8' },
    'Delivery Date Updated': { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
    'Shipment Information Updated': { bg: '#f8fafc', text: '#334155', border: '#cbd5e1' },
  };

  const currentStatus = statusTrigger || shipment.currentStatus || 'Processing';
  const badgeStyle = statusColors[currentStatus] || { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' };
  const messageText = getStatusDescription(currentStatus, shipment);
  const nowFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const trackingUrl = `https://gotrack-now.com/track?code=${encodeURIComponent(shipment.trackingCode)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GoTrack Express - ${shipment.trackingCode}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 30px 10px;
    }
    .main-card {
      max-width: 620px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
    }
    .header {
      background-color: #0f172a;
      padding: 32px 36px;
      text-align: left;
    }
    .brand-title {
      color: #ffffff;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
      text-decoration: none;
    }
    .brand-accent {
      color: #38bdf8;
    }
    .brand-sub {
      color: #94a3b8;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
      display: block;
    }
    .body-content {
      padding: 36px 36px 28px 36px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin-top: 0;
      margin-bottom: 8px;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 18px;
      border-radius: 50px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 18px;
    }
    .status-msg {
      font-size: 14px;
      line-height: 1.6;
      color: #334155;
      margin-bottom: 24px;
      background-color: #f8fafc;
      padding: 16px;
      border-radius: 12px;
      border-left: 4px solid #0284c7;
    }
    .tracking-box {
      background-color: #f0f9ff;
      border: 1px dashed #0284c7;
      border-radius: 12px;
      padding: 18px;
      text-align: center;
      margin-bottom: 28px;
    }
    .tracking-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: #0369a1;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .tracking-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 2px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
    }
    .details-table td {
      padding: 12px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
    }
    .label-col {
      color: #64748b;
      font-weight: 500;
      width: 40%;
    }
    .val-col {
      color: #0f172a;
      font-weight: 700;
      width: 60%;
      text-align: right;
    }
    .warning-box {
      background-color: #fef2f2;
      border: 1px solid #fca5a5;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      color: #991b1b;
      font-size: 13px;
      line-height: 1.5;
    }
    .cta-container {
      text-align: center;
      margin-top: 32px;
      margin-bottom: 12px;
    }
    .btn-track {
      display: inline-block;
      background-color: #0284c7;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 700;
      padding: 16px 36px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
      transition: all 0.2s ease;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 36px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      line-height: 1.6;
    }
    .footer-links {
      margin-top: 8px;
    }
    .footer-links a {
      color: #0284c7;
      text-decoration: none;
      margin: 0 8px;
      font-weight: 600;
    }
    @media only screen and (max-width: 600px) {
      .header { padding: 24px 20px; }
      .body-content { padding: 24px 20px 20px 20px; }
      .footer { padding: 20px; }
      .tracking-code { font-size: 20px; }
      .btn-track { width: 100%; box-sizing: border-box; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-card">
      
      <!-- Header -->
      <div class="header">
        <a href="https://gotrack-now.com" class="brand-title">Go<span class="brand-accent">Track</span> Express</a>
        <span class="brand-sub">Global Logistics & Supply Chain Network</span>
      </div>

      <!-- Main Body -->
      <div class="body-content">
        
        <p class="greeting">Dear ${shipment.customerName || 'Valued Consignee'},</p>

        <div class="status-badge" style="background-color: ${badgeStyle.bg}; color: ${badgeStyle.text}; border: 1px solid ${badgeStyle.border}">
          Status: ${currentStatus}
        </div>

        <div class="status-msg">
          ${messageText}
        </div>

        <!-- Prominent Tracking Code Badge -->
        <div class="tracking-box">
          <div class="tracking-label">Waybill / Tracking Number</div>
          <div class="tracking-code">${shipment.trackingCode}</div>
        </div>

        <!-- Delay / Hold Alert if present -->
        ${(shipment.delayReason || currentStatus === 'Delayed' || currentStatus === 'Paused') ? `
        <div class="warning-box">
          <strong>⚠️ Notice regarding your consignment:</strong><br/>
          ${shipment.delayReason || 'Your shipment is temporarily delayed due to transit hold/customs operational inspection.'}
        </div>
        ` : ''}

        <!-- Shipment Particulars Table -->
        <table class="details-table">
          <tr>
            <td class="label-col">Customer / Consignee</td>
            <td class="val-col">${shipment.customerName || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label-col">Package Description</td>
            <td class="val-col">${shipment.packageName || 'General Cargo'} ${shipment.weight ? `(${shipment.weight})` : ''}</td>
          </tr>
          <tr>
            <td class="label-col">Courier & Carrier</td>
            <td class="val-col">${shipment.courier || 'GoTrack Express'} (${shipment.shipmentType || 'Air'})</td>
          </tr>
          <tr>
            <td class="label-col">Origin ➔ Destination</td>
            <td class="val-col">${shipment.origin || 'Origin Terminal'} ➔ ${shipment.destination || 'Destination'}</td>
          </tr>
          <tr>
            <td class="label-col">Current Location</td>
            <td class="val-col">📍 ${shipment.currentLocationName || 'In Transit'}</td>
          </tr>
          <tr>
            <td class="label-col">Estimated Delivery</td>
            <td class="val-col" style="color:#0284c7; font-weight:800;">${shipment.estimatedDelivery || 'Pending Dispatch'}</td>
          </tr>
          <tr>
            <td class="label-col">Last System Scan</td>
            <td class="val-col">${nowFormatted}</td>
          </tr>
        </table>

        <!-- CTA Button -->
        <div class="cta-container">
          <a href="${trackingUrl}" class="btn-track" target="_blank">Track Shipment Live on Map</a>
        </div>

      </div>

      <!-- Footer -->
      <div class="footer">
        <p><strong>GoTrack Express International Logistics</strong><br/>
        This email was automatically sent to <strong>${shipment.customerEmail}</strong> regarding consignment #${shipment.trackingCode}.</p>
        
        <div class="footer-links">
          <a href="mailto:tracking@gotrack-now.com">Support: tracking@gotrack-now.com</a> | 
          <a href="tel:+18005550199">+1 (800) 555-0199</a>
        </div>
        
        <p style="margin-top:12px; font-size:11px; color:#94a3b8;">
          © ${new Date().getFullYear()} GoTrack Express Inc. All rights reserved. Confidential transaction record.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends automated HTML status email via server API endpoint (/api/send-email)
 * Asynchronous, error-handled, records email execution logs to Firestore.
 */
export async function sendShipmentStatusEmail(shipment: Shipment, statusTrigger: string): Promise<boolean> {
  if (!shipment || !shipment.trackingCode) {
    console.warn('[sendShipmentStatusEmail] Aborted: Missing shipment data.');
    return false;
  }

  const recipientEmail = shipment.customerEmail || 'gotracknow.com@gmail.com';
  const html = generateShipmentEmailHTML(shipment, statusTrigger);
  const subject = `[GoTrack Update] Shipment ${shipment.trackingCode} - Status: ${statusTrigger}`;

  let dispatchStatus: 'delivered' | 'failed' | 'sent' = 'sent';
  let resendId: string | null = null;
  let apiErrorMessage: string | null = null;

  try {
    // Dispatch to server API endpoint
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipientEmail,
        replyTo: 'tracking@gotrack-now.com',
        subject,
        html,
        trackingCode: shipment.trackingCode,
        statusTrigger,
      }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      dispatchStatus = 'delivered';
      resendId = data.id || null;
      console.log(`[Email Dispatch Success] Resend ID: ${resendId} to ${recipientEmail}`);
    } else {
      dispatchStatus = 'failed';
      apiErrorMessage = data.error || 'Server rejected email dispatch';
      console.warn(`[Email Dispatch Warning] ${apiErrorMessage}`);
    }
  } catch (err: any) {
    dispatchStatus = 'failed';
    apiErrorMessage = err.message || 'Network exception dispatching email';
    console.error('[Email Dispatch Fetch Error]', err);
  }

  // Record audit log in Firestore email_logs asynchronously
  try {
    await addDoc(collection(db, 'email_logs'), {
      trackingCode: shipment.trackingCode,
      recipientEmail,
      subject,
      statusTrigger,
      sentAt: new Date().toISOString(),
      status: dispatchStatus,
      resendId,
      errorMessage: apiErrorMessage,
      htmlBody: html,
    });

    // Notify admin panel notifications feed
    await addDoc(collection(db, 'admin_notifications'), {
      title: dispatchStatus === 'delivered' ? `Email Notification Dispatched` : `Email Dispatch Warning`,
      message: `Status update (${statusTrigger}) for ${shipment.trackingCode} to ${recipientEmail} - ${dispatchStatus.toUpperCase()}`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'system',
      trackingCode: shipment.trackingCode,
    });

    return dispatchStatus === 'delivered';
  } catch (logErr) {
    console.error('[Email Log Firestore Error]', logErr);
    return false;
  }
}
