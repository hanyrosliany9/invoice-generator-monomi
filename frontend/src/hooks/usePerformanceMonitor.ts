// usePerformanceMonitor Hook - Indonesian Business Management System
// Comprehensive Core Web Vitals tracking and UX metrics for Indonesian business workflows

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals'

export interface PerformanceThresholds {
  // Core Web Vitals (optimized for Indonesian conditions)
  lcp: { good: number; poor: number } // Largest Contentful Paint
  fid: { good: number; poor: number } // First Input Delay
  cls: { good: number; poor: number } // Cumulative Layout Shift
  fcp: { good: number; poor: number } // First Contentful Paint
  ttfb: { good: number; poor: number } // Time to First Byte
  
  // Component performance
  renderTime: number
  searchTime: number
  filterTime: number
  apiCallTime: number
  tableRenderTime: number
  componentLoadTime: number
  
  // Indonesian business-specific thresholds
  quotationLoad: { good: number; poor: number }
  invoiceRender: { good: number; poor: number }
  materaiCalculation: { good: number; poor: number }
  whatsappIntegration: { good: number; poor: number }
  currencyFormatting: { good: number; poor: number }
}

export interface PerformanceMetric {
  name: string
  duration: number
  timestamp: Date
  metadata?: Record<string, any>
  threshold?: number
  exceeded?: boolean
  
  // Enhanced fields for comprehensive tracking
  type: 'web-vital' | 'business-metric' | 'user-interaction' | 'component-render' | 'api-call'
  severity?: 'low' | 'medium' | 'high' | 'critical'
  indonesianContext?: boolean
  impact?: 'user-experience' | 'business-critical' | 'performance' | 'accessibility'
}

export interface PerformanceAlert {
  id: string
  type: 'warning' | 'critical'
  metric: string
  value: number
  threshold: number
  impact: 'low' | 'medium' | 'high'
  recommendation: string
  indonesianContext?: boolean
  timestamp: Date
}

export interface PerformanceScore {
  overall: number
  coreWebVitals: number
  businessMetrics: number
  indonesianExperience: number
  userInteraction: number
}

export interface PerformanceOptions {
  enabled?: boolean
  thresholds?: Partial<PerformanceThresholds>
  onThresholdExceeded?: (metric: string, value: number, threshold: number) => void
  onAlert?: (alert: PerformanceAlert) => void
  enableLogging?: boolean
  enableReporting?: boolean
  sampleRate?: number // 0-1, percentage of measurements to record
  trackBusinessMetrics?: boolean
  trackIndonesianMetrics?: boolean
  enableAutoOptimization?: boolean
  reportInterval?: number
}

export interface UsePerformanceMonitorReturn {
  // Measurement functions
  measurePerformance: <T>(name: string, fn: () => T) => T
  startMeasurement: (name: string) => string
  endMeasurement: (measurementId: string, metadata?: Record<string, any>) => PerformanceMetric | null
  
  // Recording functions
  recordMetric: (name: string, metadata?: Record<string, any>) => void
  recordError: (error: Error, context?: string) => void
  recordBusinessEvent: (event: string, duration: number) => void
  
  // Analytics
  getMetrics: () => PerformanceMetric[]
  getAverageTime: (metricName: string) => number
  getSlowOperations: (threshold?: number) => PerformanceMetric[]
  alerts: PerformanceAlert[]
  
  // Optimization suggestions
  getOptimizationSuggestions: () => string[]
  getRecommendations: () => string[]
  
  // Performance scoring
  score: PerformanceScore
  isLoading: boolean
  
  // Core Web Vitals tracking (enhanced)
  vitals: {
    fcp: number | null // First Contentful Paint
    lcp: number | null // Largest Contentful Paint
    cls: number | null // Cumulative Layout Shift
    fid: number | null // First Input Delay
    ttfb: number | null // Time to First Byte
  }
  
