import { ProjectMilestone } from '../services/milestones'

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  backgroundColor: string
  borderColor: string
  textColor: string
  extendedProps: {
    status: string
    priority: string
    revenue: number
    cost?: number
    completion: number
    description?: string
    milestoneNumber: number
  }
}

/**
 * Get color based on milestone status
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'PENDING':
      return '#1890ff' // Blue
    case 'IN_PROGRESS':
      return '#faad14' // Orange
    case 'COMPLETED':
      return '#52c41a' // Green
    case 'ACCEPTED':
      return '#52c41a' // Green
    case 'BILLED':
      return '#722ed1' // Purple
    default:
      return '#d9d9d9' // Gray
  }
}

/**
 * Get color based on priority
 */
export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'HIGH':
      return '#ff4d4f' // Red
    case 'MEDIUM':
      return '#faad14' // Orange
    case 'LOW':
      return '#52c41a' // Green
    default:
      return '#d9d9d9' // Gray
  }
}

/**
 * Get status label
 */
export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'PENDING':
      return 'Pending'
    case 'IN_PROGRESS':
      return 'In Progress'
    case 'COMPLETED':
      return 'Completed'
    case 'ACCEPTED':
      return 'Accepted'
    case 'BILLED':
      return 'Billed'
    default:
      return 'Unknown'
  }
}

/**
 * Transform ProjectMilestone array to FullCalendar events
 */
export const transformMilestonesToEvents = (
  milestones: ProjectMilestone[]
): CalendarEvent[] => {
  return milestones.map((milestone) => ({
    id: milestone.id,
    title: `#${milestone.milestoneNumber} - ${milestone.name}`,
    start: milestone.plannedStartDate,
    end: new Date(
      new Date(milestone.plannedEndDate).getTime() + 24 * 60 * 60 * 1000
    ).toISOString(), // FullCalendar end dates are exclusive, add 1 day
    backgroundColor: getStatusColor(milestone.status),
    borderColor: getPriorityColor(milestone.priority),
    textColor: '#ffffff',
    extendedProps: {
      status: milestone.status,
      priority: milestone.priority,
      revenue: milestone.plannedRevenue,
      cost: milestone.estimatedCost,
      completion: milestone.completionPercentage || 0,
      description: milestone.description,
      milestoneNumber: milestone.milestoneNumber,
    },
  }))
}

/**
 * Calculate duration in days
 */
export const calculateDuration = (startDate: string, endDate: string): number => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Get status statistics
 */
export const getStatusStats = (milestones: ProjectMilestone[]) => {
  return {
    total: milestones.length,
    pending: milestones.filter((m) => m.status === 'PENDING').length,
    inProgress: milestones.filter((m) => m.status === 'IN_PROGRESS').length,
    completed: milestones.filter((m) => m.status === 'COMPLETED').length,
    accepted: milestones.filter((m) => m.status === 'ACCEPTED').length,
    billed: milestones.filter((m) => m.status === 'BILLED').length,
  }
}

/**
 * Calculate critical path - longest sequence of dependent tasks
 */
export const calculateCriticalPath = (milestones: ProjectMilestone[]): string[] => {
  const getDependencyChain = (milestoneId: string, visited = new Set<string>()): number => {
    if (visited.has(milestoneId)) return 0
    visited.add(milestoneId)

    const milestone = milestones.find((m) => m.id === milestoneId)
    if (!milestone) return 0

    const duration = calculateDuration(milestone.plannedStartDate, milestone.plannedEndDate)

    const dependents = milestones.filter((m) => m.predecessorId === milestoneId)
    if (dependents.length === 0) {
      return duration
    }

    let maxChain = 0
    dependents.forEach((dependent) => {
      const chainLength = getDependencyChain(dependent.id, visited)
      maxChain = Math.max(maxChain, chainLength)
    })

    return duration + maxChain
  }

  const startMilestones = milestones.filter((m) => !m.predecessorId)
  let longestPath: string[] = []

  startMilestones.forEach((m) => {
    const length = getDependencyChain(m.id)
    if (length > longestPath.length) {
      const path: string[] = []
      let current: ProjectMilestone | undefined = m

      while (current) {
        path.push(current.id)
        const dependent = milestones.find((dep) => dep.predecessorId === current?.id)
        current = dependent
      }

      longestPath = path
    }
  })

  return longestPath
}

/**
 * Build dependency tree for visualization
 */
export interface DependencyNode {
  milestoneId: string
  children: string[]
  parent?: string
  level: number
  duration: number
}

export const buildDependencyTree = (milestones: ProjectMilestone[]): Map<string, DependencyNode> => {
  const tree = new Map<string, DependencyNode>()

  // Initialize all nodes
  milestones.forEach((m) => {
    tree.set(m.id, {
      milestoneId: m.id,
      children: [],
      parent: m.predecessorId,
      level: 0,
      duration: calculateDuration(m.plannedStartDate, m.plannedEndDate),
    })
  })

  // Build parent-child relationships
  milestones.forEach((m) => {
    if (m.predecessorId) {
      const parent = tree.get(m.predecessorId)
      if (parent) {
        parent.children.push(m.id)
      }
    }
  })

  // Calculate levels (distance from root)
  const calculateLevel = (milestoneId: string): number => {
    const node = tree.get(milestoneId)
    if (!node) return 0
    if (!node.parent) {
      node.level = 0
      return 0
    }
    const parentLevel = calculateLevel(node.parent)
    node.level = parentLevel + 1
    return node.level
  }

  milestones.forEach((m) => {
    calculateLevel(m.id)
  })

  return tree
}

