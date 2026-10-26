import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory & file paths
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'usuarios.json');
const COMPARISONS_FILE = path.join(DATA_DIR, 'comparaciones.json');
const AUDIT_FILE = path.join(DATA_DIR, 'auditoria.json');

const SESSION_COOKIE_NAME = 'bc_session_id';
const SESSION_SECRET = process.env.SESSION_SECRET || 'bc_seguros_colombia_secret_key_2026';

export interface StoredUser {
  id: string;
  usuario: string; // short name, no spaces, lowercase
  nombre: string;
  rol: 'administrador' | 'asesor';
  estado: 'activo' | 'suspendido';
  debeCambiarClave: boolean;
  fechaCreacion: string;
  ultimoAcceso: string | null;
  passwordHash: string;
}

export interface AuditRecord {
  id: string;
  userId: string;
  usuario: string;
  accion: string;
  detalle: string;
  timestamp: string;
}

export interface ComparisonRecord {
  id: string;
  userId: string;
  advisorName: string;
  advisorUsername: string;
  clientName: string;
  vehicle: string;
  budget: number;
  proposalsCount: number;
  bestInsurer: string;
  recommendationSummary: string;
  whatsappMessage: string;
  rawComparison: any;
  rawProfile: any;
  createdAt: string;
}

// In-memory active sessions map
interface SessionData {
  userId: string;
  createdAt: number;
  expiresAt: number;
}
const activeSessions = new Map<string, SessionData>();

