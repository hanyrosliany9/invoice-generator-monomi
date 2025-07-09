import { test, expect, Page } from '@playwright/test';
import { format } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';

// Test data interfaces
interface TestClient {
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  contactPerson: string;
  paymentTerms: string;
}

interface TestProject {
  number: string;
  description: string;
  output: string;
  type: 'PRODUCTION' | 'SOCIAL_MEDIA';
  estimatedBudget: number;
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

interface TestQuotation {
  amountPerProject: number;
  totalAmount: number;
  terms: string;
  validUntil: string;
}

interface TestInvoice {
  amountPerProject: number;
  totalAmount: number;
  paymentInfo: string;
  terms: string;
  dueDate: string;
}

test.describe('Business Workflow E2E Tests', () => {
  let adminPage: Page;
  let userPage: Page;
  let workflowReport: any = {
    timestamp: new Date().toISOString(),
    workflows: [],
    performance: {},
    errors: []
  };

  test.beforeAll(async ({ browser }) => {
    // Create admin and user contexts
    const adminContext = await browser.newContext({
      storageState: './admin-auth.json'
    });
    const userContext = await browser.newContext({
      storageState: './user-auth.json'
    });

    adminPage = await adminContext.newPage();
    userPage = await userContext.newPage();
  });

  test.afterAll(async () => {
    // Generate workflow report
    const reportPath = path.join('./test-results', 'business-workflow-report.json');
    await fs.promises.writeFile(reportPath, JSON.stringify(workflowReport, null, 2));

    await adminPage.close();
    await userPage.close();
  });

  test('Complete Business Workflow: Client → Project → Quotation → Invoice → Payment', async () => {
    const workflowStartTime = Date.now();
    const workflowSteps: any[] = [];

    try {
      // Step 1: Create Client
      const stepStartTime = Date.now();
      await adminPage.goto('/clients');
      await adminPage.waitForLoadState('networkidle');

      await adminPage.click('[data-testid="create-client-button"]');
      await adminPage.waitForSelector('[data-testid="client-form"]');

      const testClient: TestClient = {
        name: 'PT Business Workflow Test',
        email: 'workflow@test.com',
        phone: '021-9999999',
        address: 'Jl. Workflow Test No. 123, Jakarta',
        company: 'PT Business Workflow Test',
        contactPerson: 'Test Manager',
        paymentTerms: 'NET 30'
      };

      await adminPage.fill('[data-testid="client-name-input"]', testClient.name);
      await adminPage.fill('[data-testid="client-email-input"]', testClient.email);
      await adminPage.fill('[data-testid="client-phone-input"]', testClient.phone);
      await adminPage.fill('[data-testid="client-address-input"]', testClient.address);
      await adminPage.fill('[data-testid="client-company-input"]', testClient.company);
      await adminPage.fill('[data-testid="client-contact-person-input"]', testClient.contactPerson);
      await adminPage.selectOption('[data-testid="client-payment-terms-select"]', testClient.paymentTerms);

      await adminPage.click('[data-testid="submit-client-button"]');
      await adminPage.waitForSelector('[data-testid="client-success-message"]');

      // Get created client ID
      const clientId = await adminPage.getAttribute('[data-testid="created-client-id"]', 'data-client-id');
      
      workflowSteps.push({
        step: 'Create Client',
        duration: Date.now() - stepStartTime,
        status: 'success',
        data: { clientId, client: testClient }
      });

      // Step 2: Create Project
      const projectStartTime = Date.now();
      await adminPage.goto('/projects');
      await adminPage.waitForLoadState('networkidle');

      await adminPage.click('[data-testid="create-project-button"]');
      await adminPage.waitForSelector('[data-testid="project-form"]');

      const testProject: TestProject = {
        number: `WF-${Date.now()}`,
        description: 'Workflow Test Project - E-commerce Development',
        output: 'Complete e-commerce website with admin panel',
        type: 'PRODUCTION',
        estimatedBudget: 75000000,
        status: 'PLANNING'
      };

      await adminPage.fill('[data-testid="project-number-input"]', testProject.number);
      await adminPage.fill('[data-testid="project-description-input"]', testProject.description);
      await adminPage.fill('[data-testid="project-output-input"]', testProject.output);
      await adminPage.selectOption('[data-testid="project-type-select"]', testProject.type);
      await adminPage.selectOption('[data-testid="project-client-select"]', clientId!);
      await adminPage.fill('[data-testid="project-budget-input"]', testProject.estimatedBudget.toString());
      await adminPage.selectOption('[data-testid="project-status-select"]', testProject.status);

      const startDate = new Date();
      const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days from now
      await adminPage.fill('[data-testid="project-start-date-input"]', format(startDate, 'yyyy-MM-dd'));
      await adminPage.fill('[data-testid="project-end-date-input"]', format(endDate, 'yyyy-MM-dd'));

      await adminPage.click('[data-testid="submit-project-button"]');
      await adminPage.waitForSelector('[data-testid="project-success-message"]');

      const projectId = await adminPage.getAttribute('[data-testid="created-project-id"]', 'data-project-id');
      
      workflowSteps.push({
        step: 'Create Project',
        duration: Date.now() - projectStartTime,
        status: 'success',
        data: { projectId, project: testProject }
      });

      // Step 3: Create Quotation
      const quotationStartTime = Date.now();
      await adminPage.goto('/quotations');
      await adminPage.waitForLoadState('networkidle');

      await adminPage.click('[data-testid="create-quotation-button"]');
      await adminPage.waitForSelector('[data-testid="quotation-form"]');

      const testQuotation: TestQuotation = {
        amountPerProject: 75000000,
        totalAmount: 75000000,
        terms: 'Pembayaran dapat dilakukan dalam 3 termin: 40% di awal, 40% di tengah, 20% di akhir',
        validUntil: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      };

      await adminPage.selectOption('[data-testid="quotation-client-select"]', clientId!);
      await adminPage.selectOption('[data-testid="quotation-project-select"]', projectId!);
      await adminPage.fill('[data-testid="quotation-amount-input"]', testQuotation.amountPerProject.toString());
      await adminPage.fill('[data-testid="quotation-total-input"]', testQuotation.totalAmount.toString());
      await adminPage.fill('[data-testid="quotation-terms-input"]', testQuotation.terms);
      await adminPage.fill('[data-testid="quotation-valid-until-input"]', testQuotation.validUntil);

      await adminPage.click('[data-testid="submit-quotation-button"]');
      await adminPage.waitForSelector('[data-testid="quotation-success-message"]');

      const quotationId = await adminPage.getAttribute('[data-testid="created-quotation-id"]', 'data-quotation-id');
      
      workflowSteps.push({
        step: 'Create Quotation',
        duration: Date.now() - quotationStartTime,
        status: 'success',
        data: { quotationId, quotation: testQuotation }
      });

      // Step 4: Send Quotation to Client
      const sendQuotationStartTime = Date.now();
      await adminPage.click(`[data-testid="quotation-${quotationId}"] [data-testid="send-quotation-button"]`);
      await adminPage.waitForSelector('[data-testid="confirm-send-modal"]');
      await adminPage.click('[data-testid="confirm-send-button"]');
      await adminPage.waitForSelector('[data-testid="quotation-sent-message"]');

      // Verify quotation status changed to SENT
      const quotationStatus = await adminPage.textContent(`[data-testid="quotation-${quotationId}"] [data-testid="quotation-status"]`);
      expect(quotationStatus).toBe('SENT');

      workflowSteps.push({
        step: 'Send Quotation',
        duration: Date.now() - sendQuotationStartTime,
        status: 'success',
        data: { quotationId, status: 'SENT' }
      });

      // Step 5: Client Approves Quotation (simulate client approval)
      const approvalStartTime = Date.now();
      await adminPage.click(`[data-testid="quotation-${quotationId}"] [data-testid="approve-quotation-button"]`);
      await adminPage.waitForSelector('[data-testid="approve-quotation-modal"]');
      await adminPage.fill('[data-testid="approval-notes-input"]', 'Quotation approved by client. Proceed with project.');
      await adminPage.click('[data-testid="confirm-approve-button"]');
      await adminPage.waitForSelector('[data-testid="quotation-approved-message"]');

      // Verify quotation status changed to APPROVED
      const approvedStatus = await adminPage.textContent(`[data-testid="quotation-${quotationId}"] [data-testid="quotation-status"]`);
      expect(approvedStatus).toBe('APPROVED');

      workflowSteps.push({
        step: 'Approve Quotation',
        duration: Date.now() - approvalStartTime,
        status: 'success',
        data: { quotationId, status: 'APPROVED' }
      });

      // Step 6: Create Invoice from Approved Quotation
      const invoiceStartTime = Date.now();
      await adminPage.goto('/invoices');
      await adminPage.waitForLoadState('networkidle');

      await adminPage.click('[data-testid="create-invoice-from-quotation-button"]');
      await adminPage.waitForSelector('[data-testid="quotation-select-modal"]');
      await adminPage.selectOption('[data-testid="approved-quotation-select"]', quotationId!);
      await adminPage.click('[data-testid="create-invoice-from-quotation-confirm"]');
      await adminPage.waitForSelector('[data-testid="invoice-form"]');

      const testInvoice: TestInvoice = {
        amountPerProject: 75000000,
        totalAmount: 75000000,
        paymentInfo: 'Bank BCA: 1234567890 a.n. PT Business Workflow Test',
        terms: 'Pembayaran dalam 30 hari setelah invoice diterima',
        dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      };

      // Form should be pre-filled from quotation
      await adminPage.fill('[data-testid="invoice-payment-info-input"]', testInvoice.paymentInfo);
      await adminPage.fill('[data-testid="invoice-terms-input"]', testInvoice.terms);
      await adminPage.fill('[data-testid="invoice-due-date-input"]', testInvoice.dueDate);

      await adminPage.click('[data-testid="submit-invoice-button"]');
      await adminPage.waitForSelector('[data-testid="invoice-success-message"]');

      const invoiceId = await adminPage.getAttribute('[data-testid="created-invoice-id"]', 'data-invoice-id');
      
      // Verify materai requirement for amount > 5M IDR
      const materaiRequired = await adminPage.textContent(`[data-testid="invoice-${invoiceId}"] [data-testid="materai-required"]`);
      expect(materaiRequired).toBe('Ya'); // Should be "Yes" in Indonesian

      workflowSteps.push({
        step: 'Create Invoice',
        duration: Date.now() - invoiceStartTime,
        status: 'success',
        data: { invoiceId, invoice: testInvoice, materaiRequired: true }
      });

      // Step 7: Send Invoice to Client
      const sendInvoiceStartTime = Date.now();
      await adminPage.click(`[data-testid="invoice-${invoiceId}"] [data-testid="send-invoice-button"]`);
      await adminPage.waitForSelector('[data-testid="confirm-send-invoice-modal"]');
      await adminPage.click('[data-testid="confirm-send-invoice-button"]');
      await adminPage.waitForSelector('[data-testid="invoice-sent-message"]');

      // Verify invoice status changed to SENT
      const invoiceStatus = await adminPage.textContent(`[data-testid="invoice-${invoiceId}"] [data-testid="invoice-status"]`);
      expect(invoiceStatus).toBe('SENT');

      workflowSteps.push({
        step: 'Send Invoice',
        duration: Date.now() - sendInvoiceStartTime,
        status: 'success',
        data: { invoiceId, status: 'SENT' }
      });

      // Step 8: Generate PDF Invoice
      const pdfStartTime = Date.now();
      await adminPage.click(`[data-testid="invoice-${invoiceId}"] [data-testid="generate-pdf-button"]`);
      
      // Wait for PDF generation
      await adminPage.waitForTimeout(3000);
      
      // Verify PDF was generated (check for download or preview)
      await adminPage.waitForSelector('[data-testid="pdf-generated-message"]');

      workflowSteps.push({
        step: 'Generate PDF',
        duration: Date.now() - pdfStartTime,
        status: 'success',
        data: { invoiceId, pdfGenerated: true }
      });

      // Step 9: Mark Invoice as Paid
      const paymentStartTime = Date.now();
      await adminPage.click(`[data-testid="invoice-${invoiceId}"] [data-testid="mark-paid-button"]`);
      await adminPage.waitForSelector('[data-testid="payment-details-modal"]');
      await adminPage.fill('[data-testid="payment-amount-input"]', testInvoice.totalAmount.toString());
      await adminPage.fill('[data-testid="payment-date-input"]', format(new Date(), 'yyyy-MM-dd'));
      await adminPage.fill('[data-testid="payment-method-input"]', 'Bank Transfer');
      await adminPage.fill('[data-testid="payment-reference-input"]', 'TRX-' + Date.now());
      await adminPage.click('[data-testid="confirm-payment-button"]');
      await adminPage.waitForSelector('[data-testid="payment-recorded-message"]');

      // Verify invoice status changed to PAID
      const paidStatus = await adminPage.textContent(`[data-testid="invoice-${invoiceId}"] [data-testid="invoice-status"]`);
      expect(paidStatus).toBe('PAID');

      workflowSteps.push({
        step: 'Record Payment',
        duration: Date.now() - paymentStartTime,
        status: 'success',
        data: { invoiceId, status: 'PAID', amount: testInvoice.totalAmount }
      });

      // Step 10: Update Project Status to Completed
      const completeProjectStartTime = Date.now();
      await adminPage.goto('/projects');
      await adminPage.waitForLoadState('networkidle');

      await adminPage.click(`[data-testid="project-${projectId}"] [data-testid="edit-project-button"]`);
      await adminPage.waitForSelector('[data-testid="project-form"]');
      await adminPage.selectOption('[data-testid="project-status-select"]', 'COMPLETED');
      await adminPage.click('[data-testid="submit-project-button"]');
      await adminPage.waitForSelector('[data-testid="project-updated-message"]');

      // Verify project status changed to COMPLETED
      const projectStatus = await adminPage.textContent(`[data-testid="project-${projectId}"] [data-testid="project-status"]`);
      expect(projectStatus).toBe('COMPLETED');

      workflowSteps.push({
        step: 'Complete Project',
        duration: Date.now() - completeProjectStartTime,
        status: 'success',
        data: { projectId, status: 'COMPLETED' }
      });

      // Record complete workflow
      const totalDuration = Date.now() - workflowStartTime;
      
      workflowReport.workflows.push({
        name: 'Complete Business Workflow',
        startTime: workflowStartTime,
        endTime: Date.now(),
        totalDuration,
        steps: workflowSteps,
        status: 'success',
        entities: {
          clientId,
          projectId,
          quotationId,
          invoiceId
        }
      });

      // Verify complete workflow integrity
      expect(workflowSteps.every(step => step.status === 'success')).toBe(true);
      expect(totalDuration).toBeLessThan(120000); // Should complete within 2 minutes

    } catch (error) {
      workflowReport.errors.push({
        workflow: 'Complete Business Workflow',
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  });

  test('Quotation Revision Workflow', async () => {
    const workflowStartTime = Date.now();
    const workflowSteps: any[] = [];

    try {
      // Step 1: Create a quotation
      const quotationStartTime = Date.now();
      await adminPage.goto('/quotations');
      await adminPage.waitForLoadState('networkidle');

      await adminPage.click('[data-testid="create-quotation-button"]');
      await adminPage.waitForSelector('[data-testid="quotation-form"]');

      // Use existing client and project
      await adminPage.selectOption('[data-testid="quotation-client-select"]', 'client-1');
      await adminPage.selectOption('[data-testid="quotation-project-select"]', 'project-1');
      await adminPage.fill('[data-testid="quotation-amount-input"]', '50000000');
      await adminPage.fill('[data-testid="quotation-total-input"]', '50000000');
      await adminPage.fill('[data-testid="quotation-terms-input"]', 'Initial quotation terms');
      await adminPage.fill('[data-testid="quotation-valid-until-input"]', format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));

      await adminPage.click('[data-testid="submit-quotation-button"]');
      await adminPage.waitForSelector('[data-testid="quotation-success-message"]');

      const quotationId = await adminPage.getAttribute('[data-testid="created-quotation-id"]', 'data-quotation-id');
      
      workflowSteps.push({
        step: 'Create Initial Quotation',
        duration: Date.now() - quotationStartTime,
        status: 'success',
        data: { quotationId, amount: 50000000 }
      });

      // Step 2: Send quotation
      const sendStartTime = Date.now();
      await adminPage.click(`[data-testid="quotation-${quotationId}"] [data-testid="send-quotation-button"]`);
      await adminPage.waitForSelector('[data-testid="confirm-send-modal"]');
      await adminPage.click('[data-testid="confirm-send-button"]');
      await adminPage.waitForSelector('[data-testid="quotation-sent-message"]');

      workflowSteps.push({
        step: 'Send Quotation',
        duration: Date.now() - sendStartTime,
        status: 'success',
        data: { quotationId, status: 'SENT' }
      });

      // Step 3: Client declines quotation
      const declineStartTime = Date.now();
      await adminPage.click(`[data-testid="quotation-${quotationId}"] [data-testid="decline-quotation-button"]`);
      await adminPage.waitForSelector('[data-testid="decline-quotation-modal"]');
      await adminPage.fill('[data-testid="decline-reason-input"]', 'Price too high, please revise');
      await adminPage.click('[data-testid="confirm-decline-button"]');
      await adminPage.waitForSelector('[data-testid="quotation-declined-message"]');

      // Verify quotation status changed to DECLINED
      const declinedStatus = await adminPage.textContent(`[data-testid="quotation-${quotationId}"] [data-testid="quotation-status"]`);
      expect(declinedStatus).toBe('DECLINED');

      workflowSteps.push({
        step: 'Decline Quotation',
        duration: Date.now() - declineStartTime,
        status: 'success',
        data: { quotationId, status: 'DECLINED', reason: 'Price too high, please revise' }
      });

      // Step 4: Create revised quotation
      const revisionStartTime = Date.now();
      await adminPage.click(`[data-testid="quotation-${quotationId}"] [data-testid="create-revision-button"]`);
      await adminPage.waitForSelector('[data-testid="quotation-form"]');

      // Update with revised terms
      await adminPage.fill('[data-testid="quotation-amount-input"]', '45000000');
      await adminPage.fill('[data-testid="quotation-total-input"]', '45000000');
      await adminPage.fill('[data-testid="quotation-terms-input"]', 'Revised quotation with reduced price');
      await adminPage.fill('[data-testid="revision-notes-input"]', 'Reduced price by 10% as requested');

      await adminPage.click('[data-testid="submit-quotation-button"]');
      await adminPage.waitForSelector('[data-testid="quotation-success-message"]');

      const revisedQuotationId = await adminPage.getAttribute('[data-testid="created-quotation-id"]', 'data-quotation-id');
      
      workflowSteps.push({
        step: 'Create Revised Quotation',
        duration: Date.now() - revisionStartTime,
        status: 'success',
        data: { 
          originalQuotationId: quotationId,
          revisedQuotationId, 
          newAmount: 45000000,
          reduction: 5000000 
        }
      });

      // Step 5: Send revised quotation
      const sendRevisedStartTime = Date.now();
      await adminPage.click(`[data-testid="quotation-${revisedQuotationId}"] [data-testid="send-quotation-button"]`);
      await adminPage.waitForSelector('[data-testid="confirm-send-modal"]');
      await adminPage.click('[data-testid="confirm-send-button"]');
      await adminPage.waitForSelector('[data-testid="quotation-sent-message"]');

      workflowSteps.push({
        step: 'Send Revised Quotation',
        duration: Date.now() - sendRevisedStartTime,
        status: 'success',
        data: { quotationId: revisedQuotationId, status: 'SENT' }
      });

      // Step 6: Client approves revised quotation
      const approveRevisedStartTime = Date.now();
      await adminPage.click(`[data-testid="quotation-${revisedQuotationId}"] [data-testid="approve-quotation-button"]`);
      await adminPage.waitForSelector('[data-testid="approve-quotation-modal"]');
      await adminPage.fill('[data-testid="approval-notes-input"]', 'Revised quotation approved. Proceed with project.');
      await adminPage.click('[data-testid="confirm-approve-button"]');
      await adminPage.waitForSelector('[data-testid="quotation-approved-message"]');

      // Verify quotation status changed to APPROVED
      const approvedStatus = await adminPage.textContent(`[data-testid="quotation-${revisedQuotationId}"] [data-testid="quotation-status"]`);
      expect(approvedStatus).toBe('APPROVED');

      workflowSteps.push({
        step: 'Approve Revised Quotation',
        duration: Date.now() - approveRevisedStartTime,
        status: 'success',
        data: { quotationId: revisedQuotationId, status: 'APPROVED' }
      });

      // Record complete workflow
      const totalDuration = Date.now() - workflowStartTime;
      
      workflowReport.workflows.push({
        name: 'Quotation Revision Workflow',
        startTime: workflowStartTime,
        endTime: Date.now(),
        totalDuration,
        steps: workflowSteps,
        status: 'success',
        entities: {
          originalQuotationId: quotationId,
          revisedQuotationId,
          priceReduction: 5000000
        }
      });

      // Verify workflow integrity
      expect(workflowSteps.every(step => step.status === 'success')).toBe(true);
      expect(totalDuration).toBeLessThan(90000); // Should complete within 1.5 minutes

    } catch (error) {
      workflowReport.errors.push({
        workflow: 'Quotation Revision Workflow',
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  });

  test('Indonesian Materai Compliance Workflow', async () => {
    const workflowStartTime = Date.now();
    const workflowSteps: any[] = [];

    try {
      // Test scenarios with different amounts
      const testScenarios = [
        { amount: 3000000, materaiRequired: false, description: 'Amount under 5M IDR' },
        { amount: 5000000, materaiRequired: true, description: 'Amount exactly 5M IDR' },
        { amount: 10000000, materaiRequired: true, description: 'Amount over 5M IDR' }
      ];

      for (const scenario of testScenarios) {
        const scenarioStartTime = Date.now();
        
        // Create invoice with specific amount
        await adminPage.goto('/invoices');
        await adminPage.waitForLoadState('networkidle');

        await adminPage.click('[data-testid="create-invoice-button"]');
        await adminPage.waitForSelector('[data-testid="invoice-form"]');

        await adminPage.selectOption('[data-testid="invoice-client-select"]', 'client-1');
        await adminPage.selectOption('[data-testid="invoice-project-select"]', 'project-1');
        await adminPage.fill('[data-testid="invoice-amount-input"]', scenario.amount.toString());
        await adminPage.fill('[data-testid="invoice-total-input"]', scenario.amount.toString());
        await adminPage.fill('[data-testid="invoice-payment-info-input"]', 'Bank BCA: 1234567890');
        await adminPage.fill('[data-testid="invoice-terms-input"]', 'Payment terms');
        await adminPage.fill('[data-testid="invoice-due-date-input"]', format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));

        await adminPage.click('[data-testid="submit-invoice-button"]');
        await adminPage.waitForSelector('[data-testid="invoice-success-message"]');

        const invoiceId = await adminPage.getAttribute('[data-testid="created-invoice-id"]', 'data-invoice-id');
        
        // Check materai requirement
        const materaiStatus = await adminPage.textContent(`[data-testid="invoice-${invoiceId}"] [data-testid="materai-required"]`);
        const expectedMateraiStatus = scenario.materaiRequired ? 'Ya' : 'Tidak';
        expect(materaiStatus).toBe(expectedMateraiStatus);

        if (scenario.materaiRequired) {
          // Test materai application
          await adminPage.click(`[data-testid="invoice-${invoiceId}"] [data-testid="apply-materai-button"]`);
          await adminPage.waitForSelector('[data-testid="materai-confirmation-modal"]');
          await adminPage.fill('[data-testid="materai-number-input"]', 'MATERAI-' + Date.now());
          await adminPage.fill('[data-testid="materai-date-input"]', format(new Date(), 'yyyy-MM-dd'));
          await adminPage.click('[data-testid="confirm-materai-button"]');
          await adminPage.waitForSelector('[data-testid="materai-applied-message"]');

          // Verify materai was applied
          const materaiApplied = await adminPage.textContent(`[data-testid="invoice-${invoiceId}"] [data-testid="materai-applied"]`);
          expect(materaiApplied).toBe('Ya');
        }

        workflowSteps.push({
          step: `Test ${scenario.description}`,
          duration: Date.now() - scenarioStartTime,
          status: 'success',
          data: {
            invoiceId,
            amount: scenario.amount,
            materaiRequired: scenario.materaiRequired,
            materaiApplied: scenario.materaiRequired
          }
        });
      }

      // Record complete workflow
      const totalDuration = Date.now() - workflowStartTime;
      
      workflowReport.workflows.push({
        name: 'Indonesian Materai Compliance Workflow',
        startTime: workflowStartTime,
        endTime: Date.now(),
        totalDuration,
        steps: workflowSteps,
        status: 'success',
        compliance: {
          materiCompliance: 'PASSED',
          idFormatting: 'PASSED',
          legalRequirements: 'PASSED'
        }
      });

      // Verify workflow integrity
      expect(workflowSteps.every(step => step.status === 'success')).toBe(true);

    } catch (error) {
      workflowReport.errors.push({
        workflow: 'Indonesian Materai Compliance Workflow',
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  });

  test('Multi-User Collaboration Workflow', async () => {
    const workflowStartTime = Date.now();
    const workflowSteps: any[] = [];

    try {
      // Admin creates a project
      const adminStartTime = Date.now();
      await adminPage.goto('/projects');
      await adminPage.waitForLoadState('networkidle');

      await adminPage.click('[data-testid="create-project-button"]');
      await adminPage.waitForSelector('[data-testid="project-form"]');

      const projectNumber = `COLLAB-${Date.now()}`;
      await adminPage.fill('[data-testid="project-number-input"]', projectNumber);
      await adminPage.fill('[data-testid="project-description-input"]', 'Multi-user collaboration test project');
      await adminPage.fill('[data-testid="project-output-input"]', 'Collaboration deliverables');
      await adminPage.selectOption('[data-testid="project-type-select"]', 'PRODUCTION');
      await adminPage.selectOption('[data-testid="project-client-select"]', 'client-1');
      await adminPage.fill('[data-testid="project-budget-input"]', '60000000');
      await adminPage.selectOption('[data-testid="project-status-select"]', 'PLANNING');

      await adminPage.click('[data-testid="submit-project-button"]');
      await adminPage.waitForSelector('[data-testid="project-success-message"]');

      const projectId = await adminPage.getAttribute('[data-testid="created-project-id"]', 'data-project-id');
      
      workflowSteps.push({
        step: 'Admin Creates Project',
        duration: Date.now() - adminStartTime,
        status: 'success',
        user: 'admin',
        data: { projectId, projectNumber }
      });

      // User views the project
      const userViewStartTime = Date.now();
      await userPage.goto('/projects');
      await userPage.waitForLoadState('networkidle');

      await userPage.click(`[data-testid="project-${projectId}"] [data-testid="view-project-button"]`);
      await userPage.waitForSelector('[data-testid="project-detail"]');

      // Verify user can see the project
      const viewedProjectNumber = await userPage.textContent('[data-testid="project-number"]');
      expect(viewedProjectNumber).toBe(projectNumber);

      workflowSteps.push({
        step: 'User Views Project',
        duration: Date.now() - userViewStartTime,
        status: 'success',
        user: 'user',
        data: { projectId, viewedProjectNumber }
      });

      // Admin assigns user to project
      const assignStartTime = Date.now();
      await adminPage.click(`[data-testid="project-${projectId}"] [data-testid="assign-user-button"]`);
      await adminPage.waitForSelector('[data-testid="assign-user-modal"]');
      await adminPage.selectOption('[data-testid="user-select"]', 'user@bisnis.co.id');
      await adminPage.selectOption('[data-testid="role-select"]', 'CONTRIBUTOR');
      await adminPage.click('[data-testid="confirm-assign-button"]');
      await adminPage.waitForSelector('[data-testid="user-assigned-message"]');

      workflowSteps.push({
        step: 'Admin Assigns User',
        duration: Date.now() - assignStartTime,
        status: 'success',
        user: 'admin',
        data: { projectId, assignedUser: 'user@bisnis.co.id', role: 'CONTRIBUTOR' }
      });

      // User updates project status
      const updateStartTime = Date.now();
      await userPage.goto(`/projects/${projectId}`);
      await userPage.waitForLoadState('networkidle');
      await userPage.click('[data-testid="update-status-button"]');
      await userPage.waitForSelector('[data-testid="status-update-modal"]');
      await userPage.selectOption('[data-testid="new-status-select"]', 'IN_PROGRESS');
      await userPage.fill('[data-testid="update-notes-input"]', 'Starting project development');
      await userPage.click('[data-testid="confirm-update-button"]');
      await userPage.waitForSelector('[data-testid="status-updated-message"]');

      workflowSteps.push({
        step: 'User Updates Project Status',
        duration: Date.now() - updateStartTime,
        status: 'success',
        user: 'user',
        data: { projectId, newStatus: 'IN_PROGRESS', notes: 'Starting project development' }
      });

      // Admin reviews and approves status change
      const reviewStartTime = Date.now();
      await adminPage.goto('/projects');
      await adminPage.waitForLoadState('networkidle');
      
      // Check notification for status change
      await adminPage.click('[data-testid="notifications-button"]');
      await adminPage.waitForSelector('[data-testid="notifications-panel"]');
      await adminPage.click('[data-testid="status-change-notification"]');
      await adminPage.waitForSelector('[data-testid="review-modal"]');
      await adminPage.click('[data-testid="approve-change-button"]');
      await adminPage.waitForSelector('[data-testid="change-approved-message"]');

      workflowSteps.push({
        step: 'Admin Reviews and Approves',
        duration: Date.now() - reviewStartTime,
        status: 'success',
        user: 'admin',
        data: { projectId, approved: true }
      });

      // Record complete workflow
      const totalDuration = Date.now() - workflowStartTime;
      
      workflowReport.workflows.push({
        name: 'Multi-User Collaboration Workflow',
        startTime: workflowStartTime,
        endTime: Date.now(),
        totalDuration,
        steps: workflowSteps,
        status: 'success',
        collaboration: {
          usersInvolved: ['admin', 'user'],
          actionsPerformed: workflowSteps.length,
          communicationEffective: true
        }
      });

      // Verify workflow integrity
      expect(workflowSteps.every(step => step.status === 'success')).toBe(true);

    } catch (error) {
      workflowReport.errors.push({
        workflow: 'Multi-User Collaboration Workflow',
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  });

  test('Reports and Analytics Workflow', async () => {
    const workflowStartTime = Date.now();
    const workflowSteps: any[] = [];

    try {
      // Step 1: Navigate to Reports page
      const reportsStartTime = Date.now();
      await adminPage.goto('/reports');
      await adminPage.waitForLoadState('networkidle');

      // Wait for reports page to load
      await adminPage.waitForSelector('[data-testid="reports-container"]', { timeout: 10000 });
      
      // Verify page title
      const pageTitle = await adminPage.textContent('[data-testid="reports-title"]');
      expect(pageTitle?.trim()).toBe('Laporan');

      workflowSteps.push({
        step: 'Navigate to Reports Page',
        duration: Date.now() - reportsStartTime,
        status: 'success',
        data: { pageTitle }
      });

      // Step 2: Test Revenue Analytics Card
      const revenueStartTime = Date.now();
      await adminPage.waitForSelector('[data-testid="revenue-card"]', { timeout: 10000 });
      
      const totalRevenue = await adminPage.textContent('[data-testid="total-revenue"]');
      const avgRevenue = await adminPage.textContent('[data-testid="avg-revenue"]');
      
      expect(totalRevenue).toBeDefined();
      expect(avgRevenue).toBeDefined();

      workflowSteps.push({
        step: 'Verify Revenue Analytics',
        duration: Date.now() - revenueStartTime,
        status: 'success',
        data: { totalRevenue, avgRevenue }
      });

      // Step 3: Test Client Analytics
      const clientAnalyticsStartTime = Date.now();
      await adminPage.waitForSelector('[data-testid="client-analytics-table"]', { timeout: 10000 });
      
      const topClientsRows = await adminPage.$$('[data-testid="client-row"]');
      expect(topClientsRows.length).toBeGreaterThan(0);

      workflowSteps.push({
        step: 'Verify Client Analytics',
        duration: Date.now() - clientAnalyticsStartTime,
        status: 'success',
        data: { clientCount: topClientsRows.length }
      });

      // Step 4: Test Project Analytics
      const projectAnalyticsStartTime = Date.now();
      await adminPage.waitForSelector('[data-testid="project-analytics-table"]', { timeout: 10000 });
      
      const topProjectsRows = await adminPage.$$('[data-testid="project-row"]');
      expect(topProjectsRows.length).toBeGreaterThan(0);

      workflowSteps.push({
        step: 'Verify Project Analytics',
        duration: Date.now() - projectAnalyticsStartTime,
        status: 'success',
        data: { projectCount: topProjectsRows.length }
      });

      // Step 5: Test Export Functionality
      const exportStartTime = Date.now();
      await adminPage.click('[data-testid="export-pdf-button"]');
      await adminPage.waitForSelector('[data-testid="export-success-message"]', { timeout: 15000 });

      await adminPage.click('[data-testid="export-excel-button"]');
      await adminPage.waitForSelector('[data-testid="export-success-message"]', { timeout: 15000 });

      workflowSteps.push({
        step: 'Test Export Functionality',
        duration: Date.now() - exportStartTime,
        status: 'success',
        data: { pdfExported: true, excelExported: true }
      });

      // Record complete workflow
      const totalDuration = Date.now() - workflowStartTime;
      
      workflowReport.workflows.push({
        name: 'Reports and Analytics Workflow',
        startTime: workflowStartTime,
        endTime: Date.now(),
        totalDuration,
        steps: workflowSteps,
        status: 'success',
        features: {
          revenueAnalytics: 'PASSED',
          clientAnalytics: 'PASSED',
          projectAnalytics: 'PASSED',
          exportFunctionality: 'PASSED'
        }
      });

      // Verify workflow integrity
      expect(workflowSteps.every(step => step.status === 'success')).toBe(true);
      expect(totalDuration).toBeLessThan(60000); // Should complete within 1 minute

    } catch (error) {
      workflowReport.errors.push({
        workflow: 'Reports and Analytics Workflow',
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  });

  test('Settings Configuration Workflow', async () => {
    const workflowStartTime = Date.now();
    const workflowSteps: any[] = [];

    try {
      // Step 1: Navigate to Settings page
      const settingsStartTime = Date.now();
      await adminPage.goto('/settings');
      await adminPage.waitForLoadState('networkidle');

      // Wait for settings page to load
      await adminPage.waitForSelector('[data-testid="settings-container"]', { timeout: 10000 });
      
      // Verify page title
      const pageTitle = await adminPage.textContent('[data-testid="settings-title"]');
      expect(pageTitle?.trim()).toBe('Pengaturan');

      workflowSteps.push({
        step: 'Navigate to Settings Page',
        duration: Date.now() - settingsStartTime,
        status: 'success',
        data: { pageTitle }
      });

      // Step 2: Test Profile Tab
      const profileStartTime = Date.now();
      await adminPage.click('[data-testid="profile-tab"]');
      await adminPage.waitForSelector('[data-testid="profile-form"]', { timeout: 10000 });

      // Update profile information
      await adminPage.fill('[data-testid="name-input"]', 'Test Admin Updated');
      await adminPage.fill('[data-testid="email-input"]', 'admin.updated@bisnis.co.id');
      await adminPage.selectOption('[data-testid="timezone-select"]', 'Asia/Jakarta');
      await adminPage.selectOption('[data-testid="language-select"]', 'id');

      await adminPage.click('[data-testid="save-profile-button"]');
      await adminPage.waitForSelector('[data-testid="profile-success-message"]', { timeout: 10000 });

      workflowSteps.push({
        step: 'Update Profile Settings',
        duration: Date.now() - profileStartTime,
        status: 'success',
        data: { profileUpdated: true }
      });

      // Step 3: Test Security Tab
      const securityStartTime = Date.now();
      await adminPage.click('[data-testid="security-tab"]');
      await adminPage.waitForSelector('[data-testid="security-form"]', { timeout: 10000 });

      // Test notification preferences
      await adminPage.check('[data-testid="email-notifications-checkbox"]');
      await adminPage.check('[data-testid="push-notifications-checkbox"]');

      await adminPage.click('[data-testid="save-security-button"]');
      await adminPage.waitForSelector('[data-testid="security-success-message"]', { timeout: 10000 });

      workflowSteps.push({
        step: 'Update Security Settings',
        duration: Date.now() - securityStartTime,
        status: 'success',
        data: { securityUpdated: true }
      });

      // Step 4: Test Company Tab
      const companyStartTime = Date.now();
      await adminPage.click('[data-testid="company-tab"]');
      await adminPage.waitForSelector('[data-testid="company-form"]', { timeout: 10000 });

      // Update company information
      await adminPage.fill('[data-testid="company-name-input"]', 'PT Business Test Updated');
      await adminPage.fill('[data-testid="company-address-input"]', 'Jl. Test Updated No. 123, Jakarta');
      await adminPage.fill('[data-testid="company-phone-input"]', '021-1234567');
      await adminPage.fill('[data-testid="company-email-input"]', 'info@businesstest.co.id');

      await adminPage.click('[data-testid="save-company-button"]');
      await adminPage.waitForSelector('[data-testid="company-success-message"]', { timeout: 10000 });

      workflowSteps.push({
        step: 'Update Company Settings',
        duration: Date.now() - companyStartTime,
        status: 'success',
        data: { companyUpdated: true }
      });

      // Step 5: Test System Tab
      const systemStartTime = Date.now();
      await adminPage.click('[data-testid="system-tab"]');
      await adminPage.waitForSelector('[data-testid="system-form"]', { timeout: 10000 });

      // Update system settings
      await adminPage.selectOption('[data-testid="payment-terms-select"]', 'NET 30');
      await adminPage.fill('[data-testid="materai-threshold-input"]', '5000000');
      await adminPage.fill('[data-testid="invoice-prefix-input"]', 'INV-TEST-');
      await adminPage.fill('[data-testid="quotation-prefix-input"]', 'QT-TEST-');

      await adminPage.click('[data-testid="save-system-button"]');
      await adminPage.waitForSelector('[data-testid="system-success-message"]', { timeout: 10000 });

      workflowSteps.push({
        step: 'Update System Settings',
        duration: Date.now() - systemStartTime,
        status: 'success',
        data: { systemUpdated: true }
      });

      // Step 6: Test Reset to Default
      const resetStartTime = Date.now();
      await adminPage.click('[data-testid="reset-settings-button"]');
      await adminPage.waitForSelector('[data-testid="confirm-reset-modal"]', { timeout: 10000 });
      await adminPage.click('[data-testid="confirm-reset-button"]');
      await adminPage.waitForSelector('[data-testid="reset-success-message"]', { timeout: 10000 });

      workflowSteps.push({
        step: 'Reset to Default Settings',
        duration: Date.now() - resetStartTime,
        status: 'success',
        data: { settingsReset: true }
      });

      // Record complete workflow
      const totalDuration = Date.now() - workflowStartTime;
      
      workflowReport.workflows.push({
        name: 'Settings Configuration Workflow',
        startTime: workflowStartTime,
        endTime: Date.now(),
        totalDuration,
        steps: workflowSteps,
        status: 'success',
        features: {
          profileSettings: 'PASSED',
          securitySettings: 'PASSED',
          companySettings: 'PASSED',
          systemSettings: 'PASSED',
          resetFunctionality: 'PASSED'
        }
      });

      // Verify workflow integrity
      expect(workflowSteps.every(step => step.status === 'success')).toBe(true);
      expect(totalDuration).toBeLessThan(120000); // Should complete within 2 minutes

    } catch (error) {
      workflowReport.errors.push({
        workflow: 'Settings Configuration Workflow',
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  });

  test('Dashboard Navigation and Data Loading Workflow', async () => {
    const workflowStartTime = Date.now();
    const workflowSteps: any[] = [];

    try {
      // Step 1: Navigate to Dashboard
      const dashboardStartTime = Date.now();
      await adminPage.goto('/dashboard');
      await adminPage.waitForLoadState('networkidle');

      // Wait for dashboard to fully load
      await adminPage.waitForSelector('[data-testid="dashboard-container"]', { timeout: 10000 });

      workflowSteps.push({
        step: 'Navigate to Dashboard',
        duration: Date.now() - dashboardStartTime,
        status: 'success',
        data: { dashboardLoaded: true }
      });

      // Step 2: Verify Statistics Cards
      const statsStartTime = Date.now();
      await adminPage.waitForSelector('[data-testid="quotations-card"]', { timeout: 10000 });
      await adminPage.waitForSelector('[data-testid="invoices-card"]', { timeout: 10000 });
      await adminPage.waitForSelector('[data-testid="clients-card"]', { timeout: 10000 });
      await adminPage.waitForSelector('[data-testid="projects-card"]', { timeout: 10000 });

      // Get stats values
      const quotationsTotal = await adminPage.textContent('[data-testid="quotations-total"]');
      const invoicesTotal = await adminPage.textContent('[data-testid="invoices-total"]');
      const clientsTotal = await adminPage.textContent('[data-testid="clients-total"]');
      const projectsTotal = await adminPage.textContent('[data-testid="projects-total"]');

      workflowSteps.push({
        step: 'Verify Statistics Cards',
        duration: Date.now() - statsStartTime,
        status: 'success',
        data: { 
          quotationsTotal, 
          invoicesTotal, 
          clientsTotal, 
          projectsTotal 
        }
      });

      // Step 3: Test Navigation to Reports
      const reportsNavStartTime = Date.now();
      await adminPage.click('[data-testid="nav-reports"]');
      await adminPage.waitForURL('/reports');
      await adminPage.waitForLoadState('networkidle');

      workflowSteps.push({
        step: 'Navigate to Reports from Dashboard',
        duration: Date.now() - reportsNavStartTime,
        status: 'success',
        data: { navigatedToReports: true }
      });

      // Step 4: Test Navigation to Settings
      const settingsNavStartTime = Date.now();
      await adminPage.click('[data-testid="nav-settings"]');
      await adminPage.waitForURL('/settings');
      await adminPage.waitForLoadState('networkidle');

      workflowSteps.push({
        step: 'Navigate to Settings from Reports',
        duration: Date.now() - settingsNavStartTime,
        status: 'success',
        data: { navigatedToSettings: true }
      });

      // Step 5: Navigate back to Dashboard
      const backToDashboardStartTime = Date.now();
      await adminPage.click('[data-testid="nav-dashboard"]');
      await adminPage.waitForURL('/dashboard');
      await adminPage.waitForLoadState('networkidle');

      workflowSteps.push({
        step: 'Navigate back to Dashboard',
        duration: Date.now() - backToDashboardStartTime,
        status: 'success',
        data: { backToDashboard: true }
      });

      // Record complete workflow
      const totalDuration = Date.now() - workflowStartTime;
      
      workflowReport.workflows.push({
        name: 'Dashboard Navigation and Data Loading Workflow',
        startTime: workflowStartTime,
        endTime: Date.now(),
        totalDuration,
        steps: workflowSteps,
        status: 'success',
        navigation: {
          dashboardLoading: 'PASSED',
          statisticsDisplay: 'PASSED',
          navigationFlow: 'PASSED'
        }
      });

      // Verify workflow integrity
      expect(workflowSteps.every(step => step.status === 'success')).toBe(true);
      expect(totalDuration).toBeLessThan(45000); // Should complete within 45 seconds

    } catch (error) {
      workflowReport.errors.push({
        workflow: 'Dashboard Navigation and Data Loading Workflow',
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  });
});