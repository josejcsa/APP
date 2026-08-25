import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = '0.0.0.0';

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Healthcheck
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Elthera Pro API',
      timestamp: new Date().toISOString(),
    });
  });

  // Static uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Image upload handler
  const handleImageUpload = (req: express.Request, res: express.Response) => {
    const payload = req.body || {};
    const base64 = payload.imagem_base64 || payload.dataUrl || '';
    const guid = payload.guid || payload.id || `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const originalName = payload.nome_original || `${guid}.jpg`;
    
    let ext = 'jpg';
    let cleanBase64 = base64;
    const match = base64.match(/^data:image\/(\w+);base64,/);
    if (match) {
      ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
    }

    const uniqueFilename = `${guid}.${ext}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    try {
      if (cleanBase64) {
        fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));
      }
      return res.json({
        success: true,
        message: 'Imagem salva com ID único no servidor.',
        imageId: guid,
        filename: uniqueFilename,
        url: `/uploads/${uniqueFilename}`,
        size: cleanBase64 ? Buffer.from(cleanBase64, 'base64').length : 0,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: 'Erro ao salvar imagem: ' + err.message });
    }
  };

  app.post(['/api/upload-image', '/api/upload', '/start/api/upload_image'], handleImageUpload);

  // Offline-First PHP & Sync Mock / Bridge for development and preview environment
  const handlePhpEndpoints = (req: express.Request, res: express.Response) => {
    if (req.method === 'GET') {
      return res.json({
        success: true,
        banco_instalado: true,
        driver: 'Node Express Proxy (Dev/Preview)',
        estatisticas: {
          total_checklists: 24,
          total_cadastros: 18,
          total_agendamentos: 12,
          total_financeiro: 24,
          total_auditoria: 45,
          total_imagens: 60,
        },
        registros: [],
      });
    }

    const payload = req.body || {};

    if (payload.action === 'upload_image' || req.query.action === 'upload_image') {
      return handleImageUpload(req, res);
    }

    const items = payload.lote || payload.itens || payload.queue || payload.items || [];
    let counter = 100;
    const mapeamento = items.map((item: any) => ({
      guid: item.guid || item.id,
      id_banco: ++counter,
      status: 'inserido',
    }));

    return res.json({
      success: true,
      message: 'Lote de dados (Checklists, Cadastros, Agenda, Financeiro e Auditoria) processado com sucesso.',
      total_processados: mapeamento.length,
      itemsProcessed: mapeamento.length,
      mapeamento,
      servidor_timestamp: new Date().toISOString(),
    });
  };

  app.all([
    '/start/api/api.php',
    '/start/api/sync.php',
    '/app/api/sync.php',
    '/app/api/api.php',
    '/api/sync.php',
    '/api/api.php',
    '/api.php',
    '/sync.php'
  ], handlePhpEndpoints);

  // Gemini AI Solar Diagnostic & Gain Estimation Advisor
  app.post('/api/ai/solar-assessment', async (req, res) => {
    try {
      const { powerKwp, moduleCount, dirtLevel, dirtTypes, kwBefore, kwAfter, roofType } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        const gainPercent = kwBefore && kwAfter ? ((kwAfter - kwBefore) / kwBefore) * 100 : 25;
        return res.json({
          gainPercent: Number(gainPercent.toFixed(1)),
          estimatedMonthlyExtraKwh: Math.round((powerKwp || 10) * 30 * (gainPercent / 100) * 4.5),
          estimatedMonthlySavingsBrl: Math.round((powerKwp || 10) * 30 * (gainPercent / 100) * 4.5 * 0.90),
          recommendations: 'Higienização recomendada a cada 4 a 6 meses. Inspeção de conexões MC4 em dia.',
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Você é um engenheiro especialista em energia solar fotovoltaica e manutenção técnica de usinas e sistemas residenciais.
Analise os seguintes dados de uma limpeza técnica de módulos solares:
- Potência instalada: ${powerKwp} kWp
- Quantidade de módulos: ${moduleCount} painéis
- Tipo de telhado/solo: ${roofType}
- Nível de sujeira inicial: ${dirtLevel}
- Tipos de sujeira encontrados: ${Array.isArray(dirtTypes) ? dirtTypes.join(', ') : dirtTypes}
- Geração instantânea ANTES da limpeza: ${kwBefore} kW
- Geração instantânea DEPOIS da limpeza: ${kwAfter} kW

Forneça um JSON com a seguinte estrutura:
{
  "gainPercent": number,
  "estimatedMonthlyExtraKwh": number,
  "estimatedMonthlySavingsBrl": number,
  "technicalEvaluation": "string com parecer técnico claro para o cliente",
  "recommendedFrequencyMonths": number,
  "maintenanceTips": ["dica 1", "dica 2"]
}
Retorne APENAS o JSON válido sem markdown adicional.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return res.json(parsed);
    } catch (e: any) {
      console.warn('Fallback due to AI assessment error:', e?.message);
      const { kwBefore, kwAfter, powerKwp } = req.body;
      const gainPercent = kwBefore && kwAfter ? ((kwAfter - kwBefore) / kwBefore) * 100 : 35;
      return res.json({
        gainPercent: Number(gainPercent.toFixed(1)),
        estimatedMonthlyExtraKwh: Math.round((powerKwp || 10) * 130 * 0.25),
        estimatedMonthlySavingsBrl: Math.round((powerKwp || 10) * 130 * 0.25 * 0.92),
        technicalEvaluation: 'Excelente recuperação de rendimento após remoção completa da camada de sujeira e dejetos.',
        recommendedFrequencyMonths: 6,
        maintenanceTips: ['Verificar sombreamentos sazonais', 'Evitar lavagem sob sol a pino'],
      });
    }
  });

  // Vite middleware for development vs static build in production
  const isDev = process.env.NODE_ENV !== 'production' && fs.existsSync(path.join(process.cwd(), 'src', 'App.tsx')) && !fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));

  if (isDev) {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteError) {
      console.warn('Vite dev middleware could not be loaded, falling back to static files.');
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(200).send('Elthera Pro Backend Running. Please run `npm run build` to build client assets.');
        }
      });
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('Elthera Pro Backend Running.');
      }
    });
  }

  // Start server and bind to host & port assigned by GoDaddy Node.js Hosting
  const server = app.listen(PORT, HOST, () => {
    console.log(`⚡ Elthera Pro Server running on http://${HOST}:${PORT}`);
    console.log(`🚀 Node.js Environment: ${process.env.NODE_ENV || 'production'}`);
  });

  // Graceful shutdown handling for GoDaddy Node.js Hosting container lifecycle
  const handleGracefulShutdown = (signal: string) => {
    console.log(`Received ${signal}. Gracefully closing Elthera Pro server...`);
    server.close(() => {
      console.log('HTTP server closed successfully.');
      process.exit(0);
    });

    // Force close after 10s if connections linger
    setTimeout(() => {
      console.error('Forcing shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
}

// Auto-start application server
startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
