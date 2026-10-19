import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

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

  // Endpoint to fetch bundled sample proposals for quick testing
  app.get('/api/sample-proposals', (_req, res) => {
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

  // Main comparison endpoint powered by Gemini with rate-limiting and payload validation
  app.post('/api/compare', rateLimitMiddleware, async (req, res) => {
    try {
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
Eres el motor de análisis y extracción de documentos para "Comparador de Propuestas BN", una corredora de seguros en Costa Rica.
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
        // Fallback: try extracting JSON from markdown code block if needed
        const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          throw new Error('La respuesta de Gemini no tuvo el formato JSON esperado.');
        }
      }

      // Business Rule Double-Check & Deterministic Enforcement
      // Rule 2: Cabe en presupuesto si prima anual <= presupuesto
      // Rule 3: Semáforo: verde si cabe y cumple; amarillo si cumple pero no cabe; rojo si no cumple
      if (Array.isArray(parsedResult.propuestas)) {
        parsedResult.propuestas = parsedResult.propuestas.map((p: any, idx: number) => {
          const fallbackName = files[idx]?.name || `Propuesta ${idx + 1}`;
          const primaNum = Number(p.primaAnualNumero) || 0;
          const maxPresupuesto = Number(clientProfile.presupuesto) || 0;

          // Double check cabe en presupuesto if prima is known
          const cabe = maxPresupuesto > 0 && primaNum > 0 ? (primaNum <= maxPresupuesto ? 'Sí' : 'No') : p.cabeEnPresupuesto;

          // Semáforo rule:
          // verde: cabe en presupuesto ("Sí") && cumple obligatorias ("Sí")
          // amarillo: cumple obligatorias ("Sí") && NO cabe en presupuesto ("No")
          // rojo: NO cumple obligatorias ("No")
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
