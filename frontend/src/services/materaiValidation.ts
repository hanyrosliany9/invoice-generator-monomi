// Materai Validation Service - Indonesian Business Management System
// Comprehensive Indonesian stamp duty (materai) compliance validation and calculation

// Indonesian Materai Regulations based on:
// - UU No. 13 Tahun 1985 tentang Bea Materai
// - Peraturan Pemerintah No. 24 Tahun 2000
// - Latest updates from Direktorat Jenderal Pajak

export interface MateraiRule {
  id: string
  name: string
  minAmount: number
  maxAmount: number | null
  materaiAmount: number
  regulation: string
  effectiveDate: Date
  description: string
  exemptions?: string[]
  additionalRequirements?: string[]
}

export interface MateraiValidationResult {
  required: boolean
  amount: number
  rule: MateraiRule | null
  compliance: {
    isCompliant: boolean
    issues: string[]
    warnings: string[]
    recommendations: string[]
  }
  calculation: {
    transactionAmount: number
    materaiPercentage: number
    totalMateraiRequired: number
    documentCount: number
    totalCost: number
  }
  documentType: 'quotation' | 'invoice' | 'contract' | 'receipt' | 'other'
  metadata: {
    calculatedAt: Date
    regulationVersion: string
    lastUpdated: Date
    validationId: string
  }
}

export interface MateraiExemption {
  type: string
  description: string
  conditions: string[]
  applicableDocuments: string[]
}

export interface BusinessContext {
  companyType: 'PT' | 'CV' | 'UD' | 'Koperasi' | 'Perorangan'
  businessScale: 'UMKM' | 'Menengah' | 'Besar'
  npwp?: string
  location: {
    province: string
    city: string
    region: 'Jakarta' | 'Jawa' | 'Sumatera' | 'Kalimantan' | 'Sulawesi' | 'Papua' | 'Bali_NTT_NTB' | 'Maluku'
  }
  specialStatus?: 'Export' | 'Import' | 'Manufaktur' | 'Jasa' | 'Teknologi'
}

// Current Indonesian Materai Rules (2025)
const CURRENT_MATERAI_RULES: MateraiRule[] = [
  {
    id: 'materai_10k_standard',
    name: 'Materai Rp 10.000 - Standar',
    minAmount: 5000000, // 5 million IDR
    maxAmount: 1000000000, // 1 billion IDR
    materaiAmount: 10000,
    regulation: 'UU No. 13 Tahun 1985 Pasal 2',
    effectiveDate: new Date('2021-01-01'),
    description: 'Materai standar untuk dokumen dengan nilai 5 juta - 1 miliar rupiah',
    exemptions: [
      'Kuitansi pembayaran gaji pegawai',
      'Tanda terima barang',
      'Surat kuasa khusus untuk keperluan pengadilan'
    ],
    additionalRequirements: [
      'Dokumen harus ditandatangani di atas materai',
      'Materai tidak boleh rusak atau sobek',
      'Satu materai per dokumen asli'
    ]
  },
  {
    id: 'materai_20k_high_value',
    name: 'Materai Rp 20.000 - Nilai Tinggi',
    minAmount: 1000000001, // > 1 billion IDR
    maxAmount: null,
    materaiAmount: 20000,
    regulation: 'Peraturan Pemerintah No. 24 Tahun 2000',
    effectiveDate: new Date('2021-01-01'),
    description: 'Materai untuk dokumen dengan nilai di atas 1 miliar rupiah',
    exemptions: [
      'Dokumen ekspor-impor tertentu',
      'Kontrak pemerintah dengan syarat khusus'
    ],
    additionalRequirements: [
      'Dokumen harus dilegalisir notaris',
      'Diperlukan materai tambahan untuk setiap salinan resmi',
      'Audit compliance oleh konsultan pajak'
    ]
  }
]

// Exemptions from materai requirements
const MATERAI_EXEMPTIONS: MateraiExemption[] = [
  {
    type: 'government_transaction',
    description: 'Transaksi dengan Pemerintah',
    conditions: [
      'Dokumen untuk kepentingan negara',
      'Kontrak dengan BUMN/BUMD',
      'Tender pemerintah'
    ],
    applicableDocuments: ['contract', 'quotation']
  },
  {
    type: 'export_import',
    description: 'Ekspor-Impor',
    conditions: [
      'Barang untuk ekspor',
      'Import untuk keperluan industri',
      'Terdaftar di DJBC'
    ],
    applicableDocuments: ['invoice', 'contract']
  },
  {
    type: 'small_business',
    description: 'Usaha Kecil (UMKM)',
    conditions: [
      'Omzet tahunan < 4.8 miliar',
      'Terdaftar sebagai UMKM',
      'Memiliki sertifikat UMKM'
    ],
    applicableDocuments: ['quotation', 'invoice', 'receipt']
  },
  {
    type: 'non_profit',
    description: 'Organisasi Non-Profit',
    conditions: [
      'Lembaga sosial terdaftar',
      'Yayasan dengan NPWP khusus',
      'Kegiatan sosial/pendidikan'
    ],
    applicableDocuments: ['receipt', 'contract']
  }
]

