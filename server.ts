import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { SAMPLE_PRESENTATION_VEHICLES } from './src/data/sampleVehicles.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

import { initializeApp as initializeFirebaseApp, getApps as getFirebaseApps } from 'firebase/app';
import {
  collection as fsCollection,
  doc as fsDoc,
  getDoc as fsGetDoc,
  getDocs as fsGetDocs,
  getFirestore,
  limit as fsLimit,
  query as fsQuery,
} from 'firebase/firestore';

// Load Firebase config safely from disk
interface FirebaseAppletConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  firestoreDatabaseId: string;
  appId?: string;
}

function loadFirebaseConfig(): FirebaseAppletConfig | null {
  try {
    const configPath = path.join(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return {
        apiKey: raw.apiKey,
        authDomain: raw.authDomain,
        projectId: raw.projectId,
        firestoreDatabaseId: raw.firestoreDatabaseId || '(default)',
        appId: raw.appId,
      };
    }
  } catch (err) {
    console.error('Failed to read firebase-applet-config.json:', err);
  }
  return null;
}

let cachedServerDb: ReturnType<typeof getFirestore> | null = null;

function getServerFirestore() {
  if (cachedServerDb) return cachedServerDb;
  const cfg = loadFirebaseConfig();
  if (!cfg) return null;
  const app = getFirebaseApps().length > 0 ? getFirebaseApps()[0] : initializeFirebaseApp(cfg);
  cachedServerDb = getFirestore(app, cfg.firestoreDatabaseId);
  return cachedServerDb;
}