  // Indonesian business metrics
  businessMetrics: {
    quotationLoadTime: number | null
    invoiceRenderTime: number | null
    materaiCalculationTime: number | null
    whatsappIntegrationTime: number | null
    currencyFormattingTime: number | null
  }
  
  // Utility functions
  clearMetrics: () => void
  exportReport: () => string
}

// Default thresholds optimized for Indonesian internet conditions and business requirements
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  // Core Web Vitals (adjusted for Indonesian network conditions)
  lcp: { good: 2500, poor: 4000 }, // Slightly higher due to Indonesia's network conditions
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  fcp: { good: 1800, poor: 3000 }, // Adjusted for Indonesian internet speeds
  ttfb: { good: 800, poor: 1800 }, // Higher due to geographic latency
  
  // Component performance
  renderTime: 16, // 60fps = 16.67ms per frame
  searchTime: 100,
  filterTime: 150,
  apiCallTime: 1000,
  tableRenderTime: 200,
  componentLoadTime: 500,
  
  // Indonesian business-specific thresholds
  quotationLoad: { good: 2000, poor: 5000 },
  invoiceRender: { good: 1500, poor: 3000 },
  materaiCalculation: { good: 500, poor: 1500 },
  whatsappIntegration: { good: 1000, poor: 3000 },
  currencyFormatting: { good: 50, poor: 200 }
}