class MateraiValidationService {
  private rules: MateraiRule[]
  private exemptions: MateraiExemption[]
  private currentVersion: string
  
  constructor() {
    this.rules = CURRENT_MATERAI_RULES
    this.exemptions = MATERAI_EXEMPTIONS
    this.currentVersion = '2025.1'
  }
  
  /**
   * Validate materai requirement for a transaction
   */
  validateMateraiRequirement(
    amount: number,
    documentType: MateraiValidationResult['documentType'],
    businessContext?: BusinessContext
  ): MateraiValidationResult {
    const validationId = this.generateValidationId()
    const calculatedAt = new Date()
    
    // Find applicable rule
    const applicableRule = this.findApplicableRule(amount)
    
    // Check for exemptions
    const exemptions = this.checkExemptions(documentType, businessContext)
    
    // Calculate materai requirement
    const calculation = this.calculateMateraiCost(amount, applicableRule, 1)
    
    // Perform compliance check
    const compliance = this.performComplianceCheck(
      amount,
      documentType,
      applicableRule,
      exemptions,
      businessContext
    )
    
    const required = applicableRule !== null && exemptions.length === 0
    
    return {
      required,
      amount: required ? applicableRule.materaiAmount : 0,
      rule: applicableRule,
      compliance,
      calculation,
      documentType,
      metadata: {
        calculatedAt,
        regulationVersion: this.currentVersion,
        lastUpdated: new Date('2025-01-01'),
        validationId
      }
    }
  }
  
  /**
   * Calculate total materai cost for multiple documents
   */
  calculateBulkMateraiCost(
    transactions: Array<{
      amount: number
      documentType: MateraiValidationResult['documentType']
      quantity: number
    }>,
    businessContext?: BusinessContext
  ): {
    totalCost: number
    breakdown: Array<{
      amount: number
      documentType: string
      quantity: number
      materaiPerDocument: number
      subtotal: number
      required: boolean
    }>
    summary: {
      totalDocuments: number
      documentsRequiringMaterai: number
      totalMateraiCost: number
      complianceScore: number
    }
  } {
    const breakdown = transactions.map(transaction => {
      const validation = this.validateMateraiRequirement(
        transaction.amount,
        transaction.documentType,
        businessContext
      )
      
      const materaiPerDocument = validation.required ? validation.amount : 0
      const subtotal = materaiPerDocument * transaction.quantity
      
      return {
        amount: transaction.amount,
        documentType: transaction.documentType,
        quantity: transaction.quantity,
        materaiPerDocument,
        subtotal,
        required: validation.required
      }
    })
    
    const totalCost = breakdown.reduce((sum, item) => sum + item.subtotal, 0)
    const totalDocuments = breakdown.reduce((sum, item) => sum + item.quantity, 0)
    const documentsRequiringMaterai = breakdown
      .filter(item => item.required)
      .reduce((sum, item) => sum + item.quantity, 0)
    
    // Calculate compliance score (0-100)
    const complianceScore = this.calculateComplianceScore(breakdown, businessContext)
    
    return {
      totalCost,
      breakdown,
      summary: {
        totalDocuments,
        documentsRequiringMaterai,
        totalMateraiCost: totalCost,
        complianceScore
      }
    }
  }
  
  /**
   * Check if business qualifies for materai exemptions
   */
  checkBusinessExemptions(businessContext: BusinessContext): {
    qualifiedExemptions: MateraiExemption[]
    potentialSavings: number
    recommendations: string[]
  } {
    const qualifiedExemptions: MateraiExemption[] = []
    let potentialSavings = 0
    const recommendations: string[] = []
    
    // Check UMKM exemption
    if (businessContext.businessScale === 'UMKM') {
      const umkmExemption = this.exemptions.find(e => e.type === 'small_business')
      if (umkmExemption) {
        qualifiedExemptions.push(umkmExemption)
        potentialSavings += 10000 // Estimate based on average transaction
        recommendations.push('Pastikan sertifikat UMKM selalu update untuk mempertahankan exemption')
      }
    }
    
    // Check export-import business
    if (businessContext.specialStatus === 'Export' || businessContext.specialStatus === 'Import') {
      const exportImportExemption = this.exemptions.find(e => e.type === 'export_import')
      if (exportImportExemption) {
        qualifiedExemptions.push(exportImportExemption)
        potentialSavings += 15000
        recommendations.push('Daftarkan semua aktivitas ekspor-impor di DJBC untuk maksimal exemption')
      }
    }
    
    // Regional considerations
    if (businessContext.location.region === 'Papua') {
      recommendations.push('Manfaatkan insentif khusus untuk wilayah Papua dalam perhitungan materai')
    }
    
    return {
      qualifiedExemptions,
      potentialSavings,
      recommendations
    }
  }
  
