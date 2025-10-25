# Calendar Timeline - Quick Reference Card

## Component Quick Links

### 🎯 Main Dashboard (Recommended)
```typescript
import { ProjectTimelineManager } from '@/components/calendar'

<ProjectTimelineManager
  projectId="proj-123"
  milestones={milestones}
  onMilestoneClick={handleClick}
  loading={isLoading}
/>
```

### 📊 Gantt Chart Only
```typescript
import { GanttChartView } from '@/components/calendar'

<GanttChartView
  milestones={milestones}
  onEventClick={handleClick}
/>
```

### 📅 Interactive Timeline
```typescript
import { TimelineView } from '@/components/calendar'

<TimelineView
  milestones={milestones}
  onEventClick={handleClick}
/>
```

### 🕸️ Dependency Graph
```typescript
import { DependencyVisualization } from '@/components/calendar'

<DependencyVisualization
  milestones={milestones}
  onMilestoneClick={handleClick}
/>
```

---

## Key Utilities

### Calculate Critical Path
```typescript
import { calculateCriticalPath } from '@/utils/calendarUtils'

const criticalMilestones = calculateCriticalPath(milestones)
// Returns: string[] of milestone IDs on critical path
```

### Get Timeline Metrics
```typescript
import { getTimelineMetrics } from '@/utils/calendarUtils'

const metrics = getTimelineMetrics(milestones)
// Returns: {
//   totalDays: 90,
//   daysRemaining: 45,
//   criticalPathLength: 85,
//   avgMilestoneDuration: 7.5,
//   timelineVariance: 3.2,
//   bufferDays: 5
// }
```

### Assess Risk
```typescript
import { assessMilestoneRisks } from '@/utils/calendarUtils'

const risks = assessMilestoneRisks(milestones)
// Returns array with: {
//   milestoneId: "m-1",
//   milestoneName: "#1 - Design",
//   riskLevel: "HIGH",
//   reasons: ["On critical path", "5 days delayed"]
// }
```

### Build Dependency Tree
```typescript
import { buildDependencyTree } from '@/utils/calendarUtils'

const tree = buildDependencyTree(milestones)
// Returns Map with:
// {
//   milestoneId: string,
//   children: string[],
//   parent?: string,
//   level: number,
//   duration: number
// }
```

---

## Data Requirements

### Minimal Milestone Object
```typescript
{
  id: "m-1",
  milestoneNumber: 1,
  name: "Phase 1 - Design",
  status: "IN_PROGRESS",
  priority: "HIGH",
  plannedStartDate: "2025-11-01",
  plannedEndDate: "2025-11-15",
  plannedRevenue: 10000,
  actualCost: 5000,
  completionPercentage: 50
}
```

### Full Milestone Object
```typescript
{
  // Identification
  id: string,
  projectId: string,
  milestoneNumber: number,
  name: string,

  // Description
  nameId?: string,
  description?: string,
  descriptionId?: string,

  // Dates
  plannedStartDate: string,    // Required
  plannedEndDate: string,      // Required
  actualStartDate?: string,
  actualEndDate?: string,

  // Financial
  plannedRevenue: number,      // Required
  recognizedRevenue: number,
  remainingRevenue: number,
  estimatedCost?: number,
  actualCost: number,          // Required

  // Status & Progress
  completionPercentage?: number,
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ACCEPTED' | 'BILLED',
  priority: 'LOW' | 'MEDIUM' | 'HIGH',

  // Dependencies
  predecessorId?: string,
  deliverables?: string,

  // Tracking
  notes?: string,
  notesId?: string,
  delayDays?: number,
  delayReason?: string,
  acceptedBy?: string,
  acceptedAt?: string,

  // Metadata
  createdAt: string,
  updatedAt: string
}
```

---

## Common Tasks

### Display All Views
```typescript
<ProjectTimelineManager
  projectId={projectId}
  milestones={milestones}
  onMilestoneClick={handleClick}
/>
// Includes: Gantt, Timeline, Dependencies, Month, Week views
```

### Check if Timeline is At Risk
```typescript
const metrics = getTimelineMetrics(milestones)
const risks = assessMilestoneRisks(milestones)

if (metrics.bufferDays < 5 || risks.length > 0) {
  // Alert user about schedule risk
}
```

### Find Critical Path Milestones
```typescript
const criticalPath = calculateCriticalPath(milestones)
const criticalMilestones = milestones.filter(m =>
  criticalPath.includes(m.id)
)
// These are the "must not slip" milestones
```

### Check Specific Milestone Risk
```typescript
const risks = assessMilestoneRisks(milestones)
const milestoneRisk = risks.find(r => r.milestoneId === "m-1")

if (milestoneRisk?.riskLevel === "HIGH") {
  // Show warning badge or alert
}
```

### List All Dependencies
```typescript
const tree = buildDependencyTree(milestones)

for (const [id, node] of tree) {
  console.log(`${id} depends on ${node.parent}`)
  console.log(`${id} has children: ${node.children.join(',')}`)
}
```

---

## Color Coding

### Status Colors (Backgrounds)
| Status | Color | Hex |
|--------|-------|-----|
| PENDING | Blue | #1890ff |
| IN_PROGRESS | Orange | #faad14 |
| COMPLETED | Green | #52c41a |
| ACCEPTED | Green | #52c41a |
| BILLED | Purple | #722ed1 |

### Priority Colors (Borders)
| Priority | Color | Hex |
|----------|-------|-----|
| HIGH | Red | #ff4d4f |
| MEDIUM | Orange | #faad14 |
| LOW | Green | #52c41a |

