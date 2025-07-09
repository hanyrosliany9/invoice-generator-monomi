import { test, expect } from '@playwright/test';

test.describe('Infrastructure Tests - Docker Services', () => {
  test('Database connection is available', async () => {
    // Test database connection through a simple Node.js connection
    const { Client } = require('pg');
    const client = new Client({
      connectionString: 'postgresql://invoiceuser:invoicepass@localhost:5433/invoices_test'
    });
    
    try {
      await client.connect();
      const result = await client.query('SELECT NOW()');
      expect(result.rows.length).toBeGreaterThan(0);
      console.log('✅ Database connection successful');
    } finally {
      await client.end();
    }
  });

  test('Redis connection is available', async () => {
    // Test Redis connection
    const redis = require('redis');
    const client = redis.createClient({
      socket: {
        host: 'localhost',
        port: 6380
      }
    });
    
    try {
      await client.connect();
      await client.ping();
      console.log('✅ Redis connection successful');
    } finally {
      await client.disconnect();
    }
  });

  test('Docker containers are running', async ({ request }) => {
    // This test validates that our Docker-first approach is working
    // by checking if we can connect to the containerized services
    
    const dbTest = async () => {
      try {
        const { Client } = require('pg');
        const client = new Client({
          connectionString: 'postgresql://invoiceuser:invoicepass@localhost:5433/invoices_test'
        });
        await client.connect();
        await client.query('SELECT 1');
        await client.end();
        return true;
      } catch (error) {
        return false;
      }
    };

    const redisTest = async () => {
      try {
        const redis = require('redis');
        const client = redis.createClient({
          socket: { host: 'localhost', port: 6380 }
        });
        await client.connect();
        await client.ping();
        await client.disconnect();
        return true;
      } catch (error) {
        return false;
      }
    };

    const dbResult = await dbTest();
    const redisResult = await redisTest();

    expect(dbResult).toBe(true);
    expect(redisResult).toBe(true);
    
    console.log('✅ Docker-first infrastructure validation passed');
    console.log('📦 PostgreSQL: Running in Docker on port 5433');
    console.log('📦 Redis: Running in Docker on port 6380');
    console.log('🎯 Ready for application testing');
  });
});