function withTimeout<T>(promise: Promise<T>, ms = 6000, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function fetchPublicCollection(collectionName: string, pageSize = 100): Promise<any[]> {
  const db = getServerFirestore();
  if (!db) return [];
  try {
    const snap = await withTimeout(
      fsGetDocs(fsQuery(fsCollection(db, collectionName), fsLimit(pageSize))),
      6000,
      null
    );
    if (!snap) return [];
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error(`Firestore SDK fetch error (${collectionName}):`, err);
    return [];
  }
}

async function fetchPublicDocument(collectionName: string, docId: string): Promise<any | null> {
  const db = getServerFirestore();
  if (!db) return null;
  try {
    const snap = await withTimeout(fsGetDoc(fsDoc(db, collectionName, docId)), 5000, null);
    if (!snap || !snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    console.error(`Firestore SDK doc error (${collectionName}/${docId}):`, err);
    return null;
  }
}

async function fetchActiveInventory(settingsDoc?: any | null): Promise<any[]> {
  const dbVehicles = await fetchPublicCollection('vehicles', 200);
  if (dbVehicles.length > 0) return dbVehicles;
  const resolvedSettings = settingsDoc !== undefined ? settingsDoc : await fetchPublicDocument('settings', 'dealership');
  if (resolvedSettings?.sampleInventoryCleared) return [];
  return SAMPLE_PRESENTATION_VEHICLES;
}

// Track sent WhatsApp notification references to prevent duplicate notifications
const sentWhatsAppRefs = new Set<string>();

function createGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'car-depot-by-ultimate-autos' });
  });

  // Dynamic robots.txt
  app.get('/robots.txt', (req, res) => {
    const origin = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /dashboard',
        `Sitemap: ${origin.replace(/\/$/, '')}/sitemap.xml`,
      ].join('\n')
    );
  });

  // Dynamic XML Sitemap reading live vehicles from Firestore
  app.get('/sitemap.xml', async (req, res) => {
    const origin = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const staticPaths = [
      '/',
      '/cars',
      '/financing',
      '/save-to-own',
      '/sell-your-car',
      '/request-car',
      '/about',
      '/contact',
      '/policies/privacy',
      '/policies/terms',
      '/policies/financing-terms',
      '/policies/save-to-own-terms',
      '/policies/refund-policy',
      '/policies/purchase-policy',
    ];

    const vehicles = await fetchActiveInventory();
    const vehicleUrls = vehicles
      .filter((v) => v.slug)
      .map(
        (v) => `  <url>
    <loc>${origin}/cars/${encodeURIComponent(v.slug)}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`
      );

    const staticUrls = staticPaths.map(
      (p) => `  <url>
    <loc>${origin}${p}</loc>
    <changefreq>weekly</changefreq>
    <priority>${p === '/' ? '1.0' : '0.8'}</priority>
  </url>`
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.join('\n')}
${vehicleUrls.join('\n')}
</urlset>`;

    res.type('application/xml').send(xml);
  });

  // AI Chatbot endpoint using @google/genai server-side + real Firestore inventory
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, history = [] } = req.body as {
        message?: string;
        history?: Array<{ role: 'user' | 'assistant'; text: string }>;
      };

      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'Message is required.' });
      }

      const ai = createGenAIClient();
      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured on the server.',
        });
      }

      const settingsDoc = await fetchPublicDocument('settings', 'dealership');
      const vehicles = await fetchActiveInventory(settingsDoc);

      if (settingsDoc && settingsDoc.chatbotEnabled === false) {
        return res.status(403).json({
          error: 'The AI Virtual Assistant is currently disabled by dealership administrators.',
        });
      }

      const liveInventory = vehicles.map((v) => ({
        id: v.id,
        slug: v.slug,
        referenceCode: v.referenceCode,
        name: v.name,
        make: v.make,
        model: v.model,
        year: v.year,
        priceNgn: v.priceNgn,
        location: v.location,
        condition: v.condition,
        transmission: v.transmission,
        fuelType: v.fuelType,
        bodyType: v.bodyType,
        mileageKm: v.mileageKm,
        status: v.status,
        financingAvailable: Boolean(v.financingAvailable),
        saveToOwnAvailable: Boolean(v.saveToOwnAvailable),
        verified: Boolean(v.verified),
      }));

      const businessContext = {
        businessName: settingsDoc?.businessName || 'CAR DEPOT BY ULTIMATE AUTOS',
        publicListingTitle:
          settingsDoc?.publicListingTitle ||
          'Car Depot | Foreign and Locally Used Cars in Nigeria | Ultimate Autos NG',
        tagline: settingsDoc?.tagline || 'YOUR TRUSTED CAR PARTNER.',
        whatsappNumber: settingsDoc?.whatsappNumber || '+234 816 569 5833',
        phoneNumber: settingsDoc?.phoneNumber || '+234 816 569 5833',
        address: settingsDoc?.address || 'Lagos, Nigeria',
        businessHours: settingsDoc?.businessHours || 'Mon – Sat: 8:30 AM – 6:00 PM WAT',
        faqs: Array.isArray(settingsDoc?.faqs) ? settingsDoc.faqs : [],
        customInstructions: settingsDoc?.chatbotInstructions || '',
      };

      const systemInstruction = `You are "${settingsDoc?.chatbotName || 'Car Depot AI Assistant'}", the official virtual customer service and sales assistant for ${businessContext.businessName} ("${businessContext.tagline}").

CRITICAL GROUNDING RULES (MUST NEVER BE VIOLATED):
1. LIVE DATABASE INVENTORY ONLY: Below is the complete, real-time Firestore vehicle inventory (${liveInventory.length} vehicles). NEVER invent, guess, or fabricate vehicle listings, prices, specifications, mileage, availability, or financing approvals.
2. MISSING VEHICLES: If a customer asks for a vehicle that is NOT in the live inventory list below (or if the inventory has 0 vehicles), explicitly state that you cannot confirm current showroom availability for that exact model in our live database, and immediately offer to:
   (a) collect their details for a Car Quotation / Sourcing Request, or
   (b) connect them to our sales team on WhatsApp (${businessContext.whatsappNumber}).
3. NO AUTO-APPROVALS: Never claim to approve car financing, confirm a bank transfer/payment, or lock a price automatically. State clearly that Buy Now Pay Later financing and Save to Own payment confirmations are subject to dealership verification and approval.
4. NATURAL ENQUIRY COLLECTION: When a customer expresses intent to buy a car, apply for financing, start Save to Own, sell their car (Direct Purchase or Consignment), or request a quotation, collect their details conversationally—ask at most 1–2 natural questions per turn, NEVER overwhelm with a huge form list at once.
5. HUMAN HANDOVER: If the customer asks for a human representative, wants to negotiate a final price, sounds frustrated, asks for an official financing decision, or has a question you cannot answer from dealership data, set "needsHumanHandover" to true and offer WhatsApp (${businessContext.whatsappNumber}), phone call, or enquiry submission.
6. CURRENCY: Always format prices in Nigerian Naira (₦).

BUSINESS INFORMATION:
${JSON.stringify(businessContext, null, 2)}

LIVE FIRESTORE VEHICLE INVENTORY:
${JSON.stringify(liveInventory, null, 2)}
`;

      const trimmedHistory = Array.isArray(history) ? history.slice(-12) : [];
      const contents = [
        ...trimmedHistory.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m.text || '') }],
        })),
        {
          role: 'user',
          parts: [{ text: message.trim() }],
        },
      ];

      let response: any = null;
      let lastErr: any = null;
      const candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
      for (const modelName of candidateModels) {
        let succeeded = false;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    reply: {
                      type: Type.STRING,
                      description: 'Natural, helpful, accurate customer response.',
                    },
                    matchedVehicleIds: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description:
                        'Exact IDs from the LIVE FIRESTORE VEHICLE INVENTORY that match the customer query.',
                    },
                    needsHumanHandover: {
                      type: Type.BOOLEAN,
                      description:
                        'True if customer requested human assistance, price negotiation, official financing approval, or is frustrated.',
                    },
                    unansweredQuestion: {
                      type: Type.BOOLEAN,
                      description:
                        'True if the question could not be fully answered from live inventory or business info.',
                    },
                    collectedLead: {
                      type: Type.OBJECT,
                      properties: {
                        customerName: { type: Type.STRING },
                        customerPhone: { type: Type.STRING },
                        enquiryCategory: {
                          type: Type.STRING,
                          description:
                            'One of: car_purchase, financing, save_to_own, sell_car, quotation, inspection, general',
                        },
                        preferredVehicle: { type: Type.STRING },
                        budgetNgn: { type: Type.NUMBER },
                        paymentPreference: { type: Type.STRING },
                        notes: { type: Type.STRING },
                        readyToSubmit: {
                          type: Type.BOOLEAN,
                          description:
                            'True when at least customerName, customerPhone, and an enquiry topic have been collected.',
                        },
                      },
                    },
                  },
                  required: ['reply', 'matchedVehicleIds', 'needsHumanHandover', 'unansweredQuestion'],
                },
              },
            });
            succeeded = true;
            break;
          } catch (err: any) {
            lastErr = err;
            const msg = String(err?.message || '');
            const isTransient = msg.includes('503') || msg.includes('429') || msg.includes('UNAVAILABLE');
            if (!isTransient) {
              throw err;
            }
            if (attempt === 0) {
              await new Promise((r) => setTimeout(r, 700));
            }
          }
        }
        if (succeeded) break;
      }
      if (!response) throw lastErr;

      const rawText = (response.text || '{}').trim();
      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = {
          reply: rawText || 'How can I assist you with Car Depot by Ultimate Autos today?',
          matchedVehicleIds: [],
          needsHumanHandover: false,
          unansweredQuestion: false,
        };
      }

      const validIdSet = new Set(liveInventory.map((v) => v.id));
      const matchedIds = Array.isArray(parsed.matchedVehicleIds)
        ? parsed.matchedVehicleIds.filter((id: string) => validIdSet.has(id))
        : [];
      const matchedVehicles = vehicles.filter((v) => matchedIds.includes(v.id));

      return res.json({
        reply: parsed.reply,
        matchedVehicles,
        needsHumanHandover: Boolean(parsed.needsHumanHandover),
        unansweredQuestion: Boolean(parsed.unansweredQuestion),
        collectedLead: parsed.collectedLead || null,
        dealershipWhatsapp: businessContext.whatsappNumber,
      });
    } catch (err: any) {
      console.error('AI Chat API error:', err);
      const rawMsg = String(err?.message || '');
      const isBusy = rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE');
      return res.status(isBusy ? 503 : 500).json({
        error: isBusy
          ? 'Our AI assistant is experiencing high demand right now. Please try again in a moment or chat directly with our sales team on WhatsApp.'
          : 'Unable to process AI assistant response right now. You can continue via WhatsApp or Request a Quotation.',
      });
    }
  });

  // Automated WhatsApp Business Cloud API notification (with strict credential & duplicate protection)
  app.post('/api/whatsapp/notify', async (req, res) => {
    try {
      const {
        enquiryReference,
        customerName,
        customerPhone,
        category,
        preferredVehicle,
        budgetNgn,
        paymentPreference,
        message,
      } = req.body as Record<string, any>;

      if (!enquiryReference || !customerName) {
        return res.status(400).json({ error: 'enquiryReference and customerName are required.' });
      }

      const recipientDigits = (process.env.WHATSAPP_BUSINESS_RECIPIENT || '2348165695833').replace(
        /\D/g,
        ''
      );
      const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

      const formattedBody = [
        `*New Car Depot Enquiry (${enquiryReference})*`,
        `Name: ${customerName}`,
        customerPhone ? `Phone: ${customerPhone}` : null,
        `Category: ${category || 'general'}`,
        preferredVehicle ? `Vehicle: ${preferredVehicle}` : null,
        budgetNgn ? `Budget: ₦${Number(budgetNgn).toLocaleString('en-NG')}` : null,
        paymentPreference ? `Payment: ${paymentPreference}` : null,
        message ? `Details: ${String(message).slice(0, 600)}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      const clickToWhatsAppUrl = `https://wa.me/${recipientDigits}?text=${encodeURIComponent(
        formattedBody.replace(/\*/g, '')
      )}`;

      if (sentWhatsAppRefs.has(enquiryReference)) {
        return res.json({
          configured: Boolean(token && phoneNumberId),
          delivered: true,
          duplicatePrevented: true,
          status: 'sent',
          clickToWhatsAppUrl,
        });
      }

      if (!token || !phoneNumberId) {
        return res.json({
          configured: false,
          delivered: false,
          status: 'not_configured',
          reason:
            'WhatsApp Business Cloud API credentials are not configured on the server. Enquiry saved; Click-to-WhatsApp handover is ready.',
          clickToWhatsAppUrl,
        });
      }

      const graphRes = await fetch(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: recipientDigits,
            type: 'text',
            text: { body: formattedBody },
          }),
        }
      );

      const graphJson = (await graphRes.json()) as any;
      if (!graphRes.ok) {
        return res.status(502).json({
          configured: true,
          delivered: false,
          status: 'failed',
          error: graphJson?.error?.message || 'WhatsApp Cloud API delivery failed.',
          clickToWhatsAppUrl,
        });
      }

      sentWhatsAppRefs.add(enquiryReference);
      return res.json({
        configured: true,
        delivered: true,
        status: 'sent',
        providerMessageId: graphJson?.messages?.[0]?.id || '',
        clickToWhatsAppUrl,
      });
    } catch (err: any) {
      console.error('WhatsApp notify error:', err);
      return res.status(500).json({
        configured: Boolean(process.env.WHATSAPP_CLOUD_API_TOKEN),
        delivered: false,
        status: 'failed',
        error: err?.message || 'Unexpected WhatsApp notification failure.',
      });
    }
  });

  // Cloudinary configuration & signed upload parameters
  app.get('/api/cloudinary/status', (_req, res) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || '';
    const hasSignedCreds = Boolean(
      cloudName && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
    );
    res.json({
      configured: Boolean(cloudName && (uploadPreset || hasSignedCreds)),
      cloudName,
      mode: hasSignedCreds ? 'signed' : uploadPreset ? 'unsigned' : 'unconfigured',
    });
  });

  app.post('/api/cloudinary/sign', (req, res) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
    const apiKey = process.env.CLOUDINARY_API_KEY || '';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || '';
    const folder = String(req.body?.folder || 'car-depot').replace(/[^a-zA-Z0-9_\-/]/g, '');

    if (!cloudName) {
      return res.status(503).json({
        configured: false,
        error: 'Cloudinary is not configured on the server (CLOUDINARY_CLOUD_NAME missing).',
      });
    }

    if (apiKey && apiSecret) {
      const timestamp = Math.floor(Date.now() / 1000);
      const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');
      return res.json({
        configured: true,
        mode: 'signed',
        cloudName,
        apiKey,
        timestamp,
        signature,
        folder,
      });
    }

    if (uploadPreset) {
      return res.json({
        configured: true,
        mode: 'unsigned',
        cloudName,
        uploadPreset,
        folder,
      });
    }

    return res.status(503).json({
      configured: false,
      error: 'Cloudinary upload preset or API secret is not configured.',
    });
  });

  // Nigerian Payment Gateway (Paystack) Status, Initialize & Server-Side Verification
  app.get('/api/payments/status', (_req, res) => {
    const configured = Boolean(process.env.PAYSTACK_SECRET_KEY);
    res.json({
      configured,
      provider: 'paystack',
      currency: 'NGN',
    });
  });

  app.post('/api/payments/initialize', async (req, res) => {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return res.status(503).json({
        configured: false,
        error:
          'Online payment gateway (PAYSTACK_SECRET_KEY) is not configured yet. Please submit a Bank Transfer receipt for admin verification.',
      });
    }

    try {
      const { email, amountNgn, reference, callbackUrl, metadata } = req.body as {
        email: string;
        amountNgn: number;
        reference: string;
        callbackUrl?: string;
        metadata?: Record<string, any>;
      };

      if (!email || !amountNgn || amountNgn <= 0 || !reference) {
        return res.status(400).json({ error: 'Valid email, amountNgn, and reference are required.' });
      }

      const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: Math.round(amountNgn * 100), // Paystack expects kobo
          reference,
          currency: 'NGN',
          callback_url: callbackUrl,
          metadata,
        }),
      });

      const data = (await paystackRes.json()) as any;
      if (!paystackRes.ok || !data.status) {
        return res.status(400).json({ error: data.message || 'Paystack initialization failed.' });
      }

      return res.json({
        configured: true,
        authorizationUrl: data.data.authorization_url,
        accessCode: data.data.access_code,
        reference: data.data.reference,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Payment initialization failed.' });
    }
  });

  app.post('/api/payments/verify', async (req, res) => {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return res.status(503).json({
        configured: false,
        verified: false,
        error: 'PAYSTACK_SECRET_KEY is not configured on the server.',
      });
    }

    try {
      const { reference } = req.body as { reference?: string };
      if (!reference) {
        return res.status(400).json({ error: 'Transaction reference is required.' });
      }

      const verifyRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        }
      );
      const data = (await verifyRes.json()) as any;
      if (!verifyRes.ok || !data.status) {
        return res.status(400).json({ verified: false, error: data.message || 'Verification failed.' });
      }

      const tx = data.data;
      return res.json({
        configured: true,
        verified: tx.status === 'success',
        status: tx.status,
        amountNgn: Number(tx.amount || 0) / 100,
        currency: tx.currency,
        reference: tx.reference,
        paidAt: tx.paid_at,
      });
    } catch (err: any) {
      return res.status(500).json({ verified: false, error: err?.message || 'Verification error.' });
    }
  });

  // Vite middleware in dev, static serving in production
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Car Depot by Ultimate Autos server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