  /**
   * Generate compliance report
   */
  generateComplianceReport(
    validationResults: MateraiValidationResult[],
    businessContext?: BusinessContext
  ): {
    overallCompliance: number
    criticalIssues: string[]
    recommendations: string[]
    costOptimization: {
      currentCost: number
      optimizedCost: number
      potentialSavings: number
      optimizationMethods: string[]
    }
    auditTrail: {
      validationCount: number
      timeRange: { from: Date; to: Date }
      regulationVersion: string
    }
  } {
    const criticalIssues: string[] = []
    const recommendations: string[] = []
    const optimizationMethods: string[] = []
    
    // Calculate current total cost
    const currentCost = validationResults.reduce((sum, result) => 
      sum + result.calculation.totalCost, 0
    )
    
    // Analyze compliance issues
    let complianceScore = 100
    validationResults.forEach(result => {
      result.compliance.issues.forEach(issue => {
        criticalIssues.push(issue)
        complianceScore -= 10
      })
      
      result.compliance.recommendations.forEach(rec => {
        if (!recommendations.includes(rec)) {
          recommendations.push(rec)
        }
      })
    })
    
    // Calculate optimization opportunities
    const exemptionAnalysis = businessContext ? 
      this.checkBusinessExemptions(businessContext) : 
      { potentialSavings: 0, recommendations: [] }
    
    const optimizedCost = Math.max(0, currentCost - exemptionAnalysis.potentialSavings)
    
    // Add optimization methods
    if (exemptionAnalysis.potentialSavings > 0) {
      optimizationMethods.push('Manfaatkan exemption UMKM/Export-Import')
    }
    
    if (validationResults.some(r => r.calculation.totalCost > 50000)) {
      optimizationMethods.push('Pertimbangkan splitting transaksi besar')
    }
    
    if (businessContext?.businessScale === 'UMKM') {
      optimizationMethods.push('Maksimalkan insentif untuk usaha kecil')
    }
    
    const timeRange = {
      from: new Date(Math.min(...validationResults.map(r => r.metadata.calculatedAt.getTime()))),
      to: new Date(Math.max(...validationResults.map(r => r.metadata.calculatedAt.getTime())))
    }
    
    return {
      overallCompliance: Math.max(0, Math.min(100, complianceScore)),
      criticalIssues,
      recommendations: [...recommendations, ...exemptionAnalysis.recommendations],
      costOptimization: {
        currentCost,
        optimizedCost,
        potentialSavings: exemptionAnalysis.potentialSavings,
        optimizationMethods
      },
      auditTrail: {
        validationCount: validationResults.length,
        timeRange,
        regulationVersion: this.currentVersion
      }
    }
  }
  
  /**
   * Real-time materai calculator for UI
   */
  calculateRealTime(amount: number): {
    required: boolean
    materaiAmount: number
    threshold: number
    percentageToThreshold: number
    warning?: string
  } {
    const applicableRule = this.findApplicableRule(amount)
    
    if (!applicableRule) {
      const nextThreshold = 5000000 // First threshold
      const percentageToThreshold = (amount / nextThreshold) * 100
      
      const result = {
        required: false,
        materaiAmount: 0,
        threshold: nextThreshold,
        percentageToThreshold
      } as { required: boolean; materaiAmount: number; threshold: number; percentageToThreshold: number; warning?: string }
      
      if (amount > 4000000) {
        result.warning = 'Mendekati threshold materai (Rp 5 juta)'
      }
      
      return result
    }
    
    const nextThreshold = applicableRule.maxAmount || Infinity
    const percentageToThreshold = applicableRule.maxAmount ? 
      (amount / applicableRule.maxAmount) * 100 : 0
    
    const result = {
      required: true,
      materaiAmount: applicableRule.materaiAmount,
      threshold: nextThreshold,
      percentageToThreshold
    } as { required: boolean; materaiAmount: number; threshold: number; percentageToThreshold: number; warning?: string }
    
    if (percentageToThreshold > 90) {
      result.warning = 'Mendekati threshold materai tingkat berikutnya'
    }
    
    return result
  }
  
