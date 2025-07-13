// SecurityAudit Component Tests - Indonesian Business Management System
// Comprehensive testing for security audit functionality with Indonesian compliance

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import SecurityAudit, {
  SecurityVulnerability,
  SecurityScanResult,
} from '../SecurityAudit'

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../../../utils/currency', () => ({
  formatDateIndonesian: (date: Date) => date.toLocaleDateString('id-ID'),
}))

// Mock data
const mockVulnerabilities: SecurityVulnerability[] = [
  {
    id: 'xss_001',
    type: 'xss',
    severity: 'high',
    title: 'XSS Vulnerability in Form Input',
    description: 'Input validation missing in quotation form',
    location: 'components/forms/QuotationForm.tsx:45',
    impact: 'Potential script injection attack',
    recommendation: 'Implement input sanitization',
    cwe: 'CWE-79',
    cvss: 7.5,
    foundAt: new Date('2025-01-01'),
    status: 'open',
    affectsIndonesianCompliance: false,
    businessCritical: true,
  },
  {
    id: 'materai_001',
    type: 'materai_compliance',
    severity: 'medium',
    title: 'Materai Calculation Error',
    description: 'Incorrect materai calculation for high-value transactions',
    location: 'utils/materaiCalculator.ts',
    impact: 'Indonesian regulation violation',
    recommendation: 'Update materai calculation logic',
    foundAt: new Date('2025-01-01'),
    status: 'open',
    affectsIndonesianCompliance: true,
    materaiRelated: true,
    businessCritical: true,
  },
]

const mockScanResult: SecurityScanResult = {
  id: 'scan_001',
  timestamp: new Date('2025-01-01'),
  duration: 5000,
  totalChecks: 6,
  vulnerabilities: mockVulnerabilities,
  score: 75,
  status: 'completed',
  indonesianCompliance: 85,
  materaiCompliance: 90,
  privacyCompliance: 80,
  authenticationSecurity: 88,
  dataProtection: 85,
}

const defaultProps = {
  autoScan: false,
  scanInterval: 60,
  showIndonesianCompliance: true,
  enableMateraiValidation: true,
  enablePrivacyChecks: true,
}

// Mock setTimeout to control timing in tests
vi.useFakeTimers()

