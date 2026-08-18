const http = require('http');
const fs = require('fs');
const path = require('path');

// --- Carga Segura de Variables de Entorno ---
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const PORT = parseInt(process.env.PORT || '3000', 10);
const PUBLIC_DIR = __dirname;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const labelsMap = {
  nivel_satisfaccion: {
    1: '1 - Muy insatisfecho',
    2: '2 - Insatisfecho',
    3: '3 - Neutral',
    4: '4 - Satisfecho',
    5: '5 - Muy satisfecho'
  },
  claridad_contenido: {
    1: '1 - Muy poco claro',
    2: '2 - Poco claro',
    3: '3 - Aceptable',
    4: '4 - Claro',
    5: '5 - Muy claro'
  },
  aplicabilidad_practica: {
    1: '1 - Nada aplicable',
    2: '2 - Poco aplicable',
    3: '3 - Moderada',
    4: '4 - Bastante aplicable',
    5: '5 - Muy aplicable'
  }
};

// --- Control de Tasa (Rate Limiter en Memoria) ---
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const MAX_REQUESTS_PER_WINDOW = 20;

function isRateLimited(ip) {
  const now = Date.now();
  const clientData = rateLimitMap.get(ip) || { count: 0, firstRequest: now };

  if (now - clientData.firstRequest > RATE_LIMIT_WINDOW_MS) {
    clientData.count = 1;
    clientData.firstRequest = now;
    rateLimitMap.set(ip, clientData);
    return false;
  }

  clientData.count++;
  rateLimitMap.set(ip, clientData);

  return clientData.count > MAX_REQUESTS_PER_WINDOW;
}

// Limpieza periódica de IPs expiradas
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now - data.firstRequest > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}, 15 * 60 * 1000);

// --- Validación y Sanitización de Entradas ---
function validateAndSanitizeSurvey(data) {
  const errors = [];

  // ID Estudiante
  const idEstudiante = typeof data.id_estudiante === 'string' ? data.id_estudiante.trim() : '';
  if (!idEstudiante || idEstudiante.length < 1 || idEstudiante.length > 100) {
    errors.push('El identificador de estudiante es obligatorio (máximo 100 caracteres).');
  }

  // Nivel de Satisfacción (1 a 5)
  const sat = parseInt(data.nivel_satisfaccion, 10);
  if (isNaN(sat) || sat < 1 || sat > 5) {
    errors.push('El nivel de satisfacción debe ser un valor del 1 al 5.');
  }

  // Claridad del Contenido (1 a 5)
  const clar = parseInt(data.claridad_contenido, 10);
  if (isNaN(clar) || clar < 1 || clar > 5) {
    errors.push('La claridad del contenido debe ser un valor del 1 al 5.');
  }

  // Aplicabilidad Práctica (1 a 5)
  const app = parseInt(data.aplicabilidad_practica, 10);
  if (isNaN(app) || app < 1 || app > 5) {
    errors.push('La aplicabilidad práctica debe ser un valor del 1 al 5.');
  }

  // Comentarios Adicionales (máx 1000 caracteres)
  let comentarios = typeof data.comentarios_adicionales === 'string' ? data.comentarios_adicionales.trim() : '';
  if (comentarios.length > 1000) {
    comentarios = comentarios.substring(0, 1000);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      id_estudiante: idEstudiante,
      nivel_satisfaccion: sat,
      claridad_contenido: clar,
      aplicabilidad_practica: app,
      comentarios_adicionales: comentarios
    }
  };
}

// --- Servidor HTTP Principal ---
const server = http.createServer(async (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // Cabeceras HTTP de Seguridad
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Endpoint Seguro para Procesar Encuesta
  if (req.url === '/api/submit-survey' && req.method === 'POST') {
    if (isRateLimited(clientIp)) {
      res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ 
        success: false, 
        error: 'Has alcanzado el límite de envíos. Por favor espera unos minutos.' 
      }));
      return;
    }

    const MAX_BODY_SIZE = 50 * 1024; // 50 KB
    let body = '';
    let bodyTooLarge = false;

    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_BODY_SIZE) {
        bodyTooLarge = true;
        res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: 'El tamaño de la solicitud excede el límite permitido.' }));
        req.destroy();
      }
    });

    req.on('end', async () => {
      if (bodyTooLarge) return;

      try {
        const parsed = JSON.parse(body || '{}');

        // Validación y Sanitización
        const validation = validateAndSanitizeSurvey(parsed);
        if (!validation.valid) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, errors: validation.errors }));
          return;
        }

        const survey = validation.data;
        let n8nSuccess = false;

        // Envío Seguro al Webhook de n8n (para envío de correo / automatización)
        if (N8N_WEBHOOK_URL) {
          try {
            const queryParams = new URLSearchParams({
              id_estudiante: survey.id_estudiante,
              IdEstudiante: survey.id_estudiante,
              nivel_satisfaccion: String(survey.nivel_satisfaccion),
              NivelSatisfaccion: labelsMap.nivel_satisfaccion[survey.nivel_satisfaccion] || String(survey.nivel_satisfaccion),
              claridad_contenido: String(survey.claridad_contenido),
              ClaridadContenido: String(survey.claridad_contenido),
              aplicabilidad_practica: String(survey.aplicabilidad_practica),
              AplicabilidadPractica: String(survey.aplicabilidad_practica),
              comentarios_adicionales: survey.comentarios_adicionales,
              ComentariosAdicionales: survey.comentarios_adicionales,
              fecha: new Date().toLocaleString('es-ES')
            });

            // Intento con GET
            let n8nRes = await fetch(`${N8N_WEBHOOK_URL}?${queryParams.toString()}`, { method: 'GET' });
            
            // Reintento con POST si n8n lo requiere
            if (!n8nRes.ok && n8nRes.status === 404) {
              n8nRes = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...survey,
                  fecha: new Date().toLocaleString('es-ES')
                })
              });
            }

            n8nSuccess = n8nRes.ok;
          } catch (n8nErr) {
            console.error('⚠️ [n8n Webhook Error]:', n8nErr.message);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          n8nSuccess,
          message: 'Encuesta enviada y procesada con éxito.'
        }));
      } catch (parseErr) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: 'Formato JSON inválido.' }));
      }
    });
    return;
  }

  // Servir Archivos Estáticos de Forma Segura
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';

  const normalizedPath = path.normalize(path.join(PUBLIC_DIR, reqPath));
  if (!normalizedPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 - Forbidden');
    return;
  }

  const baseName = path.basename(normalizedPath);
  if (baseName.startsWith('.env') || baseName.startsWith('.git') || baseName.endsWith('.log')) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 - Not Found');
    return;
  }

  const ext = path.extname(normalizedPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(normalizedPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 - Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`500 - Server Error`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🔒 Servidor Seguro de Encuesta Antigravity activo en http://localhost:${PORT}`);
});
