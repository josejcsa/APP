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
      const dados = item.dados || item.data || item;
      const dados_json = JSON.stringify(dados);
      const itemUsuarioId = item.usuario_id || usuarioId;

      try {
        // 1. Insere/atualiza tabela central de sincronização
        await connection.query(
          `INSERT INTO registros_sincronizacao (guid, tipo_entidade, usuario_id, dados_json)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE dados_json = VALUES(dados_json), atualizado_em = CURRENT_TIMESTAMP`,
          [guid, tipo_entidade, itemUsuarioId, dados_json]
        );

        // 2. Insere em tabela especializada conforme tipo
        if (tipo_entidade === 'checklist' && dados.protocolNumber) {
          await connection.query(
            `INSERT INTO checklists_laudos (guid, protocol_number, customer_id, technician_id, status, service_value, dados_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE protocol_number = VALUES(protocol_number), dados_json = VALUES(dados_json)`,
            [
              guid,
              dados.protocolNumber || 'SOL-AUTO',
              dados.customerId || null,
              dados.technicianId || null,
              dados.status || 'rascunho',
              dados.serviceValue || 0,
              dados_json
            ]
          );
        } else if (tipo_entidade === 'contact' && dados.name) {
          const tipoContato = dados.isTechnician ? 'tecnico' : 'cliente';
          await connection.query(
            `INSERT INTO cadastros_contatos (guid, tipo, nome, documento, telefone, email, cidade, uf, dados_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE tipo = VALUES(tipo), nome = VALUES(nome), dados_json = VALUES(dados_json)`,
            [
              guid,
              tipoContato,
              dados.name,
              dados.document || null,
              dados.phone || null,
              dados.email || null,
              dados.address?.city || null,
              dados.address?.state || null,
              dados_json
            ]
          );
        } else if (tipo_entidade === 'appointment' && dados.scheduledDate) {
          await connection.query(
            `INSERT INTO agendamentos_ordens (guid, customer_id, technician_id, data_agendamento, hora_agendamento, status, valor_total, dados_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE customer_id = VALUES(customer_id), dados_json = VALUES(dados_json)`,
            [
              guid,
              dados.customerId || null,
              dados.technicianId || null,
              dados.scheduledDate,
              dados.scheduledTime || null,
              dados.status || 'agendado',
              dados.totalAmount || 0,
              dados_json
            ]
          );
        } else if (tipo_entidade === 'financial' && dados.month) {
          await connection.query(
            `INSERT INTO financeiro_lancamentos (guid, customer_id, technician_id, checklist_id, mes_referencia, valor_bruto, valor_liquido, comissao_tecnico, status_pagamento, dados_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE valor_bruto = VALUES(valor_bruto), dados_json = VALUES(dados_json)`,
            [
              guid,
              dados.customerId || null,
              dados.technicianId || null,
              dados.checklistId || null,
              dados.month,
              dados.grossAmount || 0,
              dados.netAmount || 0,
              dados.technicianCommission || 0,
              dados.paymentStatus || 'pendente',
              dados_json
            ]
          );
        } else if (tipo_entidade === 'audit_log') {
          await connection.query(
            `INSERT INTO auditoria_historico (guid, entity_type, entity_id, acao, usuario, resumo, dados_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              guid,
              dados.entityType || 'geral',
              dados.entityId || '',
              dados.action || 'Edição',
              dados.user || 'Sistema',
              dados.summary || '',
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

export default { getDatabasePool, testDatabaseConnection, getDatabaseStats, closeDatabaseConnections, initializeDatabaseTables, syncBatchData, getTableCounts };
