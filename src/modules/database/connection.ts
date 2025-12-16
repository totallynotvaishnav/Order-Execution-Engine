import { Pool, PoolClient } from 'pg';
import { config } from '../../config/environment';

class DatabaseConnection {
  private pool: Pool | null = null;

  async initialize(): Promise<void> {
    if (this.pool) {
      console.log('[DB] Connection pool already initialized');
      return;
    }

    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.warn('[DB] No DATABASE_URL found - running without persistence');
      return;
    }

    try {
      this.pool = new Pool({
        connectionString: databaseUrl,
        max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
        min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: process.env.DATABASE_SSL === 'true' ? {
          rejectUnauthorized: false
        } : false,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      console.log('[DB] PostgreSQL connection pool initialized successfully');

      // Handle pool errors
      this.pool.on('error', (err: Error) => {
        console.error('[DB] Unexpected pool error:', err);
      });

    } catch (error) {
      console.error('[DB] Failed to initialize database connection:', error);
      throw error;
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      console.error('[DB] Query error:', error);
      throw error;
    }
  }

  async getClient(): Promise<PoolClient | null> {
    if (!this.pool) {
      return null;
    }
    return await this.pool.connect();
  }

  async healthCheck(): Promise<boolean> {
    if (!this.pool) {
      return false;
    }

    try {
      const result = await this.pool.query('SELECT 1');
      return result.rows.length > 0;
    } catch (error) {
      console.error('[DB] Health check failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('[DB] Connection pool closed');
    }
  }

  isInitialized(): boolean {
    return this.pool !== null;
  }
}

export const database = new DatabaseConnection();
