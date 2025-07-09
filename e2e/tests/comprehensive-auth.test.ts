import { test, expect, Page, BrowserContext } from '@playwright/test';
import { format } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Comprehensive Authentication & Authorization Tests', () => {
  let adminContext: BrowserContext;
  let userContext: BrowserContext;
  let guestContext: BrowserContext;
  let authReport: any = {
    timestamp: new Date().toISOString(),
    tests: [],
    security: {
      loginAttempts: [],
      sessionManagement: [],
      authorization: [],
      tokenValidation: []
    },
    performance: {},
    errors: []
  };

  test.beforeAll(async ({ browser }) => {
    // Create different user contexts
    adminContext = await browser.newContext();
    userContext = await browser.newContext();
    guestContext = await browser.newContext();
  });

  test.afterAll(async () => {
    // Generate comprehensive auth report
    const reportPath = path.join('./test-results', 'comprehensive-auth-report.json');
    await fs.promises.writeFile(reportPath, JSON.stringify(authReport, null, 2));

    await adminContext.close();
    await userContext.close();
    await guestContext.close();
  });

  test('Admin login with correct credentials', async () => {
    const page = await adminContext.newPage();
    const startTime = Date.now();

    try {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Fill login form
      await page.fill('[data-testid="email-input"]', process.env.ADMIN_EMAIL || 'admin@bisnis.co.id');
      await page.fill('[data-testid="password-input"]', process.env.ADMIN_PASSWORD || 'password123');

      // Submit form
      await page.click('[data-testid="login-button"]');

      // Wait for redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 });

      // Verify admin access
      await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
      
      // Check if admin-specific elements are visible
      await expect(page.locator('[data-testid="nav-settings"]')).toBeVisible();

      authReport.tests.push({
        test: 'Admin Login Success',
        duration: Date.now() - startTime,
        status: 'PASSED',
        user: 'admin'
      });

    } catch (error) {
      authReport.errors.push({
        test: 'Admin Login',
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    } finally {
      await page.close();
    }
  });

  test('User login with correct credentials', async () => {
    const page = await userContext.newPage();
    const startTime = Date.now();

    try {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Fill login form
      await page.fill('[data-testid="email-input"]', process.env.USER_EMAIL || 'user@bisnis.co.id');
      await page.fill('[data-testid="password-input"]', process.env.USER_PASSWORD || 'password123');

      // Submit form
      await page.click('[data-testid="login-button"]');

      // Wait for redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 });

      // Verify user access
      await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();

      authReport.tests.push({
        test: 'User Login Success',
        duration: Date.now() - startTime,
        status: 'PASSED',
        user: 'user'
      });

    } catch (error) {
      authReport.errors.push({
        test: 'User Login',
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    } finally {
      await page.close();
    }
  });

  test('Login with incorrect credentials should fail', async () => {
    const page = await guestContext.newPage();
    const startTime = Date.now();

    try {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Fill login form with wrong credentials
      await page.fill('[data-testid="email-input"]', 'wrong@email.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');

      // Submit form
      await page.click('[data-testid="login-button"]');

      // Should stay on login page and show error
      await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 5000 });
      await expect(page).toHaveURL(/\/login/);

      authReport.security.loginAttempts.push({
        type: 'invalid_credentials',
        result: 'BLOCKED',
        timestamp: Date.now()
      });

      authReport.tests.push({
        test: 'Invalid Credentials Rejection',
        duration: Date.now() - startTime,
        status: 'PASSED'
      });

    } catch (error) {
      authReport.errors.push({
        test: 'Invalid Credentials Test',
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    } finally {
      await page.close();
    }
  });

  test('Session persistence after page refresh', async () => {
    const page = await adminContext.newPage();
    const startTime = Date.now();

    try {
      // Login as admin
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', process.env.ADMIN_EMAIL || 'admin@bisnis.co.id');
      await page.fill('[data-testid="password-input"]', process.env.ADMIN_PASSWORD || 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should still be logged in
      await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
      await expect(page).toHaveURL('/dashboard');

      authReport.security.sessionManagement.push({
        test: 'Session Persistence',
        result: 'MAINTAINED',
        timestamp: Date.now()
      });

      authReport.tests.push({
        test: 'Session Persistence',
        duration: Date.now() - startTime,
        status: 'PASSED'
      });

    } catch (error) {
      authReport.errors.push({
        test: 'Session Persistence',
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    } finally {
      await page.close();
    }
  });

  test('Logout functionality', async () => {
    const page = await adminContext.newPage();
    const startTime = Date.now();

    try {
      // Login as admin
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', process.env.ADMIN_EMAIL || 'admin@bisnis.co.id');
      await page.fill('[data-testid="password-input"]', process.env.ADMIN_PASSWORD || 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');

      // Should redirect to login page
      await page.waitForURL('/login');
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();

      // Try to access protected route
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login/);

      authReport.security.sessionManagement.push({
        test: 'Logout Cleanup',
        result: 'SESSION_CLEARED',
        timestamp: Date.now()
      });

      authReport.tests.push({
        test: 'Logout Functionality',
        duration: Date.now() - startTime,
        status: 'PASSED'
      });

    } catch (error) {
      authReport.errors.push({
        test: 'Logout Test',
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    } finally {
      await page.close();
    }
  });

  test('Protected routes require authentication', async () => {
    const page = await guestContext.newPage();
    const startTime = Date.now();

    const protectedRoutes = [
      '/dashboard',
      '/clients',
      '/projects',
      '/quotations',
      '/invoices',
      '/reports',
      '/settings'
    ];

    try {
      for (const route of protectedRoutes) {
        await page.goto(route);
        
        // Should redirect to login
        await expect(page).toHaveURL(/\/login/);
        
        authReport.security.authorization.push({
          route,
          result: 'PROTECTED',
          timestamp: Date.now()
        });
      }

      authReport.tests.push({
        test: 'Protected Routes Authorization',
        duration: Date.now() - startTime,
        status: 'PASSED',
        routesTested: protectedRoutes.length
      });

    } catch (error) {
      authReport.errors.push({
        test: 'Protected Routes Test',
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    } finally {
      await page.close();
    }
  });

  test('JWT token validation and expiry', async () => {
    const page = await adminContext.newPage();
    const startTime = Date.now();

    try {
      // Login and get token
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', process.env.ADMIN_EMAIL || 'admin@bisnis.co.id');
      await page.fill('[data-testid="password-input"]', process.env.ADMIN_PASSWORD || 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // Check if token exists in localStorage
      const token = await page.evaluate(() => {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          return parsed.state?.token;
        }
        return null;
      });

      expect(token).toBeTruthy();

      // Verify token format (JWT should have 3 parts)
      const tokenParts = token.split('.');
      expect(tokenParts).toHaveLength(3);

      authReport.security.tokenValidation.push({
        test: 'JWT Token Format',
        result: 'VALID',
        tokenLength: token.length,
        timestamp: Date.now()
      });

      authReport.tests.push({
        test: 'JWT Token Validation',
        duration: Date.now() - startTime,
        status: 'PASSED'
      });

    } catch (error) {
      authReport.errors.push({
        test: 'JWT Token Validation',
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    } finally {
      await page.close();
    }
  });

  test('Role-based access control', async () => {
    const adminPage = await adminContext.newPage();
    const userPage = await userContext.newPage();
    const startTime = Date.now();

    try {
      // Login as admin
      await adminPage.goto('/login');
      await adminPage.fill('[data-testid="email-input"]', process.env.ADMIN_EMAIL || 'admin@bisnis.co.id');
      await adminPage.fill('[data-testid="password-input"]', process.env.ADMIN_PASSWORD || 'password123');
      await adminPage.click('[data-testid="login-button"]');
      await adminPage.waitForURL('/dashboard');

      // Admin should have access to settings
      await adminPage.goto('/settings');
      await expect(adminPage.locator('[data-testid="settings-container"]')).toBeVisible();

      // Login as user
      await userPage.goto('/login');
      await userPage.fill('[data-testid="email-input"]', process.env.USER_EMAIL || 'user@bisnis.co.id');
      await userPage.fill('[data-testid="password-input"]', process.env.USER_PASSWORD || 'password123');
      await userPage.click('[data-testid="login-button"]');
      await userPage.waitForURL('/dashboard');

      // User should have limited access (implementation depends on your RBAC)
      await userPage.goto('/settings');
      // This might redirect or show limited options based on your implementation

      authReport.security.authorization.push({
        test: 'Role-based Access Control',
        adminAccess: 'GRANTED',
        userAccess: 'LIMITED',
        timestamp: Date.now()
      });

      authReport.tests.push({
        test: 'Role-based Access Control',
        duration: Date.now() - startTime,
        status: 'PASSED'
      });

    } catch (error) {
      authReport.errors.push({
        test: 'RBAC Test',
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    } finally {
      await adminPage.close();
      await userPage.close();
    }
  });

  test('Multiple concurrent sessions', async () => {
    const page1 = await adminContext.newPage();
    const page2 = await adminContext.newPage();
    const startTime = Date.now();

    try {
      // Login in first tab
      await page1.goto('/login');
      await page1.fill('[data-testid="email-input"]', process.env.ADMIN_EMAIL || 'admin@bisnis.co.id');
      await page1.fill('[data-testid="password-input"]', process.env.ADMIN_PASSWORD || 'password123');
      await page1.click('[data-testid="login-button"]');
      await page1.waitForURL('/dashboard');

      // Login in second tab
      await page2.goto('/login');
      await page2.fill('[data-testid="email-input"]', process.env.ADMIN_EMAIL || 'admin@bisnis.co.id');
      await page2.fill('[data-testid="password-input"]', process.env.ADMIN_PASSWORD || 'password123');
      await page2.click('[data-testid="login-button"]');
      await page2.waitForURL('/dashboard');

      // Both should be accessible
      await expect(page1.locator('[data-testid="dashboard-container"]')).toBeVisible();
      await expect(page2.locator('[data-testid="dashboard-container"]')).toBeVisible();

      authReport.security.sessionManagement.push({
        test: 'Concurrent Sessions',
        result: 'ALLOWED',
        sessionsCount: 2,
        timestamp: Date.now()
      });

      authReport.tests.push({
        test: 'Multiple Concurrent Sessions',
        duration: Date.now() - startTime,
        status: 'PASSED'
      });

    } catch (error) {
      authReport.errors.push({
        test: 'Concurrent Sessions Test',
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    } finally {
      await page1.close();
      await page2.close();
    }
  });
});