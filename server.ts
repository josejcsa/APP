import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { 
  getDatabasePool, 
  testDatabaseConnection, 
  getDatabaseStats, 
  closeDatabaseConnections,
  initializeDatabaseTables,
  syncBatchData,
  getTableCounts,
  fetchRemoteSyncRecords,
  authenticateUserInDatabase
} from './src/database';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = '0.0.0.0';

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ============================================
  // DATABASE INITIALIZATION & TABLE CREATION
  // ============================================
  let dbHealthy = false;
  
  try {
    // Test database connection on startup
    const dbConnected = await testDatabaseConnection();
    dbHealthy = dbConnected;
    
    if (dbConnected) {
      // Initialize all tables automatically
      await initializeDatabaseTables();
      console.log('✅ Database tables initialized and ready');
    } else {
      console.warn('⚠️  Database connection failed. Some features may be unavailable.');
    }
  } catch (dbError: any) {
    console.warn('⚠️  Database initialization error:', dbError.message);
    dbHealthy = false;
  }

  // ============================================
  // HEALTH CHECK ENDPOINT
  // ============================================
  app.get('/api/health', async (req, res) => {
    const dbStats = await getDatabaseStats();
    res.json({
      success: true,
      status: dbStats.connected ? 'connected' : 'disconnected',
      service: 'Elthera Pro API',
      timestamp: new Date().toISOString(),
      database: dbStats,
      banco_instalado: dbHealthy,
      usando_mysql_real: dbStats.usando_mysql_real,
    });
  });

  // ============================================
  // AUTHENTICATION & LOGIN ENDPOINTS
  // ============================================
  app.post(['/api/login', '/api/auth/login', '/start/api/login'], async (req, res) => {
    try {
      const { phone, telefone, login, password, senha } = req.body || {};
      const loginIdentifier = phone || telefone || login || '';
      const passwordInput = password || senha || '';

      if (!loginIdentifier || !passwordInput) {
        return res.status(400).json({
          success: false,
          message: 'Telefone e senha são obrigatórios para acessar o sistema.'
        });
      }

      const authResult = await authenticateUserInDatabase(loginIdentifier, passwordInput);
      if (authResult.success) {
        return res.json(authResult);
      } else {
        return res.status(401).json(authResult);
      }
    } catch (error: any) {
      console.error('❌ Erro no endpoint de login:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao processar login: ' + (error.message || 'Falha no servidor')
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
  const handleImageUpload = async (req: express.Request, res: express.Response) => {
    try {
      const payload = req.body || {};
      const base64 = payload.imagem_base64 || payload.dataUrl || '';
      const guid = payload.guid || payload.id || `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const originalName = payload.nome_original || `${guid}.jpg`;
      const usuarioId = payload.usuario_id || 1;
      
      let ext = 'jpg';
      let cleanBase64 = base64;
      const match = base64.match(/^data:image\/(\w+);base64,/);
      if (match) {
        ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
      }

      const uniqueFilename = `${guid}.${ext}`;
      const filePath = path.join(uploadsDir, uniqueFilename);

      if (cleanBase64) {
        fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));
      }

      // ===== NOVO: Insere no banco de dados =====
      if (dbHealthy) {
        try {
          const pool = getDatabasePool();
          const connection = await pool.getConnection();
          
          const size = cleanBase64 ? Buffer.from(cleanBase64, 'base64').length : 0;
          const mime = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
          const publicUrl = `/uploads/${uniqueFilename}`;

          await connection.query(
            `INSERT INTO imagens_arquivos (guid, nome_original, nome_arquivo, caminho_servidor, url_publica, tipo_mime, tamanho_bytes, usuario_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE nome_arquivo = VALUES(nome_arquivo), url_publica = VALUES(url_publica)`,
            [guid, originalName, uniqueFilename, filePath, publicUrl, mime, size, usuarioId]
          );

          // Validação pós-inserção
          const [verifyResult]: any = await connection.query(
            'SELECT id FROM imagens_arquivos WHERE guid = ? LIMIT 1',
            [guid]
          );

          connection.release();

          if (verifyResult && verifyResult.length > 0) {
            return res.json({
              success: true,
              message: 'Imagem salva e registrada no banco de dados.',
              imageId: guid,
              filename: uniqueFilename,
              url: publicUrl,
              size,
              database_confirmed: true,
              db_id: verifyResult[0].id,
              banco_tipo: 'MySQL Real'
            });
          }
        } catch (dbErr: any) {
          console.error('Erro ao registrar imagem no BD:', dbErr.message);
        }
      }

      return res.json({
        success: true,
        message: 'Imagem salva no servidor.',
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
  // SINCRONIZAÇÃO DE DADOS - ENDPOINTS PRINCIPAIS
  // ============================================
  
  // GET - Retorna estatísticas, status e registros remotos para pull
  app.get(['/api/sync', '/start/api/api.php', '/start/api/sync.php', '/api/api.php', '/api.php'], async (req, res) => {
    try {
      if (!dbHealthy) {
        return res.status(503).json({
          success: false,
          message: 'Database is not available',
          banco_tipo: 'SQLite Fallback (Offline)',
          usando_mysql_real: false
        });
      }

      const limit = Number(req.query.limit) || 50;
      const strategy = (req.query.strategy as any) || 'hybrid_my_and_recent';
      const userId = (req.query.usuario_id || req.query.userId || 1) as any;

      const stats = await getTableCounts();
      const dbStats = await getDatabaseStats();
      const remoteRecords = await fetchRemoteSyncRecords({ limit, strategy, userId });

      return res.json({
        success: true,
        banco_instalado: true,
        driver: 'MySQL',
        usando_mysql_real: true,
        estatisticas: stats,
        database: dbStats,
        registros_remotos: remoteRecords,
        total_remotos: remoteRecords.length,
        servidor_timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao consultar estatísticas: ' + error.message
      });
    }
  });

  // POST - Sincroniza dados em lote (Push + Pull Híbrido)
  app.post(['/api/sync', '/start/api/api.php', '/start/api/sync.php', '/api/api.php', '/api.php'], async (req, res) => {
    try {
      const payload = req.body || {};

      // ===== Tratamento de upload de imagem via POST =====
      if (payload.action === 'upload_image') {
        return handleImageUpload(req, res);
      }

      // ===== Sincronização de dados em lote =====
      if (!dbHealthy) {
        return res.status(503).json({
          success: false,
          message: 'Database is not available for sync',
          banco_tipo: 'SQLite Fallback (Offline)',
          usando_mysql_real: false
        });
      }

      const items = payload.lote || payload.itens || payload.queue || payload.items || [];
      const usuarioId = payload.usuario_id || payload.userId || 1;
      const syncOptions = payload.sync_options || {};
      const limit = Number(syncOptions.limit || payload.limit) || 50;
      const strategy = syncOptions.strategy || payload.strategy || 'hybrid_my_and_recent';

      let result = {
        success: true,
        itemsProcessed: 0,
        mapeamento: [] as any[],
        banco_tipo: 'MySQL Real',
        servidor_timestamp: new Date().toISOString()
      };

      // Executa envio dos itens pendentes se houver
      if (Array.isArray(items) && items.length > 0) {
        result = await syncBatchData(items, usuarioId);
      }

      // Busca dados atualizados da nuvem (Pull Híbrido)
      const remoteRecords = await fetchRemoteSyncRecords({ limit, strategy, userId: usuarioId });

      return res.json({
        success: result.success,
        message: `${result.itemsProcessed} itens enviados e ${remoteRecords.length} registros remotos sincronizados.`,
        total_processados: result.itemsProcessed,
        itemsProcessed: result.itemsProcessed,
        mapeamento: result.mapeamento,
        registros_remotos: remoteRecords,
        total_remotos: remoteRecords.length,
        banco_tipo: result.banco_tipo,
        usando_mysql_real: true,
        servidor_timestamp: result.servidor_timestamp
      });

    } catch (error: any) {
      console.error('❌ Erro na sincronização:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao sincronizar dados: ' + error.message
      });
    }
  });

  // ============================================
  // DATABASE TEST ENDPOINT
  // ============================================
  app.get('/api/database-test', async (req, res) => {
    if (!dbHealthy) {
      return res.status(503).json({
        success: false,
        message: 'Database is not available',
      });
    }

    try {
      const pool = getDatabasePool();
      const connection = await pool.getConnection();
      const [rows]: any = await connection.query('SELECT 1 as test, NOW() as server_time');
      connection.release();
      
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
    console.log(`\n🚀 Elthera Pro Server running on http://${HOST}:${PORT}`);
    console.log(`📦 Node.js Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`📊 Database: ${dbHealthy ? '✅ MySQL Real Connected' : '⚠️  Offline Mode'}`);
    console.log('\n✅ Ready for API requests:');
    console.log(`   GET  http://${HOST}:${PORT}/api/health`);
    console.log(`   POST http://${HOST}:${PORT}/api/sync (sincronização de dados)\n`);
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
