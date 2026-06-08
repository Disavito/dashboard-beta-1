import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage() });


// Enable CORS, compression and JSON parsing
app.use(compression());  // Gzip/deflate all responses (~65% size reduction)
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
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

// ---- Middleware de autenticación ----
// Verifica que el usuario tiene un JWT válido de Supabase
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }
  
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  req.user = user;
  next();
};

// Verifica el webhook_secret para endpoints llamados desde Supabase Database Webhooks
const requireWebhookSecret = (req, res, next) => {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (secret && req.body?.webhook_secret !== secret && req.headers['x-webhook-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized webhook' });
  }
  next();
};

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
        const status = Number(e.statusCode);
        if (status === 410 || status === 404 || status === 403) {
          // Eliminar suscripción inválida o caducada de forma silenciosa
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error('Push error detallado:', e.message || e);
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
      
      // Fetch all admins to notify
      const { data: adminsRaw } = await supabase
        .from('user_roles')
        .select('user_id, roles(role_name)')
        .not('roles', 'is', null);
        
      const admins = (adminsRaw || []).filter(a => ['admin', 'finanzas_senior'].includes(a.roles?.role_name?.toLowerCase()));
        
      if (!admins || admins.length === 0) return res.status(200).json({ success: true, count: 0 });
      
      const title = 'Nueva Solicitud de Aprobación';
      const formattedType = record.request_type === 'engineer_expense' ? 'Gasto de Ingeniero' : 
                            record.request_type === 'high_expense' ? 'Gasto Elevado' : 
                            record.request_type === 'expense_approval' ? 'Nuevo Gasto' :
                            record.request_type === 'delete_expense' ? 'Eliminación de Gasto' :
                            record.request_type === 'delete_income' ? 'Eliminación de Ingreso' : record.request_type;
      const message = `Se requiere aprobación para: ${formattedType}`;
      const link = '/aprobaciones'; // Path to aprobaciones page
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
              const status = Number(e.statusCode);
              if (status === 410 || status === 404 || status === 403) {
                await supabase.from('push_subscriptions').delete().eq('id', sub.id);
              } else {
                console.error('Webhook push error:', e.message || e);
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
app.post('/api/reniec', requireAuth, async (req, res) => {
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

// Helper to render and upload Carbone.io documents
async function renderAndUploadCarboneDocument(templateId, data, socioId, docName, folder, customFileName) {
  const carboneUrl = process.env.VITE_CARBONE_API_URL || 'https://fimagadi-carbone.mv7mvl.easypanel.host';
  
  console.log(`Requesting render from Carbone for template ${templateId}...`);
  // 1. Render template
  const renderResponse = await fetch(`${carboneUrl}/render/${templateId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: data,
      convertTo: 'pdf',
      converter: 'O'
    })
  });
  
  if (!renderResponse.ok) {
    const errorText = await renderResponse.text();
    throw new Error(`Failed to request render from Carbone: ${renderResponse.statusText}. Details: ${errorText}`);
  }
  
  const renderResult = await renderResponse.json();
  if (!renderResult.success || !renderResult.data || !renderResult.data.renderId) {
    throw new Error(renderResult.error || 'Failed to render template on Carbone');
  }
  
  const renderId = renderResult.data.renderId;
  console.log(`Render initiated on Carbone. renderId: ${renderId}. Downloading PDF...`);
  
  // 2. Download file
  const downloadResponse = await fetch(`${carboneUrl}/render/${renderId}`);
  if (!downloadResponse.ok) {
    throw new Error(`Failed to download rendered PDF from Carbone: ${downloadResponse.statusText}`);
  }
  
  const arrayBuffer = await downloadResponse.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);
  
  // 3. Upload to Supabase Storage
  const fileName = `${socioId}/${folder}/${customFileName}`;
  console.log(`Uploading PDF to Supabase Storage: bucket 'documentos', path '${fileName}'...`);
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documentos')
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });
    
  if (uploadError) throw uploadError;
  
  // 4. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('documentos')
    .getPublicUrl(fileName);
    
  console.log(`Uploaded successfully. Public URL: ${publicUrl}. Linking in socio_documentos...`);
  
  // 5. Link in socio_documentos
  const { error: dbError } = await supabase
    .from('socio_documentos')
    .upsert(
      {
        socio_id: socioId,
        tipo_documento: docName,
        link_documento: publicUrl
      },
      {
        onConflict: 'socio_id,tipo_documento',
        ignoreDuplicates: false
      }
    );
    
  if (dbError) throw dbError;
  console.log(`Linked successfully.`);
  return publicUrl;
}

// Endpoint for Admin to upload templates to Carbone.io and save templateId in configuration table
app.post('/api/admin/templates/upload', requireAuth, upload.single('template'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No template file provided' });
    }
    const type = req.body.type;
    if (type !== 'ficha' && type !== 'contrato') {
      return res.status(400).json({ error: 'Invalid template type. Must be "ficha" or "contrato"' });
    }
    
    const carboneUrl = process.env.VITE_CARBONE_API_URL || 'https://fimagadi-carbone.mv7mvl.easypanel.host';
    console.log(`Uploading template to Carbone.io type ${type}...`);
    
    // Create FormData for Carbone upload
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    const formData = new FormData();
    formData.append('template', blob, req.file.originalname);
    
    const carboneResponse = await fetch(`${carboneUrl}/template`, {
      method: 'POST',
      body: formData
    });
    
    if (!carboneResponse.ok) {
      const errorText = await carboneResponse.text();
      throw new Error(`Carbone API upload failed: ${carboneResponse.statusText}. Details: ${errorText}`);
    }
    
    const carboneResult = await carboneResponse.json();
    if (!carboneResult.success || !carboneResult.data || !carboneResult.data.templateId) {
      throw new Error(carboneResult.error || 'Failed to upload template to Carbone');
    }
    
    const templateId = carboneResult.data.templateId;
    console.log(`Carbone upload success. templateId: ${templateId}. Saving in database configuracion...`);
    
    // Update configuracion table in Supabase via RPC to bypass RLS
    const { data: configValor, error: readError } = await supabase
      .rpc('get_configuracion_valor', { p_clave: 'carbone_templates' });
      
    if (readError) throw readError;
    
    let existingVal = {};
    if (configValor) {
      existingVal = typeof configValor === 'string' ? JSON.parse(configValor) : configValor;
    }
    
    const updatedVal = {
      ...existingVal,
      [type]: templateId
    };
    
    const { error: dbError } = await supabase
      .rpc('upsert_configuracion', {
        p_clave: 'carbone_templates',
        p_valor: updatedVal,
        p_descripcion: 'IDs de plantillas en Carbone.io'
      });
    
    if (dbError) throw dbError;
    console.log(`Database configuracion updated successfully.`);
    res.status(200).json({ success: true, templateId });
  } catch (error) {
    console.error('Error uploading template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for Admin to download templates from Carbone.io
app.get('/api/admin/templates/download/:type', requireAuth, async (req, res) => {
  try {
    const type = req.params.type;
    if (type !== 'ficha' && type !== 'contrato') {
      return res.status(400).json({ error: 'Invalid template type. Must be "ficha" or "contrato"' });
    }
    
    // Get active templateId from configuracion table
    const { data: configValor, error: readError } = await supabase
      .rpc('get_configuracion_valor', { p_clave: 'carbone_templates' });
      
    if (readError) throw readError;
    
    if (!configValor || !configValor[type]) {
      return res.status(404).json({ error: `Plantilla de ${type === 'ficha' ? 'Ficha' : 'Contrato'} no configurada` });
    }
    
    const templateId = configValor[type];
    const carboneUrl = process.env.VITE_CARBONE_API_URL || 'https://fimagadi-carbone.mv7mvl.easypanel.host';
    
    console.log(`Downloading template ${templateId} from Carbone for type ${type}...`);
    const carboneResponse = await fetch(`${carboneUrl}/template/${templateId}`);
    if (!carboneResponse.ok) {
      throw new Error(`Failed to fetch template from Carbone: ${carboneResponse.statusText}`);
    }
    
    const arrayBuffer = await carboneResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="plantilla_${type}.docx"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Error downloading template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Database Webhook Endpoint: Generate Ficha when socio_titulares is inserted or updated, and delete on remove
app.post('/api/webhook/generate-ficha', requireWebhookSecret, async (req, res) => {
  try {
    const payload = req.body;
    console.log('Received generate-ficha webhook:', JSON.stringify(payload));
    
    if (payload.type === 'INSERT' || payload.type === 'UPDATE') {
      const record = payload.record;
      const socioId = record.id;
      
      const { data: configValor, error: configError } = await supabase
        .rpc('get_configuracion_valor', { p_clave: 'carbone_templates' });
        
      if (configError || !configValor || !configValor.ficha) {
        console.warn('Ficha template ID not found in database config');
        return res.status(400).json({ error: 'Plantilla de Ficha no configurada en el sistema' });
      }
      
      const templateId = configValor.ficha;
      const fileName = `ficha_${record.dni}.pdf`;
      await renderAndUploadCarboneDocument(templateId, record, socioId, 'Ficha', 'ficha', fileName);
      return res.status(200).json({ success: true, message: `Ficha ${payload.type.toLowerCase()}d successfully` });
    }
    
    if (payload.type === 'DELETE') {
      const record = payload.old_record;
      if (!record || !record.id) {
        return res.status(400).json({ error: 'No old_record or id provided for delete webhook' });
      }
      
      console.log(`Processing DELETE webhook for socio: ${record.id}`);
      
      // 1. Get all associated documents for files deletion
      const { data: docs } = await supabase
        .from('socio_documentos')
        .select('link_documento')
        .eq('socio_id', record.id);
        
      if (docs && docs.length > 0) {
        const filePaths = [];
        for (const doc of docs) {
          if (doc.link_documento) {
            try {
              const url = new URL(doc.link_documento);
              const parts = url.pathname.split('/');
              const bucketIndex = parts.indexOf('documentos');
              if (bucketIndex !== -1) {
                filePaths.push(parts.slice(bucketIndex + 1).join('/'));
              }
            } catch (err) {
              console.warn('Could not parse document link for deletion:', doc.link_documento);
            }
          }
        }
        
        if (filePaths.length > 0) {
          console.log(`Deleting storage files: ${JSON.stringify(filePaths)}`);
          await supabase.storage.from('documentos').remove(filePaths);
        }
      }
      
      // 2. Delete rows in socio_documentos (although DB might cascade delete)
      await supabase.from('socio_documentos').delete().eq('socio_id', record.id);
      
      return res.status(200).json({ success: true, message: 'Socio documents deleted successfully' });
    }
    
    res.status(200).json({ success: true, ignored: true });
  } catch (error) {
    console.error('Error in generate-ficha webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Database Webhook Endpoint: Generate Contrato when ingresos is inserted or updated, and delete on remove
app.post('/api/webhook/generate-contrato', requireWebhookSecret, async (req, res) => {
  try {
    const payload = req.body;
    console.log('Received generate-contrato webhook:', JSON.stringify(payload));
    
    if (payload.type === 'INSERT' || payload.type === 'UPDATE') {
      const record = payload.record;
      if (!record.dni) {
        console.warn('Income record has no DNI. Skipping.');
        return res.status(400).json({ error: 'Income record has no DNI' });
      }
      
      // Find socio by DNI
      const { data: socio, error: socioError } = await supabase
        .from('socio_titulares')
        .select('*')
        .eq('dni', record.dni)
        .maybeSingle();
        
      if (socioError || !socio) {
        console.warn(`No socio found matching DNI: ${record.dni}`);
        return res.status(200).json({ success: false, message: `No socio found matching DNI: ${record.dni}` });
      }
      
      const { data: configValor, error: configError } = await supabase
        .rpc('get_configuracion_valor', { p_clave: 'carbone_templates' });
        
      if (configError || !configValor || !configValor.contrato) {
        console.warn('Contrato template ID not found in database config');
        return res.status(400).json({ error: 'Plantilla de Contrato no configurada en el sistema' });
      }
      
      const templateId = configValor.contrato;
      const mergeData = {
        socio: socio,
        pago: record
      };
      
      const fileName = `contrato_${record.receipt_number}.pdf`;
      await renderAndUploadCarboneDocument(templateId, mergeData, socio.id, 'Contrato', 'contrato', fileName);
      return res.status(200).json({ success: true, message: `Contrato ${payload.type.toLowerCase()}d successfully` });
    }
    
    if (payload.type === 'DELETE') {
      const record = payload.old_record;
      if (!record || !record.dni) {
        return res.status(400).json({ error: 'No old_record or DNI provided for delete webhook' });
      }
      
      // Find socio by DNI
      const { data: socio, error: socioError } = await supabase
        .from('socio_titulares')
        .select('id')
        .eq('dni', record.dni)
        .maybeSingle();
        
      if (socioError || !socio) {
        console.warn(`No socio found matching DNI: ${record.dni}`);
        return res.status(200).json({ success: false, message: `No socio found matching DNI: ${record.dni}` });
      }
      
      const fileName = `${socio.id}/contrato/contrato_${record.receipt_number}.pdf`;
      console.log(`Deleting contract from Storage: ${fileName}`);
      await supabase.storage.from('documentos').remove([fileName]);
      
      // Delete row in socio_documentos corresponding to this Contract for the partner
      await supabase
        .from('socio_documentos')
        .delete()
        .eq('socio_id', socio.id)
        .eq('tipo_documento', 'Contrato');
        
      return res.status(200).json({ success: true, message: 'Contrato documents deleted successfully' });
    }
    
    res.status(200).json({ success: true, ignored: true });
  } catch (error) {
    console.error('Error generating/deleting Contrato in webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

import fs from 'fs';


// Cache for index.html content
let cachedIndexHtml = null;

// Serve hashed assets (JS/CSS/images) with aggressive 1-year immutable cache
// Vite generates unique filenames on each build, so old caches auto-invalidate
app.use('/assets', express.static(path.join(__dirname, 'dist', 'assets'), {
  maxAge: '1y',
  immutable: true,
}));

// Serve other static files (manifest, icons, sw) with short cache
app.use(express.static(path.join(__dirname, 'dist'), {
  index: false,
  maxAge: '1h',
}));

// SPA fallback: any other route should serve index.html with runtime environment variables
app.use(async (req, res) => {
  try {
    if (!cachedIndexHtml) {
      cachedIndexHtml = await fs.promises.readFile(path.join(__dirname, 'dist', 'index.html'), 'utf8');
    }
    
    let html = cachedIndexHtml;
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
    console.error('Error loading index.html:', err);
    res.status(500).send('Error loading index.html');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Node Server listening on port ${PORT}`);
});
