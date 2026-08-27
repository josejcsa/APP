import mysql from 'mysql2/promise';

/**
 * Database configuration for GoDaddy Node.js Hosting
 * 
 * The platform provides managed MySQL with the following env vars:
 * - DB_HOST: Database host
 * - DB_PORT: Database port (usually 3306)
 * - DB_NAME: Database name
 * - DB_USER: Database user
 * - DB_PASSWORD: Database password
 * 
 * Usage:
 *   const pool = getDatabasePool();
 *   const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
 */

let pool: mysql.Pool | null = null;

/**
 * Initialize and return the MySQL connection pool
 * Reads all credentials from process.env (GoDaddy Node.js Hosting)
 */
export function getDatabasePool(): mysql.Pool {
  if (pool) return pool;

  const dbHost = process.env.DB_HOST;
  const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
  const dbName = process.env.DB_NAME;
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;

  // Validate that all required database environment variables are set
  if (!dbHost || !dbName || !dbUser || !dbPassword) {
    throw new Error(
      'Database configuration incomplete. Ensure DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD are set in the Node.js Hosting environment.'
    );
  }

  try {
    pool = mysql.createPool({
      host: dbHost,
      port: dbPort,
      database: dbName,
      user: dbUser,
      password: dbPassword,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    console.log(`✅ MySQL database pool initialized: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);
    return pool;
  } catch (error) {
    console.error('❌ Failed to create MySQL connection pool:', error);
    throw error;
  }
}

/**
 * ===== NOVO: Criar todas as tabelas necessárias =====
 * Executado automaticamente na inicialização
 */
export async function initializeDatabaseTables(): Promise<void> {
  try {
    const pool = getDatabasePool();
    const connection = await pool.getConnection();

    console.log('📊 Initializing database tables...');

    // 1. Tabela de Sincronização Central
    await connection.query(`
      CREATE TABLE IF NOT EXISTS registros_sincronizacao (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guid VARCHAR(64) UNIQUE NOT NULL,
        tipo_entidade VARCHAR(50) DEFAULT 'geral',
        usuario_id INT DEFAULT 1,
        dados_json LONGTEXT NOT NULL,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tipo (tipo_entidade),
        INDEX idx_guid (guid),
        INDEX idx_usuario (usuario_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table: registros_sincronizacao');

    // 2. Tabela de Checklists Técnicos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS checklists_laudos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guid VARCHAR(64) UNIQUE NOT NULL,
        protocol_number VARCHAR(50) NOT NULL,
        customer_id VARCHAR(64),
        technician_id VARCHAR(64),
        status VARCHAR(30) DEFAULT 'rascunho',
        service_value DECIMAL(10,2) DEFAULT 0.00,
        dados_json LONGTEXT NOT NULL,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_customer (customer_id),
        INDEX idx_status (status),
        INDEX idx_guid (guid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table: checklists_laudos');

    // 3. Tabela de Cadastros (Clientes e Técnicos)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cadastros_contatos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guid VARCHAR(64) UNIQUE NOT NULL,
        tipo ENUM('cliente', 'tecnico', 'parceiro') DEFAULT 'cliente',
        nome VARCHAR(255) NOT NULL,
        documento VARCHAR(50),
        telefone VARCHAR(50),
        email VARCHAR(150),
        cidade VARCHAR(100),
        uf VARCHAR(10),
        dados_json LONGTEXT NOT NULL,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tipo (tipo),
        INDEX idx_telefone (telefone),
        INDEX idx_guid (guid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table: cadastros_contatos');

    // 4. Tabela de Agendamentos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS agendamentos_ordens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guid VARCHAR(64) UNIQUE NOT NULL,
        customer_id VARCHAR(64),
        technician_id VARCHAR(64),
        data_agendamento VARCHAR(20),
        hora_agendamento VARCHAR(10),
        status VARCHAR(30) DEFAULT 'agendado',
        valor_total DECIMAL(10,2) DEFAULT 0.00,
        dados_json LONGTEXT NOT NULL,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_data (data_agendamento),
        INDEX idx_status (status),
        INDEX idx_guid (guid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table: agendamentos_ordens');

    // 5. Tabela de Financeiro
    await connection.query(`
      CREATE TABLE IF NOT EXISTS financeiro_lancamentos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guid VARCHAR(64) UNIQUE NOT NULL,
        customer_id VARCHAR(64),
        technician_id VARCHAR(64),
        checklist_id VARCHAR(64),
        mes_referencia VARCHAR(10),
        valor_bruto DECIMAL(10,2) DEFAULT 0.00,
        valor_liquido DECIMAL(10,2) DEFAULT 0.00,
        comissao_tecnico DECIMAL(10,2) DEFAULT 0.00,
        status_pagamento VARCHAR(30) DEFAULT 'pendente',
        dados_json LONGTEXT NOT NULL,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_mes (mes_referencia),
        INDEX idx_status (status_pagamento),
        INDEX idx_guid (guid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table: financeiro_lancamentos');

    // 6. Tabela de Auditoria
    await connection.query(`
      CREATE TABLE IF NOT EXISTS auditoria_historico (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guid VARCHAR(64) UNIQUE NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(64) NOT NULL,
        acao VARCHAR(50) NOT NULL,
        usuario VARCHAR(150) NOT NULL,
        usuario_id INT,
        ip_origem VARCHAR(45),
        resumo TEXT,
        dados_json LONGTEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_usuario (usuario),
        INDEX idx_acao (acao),
        INDEX idx_guid (guid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table: auditoria_historico');

    // 7. Tabela de Usuários
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios_auth (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guid VARCHAR(64) UNIQUE NOT NULL,
        nome VARCHAR(255) NOT NULL,
        login_ou_telefone VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(191),
        senha_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'tecnico', 'cliente') DEFAULT 'tecnico',
        contato_id VARCHAR(64),
        permissoes_json JSON,
        ativo TINYINT(1) DEFAULT 1,
        ultimo_login DATETIME,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_role_ativo (role, ativo),
        INDEX idx_guid (guid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table: usuarios_auth');

    // 8. Tabela de Imagens
    await connection.query(`
      CREATE TABLE IF NOT EXISTS imagens_arquivos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guid VARCHAR(64) UNIQUE NOT NULL,
        nome_original VARCHAR(255),
        nome_arquivo VARCHAR(255) NOT NULL,
        caminho_servidor VARCHAR(500) NOT NULL,
        url_publica VARCHAR(500) NOT NULL,
        tipo_mime VARCHAR(100),
        tamanho_bytes INT DEFAULT 0,
        usuario_id INT DEFAULT 1,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_guid (guid),
        INDEX idx_usuario (usuario_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table: imagens_arquivos');

    connection.release();
    console.log('✅ All database tables initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error);
    throw error;
  }
}

/**
 * Test database connection
 * Call this during server startup to verify connectivity
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const pool = getDatabasePool();
    const connection = await pool.getConnection();
    const [result]: any = await connection.query('SELECT 1 as test');
    connection.release();
    console.log('✅ Database connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

/**
 * Get database statistics
 * Useful for health checks and monitoring
 */
export async function getDatabaseStats(): Promise<{
  status: string;
  host: string;
  database: string;
  user: string;
  connected: boolean;
  driver: string;
  usando_mysql_real: boolean;
  timestamp: string;
}> {
  try {
    const pool = getDatabasePool();
    const connection = await pool.getConnection();
    
    await connection.query('SELECT 1');
    connection.release();

    return {
      status: 'connected',
      host: process.env.DB_HOST || 'unknown',
      database: process.env.DB_NAME || 'unknown',
      user: process.env.DB_USER || 'unknown',
      connected: true,
      driver: 'MySQL',
      usando_mysql_real: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'error',
      host: process.env.DB_HOST || 'unknown',
      database: process.env.DB_NAME || 'unknown',
      user: process.env.DB_USER || 'unknown',
      connected: false,
      driver: 'MySQL',
      usando_mysql_real: false,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * ===== NOVO: Inserir dados com validação pós-inserção =====
 */
export async function syncBatchData(items: any[], usuarioId: number = 1): Promise<{
  success: boolean;
  itemsProcessed: number;
  mapeamento: any[];
  banco_tipo: string;
  servidor_timestamp: string;
}> {
  try {
    const pool = getDatabasePool();
    const connection = await pool.getConnection();
    
    const mapeamento: any[] = [];
    let itemsProcessed = 0;

    // Inicia transação
    await connection.beginTransaction();

    for (const item of items) {
      const guid = item.guid || item.id;
      if (!guid) continue;

      const tipo_entidade = item.tipo_entidade || item.type || 'geral';
      
      // Decodifica dados do item se vier como dados_json ou dados
      let dados: any = item.dados || item.data;
      if (!dados && item.dados_json) {
        try {
          dados = typeof item.dados_json === 'string' ? JSON.parse(item.dados_json) : item.dados_json;
        } catch (e) {
          dados = null;
        }
      }
      if (!dados || typeof dados !== 'object') {
        dados = item;
      }
      
      const dados_json = typeof item.dados_json === 'string' ? item.dados_json : JSON.stringify(dados);
      const itemUsuarioId = item.usuario_id || usuarioId;

      try {
        // 1. Insere/atualiza tabela central de sincronização
        await connection.query(
          `INSERT INTO registros_sincronizacao (guid, tipo_entidade, usuario_id, dados_json)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE dados_json = VALUES(dados_json), tipo_entidade = VALUES(tipo_entidade), atualizado_em = CURRENT_TIMESTAMP`,
          [guid, tipo_entidade, itemUsuarioId, dados_json]
        );

        // 2. Insere em tabela especializada conforme tipo
        if (tipo_entidade === 'checklist') {
          const proto = dados.protocolNumber || dados.protocolo || `SOL-${Date.now().toString().slice(-6)}`;
          await connection.query(
            `INSERT INTO checklists_laudos (guid, protocol_number, customer_id, technician_id, status, service_value, dados_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE protocol_number = VALUES(protocol_number), customer_id = VALUES(customer_id), technician_id = VALUES(technician_id), status = VALUES(status), service_value = VALUES(service_value), dados_json = VALUES(dados_json)`,
            [
              guid,
              proto,
              dados.customerId || dados.customer_id || null,
              dados.technicianId || dados.technician_id || null,
              dados.status || 'rascunho',
              Number(dados.serviceValue || dados.valor_servico || 0),
              dados_json
            ]
          );
        } else if (tipo_entidade === 'contact') {
          const nome = dados.name || dados.nome || 'Contato Sem Nome';
          const tipoContato = (dados.isTechnician || dados.tipo === 'tecnico') ? 'tecnico' : 'cliente';
          await connection.query(
            `INSERT INTO cadastros_contatos (guid, tipo, nome, documento, telefone, email, cidade, uf, dados_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE tipo = VALUES(tipo), nome = VALUES(nome), documento = VALUES(documento), telefone = VALUES(telefone), email = VALUES(email), cidade = VALUES(cidade), uf = VALUES(uf), dados_json = VALUES(dados_json)`,
            [
              guid,
              tipoContato,
              nome,
              dados.document || dados.documento || null,
              dados.phone || dados.telefone || null,
              dados.email || null,
              dados.address?.city || dados.cidade || null,
              dados.address?.state || dados.uf || null,
              dados_json
            ]
          );
        } else if (tipo_entidade === 'appointment') {
          const dataAg = dados.scheduledDate || dados.data_agendamento || new Date().toISOString().slice(0, 10);
          await connection.query(
            `INSERT INTO agendamentos_ordens (guid, customer_id, technician_id, data_agendamento, hora_agendamento, status, valor_total, dados_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE customer_id = VALUES(customer_id), technician_id = VALUES(technician_id), data_agendamento = VALUES(data_agendamento), hora_agendamento = VALUES(hora_agendamento), status = VALUES(status), valor_total = VALUES(valor_total), dados_json = VALUES(dados_json)`,
            [
              guid,
              dados.customerId || dados.customer_id || null,
              dados.technicianId || dados.technician_id || null,
              dataAg,
              dados.scheduledTime || dados.hora_agendamento || null,
              dados.status || 'agendado',
              Number(dados.totalAmount || dados.valor_total || 0),
              dados_json
            ]
          );
        } else if (tipo_entidade === 'financial') {
          const mes = dados.month || dados.mes_referencia || new Date().toISOString().slice(0, 7);
          await connection.query(
            `INSERT INTO financeiro_lancamentos (guid, customer_id, technician_id, checklist_id, mes_referencia, valor_bruto, valor_liquido, comissao_tecnico, status_pagamento, dados_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE customer_id = VALUES(customer_id), technician_id = VALUES(technician_id), checklist_id = VALUES(checklist_id), mes_referencia = VALUES(mes_referencia), valor_bruto = VALUES(valor_bruto), valor_liquido = VALUES(valor_liquido), comissao_tecnico = VALUES(comissao_tecnico), status_pagamento = VALUES(status_pagamento), dados_json = VALUES(dados_json)`,
            [
              guid,
              dados.customerId || dados.customer_id || null,
              dados.technicianId || dados.technician_id || null,
              dados.checklistId || dados.checklist_id || null,
              mes,
              Number(dados.grossAmount || dados.valor_bruto || 0),
              Number(dados.netAmount || dados.valor_liquido || 0),
              Number(dados.technicianCommission || dados.comissao_tecnico || 0),
              dados.paymentStatus || dados.status_pagamento || 'pendente',
              dados_json
            ]
          );
        } else if (tipo_entidade === 'audit_log') {
          await connection.query(
            `INSERT INTO auditoria_historico (guid, entity_type, entity_id, acao, usuario, resumo, dados_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              guid,
              dados.entityType || dados.entity_type || 'geral',
              dados.entityId || dados.entity_id || '',
              dados.action || dados.acao || 'Edição',
              dados.user || dados.usuario || 'Sistema',
              dados.summary || dados.resumo || '',
              dados_json
            ]
          );
        }

        // Validação pós-inserção: verifica se foi registrado
        const [syncCheck]: any = await connection.query(
          'SELECT id FROM registros_sincronizacao WHERE guid = ? LIMIT 1',
          [guid]
        );

        if (syncCheck && syncCheck.length > 0) {
          mapeamento.push({
            guid,
            id_banco: syncCheck[0].id,
            tipo: tipo_entidade,
            status: 'inserido',
            database_confirmed: true
          });
          itemsProcessed++;
        }
      } catch (err: any) {
        console.error(`❌ Erro ao processar item ${guid}:`, err.message);
        mapeamento.push({
          guid,
          tipo: tipo_entidade,
          status: 'erro',
          erro: err.message
        });
      }
    }

    // Confirma transação
    await connection.commit();
    connection.release();

    return {
      success: true,
      itemsProcessed,
      mapeamento,
      banco_tipo: 'MySQL Real',
      servidor_timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('❌ Erro na sincronização:', error);
    throw error;
  }
}

/**
 * ===== NOVO: Contar registros por tabela =====
 */
export async function getTableCounts(): Promise<{
  total_checklists: number;
  total_cadastros: number;
  total_agendamentos: number;
  total_financeiro: number;
  total_auditoria: number;
  total_imagens: number;
}> {
  try {
    const pool = getDatabasePool();
    const connection = await pool.getConnection();

    const queries = [
      'SELECT COUNT(*) as count FROM checklists_laudos',
      'SELECT COUNT(*) as count FROM cadastros_contatos',
      'SELECT COUNT(*) as count FROM agendamentos_ordens',
      'SELECT COUNT(*) as count FROM financeiro_lancamentos',
      'SELECT COUNT(*) as count FROM auditoria_historico',
      'SELECT COUNT(*) as count FROM imagens_arquivos'
    ];

    const [q1]: any = await connection.query(queries[0]);
    const [q2]: any = await connection.query(queries[1]);
    const [q3]: any = await connection.query(queries[2]);
    const [q4]: any = await connection.query(queries[3]);
    const [q5]: any = await connection.query(queries[4]);
    const [q6]: any = await connection.query(queries[5]);

    connection.release();

    return {
      total_checklists: q1[0].count || 0,
      total_cadastros: q2[0].count || 0,
      total_agendamentos: q3[0].count || 0,
      total_financeiro: q4[0].count || 0,
      total_auditoria: q5[0].count || 0,
      total_imagens: q6[0].count || 0
    };
  } catch (error) {
    console.error('❌ Erro ao contar registros:', error);
    return {
      total_checklists: 0,
      total_cadastros: 0,
      total_agendamentos: 0,
      total_financeiro: 0,
      total_auditoria: 0,
      total_imagens: 0
    };
  }
}

/**
 * ===== NOVO: Buscar registros remotos para sincronização híbrida (Pull) =====
 */
export async function fetchRemoteSyncRecords(options: {
  limit?: number;
  strategy?: 'all_recent' | 'my_recent' | 'hybrid_my_and_recent';
  userId?: string | number;
  since?: string;
}): Promise<Array<{
  id_banco: number;
  guid: string;
  tipo_entidade: string;
  usuario_id: any;
  dados: any;
  atualizado_em: string;
}>> {
  try {
    const limit = Math.min(Math.max(Number(options.limit) || 50, 10), 200);
    const strategy = options.strategy || 'hybrid_my_and_recent';
    const userId = options.userId || 1;
    const pool = getDatabasePool();
    const connection = await pool.getConnection();

    let rows: any[] = [];

    if (strategy === 'my_recent') {
      const [results]: any = await connection.query(
        `SELECT id as id_banco, guid, tipo_entidade, usuario_id, dados_json, atualizado_em 
         FROM registros_sincronizacao 
         WHERE usuario_id = ? 
         ORDER BY atualizado_em DESC, id DESC 
         LIMIT ?`,
        [userId, limit]
      );
      rows = results || [];
    } else if (strategy === 'all_recent') {
      const [results]: any = await connection.query(
        `SELECT id as id_banco, guid, tipo_entidade, usuario_id, dados_json, atualizado_em 
         FROM registros_sincronizacao 
         ORDER BY atualizado_em DESC, id DESC 
         LIMIT ?`,
        [limit]
      );
      rows = results || [];
    } else {
      // hybrid_my_and_recent: Meus registros + mais recentes gerais
      const myLimit = Math.floor(limit / 2);

      const [myResults]: any = await connection.query(
        `SELECT id as id_banco, guid, tipo_entidade, usuario_id, dados_json, atualizado_em 
         FROM registros_sincronizacao 
         WHERE usuario_id = ? 
         ORDER BY atualizado_em DESC, id DESC 
         LIMIT ?`,
        [userId, myLimit]
      );

      const [allResults]: any = await connection.query(
        `SELECT id as id_banco, guid, tipo_entidade, usuario_id, dados_json, atualizado_em 
         FROM registros_sincronizacao 
         ORDER BY atualizado_em DESC, id DESC 
         LIMIT ?`,
        [limit]
      );

      const seen = new Set<number>();
      const combined: any[] = [];

      for (const r of (myResults || [])) {
        if (!seen.has(r.id_banco)) {
          seen.add(r.id_banco);
          combined.push(r);
        }
      }

      for (const r of (allResults || [])) {
        if (!seen.has(r.id_banco) && combined.length < limit) {
          seen.add(r.id_banco);
          combined.push(r);
        }
      }

      rows = combined;
    }

    connection.release();

    const sanitizedRows: any[] = [];
    for (const r of rows) {
      // Ignora master admin
      if (
        r.guid === 'usr-admin-master' ||
        r.guid === 'admin' ||
        r.tipo_entidade === 'master'
      ) {
        continue;
      }

      let parsed: any = null;
      try {
        parsed = typeof r.dados_json === 'string' ? JSON.parse(r.dados_json) : r.dados_json;
      } catch (e) {
        parsed = {};
      }

      // Se for contato ou tiver senha, sanitiza o campo
      if (parsed && typeof parsed === 'object') {
        if (parsed.id === 'usr-admin-master' || parsed.phone === '(47)98863-8516' || parsed.phone === '(47) 98863-8516') {
          continue;
        }
        delete parsed.password;
        delete parsed.senha;
      }

      sanitizedRows.push({
        id_banco: r.id_banco,
        guid: r.guid,
        tipo_entidade: r.tipo_entidade,
        usuario_id: r.usuario_id,
        dados: parsed,
        atualizado_em: r.atualizado_em
      });
    }

    return sanitizedRows;
  } catch (error) {
    console.error('❌ Erro ao buscar registros remotos:', error);
    return [];
  }
}

/**
 * ===== NOVO: Autenticação de Usuário e Administração via Banco de Dados =====
 */
export async function authenticateUserInDatabase(phoneOrLogin: string, passwordInput: string): Promise<{
  success: boolean;
  message?: string;
  session?: {
    id: string;
    name: string;
    phone: string;
    role: 'admin' | 'technician' | 'client';
    isTechnician?: boolean;
    isAdmin?: boolean;
    isPartner?: boolean;
    contactId?: string;
    allowedNavTabs: Array<'geral' | 'cliente' | 'checklist' | 'agenda' | 'financeiro' | 'contatos'>;
    loginTimestamp: string;
    token?: string;
  };
  banco_tipo?: string;
}> {
  const cleanInput = (phoneOrLogin || '').trim();
  const cleanPhone = cleanInput.replace(/\D/g, '');
  const cleanPassword = (passwordInput || '').trim();

  const masterPhoneNorm = '47988638516';
  const masterPassword = process.env.ADMIN_PASSWORD || 'ELT2026A';

  // 1. Verificação do Usuário Master / Administrador Geral (Exclusivo do Servidor)
  if (
    (cleanPhone === masterPhoneNorm || cleanInput.toLowerCase() === 'admin' || cleanInput === '(47) 98863-8516' || cleanInput === '(47)98863-8516') &&
    cleanPassword === masterPassword
  ) {
    const session = {
      id: 'usr-admin-master',
      name: 'Administrador Geral Elthera',
      phone: '(47) 98863-8516',
      role: 'admin' as const,
      isAdmin: true,
      isPartner: false,
      isTechnician: false,
      allowedNavTabs: ['geral', 'cliente', 'checklist', 'agenda', 'financeiro', 'contatos'] as Array<'geral' | 'cliente' | 'checklist' | 'agenda' | 'financeiro' | 'contatos'>,
      loginTimestamp: new Date().toISOString(),
      token: `auth_master_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
    };

    // Registra log de auditoria no banco se disponível
    try {
      const pool = getDatabasePool();
      const connection = await pool.getConnection();
      await connection.query(
        `INSERT INTO auditoria_historico (guid, entity_type, entity_id, acao, usuario, resumo, dados_json)
         VALUES (?, 'auth', 'admin', 'Login', 'Administrador Geral', 'Login master efetuado no servidor', ?)`,
        [`aud_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`, JSON.stringify({ phone: cleanPhone, timestamp: new Date().toISOString() })]
      );
      connection.release();
    } catch (e) {
      // Ignora erro de auditoria se banco estiver indisponível
    }

    return {
      success: true,
      message: 'Autenticado com privilégios de Administrador Geral.',
      session,
      banco_tipo: 'MySQL Real'
    };
  }

  // 2. Consulta no Banco de Dados MySQL (cadastros_contatos e registros_sincronizacao)
  try {
    const pool = getDatabasePool();
    const connection = await pool.getConnection();

    // Busca contato pelo telefone ou documento
    const [rows]: any = await connection.query(
      `SELECT guid, tipo, nome, documento, telefone, email, dados_json, atualizado_em 
       FROM cadastros_contatos 
       WHERE telefone LIKE ? OR REPLACE(REPLACE(REPLACE(REPLACE(telefone, '(', ''), ')', ''), '-', ''), ' ', '') = ? 
       LIMIT 10`,
      [`%${cleanPhone.slice(-8)}%`, cleanPhone]
    );

    // Também verifica em registros_sincronizacao caso ainda não tenha sido populado em cadastros_contatos
    let matchedContact: any = null;
    let contactData: any = null;

    if (rows && rows.length > 0) {
      for (const row of rows) {
        let parsedData: any = null;
        try {
          parsedData = typeof row.dados_json === 'string' ? JSON.parse(row.dados_json) : row.dados_json;
        } catch (e) {
          parsedData = {};
        }

        const rowPhoneClean = (row.telefone || parsedData.phone || '').replace(/\D/g, '');
        if (rowPhoneClean === cleanPhone || (cleanPhone.length >= 8 && rowPhoneClean.endsWith(cleanPhone.slice(-8)))) {
          matchedContact = row;
          contactData = parsedData;
          break;
        }
      }
    }

    // Se não encontrou em cadastros_contatos, busca em registros_sincronizacao
    if (!matchedContact) {
      const [syncRows]: any = await connection.query(
        `SELECT guid, dados_json FROM registros_sincronizacao WHERE tipo_entidade = 'contact' ORDER BY id DESC LIMIT 200`
      );

      if (syncRows && syncRows.length > 0) {
        for (const sr of syncRows) {
          try {
            const parsed = typeof sr.dados_json === 'string' ? JSON.parse(sr.dados_json) : sr.dados_json;
            const parsedPhoneClean = (parsed.phone || parsed.telefone || '').replace(/\D/g, '');
            if (parsedPhoneClean === cleanPhone || (cleanPhone.length >= 8 && parsedPhoneClean.endsWith(cleanPhone.slice(-8)))) {
              matchedContact = { guid: sr.guid, ...parsed };
              contactData = parsed;
              break;
            }
          } catch (e) {
            // Ignora JSON mal formatado
          }
        }
      }
    }

    connection.release();

    if (!matchedContact) {
      return {
        success: false,
        message: 'Telefone não localizado no cadastro. Verifique o número informado ou contate o administrador.'
      };
    }

    const contactPassword = contactData?.password || matchedContact?.password || '';
    if (!contactPassword) {
      return {
        success: false,
        message: 'Este usuário ainda não possui senha cadastrada. Solicite o cadastro de senha ao administrador.'
      };
    }

    if (contactPassword !== cleanPassword) {
      return {
        success: false,
        message: 'Senha incorreta. A senha é composta por 8 dígitos alfanuméricos.'
      };
    }

    const isAdmin = Boolean(contactData?.isAdmin || matchedContact?.isAdmin);
    const isPartner = Boolean(contactData?.isPartner || matchedContact?.isPartner);
    const isTechnician = Boolean(contactData?.isTechnician || matchedContact?.tipo === 'tecnico' || matchedContact?.isTechnician);

    const defaultTabs: Array<'geral' | 'cliente' | 'checklist' | 'agenda' | 'financeiro' | 'contatos'> = isAdmin
      ? ['geral', 'cliente', 'checklist', 'agenda', 'financeiro', 'contatos']
      : isTechnician
      ? ['checklist', 'agenda', 'cliente']
      : ['cliente'];

    const allowedTabs: Array<'geral' | 'cliente' | 'checklist' | 'agenda' | 'financeiro' | 'contatos'> = isAdmin
      ? ['geral', 'cliente', 'checklist', 'agenda', 'financeiro', 'contatos']
      : (contactData?.allowedNavTabs && contactData.allowedNavTabs.length > 0
        ? contactData.allowedNavTabs
        : defaultTabs);

    const role: 'admin' | 'technician' | 'client' = isAdmin ? 'admin' : isTechnician ? 'technician' : 'client';

    const session = {
      id: matchedContact.guid || matchedContact.id || `usr_${Date.now()}`,
      name: contactData?.name || matchedContact.nome || 'Usuário Cadastrado',
      phone: contactData?.phone || matchedContact.telefone || cleanInput,
      role,
      isTechnician,
      isAdmin,
      isPartner,
      contactId: matchedContact.guid || matchedContact.id,
      allowedNavTabs: allowedTabs,
      loginTimestamp: new Date().toISOString(),
      token: `auth_usr_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
    };

    // Registra log de auditoria
    try {
      const pool = getDatabasePool();
      const connection = await pool.getConnection();
      await connection.query(
        `INSERT INTO auditoria_historico (guid, entity_type, entity_id, acao, usuario, resumo, dados_json)
         VALUES (?, 'auth', ?, 'Login', ?, 'Login realizado com sucesso', ?)`,
        [
          `aud_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          session.id,
          session.name,
          JSON.stringify({ phone: session.phone, role: session.role, timestamp: session.loginTimestamp })
        ]
      );
      connection.release();
    } catch (e) {
      // Ignora erro de auditoria
    }

    return {
      success: true,
      message: 'Login realizado com sucesso!',
      session,
      banco_tipo: 'MySQL Real'
    };

  } catch (error: any) {
    console.error('❌ Erro na autenticação via banco de dados:', error);
    return {
      success: false,
      message: 'Erro de comunicação com o banco de dados: ' + (error.message || 'Falha ao autenticar')
    };
  }
}

/**
 * Close all database connections gracefully
 * Call this during server shutdown
 */
export async function closeDatabaseConnections(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
      pool = null;
      console.log('✅ All database connections closed');
    } catch (error) {
      console.error('❌ Error closing database connections:', error);
    }
  }
}

export default { 
  getDatabasePool, 
  testDatabaseConnection, 
  getDatabaseStats, 
  closeDatabaseConnections, 
  initializeDatabaseTables, 
  syncBatchData, 
  getTableCounts, 
  fetchRemoteSyncRecords,
  authenticateUserInDatabase
};
