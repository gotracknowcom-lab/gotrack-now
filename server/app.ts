import express from 'express';
import crypto from 'crypto';

export const app = express();

// Increase payload limit to support base64 image uploads from client
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// 1. Healthcheck Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'GoTrack Logistics Express Service',
    env: {
      hasResendKey: Boolean(process.env.RESEND_API_KEY),
      hasCloudinaryName: Boolean(process.env.CLOUDINARY_CLOUD_NAME),
      hasFirebaseKey: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY),
    },
  });
});

// 2. Resend Email Dispatch Endpoint with Server-Side Idempotency
interface EmailCacheEntry {
  timestamp: number;
  response: { success: boolean; id?: string; error?: string; message?: string };
}

const emailIdempotencyCache = new Map<string, EmailCacheEntry>();

// Clean up stale cache entries older than 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of emailIdempotencyCache.entries()) {
    if (now - entry.timestamp > 10 * 60 * 1000) {
      emailIdempotencyCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html, trackingCode, statusTrigger, replyTo, idempotencyKey } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    // Compute effective idempotency key
    const effectiveKey = idempotencyKey || `${trackingCode || 'NO_CODE'}_${statusTrigger || 'NO_TRIGGER'}_${to}`;
    const now = Date.now();

    // Check if key was recently processed (within last 3 minutes)
    if (effectiveKey && emailIdempotencyCache.has(effectiveKey)) {
      const cached = emailIdempotencyCache.get(effectiveKey)!;
      if (now - cached.timestamp < 3 * 60 * 1000) {
        console.log(`[Idempotency Filter] Suppressed duplicate email dispatch for key: ${effectiveKey} | Shipment: #${trackingCode || 'N/A'}`);
        return res.json({
          ...cached.response,
          deduplicated: true,
          message: 'Duplicate email request suppressed by server idempotency filter.',
        });
      }
    }

    // Read API Key strictly from environment variable RESEND_API_KEY
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('[Resend API Error] RESEND_API_KEY environment variable is missing.');
      return res.status(500).json({
        success: false,
        error: 'RESEND_API_KEY is not configured in server environment variables.',
      });
    }

    const primarySender = 'GoTrack Express <tracking@gotrack-now.com>';
    const replyToAddress = replyTo || 'tracking@gotrack-now.com';

    console.log(`[Email Request Logged] Timestamp: ${new Date().toISOString()} | Shipment: #${trackingCode || 'N/A'} | Status: ${statusTrigger || 'Update'} | Recipient: ${to} | Key: ${effectiveKey}`);

    let response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: primarySender,
        reply_to: replyToAddress,
        to: [to],
        subject,
        html,
      }),
    });

    let responseData = await response.json();

    // Fallback if domain is unverified on Resend testing mode
    if (!response.ok && (
      responseData.message?.includes('testing emails') ||
      responseData.message?.includes('domain') ||
      responseData.name === 'validation_error' ||
      responseData.statusCode === 403
    )) {
      console.warn(`[Resend Notice] Primary domain sender fallback dispatch via onboarding@resend.dev...`);
      
      const targetRecipient = responseData.message?.includes('testing emails') ? 'gotracknow.com@gmail.com' : to;

      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'GoTrack Express <onboarding@resend.dev>',
          reply_to: replyToAddress,
          to: [targetRecipient],
          subject: targetRecipient !== to ? `[Target: ${to}] ${subject}` : subject,
          html: (targetRecipient !== to ? `<div style="background:#fef3c7;padding:12px;margin-bottom:16px;border-radius:8px;font-family:sans-serif;font-size:12px;color:#92400e;"><strong>Resend Test Dispatch Note:</strong> Originally addressed to <code>${to}</code>. Delivered to verified admin address for testing.</div>` : '') + html,
        }),
      });
      responseData = await response.json();
    }

    if (!response.ok) {
      console.warn('[Resend API Error]', responseData);
      return res.status(response.status).json({
        success: false,
        error: responseData.message || 'Failed to dispatch email via Resend',
        details: responseData,
      });
    }

    console.log('[Resend Email Dispatched Successfully]', responseData.id);
    const successRes = {
      success: true,
      id: responseData.id,
      message: 'Email successfully queued/dispatched via Resend',
    };

    // Cache successful response for idempotency
    emailIdempotencyCache.set(effectiveKey, { timestamp: now, response: successRes });

    return res.json(successRes);
  } catch (err: any) {
    console.error('[Send Email Internal Error]', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error during email dispatch',
    });
  }
});

// 3. Cloudinary Image Upload Endpoint
app.post('/api/upload', async (req, res) => {
  try {
    const { image, folder } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Missing image field in request body' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({ error: 'Cloudinary environment variables are missing on the server.' });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    
    let strToSign = `timestamp=${timestamp}`;
    if (folder) {
      strToSign = `folder=${folder}&timestamp=${timestamp}`;
    }
    const signature = crypto.createHash('sha1').update(strToSign + apiSecret).digest('hex');

    const formData = new URLSearchParams();
    formData.append('file', image);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    if (folder) {
      formData.append('folder', folder);
    }

    console.log(`[Cloudinary] Uploading image to cloud: ${cloudName}...`);

    const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const cloudinaryData = await cloudinaryRes.json();

    if (!cloudinaryRes.ok) {
      console.error('[Cloudinary Upload Error]', cloudinaryData);
      return res.status(cloudinaryRes.status).json({
        error: cloudinaryData.error?.message || 'Cloudinary upload failed',
        details: cloudinaryData,
      });
    }

    let secureUrl = cloudinaryData.secure_url;
    if (secureUrl && secureUrl.includes('/upload/')) {
      secureUrl = secureUrl.replace('/upload/', '/upload/f_auto,q_auto/');
    }

    console.log('[Cloudinary Upload Success]', secureUrl);
    return res.json({
      success: true,
      url: secureUrl,
      public_id: cloudinaryData.public_id,
      format: cloudinaryData.format,
      width: cloudinaryData.width,
      height: cloudinaryData.height,
    });
  } catch (err: any) {
    console.error('[Upload Endpoint Error]', err);
    return res.status(500).json({
      error: err.message || 'Internal server error uploading image to Cloudinary',
    });
  }
});