  // Private helper methods
  
  private findApplicableRule(amount: number): MateraiRule | null {
    return this.rules.find(rule => 
      amount >= rule.minAmount && (rule.maxAmount === null || amount <= rule.maxAmount)
    ) || null
  }
  
  private checkExemptions(
    documentType: MateraiValidationResult['documentType'],
    businessContext?: BusinessContext
  ): MateraiExemption[] {
    return this.exemptions.filter(exemption => {
      // Check if document type is applicable
      if (!exemption.applicableDocuments.includes(documentType)) {
        return false
      }
      
      // Check business context conditions
      if (businessContext) {
        if (exemption.type === 'small_business' && businessContext.businessScale !== 'UMKM') {
          return false
        }
        
        if (exemption.type === 'export_import' && 
            !['Export', 'Import'].includes(businessContext.specialStatus || '')) {
          return false
        }
      }
      
      return true
    })
  }
  
  private calculateMateraiCost(
    amount: number,
    rule: MateraiRule | null,
    documentCount: number
  ) {
    const materaiPercentage = 0 // Materai is fixed amount, not percentage
    const totalMateraiRequired = rule ? rule.materaiAmount * documentCount : 0
    
    return {
      transactionAmount: amount,
      materaiPercentage,
      totalMateraiRequired,
      documentCount,
      totalCost: totalMateraiRequired
    }
  }
  
  private performComplianceCheck(
    amount: number,
    documentType: MateraiValidationResult['documentType'],
    rule: MateraiRule | null,
    exemptions: MateraiExemption[],
    businessContext?: BusinessContext
  ) {
    const issues: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []
    
    // Check if materai is required but not calculated
    if (amount >= 5000000 && !rule && exemptions.length === 0) {
      issues.push('Transaksi memerlukan materai tetapi aturan tidak ditemukan')
    }
    
    // Check for high-value transactions
    if (amount >= 1000000000) {
      warnings.push('Transaksi bernilai tinggi - pertimbangkan konsultasi dengan konsultan pajak')
      recommendations.push('Pastikan dokumen dilegalisir notaris')
    }
    
    // Business context warnings
    if (businessContext) {
      if (!businessContext.npwp && amount >= 50000000) {
        warnings.push('Transaksi besar tanpa NPWP - dapat menimbulkan masalah compliance')
      }
      
      if (businessContext.businessScale === 'UMKM' && amount >= 100000000) {
        warnings.push('Transaksi melebihi batasan UMKM - periksa status bisnis')
      }
    }
    
    // Document type specific checks
    if (documentType === 'invoice' && amount >= 5000000) {
      recommendations.push('Pastikan invoice ditandatangani di atas materai')
    }
    
    if (documentType === 'contract' && amount >= 100000000) {
      recommendations.push('Kontrak bernilai tinggi sebaiknya didampingi legal advisor')
    }
    
    const isCompliant = issues.length === 0
    
    return {
      isCompliant,
      issues,
      warnings,
      recommendations
    }
  }
  
  private calculateComplianceScore(
    breakdown: any[],
    businessContext?: BusinessContext
  ): number {
    let score = 100
    
    // Deduct points for non-compliance
    breakdown.forEach(item => {
      if (item.amount >= 5000000 && !item.required) {
        score -= 20 // Major compliance issue
      }
    })
    
    // Bonus points for proper business setup
    if (businessContext?.npwp) {
      score += 5
    }
    
    if (businessContext?.businessScale === 'UMKM') {
      score += 10 // Proper classification
    }
    
    return Math.max(0, Math.min(100, score))
  }
  
  private generateValidationId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2)
    return `MVAL_${timestamp}_${random}`.toUpperCase()
  }
}

// Export singleton instance
export const materaiValidationService = new MateraiValidationService()

// Export types and utilities
export {
  MateraiValidationService,
  CURRENT_MATERAI_RULES,
  MATERAI_EXEMPTIONS
}

// Helper function for quick validation
export const validateMaterai = (
  amount: number,
  documentType: MateraiValidationResult['documentType'] = 'invoice'
): { required: boolean; amount: number; warning?: string } => {
  const result = materaiValidationService.validateMateraiRequirement(amount, documentType)
  const returnValue: { required: boolean; amount: number; warning?: string } = {
    required: result.required,
    amount: result.amount
  }
  
  if (result.compliance.warnings.length > 0 && result.compliance.warnings[0]) {
    returnValue.warning = result.compliance.warnings[0]
  }
  
  return returnValue
}

// Helper function for real-time calculation
export const calculateMateraiRealTime = (amount: number) => {
  return materaiValidationService.calculateRealTime(amount)
}

export default materaiValidationService