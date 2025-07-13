// UX Metrics Collection Utility - Performance Monitoring for Indonesian Business System
// Enhanced with Core Web Vitals tracking and user behavior analytics

import { onCLS, onFCP, onFID, onLCP, onTTFB } from 'web-vitals'
import {
  BusinessJourneyTimelinePerformance,
  UXMetrics,
} from '../types/businessJourney.types'

interface UXMetricsCollectorConfig {
  enableAnalytics: boolean
  enableConsoleLogging: boolean
  enablePerformanceMarks: boolean
  samplingRate: number
}

interface PerformanceData {
  lcp: number
  fid: number
  cls: number
  fcp: number
  ttfb: number
}

interface InteractionMetric {
  type: string
  duration: number
  target: string
  timestamp: number
}

export class UXMetricsCollector {
  private metrics: Map<string, UXMetrics> = new Map()
  private performanceData: Partial<PerformanceData> = {}
  private interactions: InteractionMetric[] = []
  private config: UXMetricsCollectorConfig

  constructor(config: Partial<UXMetricsCollectorConfig> = {}) {
    this.config = {
      enableAnalytics: true,
      enableConsoleLogging: false,
      enablePerformanceMarks: true,
      samplingRate: 1.0,
      ...config,
    }

    this.initializeWebVitals()
  }

  private initializeWebVitals(): void {
    if (typeof window === 'undefined') return

    onCLS((metric: any) => {
      this.performanceData.cls = metric.value
      this.sendMetricToAnalytics('cls', metric.value)
    })

    onFID((metric: any) => {
      this.performanceData.fid = metric.value
      this.sendMetricToAnalytics('fid', metric.value)
    })

    onFCP((metric: any) => {
      this.performanceData.fcp = metric.value
      this.sendMetricToAnalytics('fcp', metric.value)
    })

    onLCP((metric: any) => {
      this.performanceData.lcp = metric.value
      this.sendMetricToAnalytics('lcp', metric.value)
    })

    onTTFB((metric: any) => {
      this.performanceData.ttfb = metric.value
      this.sendMetricToAnalytics('ttfb', metric.value)
    })
  }

  public trackComponentPerformance(componentName: string) {
    const startTime = performance.now()

    if (this.config.enablePerformanceMarks) {
      performance.mark(`${componentName}-start`)
    }

    return {
      markRenderStart: () => {
        if (this.config.enablePerformanceMarks) {
          performance.mark(`${componentName}-render-start`)
        }
      },

      markRenderComplete: () => {
        const renderTime = performance.now() - startTime

        if (this.config.enablePerformanceMarks) {
          performance.mark(`${componentName}-render-complete`)
          performance.measure(
            `${componentName}-render-duration`,
            `${componentName}-render-start`,
            `${componentName}-render-complete`
          )
        }

        this.recordMetric(componentName, {
          componentName,
          loadTime: renderTime,
          interactionDelay: 0,
          renderComplete: renderTime,
          userSatisfaction: this.calculateSatisfaction(renderTime),
        })

        if (this.config.enableConsoleLogging) {
          console.log(
            `[UX Metrics] ${componentName} rendered in ${renderTime.toFixed(2)}ms`
          )
        }
      },

      trackInteraction: (interactionType: string, target?: string) => {
        const interactionStart = performance.now()

        return () => {
          const interactionTime = performance.now() - interactionStart

          const interaction: InteractionMetric = {
            type: interactionType,
            duration: interactionTime,
            target: target || 'unknown',
            timestamp: Date.now(),
          }

          this.interactions.push(interaction)

          // Keep only last 100 interactions
          if (this.interactions.length > 100) {
            this.interactions = this.interactions.slice(-100)
          }

          // Send to analytics
          this.sendInteractionToAnalytics({
            event: 'ux_interaction',
            component: componentName,
            interaction: interactionType,
            duration: interactionTime,
            target: target || 'unknown',
            timestamp: Date.now(),
          })

          if (this.config.enableConsoleLogging) {
            console.log(
              `[UX Metrics] ${componentName} ${interactionType} took ${interactionTime.toFixed(2)}ms`
            )
          }
        }
      },

      trackError: (error: Error, context?: string) => {
        this.sendErrorToAnalytics({
          event: 'ux_error',
          component: componentName,
          error: error.message,
          stack: error.stack,
          context: context || 'unknown',
          timestamp: Date.now(),
        })
      },
    }
  }

  public trackBusinessJourneyPerformance(
    clientId: string
  ): BusinessJourneyTimelinePerformance {
    const performance = this.getComponentPerformance('BusinessJourneyTimeline')
    const filterPerformance = this.getAverageInteractionTime('filter_change')
    const scrollPerformance = this.getAverageInteractionTime('scroll')

    const businessJourneyPerformance: BusinessJourneyTimelinePerformance = {
      initialLoadTime: performance?.loadTime || 0,
      filterResponseTime: filterPerformance,
      scrollPerformance: scrollPerformance,
      memoryUsage: this.getMemoryUsage(),
      renderCount: this.getRenderCount('BusinessJourneyTimeline'),
    }

    // Send business journey specific metrics
    this.sendMetricToAnalytics(
      'business_journey_performance',
      businessJourneyPerformance,
      {
        clientId,
      }
    )

    return businessJourneyPerformance
  }

  private recordMetric(componentName: string, metric: UXMetrics): void {
    this.metrics.set(componentName, metric)

    // Send to analytics if enabled
    if (
      this.config.enableAnalytics &&
      Math.random() < this.config.samplingRate
    ) {
      this.sendMetricToAnalytics('component_performance', metric)
    }
  }