/**
 * Get timeline metrics
 */
export interface TimelineMetrics {
  totalDays: number
  daysRemaining: number
  criticalPathLength: number
  avgMilestoneDuration: number
  timelineVariance: number
  bufferDays: number
}

export const getTimelineMetrics = (milestones: ProjectMilestone[]): TimelineMetrics => {
  if (milestones.length === 0) {
    return {
      totalDays: 0,
      daysRemaining: 0,
      criticalPathLength: 0,
      avgMilestoneDuration: 0,
      timelineVariance: 0,
      bufferDays: 0,
    }
  }

  const dates = milestones.flatMap((m) => [
    new Date(m.plannedStartDate),
    new Date(m.plannedEndDate),
  ])

  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))

  const totalDays = calculateDuration(minDate.toISOString(), maxDate.toISOString())
  const daysRemaining = Math.max(
    0,
    Math.ceil((maxDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  )

  const criticalPath = calculateCriticalPath(milestones)
  const criticalPathLength = criticalPath.reduce((sum, id) => {
    const milestone = milestones.find((m) => m.id === id)
    return sum + (milestone ? calculateDuration(milestone.plannedStartDate, milestone.plannedEndDate) : 0)
  }, 0)

  const durations = milestones.map((m) =>
    calculateDuration(m.plannedStartDate, m.plannedEndDate)
  )
  const avgMilestoneDuration = durations.reduce((a, b) => a + b, 0) / durations.length

  // Variance in milestone durations
  const meanDuration = avgMilestoneDuration
  const variance = durations.reduce((sum, d) => sum + Math.pow(d - meanDuration, 2), 0) / durations.length
  const timelineVariance = Math.sqrt(variance)

  // Buffer = total days - critical path
  const bufferDays = Math.max(0, totalDays - criticalPathLength)

  return {
    totalDays,
    daysRemaining,
    criticalPathLength,
    avgMilestoneDuration: Math.round(avgMilestoneDuration * 10) / 10,
    timelineVariance: Math.round(timelineVariance * 10) / 10,
    bufferDays,
  }
}

/**
 * Identify at-risk milestones (delays or dependencies)
 */
export interface RiskAssessment {
  milestoneId: string
  milestoneName: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  reasons: string[]
}

export const assessMilestoneRisks = (milestones: ProjectMilestone[]): RiskAssessment[] => {
  const assessments: RiskAssessment[] = []
  const now = new Date()
  const criticalPath = calculateCriticalPath(milestones)

  milestones.forEach((milestone) => {
    const reasons: string[] = []
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'

    // Check if on critical path
    if (criticalPath.includes(milestone.id)) {
      reasons.push('On critical path - delays will impact project')
      riskLevel = 'HIGH'
    }

    // Check if overdue
    if (new Date(milestone.plannedEndDate) < now && milestone.status !== 'COMPLETED' && milestone.status !== 'ACCEPTED' && milestone.status !== 'BILLED') {
      reasons.push('Planned end date has passed')
      riskLevel = 'HIGH'
    }

    // Check if has delay
    if (milestone.delayDays && milestone.delayDays > 0) {
      reasons.push(`${milestone.delayDays} days delayed`)
      if (milestone.delayDays > 7) {
        riskLevel = 'HIGH'
      } else if (milestone.delayDays > 3) {
        riskLevel = 'MEDIUM'
      }
    }

    // Check if pending with approaching start date
    if (milestone.status === 'PENDING') {
      const daysUntilStart = Math.ceil(
        (new Date(milestone.plannedStartDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysUntilStart < 7 && daysUntilStart >= 0) {
        reasons.push('Starting soon - ensure readiness')
        if (riskLevel === 'LOW') riskLevel = 'MEDIUM'
      }
    }

    // Check if has unmet dependencies
    const predecessor = milestones.find((m) => m.id === milestone.predecessorId)
    if (predecessor && predecessor.status !== 'COMPLETED' && predecessor.status !== 'ACCEPTED' && predecessor.status !== 'BILLED') {
      reasons.push(`Blocked by: #${predecessor.milestoneNumber}`)
      if (riskLevel === 'LOW') riskLevel = 'MEDIUM'
    }

    // Check low completion on in-progress items
    if (milestone.status === 'IN_PROGRESS' && (milestone.completionPercentage || 0) < 30) {
      reasons.push('Low progress on in-progress milestone')
      if (riskLevel === 'LOW') riskLevel = 'MEDIUM'
    }

    if (reasons.length > 0) {
      assessments.push({
        milestoneId: milestone.id,
        milestoneName: `#${milestone.milestoneNumber} - ${milestone.name}`,
        riskLevel,
        reasons,
      })
    }
  })

  return assessments.sort((a, b) => {
    const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
  })
}
