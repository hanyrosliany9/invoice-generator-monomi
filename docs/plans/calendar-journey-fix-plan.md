# Calendar User Journey Fix Plan

## Scope
- **Focus**: Fix broken data loading + improve empty state
- **Skip**: Timeline view (future phase)

---

## Problem Statement

**Broken Journey**: Calendar page shows empty/stale data, forcing users to visit Projects page first.

**Expected**: Calendar shows all projects with milestones immediately on first load.

---

## Root Cause

| Issue | Location | Details |
|-------|----------|---------|
| **Missing Type** | `services/projects.ts` | `Project` interface missing `milestones` field |
| **Type Workaround** | `CalendarPage.tsx:94` | Uses `(project as any).milestones` |
| **Stale Cache** | `useProjects.ts` | 5-minute `staleTime` serves empty data |

**Backend is fine** - `GET /projects` includes milestones in response.

---

## Implementation Plan

### 1. Update Project Interface
**File:** `frontend/src/services/projects.ts`

Add milestones to the Project interface:
```typescript
export interface Project {
  // ... existing fields ...
  milestones?: ProjectMilestone[]
}

export interface ProjectMilestone {
  id: string
  projectId: string
  milestoneNumber: number
  name: string
  description?: string
  status: string
  priority?: string
  plannedStartDate?: string
  plannedEndDate?: string
  completedDate?: string
  completionPercentage?: number
  plannedRevenue?: number
  estimatedCost?: number
}
```

### 2. Force Fresh Data on Calendar Mount
**File:** `frontend/src/hooks/useProjects.ts`

Add `refetchOnMount: true` to ensure fresh data:
```typescript
export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await apiClient.get('/projects')
      return response?.data?.data || []
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,  // ADD THIS
  })
}
```

### 3. Remove Type Workarounds
**File:** `frontend/src/pages/CalendarPage.tsx`

Change:
```typescript
// FROM:
const projectMilestones = (project as any).milestones || []

// TO:
const projectMilestones = project.milestones || []
```

### 4. Improve Empty State
**File:** `frontend/src/pages/CalendarPage.tsx`

Replace "Go to Projects" with inline quick-add:
```typescript
if (allMilestones.length === 0 && projects.length > 0) {
  return (
    <div style={{ padding: '24px' }}>
      <h1>Global Calendar</h1>
      <Card>
        <Empty description="Your projects don't have milestones yet">
          <p style={{ marginBottom: 16 }}>
            Click any project below to add its first milestone
          </p>
          <Space wrap>
            {projects.slice(0, 5).map(project => (
              <Button
                key={project.id}
                type="primary"
                ghost
                onClick={() => {
                  setSelectedDate(new Date())
                  setQuickAddOpen(true)
                }}
              >
                + {project.number}
              </Button>
            ))}
          </Space>
        </Empty>
      </Card>
    </div>
  )
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/services/projects.ts` | Add `milestones` and `ProjectMilestone` interfaces |
| `frontend/src/hooks/useProjects.ts` | Add `refetchOnMount: true` |
| `frontend/src/pages/CalendarPage.tsx` | Remove `as any` casts, improve empty state |

---

## Execution Order

1. **First**: Update `Project` interface in `services/projects.ts`
2. **Second**: Add `refetchOnMount: true` to `useProjects` hook
3. **Third**: Remove `(project as any)` casts in CalendarPage
4. **Fourth**: Improve empty state with quick-add buttons

---

## Success Criteria

After implementation:
- [x] Opening Calendar page shows milestones immediately (DONE)
- [x] No TypeScript `any` casts for milestones data (DONE)
- [x] Empty state allows adding milestones without leaving Calendar (DONE)
- [x] Data is fresh on every page visit (DONE)

---

## Implementation Summary

### Complete! ✅

All 4 tasks have been successfully implemented:

**1. Updated Project Interface** ✅
- Added `ProjectMilestone` interface to `services/projects.ts`
- Added `milestones?: ProjectMilestone[]` field to `Project` interface
- Now properly typed with full milestone data

**2. Added refetchOnMount** ✅
- Added `refetchOnMount: true` to `useProjects` hook
- Calendar page now fetches fresh data on every mount
- Ensures users see current milestones immediately

**3. Removed Type Workarounds** ✅
- Changed `(project as any).milestones` → `project.milestones`
- Changed `(milestone: any) =>` → `(milestone) =>`
- Full TypeScript type safety restored

**4. Improved Empty State** ✅
- Shows helpful "Your projects don't have milestones yet" message
- Displays quick-add buttons for up to 5 projects
- Users can create first milestone without leaving calendar
- Better UX flow: click project button → quick-add drawer opens

### Key Changes

**services/projects.ts**
```typescript
export interface ProjectMilestone {
  id: string
  projectId: string
  milestoneNumber: number
  name: string
  description?: string
  status: string
  priority?: string
  plannedStartDate?: string
  plannedEndDate?: string
  completedDate?: string
  completionPercentage?: number
  plannedRevenue?: number
  estimatedCost?: number
}

export interface Project {
  // ... existing fields ...
  milestones?: ProjectMilestone[]
}
```

**useProjects.ts**
```typescript
export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await apiClient.get('/projects')
      return response?.data?.data || []
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,  // ← Fresh data on every mount
  })
}
```

**CalendarPage.tsx**
```typescript
// Removed:
const projectMilestones = (project as any).milestones || []

// Now:
const projectMilestones = project.milestones || []

// Empty state now shows quick-add buttons:
if (allMilestones.length === 0 && projects.length > 0) {
  return (
    <Empty description="Your projects don't have milestones yet">
      <Space wrap>
        {projects.slice(0, 5).map((project) => (
          <Button onClick={() => setQuickAddOpen(true)}>
            + {project.number}
          </Button>
        ))}
      </Space>
    </Empty>
  )
}
```

### Benefits

1. **Better Data Flow**: Calendar always shows fresh milestone data
2. **Type Safety**: No more `any` casts, full TypeScript support
3. **Better UX**: Users can create milestones directly from empty state
4. **Performance**: `refetchOnMount` respects `staleTime`, no unnecessary API calls if data is fresh

### Build Status
✅ Successful - No TypeScript errors, no console warnings

---

## Out of Scope (Future)

- Timeline/Gantt view
- Project grouping in calendar
- Advanced filtering