### Risk Levels
| Level | Color | Meaning |
|-------|-------|---------|
| HIGH | Red | 🔴 Critical - Immediate action needed |
| MEDIUM | Orange | 🟠 Warning - Monitor closely |
| LOW | Green | 🟢 Safe - Review regularly |

### Critical Path
| Element | Color | Hex |
|---------|-------|-----|
| Gantt Bar | Red | #ff4d4f |
| Timeline Item | Red | #ff4d4f |
| Dependency Line | Red | #ff4d4f |

---

## View Comparison

| Feature | Gantt | Timeline | Dependencies | Month | Week |
|---------|-------|----------|--------------|-------|------|
| Date Range | ✅ | ✅ | ❌ | ✅ | ✅ |
| Duration Bar | ✅ | ✅ | ❌ | ❌ | ❌ |
| Dependencies | ⚠️ | ⚠️ | ✅ | ❌ | ❌ |
| Critical Path | ✅ | ✅ | ✅ | ❌ | ❌ |
| Risk View | ✅ | ❌ | ❌ | ❌ | ❌ |
| Metrics | ✅ | ❌ | ❌ | ❌ | ❌ |
| Zoom | ⚠️ | ✅ | ❌ | ❌ | ❌ |
| Click Detail | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legend**: ✅ = Full Support | ⚠️ = Limited | ❌ = Not Available

---

## Troubleshooting

### Nothing Displays?
```typescript
// Check 1: Milestones array not empty
if (milestones.length === 0) {
  console.error("No milestones provided")
}

// Check 2: Required date fields
const valid = milestones.every(m =>
  m.plannedStartDate && m.plannedEndDate
)
if (!valid) {
  console.error("Missing required date fields")
}

// Check 3: Valid date format (ISO 8601)
const iso8601Regex = /^\d{4}-\d{2}-\d{2}/
const validDates = milestones.every(m =>
  iso8601Regex.test(m.plannedStartDate)
)
```

### Timeline Metrics Zero?
```typescript
// Check for empty array
if (milestones.length === 0) {
  // getTimelineMetrics returns zeros
}

// Check for single milestone
if (milestones.length === 1) {
  // Critical path = that one milestone
  // Buffer = 0
}
```

### Dependencies Not Showing?
```typescript
// Check predecessorId exists
const hasDeps = milestones.some(m => m.predecessorId)
if (!hasDeps) {
  console.log("No dependencies defined")
}

// Check predecessor milestone exists
const invalidDeps = milestones.filter(m =>
  m.predecessorId && !milestones.find(p => p.id === m.predecessorId)
)
if (invalidDeps.length > 0) {
  console.warn("Some dependencies reference non-existent milestones")
}
```

### Risk Assessment Empty?
```typescript
// Most milestones are safe if:
// - Not on critical path
// - Within planned dates
// - No delays
// - All dependencies met
// - Good progress if in progress

// To trigger risks, create test data with:
const testMilestone = {
  ...milestone,
  actualEndDate: dayjs().subtract(10, 'days').toISOString(),
  status: 'IN_PROGRESS'
  // This will trigger "Planned end date has passed" risk
}
```

---

## Performance Tips

### For Large Datasets (100+ milestones)
```typescript
// 1. Use pagination on Gantt chart (already built-in)
// 2. Filter milestones before rendering
const recentMilestones = milestones.filter(m =>
  new Date(m.plannedEndDate) > new Date()
)

// 3. Use useQuery with caching
const { data: milestones } = useQuery({
  queryKey: ['milestones', projectId],
  queryFn: () => milestonesService.getProjectMilestones(projectId),
  staleTime: 1000 * 60 * 5, // 5 minutes cache
})

// 4. Debounce updates
const debouncedUpdate = useCallback(
  debounce((newMilestone) => {
    updateMilestone(newMilestone)
  }, 500),
  []
)
```

### Memory Optimization
```typescript
// Keep only needed fields in component state
const minimumFields = ['id', 'name', 'status', 'plannedStartDate', 'plannedEndDate']

// Memoize expensive calculations
const metrics = useMemo(() => getTimelineMetrics(milestones), [milestones])
const risks = useMemo(() => assessMilestoneRisks(milestones), [milestones])
```

---

## Testing Checklist

- [ ] Milestones render in Gantt chart
- [ ] Timeline scrolls horizontally
- [ ] Dependency lines appear
- [ ] Click milestone opens detail drawer
- [ ] Critical path highlights correctly
- [ ] Risk button shows count
- [ ] Metrics display correct values
- [ ] All 5 views switch without errors
- [ ] Responsive on mobile
- [ ] No console errors

---

## Import Cheat Sheet

```typescript
// Main component
import { ProjectTimelineManager } from '@/components/calendar'

// Individual views
import { GanttChartView } from '@/components/calendar'
import { TimelineView } from '@/components/calendar'
import { DependencyVisualization } from '@/components/calendar'
import { MonthCalendarView } from '@/components/calendar'
import { WeekCalendarView } from '@/components/calendar'

// Utilities
import {
  calculateCriticalPath,
  buildDependencyTree,
  getTimelineMetrics,
  assessMilestoneRisks,
  getStatusColor,
  getPriorityColor,
  getStatusLabel
} from '@/utils/calendarUtils'

// Types
import type {
  TimelineMetrics,
  RiskAssessment,
  DependencyNode
} from '@/utils/calendarUtils'
```

---

## Resources

- **Full Guide**: `CALENDAR_IMPLEMENTATION_GUIDE.md`
- **Summary**: `CALENDAR_IMPLEMENTATION_SUMMARY.md`
- **Original Plan**: `CALENDAR_TIMELINE_IMPROVEMENT_PLAN.md`

---

**Last Updated**: October 25, 2025
**Version**: 1.0 - Production Ready