// Ensure data directory and files exist
function initDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Ensure usuarios.json exists with initial admin
  if (!fs.existsSync(USERS_FILE)) {
    const salt = bcrypt.genSaltSync(10);
    const initialAdmin: StoredUser = {
      id: 'usr_admin_' + crypto.randomBytes(4).toString('hex'),
      usuario: 'admin',
      nombre: 'Administrador',
      rol: 'administrador',
      estado: 'activo',
      debeCambiarClave: true,
      fechaCreacion: new Date().toISOString(),
      ultimoAcceso: null,
      passwordHash: bcrypt.hashSync('Fundepos2026*', salt),
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify([initialAdmin], null, 2), 'utf-8');
    console.log('[Auth] data/usuarios.json inicializado con usuario "admin" (Fundepos2026*)');
  }

  if (!fs.existsSync(COMPARISONS_FILE)) {
    fs.writeFileSync(COMPARISONS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }

  if (!fs.existsSync(AUDIT_FILE)) {
    fs.writeFileSync(AUDIT_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

function readUsers(): StoredUser[] {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error leyendo usuarios.json:', err);
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function readComparisons(): ComparisonRecord[] {
  try {
    if (!fs.existsSync(COMPARISONS_FILE)) return [];
    return JSON.parse(fs.readFileSync(COMPARISONS_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error leyendo comparaciones.json:', err);
    return [];
  }
}

function writeComparisons(items: ComparisonRecord[]) {
  fs.writeFileSync(COMPARISONS_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

function readAuditLogs(): AuditRecord[] {
  try {
    if (!fs.existsSync(AUDIT_FILE)) return [];
    return JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error leyendo auditoria.json:', err);
    return [];
  }
}

function writeAuditLogs(logs: AuditRecord[]) {
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2), 'utf-8');
}

function addAuditLog(userId: string, usuario: string, accion: string, detalle: string) {
  try {
    const logs = readAuditLogs();
    const entry: AuditRecord = {
      id: 'log_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
      userId,
      usuario,
      accion,
      detalle,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(entry);
    // Keep last 1000 logs to prevent unbounded file growth
    if (logs.length > 1000) logs.length = 1000;
    writeAuditLogs(logs);
  } catch (e) {
    console.error('Error registrando auditoría:', e);
  }
}

interface ClientProfile {
  nombre: string;
  vehiculo: string;
  presupuesto: number;
  coberturasObligatorias: {
    colision: boolean;
    robo: boolean;
    asistenciaVial: boolean;
    fenomenosNaturales: boolean;
    vehiculoSustituto: boolean;
  };
  prioridades: string;
  formaPago: string;
}

interface UploadedFile {
  name: string;
  base64: string; // base64 encoded PDF string
}

async function startServer() {
  initDataFiles();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser(SESSION_SECRET));

  // Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Auth Middleware
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const sessionId = req.signedCookies[SESSION_COOKIE_NAME];
    if (!sessionId) {
      return res.status(401).json({ error: 'No autenticado. Inicie sesión.' });
    }

    const session = activeSessions.get(sessionId);
    if (!session || Date.now() > session.expiresAt) {
      if (session) activeSessions.delete(sessionId);
      res.clearCookie(SESSION_COOKIE_NAME);
      return res.status(401).json({ error: 'Sesión expirada. Inicie sesión nuevamente.' });
    }

    const users = readUsers();
    const user = users.find(u => u.id === session.userId);
    if (!user) {
      res.clearCookie(SESSION_COOKIE_NAME);
      return res.status(401).json({ error: 'Usuario no encontrado.' });
    }

    if (user.estado === 'suspendido') {
      return res.status(403).json({ error: 'usuario suspendido, contacte al administrador' });
    }

    (req as any).user = user;
    next();
  };

  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user as StoredUser;
    if (!user || user.rol !== 'administrador') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    next();
  };

  // Basic in-memory rate limiter for AI operations
  const ipRequests = new Map<string, { count: number; resetTime: number }>();
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
  const MAX_REQUESTS_PER_WINDOW = 20;

  const rateLimitMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const clientRecord = ipRequests.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

    if (now > clientRecord.resetTime) {
      clientRecord.count = 1;
      clientRecord.resetTime = now + RATE_LIMIT_WINDOW_MS;
    } else {
      clientRecord.count++;
    }

    ipRequests.set(ip, clientRecord);

    if (clientRecord.count > MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        error: 'Demasiadas solicitudes de análisis en poco tiempo. Por favor espere un minuto.',
      });
    }

    next();
  };

  // -------------------------------------------------------------
  // AUTHENTICATION ENDPOINTS
  // -------------------------------------------------------------

  // POST /api/login (usuario y contraseña)
  app.post('/api/login', (req, res) => {
    const { usuario, password } = req.body;
    if (!usuario || !password) {
      return res.status(400).json({ error: 'Debe ingresar usuario y contraseña.' });
    }

    const cleanUser = String(usuario).trim().toLowerCase();
    const users = readUsers();
    const found = users.find(u => u.usuario === cleanUser);

    if (!found) {
      return res.status(401).json({ error: 'usuario o contraseña incorrectos' });
    }

    const match = bcrypt.compareSync(String(password), found.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'usuario o contraseña incorrectos' });
    }

    if (found.estado === 'suspendido') {
      return res.status(403).json({ error: 'usuario suspendido, contacte al administrador' });
    }

    // Update ultimoAcceso
    found.ultimoAcceso = new Date().toISOString();
    writeUsers(users);

    // Create session (8 hours expiration)
    const sessionId = crypto.randomUUID();
    const maxAge = 8 * 60 * 60 * 1000;
    activeSessions.set(sessionId, {
      userId: found.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + maxAge,
    });

    res.cookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      signed: true,
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    addAuditLog(found.id, found.usuario, 'INICIO_SESION', 'Inicio de sesión con credenciales');

    const safeUser = {
      id: found.id,
      usuario: found.usuario,
      nombre: found.nombre,
      rol: found.rol,
      estado: found.estado,
      debeCambiarClave: found.debeCambiarClave,
      ultimoAcceso: found.ultimoAcceso,
    };

    return res.json({ ok: true, user: safeUser });
  });

  // POST /api/logout
  app.post('/api/logout', (req, res) => {
    const sessionId = req.signedCookies[SESSION_COOKIE_NAME];
    if (sessionId) {
      const session = activeSessions.get(sessionId);
      if (session) {
        const users = readUsers();
        const user = users.find(u => u.id === session.userId);
        if (user) {
          addAuditLog(user.id, user.usuario, 'CIERRE_SESION', 'Cierre de sesión voluntario');
        }
        activeSessions.delete(sessionId);
      }
    }
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return res.json({ ok: true });
  });

  // GET /api/yo
  app.get('/api/yo', (req, res) => {
    const sessionId = req.signedCookies[SESSION_COOKIE_NAME];
    if (!sessionId) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const session = activeSessions.get(sessionId);
    if (!session || Date.now() > session.expiresAt) {
      if (session) activeSessions.delete(sessionId);
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      return res.status(401).json({ error: 'Sesión expirada' });
    }

    const users = readUsers();
    const found = users.find(u => u.id === session.userId);
    if (!found) {
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (found.estado === 'suspendido') {
      return res.status(403).json({ error: 'usuario suspendido, contacte al administrador' });
    }

    return res.json({
      id: found.id,
      usuario: found.usuario,
      nombre: found.nombre,
      rol: found.rol,
      estado: found.estado,
      debeCambiarClave: found.debeCambiarClave,
      ultimoAcceso: found.ultimoAcceso,
    });
  });

  // POST /api/cambiar-clave (mínimo 8 caracteres, al menos un número)
  app.post('/api/cambiar-clave', requireAuth, (req, res) => {
    const { nuevaClave } = req.body;
    if (!nuevaClave || typeof nuevaClave !== 'string') {
      return res.status(400).json({ error: 'La nueva contraseña es requerida.' });
    }

    // Regla: mínimo 8 caracteres, al menos un número
    if (nuevaClave.length < 8 || !/\d/.test(nuevaClave)) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 8 caracteres y contener al menos un número.',
      });
    }

    const user = (req as any).user as StoredUser;
    const users = readUsers();
    const found = users.find(u => u.id === user.id);
    if (!found) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    found.passwordHash = bcrypt.hashSync(nuevaClave, 10);
    found.debeCambiarClave = false;
    writeUsers(users);

    addAuditLog(found.id, found.usuario, 'CAMBIO_CLAVE', 'Contraseña actualizada por el usuario');

    return res.json({
      ok: true,
      mensaje: 'Contraseña actualizada exitosamente',
      user: {
        id: found.id,
        usuario: found.usuario,
        nombre: found.nombre,
        rol: found.rol,
        estado: found.estado,
        debeCambiarClave: false,
        ultimoAcceso: found.ultimoAcceso,
      },
    });
  });

  // -------------------------------------------------------------
  // USER MANAGEMENT ENDPOINTS (Admin Only)
  // -------------------------------------------------------------

  // GET /api/usuarios
  app.get('/api/usuarios', requireAuth, requireAdmin, (_req, res) => {
    const users = readUsers().map(u => ({
      id: u.id,
      usuario: u.usuario,
      nombre: u.nombre,
      rol: u.rol,
      estado: u.estado,
      debeCambiarClave: u.debeCambiarClave,
      fechaCreacion: u.fechaCreacion,
      ultimoAcceso: u.ultimoAcceso,
    }));
    return res.json({ usuarios: users });
  });

  // POST /api/usuarios
  app.post('/api/usuarios', requireAuth, requireAdmin, (req, res) => {
    const adminUser = (req as any).user as StoredUser;
    const { usuario, nombre, rol, password } = req.body;

    if (!usuario || !nombre || !password) {
      return res.status(400).json({ error: 'Usuario, nombre completo y contraseña temporal son obligatorios.' });
    }

    const cleanUsername = String(usuario).trim().toLowerCase();
    if (!/^[a-z0-9_.-]{3,30}$/.test(cleanUsername)) {
      return res.status(400).json({
        error: 'El nombre de usuario debe tener entre 3 y 30 caracteres, sin espacios y en minúsculas.',
      });
    }

    if (password.length < 8 || !/\d/.test(password)) {
      return res.status(400).json({
        error: 'La contraseña inicial debe tener al menos 8 caracteres y contener al menos un número.',
      });
    }

    const users = readUsers();
    if (users.some(u => u.usuario === cleanUsername)) {
      return res.status(400).json({ error: `El usuario "${cleanUsername}" ya existe en el sistema.` });
    }

    const newUser: StoredUser = {
      id: 'usr_' + crypto.randomBytes(6).toString('hex'),
      usuario: cleanUsername,
      nombre: String(nombre).trim(),
      rol: rol === 'administrador' ? 'administrador' : 'asesor',
      estado: 'activo',
      debeCambiarClave: true, // Force password change on first login
      fechaCreacion: new Date().toISOString(),
      ultimoAcceso: null,
      passwordHash: bcrypt.hashSync(password, 10),
    };

    users.push(newUser);
    writeUsers(users);

    addAuditLog(
      adminUser.id,
      adminUser.usuario,
      'CREACION_USUARIO',
      `Creado nuevo usuario "${cleanUsername}" con rol ${newUser.rol}`
    );

    return res.json({
      ok: true,
      usuario: {
        id: newUser.id,
        usuario: newUser.usuario,
        nombre: newUser.nombre,
        rol: newUser.rol,
        estado: newUser.estado,
        debeCambiarClave: newUser.debeCambiarClave,
        fechaCreacion: newUser.fechaCreacion,
      },
    });
  });

  // PATCH /api/usuarios/:id (update role, status, or reset password)
  app.patch('/api/usuarios/:id', requireAuth, requireAdmin, (req, res) => {
    const adminUser = (req as any).user as StoredUser;
    const targetId = req.params.id;
    const { rol, estado, resetPassword } = req.body;

    const users = readUsers();
    const found = users.find(u => u.id === targetId);
    if (!found) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Protection: admin cannot demote or suspend themselves
    if (found.id === adminUser.id) {
      if (rol && rol !== 'administrador') {
        return res.status(400).json({ error: 'No puede degradar su propio rol de administrador.' });
      }
      if (estado && estado !== 'activo') {
        return res.status(400).json({ error: 'No puede suspender su propia cuenta de administrador.' });
      }
    }

    if (rol && (rol === 'administrador' || rol === 'asesor')) {
      found.rol = rol;
      addAuditLog(adminUser.id, adminUser.usuario, 'MODIFICACION_ROL', `Cambio de rol de ${found.usuario} a ${rol}`);
    }

    if (estado && (estado === 'activo' || estado === 'suspendido')) {
      found.estado = estado;
      addAuditLog(adminUser.id, adminUser.usuario, 'MODIFICACION_ESTADO', `Estado de ${found.usuario} cambiado a ${estado}`);
    }

    if (resetPassword) {
      if (typeof resetPassword !== 'string' || resetPassword.length < 8 || !/\d/.test(resetPassword)) {
        return res.status(400).json({
          error: 'La nueva contraseña debe tener mínimo 8 caracteres y contener un número.',
        });
      }
      found.passwordHash = bcrypt.hashSync(resetPassword, 10);
      found.debeCambiarClave = true;
      addAuditLog(adminUser.id, adminUser.usuario, 'RESET_CLAVE', `Contraseña restablecida para ${found.usuario}`);
    }

    writeUsers(users);

    return res.json({
      ok: true,
      usuario: {
        id: found.id,
        usuario: found.usuario,
        nombre: found.nombre,
        rol: found.rol,
        estado: found.estado,
        debeCambiarClave: found.debeCambiarClave,
      },
    });
  });

  // -------------------------------------------------------------
  // AUDIT LOGS ENDPOINTS (Admin Only)
  // -------------------------------------------------------------
  app.get('/api/auditoria', requireAuth, requireAdmin, (_req, res) => {
    const logs = readAuditLogs();
    return res.json({ logs });
  });

  // -------------------------------------------------------------
  // COMPARISONS / EXPEDIENTES ENDPOINTS
  // -------------------------------------------------------------
  app.get('/api/comparaciones', requireAuth, (req, res) => {
    const user = (req as any).user as StoredUser;
    const all = readComparisons();

    if (user.rol === 'administrador') {
      return res.json({ comparaciones: all });
    } else {
      const filtered = all.filter(c => c.userId === user.id);
      return res.json({ comparaciones: filtered });
    }
  });

  app.post('/api/comparaciones', requireAuth, (req, res) => {
    const user = (req as any).user as StoredUser;
    const body = req.body;

    const newComparison: ComparisonRecord = {
      id: 'comp_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
      userId: user.id,
      advisorName: user.nombre,
      advisorUsername: user.usuario,
      clientName: String(body.clientName || 'Cliente').slice(0, 150),
      vehicle: String(body.vehicle || '').slice(0, 200),
      budget: Number(body.budget) || 0,
      proposalsCount: Number(body.proposalsCount) || 1,
      bestInsurer: String(body.bestInsurer || 'No especificada').slice(0, 150),
      recommendationSummary: String(body.recommendationSummary || '').slice(0, 3000),
      whatsappMessage: String(body.whatsappMessage || '').slice(0, 3000),
      rawComparison: body.rawComparison || null,
      rawProfile: body.rawProfile || null,
      createdAt: new Date().toISOString(),
    };

    const comps = readComparisons();
    comps.unshift(newComparison);
    writeComparisons(comps);

    addAuditLog(
      user.id,
      user.usuario,
      'EXPEDIENTE_ARCHIVADO',
      `Expediente guardado para ${newComparison.clientName} (${newComparison.bestInsurer})`
    );

    return res.json({ ok: true, id: newComparison.id });
  });

  app.delete('/api/comparaciones/:id', requireAuth, (req, res) => {
    const user = (req as any).user as StoredUser;
    const targetId = req.params.id;

    const comps = readComparisons();
    const index = comps.findIndex(c => c.id === targetId);
    if (index === -1) {
      return res.status(404).json({ error: 'Comparación no encontrada.' });
    }

    const item = comps[index];
    if (user.rol !== 'administrador' && item.userId !== user.id) {
      return res.status(403).json({ error: 'No tiene permiso para eliminar esta comparación.' });
    }

    comps.splice(index, 1);
    writeComparisons(comps);

    addAuditLog(user.id, user.usuario, 'EXPEDIENTE_ELIMINADO', `Eliminada comparativa id ${targetId}`);

    return res.json({ ok: true });
  });

  // -------------------------------------------------------------
  // COMPARATOR ENDPOINTS (Protected with requireAuth)
  // -------------------------------------------------------------

  // Endpoint to fetch bundled sample proposals for quick testing
  app.get('/api/sample-proposals', requireAuth, (_req, res) => {
    try {
      const samplesDir = path.join(__dirname, 'public', 'assets', 'aistudio');
      if (!fs.existsSync(samplesDir)) {
        return res.status(404).json({ error: 'Directorio de ejemplos no encontrado' });
      }

      const files = [
        {
          name: 'Propuesta_A_Aseguradora_Cordillera.pdf',
          file: 'Propuesta_A_Aseguradora_Cordillera_45e2b828.pdf',
          aseguradora: 'Aseguradora Cordillera S.A.',
        },
        {
          name: 'Propuesta_B_Seguros_Alborada.pdf',
          file: 'Propuesta_B_Seguros_Alborada_26bdc3b0.pdf',
          aseguradora: 'Seguros Alborada',
        },
        {
          name: 'Propuesta_C_Protectora_del_Valle.pdf',
          file: 'Propuesta_C_Protectora_del_Valle_422f9421.pdf',
          aseguradora: 'Protectora del Valle',
        },
      ];

      const sampleData = files
        .filter(item => fs.existsSync(path.join(samplesDir, item.file)))
        .map(item => {
          const filePath = path.join(samplesDir, item.file);
          const buffer = fs.readFileSync(filePath);
          return {
            name: item.name,
            originalFilename: item.file,
            aseguradora: item.aseguradora,
            base64: buffer.toString('base64'),
            sizeBytes: buffer.length,
          };
        });

      return res.json({ samples: sampleData });
    } catch (err: unknown) {
      console.error('Error loading sample files:', err);
      return res.status(500).json({ error: 'No se pudieron cargar las propuestas de ejemplo' });
    }
  });

  // Main comparison endpoint powered by Gemini with session validation, rate-limiting and payload validation
  app.post('/api/compare', requireAuth, rateLimitMiddleware, async (req, res) => {
    try {
      const user = (req as any).user as StoredUser;
      const { files, clientProfile }: { files: UploadedFile[]; clientProfile: ClientProfile } = req.body;

      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'Debe subir al menos una propuesta en PDF (máximo 3).' });
      }

      if (files.length > 3) {
        return res.status(400).json({ error: 'Se permite un máximo de 3 propuestas para comparar.' });
      }

      // Security validation: verify each file is valid PDF and does not exceed size limit (max 12MB base64)
      for (const file of files) {
        if (!file.name || typeof file.name !== 'string' || file.name.length > 150) {
          return res.status(400).json({ error: 'Nombre de archivo inválido o sospechoso.' });
        }
        if (!file.base64 || typeof file.base64 !== 'string') {
          return res.status(400).json({ error: `Contenido de archivo inválido para "${file.name}".` });
        }
        if (file.base64.length > 16 * 1024 * 1024) {
          return res.status(400).json({ error: `El archivo "${file.name}" supera el límite de seguridad (máx 12MB).` });
        }
        // Verify PDF magic header in base64 ('JVBERi' is '%PDF-')
        const cleanPrefix = file.base64.replace(/^data:application\/pdf;base64,/, '').trim();
        if (!cleanPrefix.startsWith('JVBERi')) {
          return res.status(400).json({ error: `El archivo "${file.name}" no es un documento PDF válido.` });
        }
      }

      // Input sanitization for clientProfile
      if (clientProfile) {
        clientProfile.nombre = String(clientProfile.nombre || '').slice(0, 150).replace(/[<>]/g, '');
        clientProfile.vehiculo = String(clientProfile.vehiculo || '').slice(0, 200).replace(/[<>]/g, '');
        clientProfile.prioridades = String(clientProfile.prioridades || '').slice(0, 800).replace(/[<>]/g, '');
        clientProfile.formaPago = String(clientProfile.formaPago || 'Anual de contado').slice(0, 50);
        clientProfile.presupuesto = Math.max(0, Math.min(Number(clientProfile.presupuesto) || 0, 50000000));
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'No se ha configurado la clave GEMINI_API_KEY en las variables de entorno.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Prepare mandatory coverages list in Spanish
      const obligatoriasList: string[] = [];
      if (clientProfile.coberturasObligatorias.colision) obligatoriasList.push('Colisión y vuelco');
      if (clientProfile.coberturasObligatorias.robo) obligatoriasList.push('Robo');
      if (clientProfile.coberturasObligatorias.asistenciaVial) obligatoriasList.push('Asistencia vial 24/7');
      if (clientProfile.coberturasObligatorias.fenomenosNaturales) obligatoriasList.push('Fenómenos naturales');
      if (clientProfile.coberturasObligatorias.vehiculoSustituto) obligatoriasList.push('Vehículo sustituto');

      const mandatoryText = obligatoriasList.length > 0 ? obligatoriasList.join(', ') : 'Ninguna seleccionada';

      const promptText = `
Eres el motor de análisis y extracción de documentos para "Comparador de Propuestas BC", para Banco de Colombia.
Analiza estrictamente los ${files.length} documentos PDF adjuntos correspondientes a propuestas de seguro voluntario de automóvil para el cliente especificado.

PERFIL DEL CLIENTE:
- Nombre: ${clientProfile.nombre || 'No indicado'}
- Vehículo y uso: ${clientProfile.vehiculo || 'No indicado'}
- Presupuesto máximo anual: ₡ ${Number(clientProfile.presupuesto || 0).toLocaleString('es-CR')} (Colones costarricenses)
- Coberturas obligatorias marcadas por el cliente: ${mandatoryText}
  * Colisión requerida: ${clientProfile.coberturasObligatorias.colision ? 'SÍ' : 'NO'}
  * Robo requerido: ${clientProfile.coberturasObligatorias.robo ? 'SÍ' : 'NO'}
  * Asistencia vial 24/7 requerida: ${clientProfile.coberturasObligatorias.asistenciaVial ? 'SÍ' : 'NO'}
  * Fenómenos naturales requeridos: ${clientProfile.coberturasObligatorias.fenomenosNaturales ? 'SÍ' : 'NO'}
  * Vehículo sustituto requerido: ${clientProfile.coberturasObligatorias.vehiculoSustituto ? 'SÍ' : 'NO'}
- Prioridades del cliente: ${clientProfile.prioridades || 'No indicadas'}
- Forma de pago preferida: ${clientProfile.formaPago || 'No indicada'}

INSTRUCCIONES Y REGLAS ESTRICTAS DE NEGOCIO:
1. Extraer de cada PDF SOLO lo que dice el documento; si un dato no aparece en el texto del PDF, escribir literalmente "no indicado". ¡NO INVENTAR ni asumir datos!
2. Validar para cada aseguradora:
   - "CABE EN PRESUPUESTO": "Sí" si la prima anual con IVA incluido es menor o igual a ₡ ${Number(clientProfile.presupuesto || 0).toLocaleString('es-CR')}. De lo contrario "No".
   - "CUMPLE OBLIGATORIAS": "Sí" SOLO si TODAS las coberturas marcadas como obligatorias por el cliente están formalmente INCLUIDAS en la prima básica del documento. ¡OJO! Un paquete opcional con costo adicional (ej. asistencia plus por costo adicional no incluido en la prima básica) NO cuenta como incluida. Si le falta al menos una cobertura obligatoria, responder "No".
3. "SEMÁFORO":
   - "verde": si cabe en presupuesto ("Sí") Y cumple obligatorias ("Sí").
   - "amarillo": si cumple obligatorias ("Sí") pero NO cabe en presupuesto ("No").
   - "rojo": si NO cumple obligatorias ("No").
4. "RECOMENDACIÓN PRELIMINAR (borrador)":
   Una sola propuesta recomendada, justificada en MÁXIMO 5 LÍNEAS con los montos exactos en colones, según las prioridades del cliente. Si una propuesta amarilla es mejor para las prioridades del cliente, indícalo claramente y cuantifica la diferencia exacta de prima respecto al presupuesto o las otras alternativas.
5. "MENSAJE SUGERIDO PARA EL CLIENTE (WhatsApp)":
   Mensaje redactado para enviar por WhatsApp. MÁXIMO 8 LÍNEAS. Tono cordial, profesional, sin tecnicismos complejos, con la recomendación, dos razones clave, la alternativa y un próximo paso claro. SIN prometer plazos ni tiempos de entrega.

Devuelve la respuesta EXCLUSIVAMENTE en formato JSON válido con la siguiente estructura (sin bloques de markdown adicionales ni texto previo):
{
  "propuestas": [
    {
      "nombreArchivo": "string",
      "aseguradora": "string (nombre de la aseguradora en el PDF)",
      "plan": "string (nombre del plan/cotización en el PDF)",
      "primaAnual": "string (ej: ₡ 395.000 con desglose si indica IVA)",
      "primaAnualNumero": number (valor numérico entero en colones, ej: 395000),
      "cabeEnPresupuesto": "Sí" | "No",
      "deducibleColision": "string (ej: 10 % del reclamo, mín. ₡ 150.000)",
      "deducibleRobo": "string (ej: 10 % del valor asegurado)",
      "rcDanosTerceros": "string (límite y condición)",
      "rcLesiones": "string (límite y condición)",
      "asistenciaVial": "string (detalle de asistencia vial 24/7 o 'no incluido')",
      "grua": "string (detalle de grúa: kms, eventos)",
      "vehiculoSustituto": "string (días incluidos o 'no incluido')",
      "fenomenosNaturales": "string (detalle de cobertura o 'no aplica / no cubierto')",
      "roturaCristales": "string (límite o 'no cubierto')",
      "exclusionesDestacadas": "string (principales exclusiones listadas)",
      "cumpleObligatorias": "Sí" | "No",
      "motivoObligatorias": "string (breve explicación de por qué cumple o qué coberturas le faltan)",
      "semaforo": "verde" | "amarillo" | "rojo",
      "semaforoMotivo": "string (explicación concisa del semáforo)"
    }
  ],
  "recomendacionPreliminar": "string (máximo 5 líneas con montos justificados)",
  "mensajeWhatsApp": "string (máximo 8 líneas, cordial, sin tecnicismos)"
}
`;

      // Build contents parts: PDF files as inlineData + the prompt text
      const parts: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Clean base64 data if it contains data URI header
        const cleanBase64 = file.base64.replace(/^data:application\/pdf;base64,/, '');
        parts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: cleanBase64,
          },
        });
        parts.push({
          text: `Documento ${i + 1} de ${files.length}: Nombre de archivo "${file.name}"`,
        });
      }

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts,
        },
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1, // low temperature for precise factual extraction
        },
      });

      const rawText = response.text || '';
      let parsedResult: any;

      try {
        parsedResult = JSON.parse(rawText);
      } catch (e) {
        const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          throw new Error('La respuesta de Gemini no tuvo el formato JSON esperado.');
        }
      }

      // Business Rule Double-Check & Deterministic Enforcement
      if (Array.isArray(parsedResult.propuestas)) {
        parsedResult.propuestas = parsedResult.propuestas.map((p: any, idx: number) => {
          const fallbackName = files[idx]?.name || `Propuesta ${idx + 1}`;
          const primaNum = Number(p.primaAnualNumero) || 0;
          const maxPresupuesto = Number(clientProfile.presupuesto) || 0;

          const cabe = maxPresupuesto > 0 && primaNum > 0 ? (primaNum <= maxPresupuesto ? 'Sí' : 'No') : p.cabeEnPresupuesto;

          let semaforo = p.semaforo;
          if (p.cumpleObligatorias === 'Sí') {
            if (cabe === 'Sí') {
              semaforo = 'verde';
            } else {
              semaforo = 'amarillo';
            }
          } else {
            semaforo = 'rojo';
          }

          return {
            ...p,
            nombreArchivo: p.nombreArchivo || fallbackName,
            cabeEnPresupuesto: cabe,
            semaforo,
          };
        });
      }

      addAuditLog(
        user.id,
        user.usuario,
        'COMPARACION_EJECUTADA',
        `Comparativa ejecutada para cliente ${clientProfile.nombre || 'Sin nombre'} (${files.length} propuestas)`
      );

      return res.json(parsedResult);
    } catch (error: any) {
      console.error('Error in /api/compare:', error);
      return res.status(500).json({
        error: error.message || 'Error analizando las propuestas con Gemini.',
      });
    }
  });

  // Serve static files or Vite dev server
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
