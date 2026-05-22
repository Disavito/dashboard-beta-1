import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Setup Web Push
const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails('mailto:admin@dashboard.com', vapidPublic, vapidPrivate);
}

// Setup Supabase (Using Anon key since push_subscriptions RLS allows insert and we can bypass RLS with service_role if needed, but ANON is safer if we just select)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    headers: { 'x-my-custom-header': 'dashboard-backend' }
  },
  realtime: {
    transport: WebSocket
  }
}) : null;

app.post('/api/send-push', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured on server' });
  
  const { user_id, title, message, link, webhook_secret } = req.body;
  if (process.env.PUSH_WEBHOOK_SECRET && webhook_secret !== process.env.PUSH_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized webhook' });
  }

  try {
    let targetUserIds = [user_id];
    
    // Si el user_id es el maestro de admins, buscar todos los administradores e ingenieros
    if (user_id === '00000000-0000-0000-0000-000000000000') {
      // Necesitamos buscar los usuarios que tengan el rol 'admin' o 'engineer'
      // Asumiendo que existe una vista o podemos consultar user_roles.
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id, roles(role_name)')
        .not('roles', 'is', null);
      
      if (admins) {
        targetUserIds = admins
          .filter(a => ['admin', 'engineer'].includes(a.roles?.role_name))
          .map(a => a.user_id);
      }
    }

    const { data: subs, error } = await supabase.from('push_subscriptions').select('*').in('user_id', targetUserIds);
    if (error) throw error;
    if (!subs || subs.length === 0) return res.status(200).json({ success: true, count: 0, msg: 'No active subscriptions for target users' });

    const payload = JSON.stringify({ title, body: message, url: link || '/', icon: '/icon-192.png' });
    
    const promises = subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404 || e.statusCode === 403) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error('Push error:', e);
        }
      }
    });
    
    await Promise.all(promises);
    res.status(200).json({ success: true, count: subs.length });
  } catch (error) {
    console.error('Error sending push:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint specifically for Supabase Database Webhooks (Insert on approval_requests)
app.post('/api/webhook/approval-request', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  
  try {
    const payload = req.body;
    // Handle Supabase Webhook Payload
    if (payload.type === 'INSERT' && payload.table === 'approval_requests') {
      const record = payload.record;
      
      // Fetch all admins/engineers to notify
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'engineer']);
        
      if (!admins || admins.length === 0) return res.status(200).json({ success: true, count: 0 });
      
      const title = 'Nueva Solicitud de Aprobación';
      const message = `Se requiere aprobación para: ${record.request_type}`;
      const link = '/settings'; // Path to aprobaciones page
      const pushPayload = JSON.stringify({ title, body: message, url: link, icon: '/vite.svg' });
      
      let sentCount = 0;
      
      // Send to all admins
      for (const admin of admins) {
        const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', admin.user_id);
        if (subs) {
          const promises = subs.map(async (sub) => {
            try {
              await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, pushPayload);
              sentCount++;
            } catch (e) {
              if (e.statusCode === 410 || e.statusCode === 404 || e.statusCode === 403) {
                await supabase.from('push_subscriptions').delete().eq('id', sub.id);
              }
            }
          });
          await Promise.all(promises);
        }
      }
      
      return res.status(200).json({ success: true, count: sentCount });
    }
    
    // Also handle direct API calls from frontend if needed
    if (req.body.title && req.body.admins_only) {
      // (Similar logic to notify all admins)
      return res.status(200).json({ success: true });
    }
    
    res.status(200).json({ success: true, ignored: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Proxy route for Consultas Peru API
app.post('/api/reniec', async (req, res) => {
  const { document_number, type_document } = req.body;
  
  const token1 = process.env.CONSULTAS_PERU_API_TOKEN || process.env.VITE_CONSULTAS_PERU_API_TOKEN;
  const token2 = process.env.MIAPI_CLOUD_API_TOKEN || process.env.VITE_MIAPI_CLOUD_API_TOKEN;

  if (!token1 && !token2) {
    return res.status(500).json({ success: false, message: 'API tokens not configured on server' });
  }

  try {
    if (token1) {
      try {
        const response = await axios.post('https://api.consultasperu.com/api/v1/query', {
          token: token1,
          type_document: type_document || 'dni',
          document_number: document_number
        }, { timeout: 10000 });
        if (response.data && response.data.success) {
          return res.status(200).json({ source: 'consultasperu', data: response.data.data, success: true });
        }
      } catch (e) {
        console.warn('Primary API failed, trying secondary...');
      }
    }

    if (token2) {
      const res2 = await axios.get(`https://miapi.cloud/v1/dni/${document_number}`, {
        headers: { 'Authorization': `Bearer ${token2}` },
        timeout: 10000
      });
      if (res2.data && res2.data.success && res2.data.datos) {
        const sData = res2.data.datos;
        // Normalize to look like Consultas Peru API
        const normalizedData = {
          name: sData.nombres,
          apellido_paterno: sData.ape_paterno,
          apellido_materno: sData.ape_materno,
          date_of_birth: sData.nacimiento,
          address: sData.domiciliado?.direccion || '',
          department: sData.domiciliado?.departamento || '',
          province: sData.domiciliado?.provincia || '',
          district: sData.domiciliado?.distrito || ''
        };
        return res.status(200).json({ source: 'miapi', data: normalizedData, success: true });
      }
    }

    res.status(404).json({ success: false, message: 'No data found in any API' });
  } catch (error) {
    console.error('Error proxying to APIs:', error.message);
    res.status(500).json({ success: false, message: 'Error querying API' });
  }
});

import fs from 'fs';

// Serve the static React files from 'dist' directory, but ignore index.html so we can inject env vars
app.use(express.static(path.join(__dirname, 'dist'), { index: false }));

// SPA fallback: any other route should serve index.html with runtime environment variables
app.use((req, res) => {
  try {
    let html = fs.readFileSync(path.join(__dirname, 'dist', 'index.html'), 'utf8');
    const envScript = `<script>
      window.APP_ENV = {
        VITE_SUPABASE_URL: "${process.env.VITE_SUPABASE_URL || ''}",
        VITE_SUPABASE_ANON_KEY: "${process.env.VITE_SUPABASE_ANON_KEY || ''}",
        VITE_VAPID_PUBLIC_KEY: "${process.env.VITE_VAPID_PUBLIC_KEY || ''}"
      };
    </script>`;
    html = html.replace('</head>', `${envScript}</head>`);
    res.send(html);
  } catch (err) {
    res.status(500).send('Error loading index.html');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Node Server listening on port ${PORT}`);
});