  private calculateSatisfaction(
    renderTime: number
  ): 'good' | 'needs-improvement' | 'poor' {
    if (renderTime < 100) return 'good'
    if (renderTime < 300) return 'needs-improvement'
    return 'poor'
  }

  private getComponentPerformance(
    componentName: string
  ): UXMetrics | undefined {
    return this.metrics.get(componentName)
  }

  private getAverageInteractionTime(interactionType: string): number {
    const relevantInteractions = this.interactions.filter(
      i => i.type === interactionType
    )
    if (relevantInteractions.length === 0) return 0

    const totalTime = relevantInteractions.reduce(
      (sum, i) => sum + i.duration,
      0
    )
    return totalTime / relevantInteractions.length
  }

  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      return memory.usedJSHeapSize / memory.totalJSHeapSize
    }
    return 0
  }

  private getRenderCount(componentName: string): number {
    if (typeof window === 'undefined') return 0

    const marks = performance.getEntriesByType('mark')
    return marks.filter(mark =>
      mark.name.includes(`${componentName}-render-complete`)
    ).length
  }

  private sendMetricToAnalytics(
    metricName: string,
    value: any,
    context?: any
  ): void {
    if (!this.config.enableAnalytics) return

    // Send to Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      ;(window as any).gtag('event', 'ux_performance', {
        metric_name: metricName,
        metric_value: value,
        context: context,
        timestamp: Date.now(),
      })
    }

    // Send to custom analytics endpoint
    if (typeof window !== 'undefined') {
      fetch('/api/analytics/ux-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metric: metricName,
          value: value,
          context: context,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      }).catch(error => {
        if (this.config.enableConsoleLogging) {
          console.warn('[UX Metrics] Failed to send analytics:', error)
        }
      })
    }
  }

  private sendInteractionToAnalytics(data: any): void {
    if (!this.config.enableAnalytics) return

    // Send to Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      ;(window as any).gtag('event', 'ux_interaction', data)
    }

    // Send to custom analytics endpoint
    this.sendMetricToAnalytics('user_interaction', data)
  }

  private sendErrorToAnalytics(data: any): void {
    if (!this.config.enableAnalytics) return

    // Send to error tracking service
    if (typeof window !== 'undefined') {
      fetch('/api/analytics/ux-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }).catch(() => {
        // Silently fail for error tracking
      })
    }
  }

  public getMetricsSummary(): {
    components: UXMetrics[]
    interactions: InteractionMetric[]
    webVitals: Partial<PerformanceData>
  } {
    return {
      components: Array.from(this.metrics.values()),
      interactions: this.interactions,
      webVitals: this.performanceData,
    }
  }

  public generatePerformanceReport(): string {
    const summary = this.getMetricsSummary()

    let report = '=== UX Performance Report ===\n\n'

    // Web Vitals
    report += 'Core Web Vitals:\n'
    report += `  LCP: ${summary.webVitals.lcp?.toFixed(2) || 'N/A'}ms\n`
    report += `  FID: ${summary.webVitals.fid?.toFixed(2) || 'N/A'}ms\n`
    report += `  CLS: ${summary.webVitals.cls?.toFixed(3) || 'N/A'}\n`
    report += `  FCP: ${summary.webVitals.fcp?.toFixed(2) || 'N/A'}ms\n`
    report += `  TTFB: ${summary.webVitals.ttfb?.toFixed(2) || 'N/A'}ms\n\n`

    // Component Performance
    report += 'Component Performance:\n'
    summary.components.forEach(metric => {
      report += `  ${metric.componentName}: ${metric.loadTime.toFixed(2)}ms (${metric.userSatisfaction})\n`
    })

    // Interaction Summary
    if (summary.interactions.length > 0) {
      report += '\nRecent Interactions:\n'
      const recentInteractions = summary.interactions.slice(-5)
      recentInteractions.forEach(interaction => {
        report += `  ${interaction.type}: ${interaction.duration.toFixed(2)}ms\n`
      })
    }

    return report
  }

  public clearMetrics(): void {
    this.metrics.clear()
    this.interactions = []
    this.performanceData = {}
  }
}

// React Hook for UX Metrics
import { useEffect, useMemo, useRef } from 'react'

export const useUXMetrics = (
  componentName: string,
  config?: Partial<UXMetricsCollectorConfig>
) => {
  const metricsCollector = useMemo(
    () => new UXMetricsCollector(config),
    [config]
  )
  const trackerRef = useRef<ReturnType<
    typeof metricsCollector.trackComponentPerformance
  > | null>(null)

  useEffect(() => {
    trackerRef.current =
      metricsCollector.trackComponentPerformance(componentName)
    trackerRef.current.markRenderStart()

    return () => {
      if (trackerRef.current) {
        trackerRef.current.markRenderComplete()
      }
    }
  }, [componentName, metricsCollector])

  const trackInteraction = (interactionType: string, target?: string) => {
    if (trackerRef.current) {
      return trackerRef.current.trackInteraction(interactionType, target)
    }
    return () => {}
  }

  const trackError = (error: Error, context?: string) => {
    if (trackerRef.current) {
      trackerRef.current.trackError(error, context)
    }
  }

  return {
    trackInteraction,
    trackError,
    metricsCollector,
  }
}

// Export utilities
export const uxMetricsUtils = {
  UXMetricsCollector,
  useUXMetrics,
}