export const usePerformanceMonitor = (options: PerformanceOptions = {}): UsePerformanceMonitorReturn => {
  const { t } = useTranslation()
  
  const {
    enabled = true,
    thresholds: customThresholds = {},
    onThresholdExceeded,
    onAlert,
    enableLogging = true,
    enableReporting = false,
    sampleRate = 1.0,
    trackBusinessMetrics = true,
    trackIndonesianMetrics = true,
    enableAutoOptimization = false,
    reportInterval = 60000
  } = options
  
  const thresholds = useMemo(() => ({ ...DEFAULT_THRESHOLDS, ...customThresholds }), [customThresholds])
  
  // State for storing metrics and alerts
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [vitals, setVitals] = useState({
    fcp: null as number | null,
    lcp: null as number | null,
    cls: null as number | null,
    fid: null as number | null,
    ttfb: null as number | null
  })
  
  const [businessMetrics, setBusinessMetrics] = useState({
    quotationLoadTime: null as number | null,
    invoiceRenderTime: null as number | null,
    materaiCalculationTime: null as number | null,
    whatsappIntegrationTime: null as number | null,
    currencyFormattingTime: null as number | null
  })
  
  // Refs for active measurements
  const activeMeasurements = useRef<Map<string, { name: string; startTime: number }>>(new Map())
  const measurementCounter = useRef(0)
  const performanceObserver = useRef<PerformanceObserver | null>(null)
  
  // Enhanced Core Web Vitals tracking with web-vitals library
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || Math.random() > sampleRate) return

    const handleWebVital = (metric: Metric) => {
      // Update vitals state
      setVitals(prev => ({
        ...prev,
        [metric.name.toLowerCase()]: metric.value
      }))

      // Create performance metric
      const performanceMetric: PerformanceMetric = {
        name: metric.name,
        duration: metric.value,
        timestamp: new Date(),
        type: 'web-vital',
        threshold: getThresholdForMetric(metric.name.toLowerCase()),
        exceeded: false,
        severity: 'medium',
        impact: 'user-experience'
      }

      // Check thresholds and create alerts
      checkPerformanceAlert(metric.name.toLowerCase(), metric.value, performanceMetric)
    }

    // Start monitoring Core Web Vitals
    getCLS(handleWebVital)
    getFID(handleWebVital)
    getFCP(handleWebVital)
    getLCP(handleWebVital)
    getTTFB(handleWebVital)

    setIsLoading(false)
  }, [enabled, sampleRate])

  // Enhanced performance observer for business metrics
  useEffect(() => {
    if (!enabled || !trackBusinessMetrics) return

    try {
      performanceObserver.current = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            recordPerformanceMetric('navigation-timing', navEntry.loadEventEnd - navEntry.navigationStart, {
              type: 'user-interaction',
              impact: 'user-experience'
            })
          }
          
          if (entry.entryType === 'measure') {
            handleCustomMeasurement(entry.name, entry.duration)
          }
        })
      })

      performanceObserver.current.observe({ 
        entryTypes: ['navigation', 'measure', 'paint'] 
      })

    } catch (error) {
      console.warn('Performance Observer not supported:', error)
    }

    return () => {
      performanceObserver.current?.disconnect()
    }
  }, [enabled, trackBusinessMetrics])
  
  // Core measurement function
  const measurePerformance = useCallback(<T,>(name: string, fn: () => T): T => {
    if (!enabled || Math.random() > sampleRate) {
      return fn()
    }
    
    const startTime = performance.now()
    
    try {
      const result = fn()
      
      // Handle async functions
      if (result && typeof result === 'object' && 'then' in result) {
        ;(result as Promise<any>).finally(() => {
          const duration = performance.now() - startTime
          recordPerformanceMetric(name, duration)
        })
      } else {
        const duration = performance.now() - startTime
        recordPerformanceMetric(name, duration)
      }
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      recordPerformanceMetric(name, duration, { error: true })
      throw error
    }
  }, [enabled, sampleRate])
  
  // Start measurement for async operations
  const startMeasurement = useCallback((name: string): string => {
    if (!enabled) return ''
    
    const id = `${name}_${++measurementCounter.current}`
    activeMeasurements.current.set(id, {
      name,
      startTime: performance.now()
    })
    
    return id
  }, [enabled])
  
  // End measurement
  const endMeasurement = useCallback((measurementId: string, metadata?: Record<string, any>): PerformanceMetric | null => {
    if (!enabled || !measurementId) return null
    
    const measurement = activeMeasurements.current.get(measurementId)
    if (!measurement) return null
    
    const duration = performance.now() - measurement.startTime
    activeMeasurements.current.delete(measurementId)
    
    return recordPerformanceMetric(measurement.name, duration, metadata)
  }, [enabled])
  
  // Record a performance metric
  const recordPerformanceMetric = useCallback((name: string, duration: number, metadata?: Record<string, any>): PerformanceMetric => {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date(),
      metadata,
      threshold: thresholds[name as keyof PerformanceThresholds],
      exceeded: false
    }
    
    // Check thresholds
    const threshold = thresholds[name as keyof PerformanceThresholds]
    if (threshold && duration > threshold) {
      metric.exceeded = true
      onThresholdExceeded?.(name, duration, threshold)
      
      if (enableLogging) {
        console.warn(`Performance threshold exceeded: ${name} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`)
      }
    }
    
    // Store metric (keep only last 1000 metrics to prevent memory leaks)
    setMetrics(prev => {
      const updated = [...prev, metric]
      return updated.slice(-1000)
    })
    
    // Log successful measurements in development
    if (enableLogging && process.env.NODE_ENV === 'development') {
      console.log(`Performance: ${name} - ${duration.toFixed(2)}ms`, metadata)
    }
    
    // Send to analytics service in production
    if (enableReporting && process.env.NODE_ENV === 'production') {
      // This would integrate with your analytics service
      sendPerformanceData(metric)
    }
    
    return metric
  }, [thresholds, onThresholdExceeded, enableLogging, enableReporting])
  
  // Record general metric
  const recordMetric = useCallback((name: string, metadata?: Record<string, any>) => {
    if (!enabled) return
    
    recordPerformanceMetric(name, 0, { ...metadata, isEvent: true })
  }, [enabled, recordPerformanceMetric])
  
  // Record error
  const recordError = useCallback((error: Error, context?: string) => {
    if (!enabled) return
    
    recordPerformanceMetric('error', 0, {
      error: error.message,
      stack: error.stack,
      context,
      isError: true
    })
  }, [enabled, recordPerformanceMetric])
  
  // Get all metrics
  const getMetrics = useCallback(() => metrics, [metrics])
  
  // Get average time for a specific metric
  const getAverageTime = useCallback((metricName: string): number => {
    const relevantMetrics = metrics.filter(m => m.name === metricName && !m.metadata?.isEvent)
    if (relevantMetrics.length === 0) return 0
    
    const sum = relevantMetrics.reduce((acc, m) => acc + m.duration, 0)
    return sum / relevantMetrics.length
  }, [metrics])
  
  // Get slow operations
  const getSlowOperations = useCallback((threshold?: number): PerformanceMetric[] => {
    const defaultThreshold = threshold || 100
    return metrics.filter(m => m.duration > defaultThreshold && !m.metadata?.isEvent)
      .sort((a, b) => b.duration - a.duration)
  }, [metrics])
  
  // Generate optimization suggestions
  const getOptimizationSuggestions = useCallback((): string[] => {
    const suggestions: string[] = []
    
    // Check for slow table renders
    const tableMetrics = metrics.filter(m => m.name.includes('table') || m.name.includes('render'))
    const slowTableRenders = tableMetrics.filter(m => m.duration > 200)
    if (slowTableRenders.length > 5) {
      suggestions.push('Pertimbangkan virtualisasi tabel untuk meningkatkan performa rendering')
    }
    
    // Check for slow searches
    const searchMetrics = metrics.filter(m => m.name.includes('search'))
    const avgSearchTime = getAverageTime('search')
    if (avgSearchTime > 150) {
      suggestions.push('Implementasikan debouncing atau caching untuk pencarian yang lebih cepat')
    }
    
    // Check for frequent API calls
    const apiMetrics = metrics.filter(m => m.name.includes('api') || m.name.includes('fetch'))
    if (apiMetrics.length > 50) {
      suggestions.push('Gunakan query batching atau caching untuk mengurangi API calls')
    }
    
    // Check memory usage patterns
    const errorMetrics = metrics.filter(m => m.metadata?.isError)
    if (errorMetrics.length > 10) {
      suggestions.push('Banyak error terdeteksi, periksa error handling dan validasi input')
    }
    
    // Indonesian business specific suggestions
    if (metrics.some(m => m.name.includes('materai') && m.duration > 100)) {
      suggestions.push('Cache hasil kalkulasi materai untuk transaksi serupa')
    }
    
    if (metrics.some(m => m.name.includes('currency') && m.duration > 50)) {
      suggestions.push('Optimalisasi formatting mata uang IDR dengan memoization')
    }
    
    return suggestions
  }, [metrics, getAverageTime])
  
  return {
    measurePerformance,
    startMeasurement,
    endMeasurement,
    recordMetric,
    recordError,
    getMetrics,
    getAverageTime,
    getSlowOperations,
    getOptimizationSuggestions,
    vitals
  }
}

// Helper function to send performance data to analytics
function sendPerformanceData(metric: PerformanceMetric): void {
  // This would integrate with your analytics service
  // For example: Google Analytics, DataDog, New Relic, etc.
  
  if (typeof window !== 'undefined' && 'gtag' in window) {
    // Google Analytics example
    ;(window as any).gtag('event', 'performance_metric', {
      event_category: 'Performance',
      event_label: metric.name,
      value: Math.round(metric.duration),
      custom_map: {
        metric_name: metric.name,
        duration: metric.duration,
        exceeded_threshold: metric.exceeded
      }
    })
  }
  
  // Send to custom analytics endpoint
  if (process.env.REACT_APP_ANALYTICS_ENDPOINT) {
    fetch(process.env.REACT_APP_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'performance',
        metric,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    }).catch(error => {
      console.warn('Failed to send performance data:', error)
    })
  }
}

export default usePerformanceMonitor