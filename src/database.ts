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
      keepAliveInitialDelayMs: 0,
    });

    console.log(`✅ MySQL database pool initialized: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);
    return pool;
  } catch (error) {
    console.error('❌ Failed to create MySQL connection pool:', error);
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
}> {
  try {
    const pool = getDatabasePool();
    const connection = await pool.getConnection();
    
    await connection.query('SELECT 1');
    connection.release();

    return {
      status: 'healthy',
      host: process.env.DB_HOST || 'unknown',
      database: process.env.DB_NAME || 'unknown',
      user: process.env.DB_USER || 'unknown',
      connected: true,
    };
  } catch (error) {
    return {
      status: 'error',
      host: process.env.DB_HOST || 'unknown',
      database: process.env.DB_NAME || 'unknown',
      user: process.env.DB_USER || 'unknown',
      connected: false,
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

export default { getDatabasePool, testDatabaseConnection, getDatabaseStats, closeDatabaseConnections };
