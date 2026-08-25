import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { getDatabasePool, testDatabaseConnection, getDatabaseStats, closeDatabaseConnections } from './src/database';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = '0.0.0.0';

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ============================================
  // DATABASE INITIALIZATION
  // ============================================
  let dbHealthy = false;
  
  try {
    // Test database connection on startup
    const dbConnected = await testDatabaseConnection();
    dbHealthy = dbConnected;
    if (!dbConnected) {
      console.warn('⚠️  Database connection failed. Some features may be unavailable.');
    }
  } catch (dbError: any) {
    console.warn('⚠️  Database initialization skipped (optional). Error:', dbError.message);
    dbHealthy = false;
  }

  // ============================================
  // HEALTH CHECK ENDPOINT
  // ============================================
  app.get('/api/health', async (req, res) => {
    const dbStats = await getDatabaseStats();
    res.json({
      status: 'ok',
      service: 'Elthera Pro API',
      timestamp: new Date().toISOString(),
      database: dbStats,
    });
  });

  // ============================================
  // DATABASE ENDPOINTS (Example)
  // ============================================
  // Example endpoint to fetch data from database (if enabled)
  app.get('/api/database-test', async (req, res) => {
    if (!dbHealthy) {
      return res.status(503).json({
        success: false,
        message: 'Database is not available',
      });
    }

    try {
      const pool = getDatabasePool();
      // Test query - adjust based on your schema
      const [rows]: any = await pool.query('SELECT 1 as test, NOW() as server_time');
      
      return res.json({
        success: true,
        message: 'Database connection successful',
        data: rows[0],
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Database query failed: ' + error.message,
      });
    }
  });

  // ============================================
  // STATIC UPLOADS DIRECTORY
  // ============================================
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // ============================================
  // IMAGE UPLOAD HANDLER
  // ============================================
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

  // ============================================
  // OFFLINE-FIRST PHP & SYNC MOCK
  // ============================================
  const handlePhpEndpoints = (req: express.Request, res: express.Response) => {
    if (req.method === 'GET') {
      return res.json({
        success: true,
        banco_instalado: dbHealthy,
        driver: dbHealthy ? 'MySQL (GoDaddy Node.js Hosting)' : 'Node Express Proxy (Dev/Preview)',
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

  // ============================================
  // GEMINI AI SOLAR ASSESSMENT
  // ============================================
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

  // ============================================
  // VITE MIDDLEWARE / STATIC FILES
  // ============================================
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

  // ============================================
  // SERVER START
  // ============================================
  const server = app.listen(PORT, HOST, () => {
    console.log(`⚡ Elthera Pro Server running on http://${HOST}:${PORT}`);
    console.log(`🚀 Node.js Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`📊 Database: ${dbHealthy ? '✅ Connected' : '⚠️  Offline/Optional'}`);
  });

  // ============================================
  // GRACEFUL SHUTDOWN
  // ============================================
  const handleGracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received. Gracefully shutting down Elthera Pro server...`);
    
    server.close(async () => {
      // Close database connections
      await closeDatabaseConnections();
      
      console.log('✅ HTTP server closed successfully.');
      process.exit(0);
    });

    // Force close after 10s if connections linger
    setTimeout(() => {
      console.error('❌ Forcing shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
}

// ============================================
// AUTO-START APPLICATION SERVER
// ============================================
startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