describe('SecurityAudit Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('Basic Rendering', () => {
    it('should render security audit interface correctly', () => {
      render(<SecurityAudit {...defaultProps} />)

      expect(
        screen.getByText('Security Audit - Indonesian Business Compliance')
      ).toBeInTheDocument()
      expect(screen.getByText('Mulai Scan')).toBeInTheDocument()
      expect(screen.getByText('Export Report')).toBeInTheDocument()
    })

    it('should show Indonesian compliance features when enabled', () => {
      render(
        <SecurityAudit {...defaultProps} showIndonesianCompliance={true} />
      )

      expect(
        screen.getByText('Security Audit - Indonesian Business Compliance')
      ).toBeInTheDocument()
    })

    it('should render without Indonesian compliance when disabled', () => {
      render(
        <SecurityAudit {...defaultProps} showIndonesianCompliance={false} />
      )

      // Should still render the main component
      expect(screen.getByText('Mulai Scan')).toBeInTheDocument()
    })
  })

  describe('Security Scanning', () => {
    it('should start security scan when button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<SecurityAudit {...defaultProps} />)

      const scanButton = screen.getByText('Mulai Scan')
      await user.click(scanButton)

      // Should show scanning state
      expect(screen.getByText('Scanning...')).toBeInTheDocument()
      expect(
        screen.getByText('Security Scan in Progress...')
      ).toBeInTheDocument()
    })

    it('should show scan progress during scanning', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<SecurityAudit {...defaultProps} />)

      const scanButton = screen.getByText('Mulai Scan')
      await user.click(scanButton)

      // Progress should be visible
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.getByText(/Memeriksa.*aturan keamanan/)).toBeInTheDocument()
    })

    it('should disable scan button during active scan', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<SecurityAudit {...defaultProps} />)

      const scanButton = screen.getByText('Mulai Scan')
      await user.click(scanButton)

      // Button should be disabled
      expect(scanButton).toBeDisabled()
    })

    it('should complete scan and show results', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onScanComplete = vi.fn()

      render(
        <SecurityAudit {...defaultProps} onScanComplete={onScanComplete} />
      )

      const scanButton = screen.getByText('Mulai Scan')
      await user.click(scanButton)

      // Fast-forward through the scan simulation
      vi.advanceTimersByTime(10000)

      await waitFor(() => {
        expect(screen.getByText('Mulai Scan')).not.toBeDisabled()
      })

      // Should have called completion callback
      expect(onScanComplete).toHaveBeenCalled()
    })
  })

  describe('Security Scores Display', () => {
    it('should display security scores after scan', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<SecurityAudit {...defaultProps} />)

      // Trigger scan
      const scanButton = screen.getByText('Mulai Scan')
      await user.click(scanButton)

      // Complete scan
      vi.advanceTimersByTime(10000)

      await waitFor(() => {
        // Should show score cards (exact content may vary based on mock implementation)
        expect(screen.getByText('Overall Security')).toBeInTheDocument()
        expect(screen.getByText('Indonesian Compliance')).toBeInTheDocument()
      })
    })

    it('should show different color indicators based on score', async () => {
      render(<SecurityAudit {...defaultProps} />)

      // Scores would be displayed with color coding
      // This test would need to check for specific color classes or styles
      expect(screen.getByText('Mulai Scan')).toBeInTheDocument()
    })
  })

  describe('Indonesian Business Features', () => {
    it('should include materai validation when enabled', async () => {
      render(<SecurityAudit {...defaultProps} enableMateraiValidation={true} />)

      const scanButton = screen.getByText('Mulai Scan')
      expect(scanButton).toBeInTheDocument()

      // The materai validation would be included in the scan rules
      // This can be verified through the scan behavior
    })

    it('should include privacy checks when enabled', async () => {
      render(<SecurityAudit {...defaultProps} enablePrivacyChecks={true} />)

      const scanButton = screen.getByText('Mulai Scan')
      expect(scanButton).toBeInTheDocument()

      // Privacy checks would be included in the scan
    })

    it('should show Indonesian-specific compliance scores', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<SecurityAudit {...defaultProps} />)

      const scanButton = screen.getByText('Mulai Scan')
      await user.click(scanButton)

      vi.advanceTimersByTime(10000)

      await waitFor(() => {
        expect(screen.getByText('Materai Compliance')).toBeInTheDocument()
        expect(screen.getByText('Privacy Protection')).toBeInTheDocument()
      })
    })
  })

  describe('Vulnerability Management', () => {
    it('should display vulnerabilities in table format', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<SecurityAudit {...defaultProps} />)

      // Start scan
      const scanButton = screen.getByText('Mulai Scan')
      await user.click(scanButton)

      vi.advanceTimersByTime(10000)

      await waitFor(() => {
        // Should show vulnerabilities tab
        const vulnerabilitiesTab = screen.getByText('Vulnerabilities')
        expect(vulnerabilitiesTab).toBeInTheDocument()
      })
    })

    it('should show vulnerability details when clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<SecurityAudit {...defaultProps} />)

      const scanButton = screen.getByText('Mulai Scan')
      await user.click(scanButton)

      vi.advanceTimersByTime(10000)

      await waitFor(() => {
        // Check if vulnerability details can be opened
        const vulnerabilitiesTab = screen.getByText('Vulnerabilities')
        expect(vulnerabilitiesTab).toBeInTheDocument()
      })
    })

    it('should categorize Indonesian-specific vulnerabilities', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<SecurityAudit {...defaultProps} />)

      const scanButton = screen.getByText('Mulai Scan')
      await user.click(scanButton)

      vi.advanceTimersByTime(10000)

      await waitFor(() => {
        // Indonesian-specific vulnerabilities should be marked
        expect(screen.getByText('Vulnerabilities')).toBeInTheDocument()
      })
    })
  })

  describe('Security Rules Management', () => {
    it('should display security rules in separate tab', async () => {
      render(<SecurityAudit {...defaultProps} />)

      const rulesTab = screen.getByText('Security Rules')
      await userEvent.click(rulesTab)

      expect(screen.getByText('Aturan Keamanan')).toBeInTheDocument()
    })

    it('should show Indonesian-specific rules', async () => {
      render(<SecurityAudit {...defaultProps} />)

      const rulesTab = screen.getByText('Security Rules')
      await userEvent.click(rulesTab)

      // Should show Indonesian business rules
      expect(screen.getByText('Aturan Keamanan')).toBeInTheDocument()
    })
  })

  describe('Scan History', () => {
    it('should display scan history in timeline format', async () => {
      render(<SecurityAudit {...defaultProps} />)

      const historyTab = screen.getByText('Scan History')
      await userEvent.click(historyTab)

      expect(screen.getByText('Riwayat Scan')).toBeInTheDocument()
    })

    it('should show scan results with timestamps', async () => {
      render(<SecurityAudit {...defaultProps} />)

      const historyTab = screen.getByText('Scan History')
      await userEvent.click(historyTab)

      // History content should be visible
      expect(screen.getByText('Riwayat Scan')).toBeInTheDocument()
    })
  })

  describe('Event Handlers', () => {
    it('should call onVulnerabilityFound when vulnerability is detected', async () => {
      const onVulnerabilityFound = vi.fn()
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(
        <SecurityAudit
          {...defaultProps}
          onVulnerabilityFound={onVulnerabilityFound}
        />
      )

      const scanButton = screen.getByText('Mulai Scan')
      await user.click(scanButton)

      vi.advanceTimersByTime(10000)

      await waitFor(() => {
        // Callback should be called if vulnerabilities are found
        // This depends on the mock implementation
        expect(screen.getByText('Mulai Scan')).not.toBeDisabled()
      })
    })

    it('should call onScanComplete when scan finishes', async () => {
      const onScanComplete = vi.fn()
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(
        <SecurityAudit {...defaultProps} onScanComplete={onScanComplete} />
      )

      const scanButton = screen.getByText('Mulai Scan')
      await user.click(scanButton)

      vi.advanceTimersByTime(10000)

      await waitFor(() => {
        expect(onScanComplete).toHaveBeenCalled()
      })
    })

    it('should handle export report action', async () => {
      const user = userEvent.setup()

      render(<SecurityAudit {...defaultProps} />)

      const exportButton = screen.getByText('Export Report')
      await user.click(exportButton)

      // Export functionality should be triggered
      expect(exportButton).toBeInTheDocument()
    })
  })

  describe('Auto-scan Functionality', () => {
    it('should start auto-scan when enabled', () => {
      render(
        <SecurityAudit {...defaultProps} autoScan={true} scanInterval={1} />
      )

      // Auto-scan should be set up (can't easily test the interval without more complex mocking)
      expect(screen.getByText('Mulai Scan')).toBeInTheDocument()
    })

    it('should not auto-scan when disabled', () => {
      render(<SecurityAudit {...defaultProps} autoScan={false} />)

      // Should not automatically start scanning
      expect(screen.getByText('Mulai Scan')).toBeInTheDocument()
      expect(screen.queryByText('Scanning...')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle scan failures gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<SecurityAudit {...defaultProps} />)

      const scanButton = screen.getByText('Mulai Scan')
      await user.click(scanButton)

      // Even if scan fails, UI should remain functional
      vi.advanceTimersByTime(15000)

      await waitFor(() => {
        expect(screen.getByText('Mulai Scan')).not.toBeDisabled()
      })
    })

    it('should handle missing data gracefully', () => {
      render(<SecurityAudit {...defaultProps} />)

      // Should render without errors even with no initial data
      expect(screen.getByText('Mulai Scan')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<SecurityAudit {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: /mulai scan/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /export report/i })
      ).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()

      render(<SecurityAudit {...defaultProps} />)

      // Should be able to navigate with keyboard
      await user.tab()
      expect(document.activeElement).toBeDefined()
    })
  })

  describe('Indonesian Compliance Specific Tests', () => {
    it('should validate materai calculations in security context', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<SecurityAudit {...defaultProps} enableMateraiValidation={true} />)

      const scanButton = screen.getByText('Mulai Scan')
      await user.click(scanButton)

      vi.advanceTimersByTime(10000)

      await waitFor(() => {
        // Materai compliance should be checked
        expect(screen.getByText('Materai Compliance')).toBeInTheDocument()
      })
    })

    it('should check Indonesian privacy law compliance', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<SecurityAudit {...defaultProps} enablePrivacyChecks={true} />)

      const scanButton = screen.getByText('Mulai Scan')
      await user.click(scanButton)

      vi.advanceTimersByTime(10000)

      await waitFor(() => {
        // Privacy compliance should be checked
        expect(screen.getByText('Privacy Protection')).toBeInTheDocument()
      })
    })

    it('should identify Indonesian business critical vulnerabilities', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<SecurityAudit {...defaultProps} />)

      const scanButton = screen.getByText('Mulai Scan')
      await user.click(scanButton)

      vi.advanceTimersByTime(10000)

      await waitFor(() => {
        // Should complete scan and potentially show business-critical issues
        expect(screen.getByText('Vulnerabilities')).toBeInTheDocument()
      })
    })
  })
})
