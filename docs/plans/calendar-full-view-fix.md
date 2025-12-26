# Calendar Full View Fix Plan

## Problem Statement

**Current Broken UX**: Calendar page shows empty state with buttons instead of the actual calendar view.

**What User Sees**:
- "Your projects don't have milestones yet"
- Buttons to add milestones
- NO CALENDAR VISIBLE

**What User Wants**:
- Full calendar grid ALWAYS visible
- Projects shown as timeline bars (using project start/end dates)
- Milestones as diamond markers on project timelines
- Quick-add stays, but calendar is the primary view

---

## Root Cause

The `CalendarPage.tsx` has this logic:
```typescript
if (allMilestones.length === 0 && projects.length > 0) {
  return <Empty>...</Empty>  // HIDES THE CALENDAR!
}
```

This completely hides the calendar when no milestones exist, even though:
- Projects exist with start/end dates
- Users need to SEE the calendar to understand their timeline
- Empty calendar is still useful for planning

---

## Solution

### 1. Always Show Calendar View
Remove the early return that hides calendar. Show calendar ALWAYS.

### 2. Show Projects as Events (Not Just Milestones)
Transform projects into calendar events using their `startDate` and `endDate`:

```typescript
// NEW: Transform projects to events
const projectEvents = projects.map(project => ({
  id: `project-${project.id}`,
  title: project.number,
  start: project.startDate,
  end: project.endDate,
  backgroundColor: projectColors[project.id],
  borderColor: projectColors[project.id],
  extendedProps: {
    type: 'project',
    projectId: project.id,
  }
}))

// Combine projects + milestones
const allEvents = [...projectEvents, ...milestoneEvents]
```

### 3. Visual Distinction
- **Projects**: Horizontal bars showing duration
- **Milestones**: Diamond markers (◆) on specific dates

### 4. Keep Quick-Add for Empty State
When no milestones exist, show info banner ABOVE calendar (not replacing it):

```typescript
{allMilestones.length === 0 && projects.length > 0 && (
  <Alert
    message="Tip: Click any date to add a milestone"
    type="info"
    showIcon
    style={{ marginBottom: 16 }}
  />
)}

{/* Calendar ALWAYS shows */}
<CalendarErrorBoundary>
  <MonthCalendarView events={allEvents} ... />
</CalendarErrorBoundary>
```

---

## Implementation

### File: `frontend/src/pages/CalendarPage.tsx`

#### Change 1: Create project events
```typescript
// After projectColors useMemo, add:
const projectEvents = useMemo(() => {
  return projects
    .filter(p => p.startDate || p.endDate)  // Only projects with dates
    .map(project => ({
      id: `project-${project.id}`,
      title: project.number,
      start: project.startDate,
      end: project.endDate || project.startDate,  // Fallback to start if no end
      backgroundColor: projectColors[project.id],
      borderColor: projectColors[project.id],
      textColor: '#ffffff',
      display: 'block',  // Show as bar, not dot
      extendedProps: {
        type: 'project',
        projectId: project.id,
        description: project.description,
      }
    }))
}, [projects, projectColors])
```

#### Change 2: Combine events
```typescript
// Replace calendarEvents with:
const calendarEvents = useMemo(() => {
  const milestoneEvents = filteredMilestones.map(milestone => ({
    // ... existing milestone transform
  }))

  return [...projectEvents, ...milestoneEvents]
}, [projectEvents, filteredMilestones])
```

#### Change 3: Remove empty state that hides calendar
```typescript
// REMOVE this entire block:
if (allMilestones.length === 0 && projects.length > 0) {
  return (
    <div>
      <Empty>...</Empty>
    </div>
  )
}

// REPLACE with inline tip above calendar:
{allMilestones.length === 0 && projects.length > 0 && (
  <Alert
    message="Your projects are shown below. Click any date to add milestones."
    type="info"
    showIcon
    closable
    style={{ marginBottom: 16 }}
  />
)}
```

#### Change 4: Handle project click
```typescript
const handleEventClick = (eventId: string) => {
  // Check if it's a project or milestone
  if (eventId.startsWith('project-')) {
    const projectId = eventId.replace('project-', '')
    navigate(`/projects/${projectId}`)
  } else {
    // Existing milestone click logic
    const milestone = filteredMilestones.find(m => m.id === eventId)
    // ...
  }
}
```

---

## Expected Result

After fix, calendar page will show:

```
┌─────────────────────────────────────────────────────────┐
│ 📅 Global Calendar                                       │
│                                                         │
│ ℹ️ Your projects are shown below. Click any date to add │
│    milestones.                                     [x]  │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │     December 2025                    < Today >      │ │
│ │ Sun   Mon   Tue   Wed   Thu   Fri   Sat            │ │
│ │  1     2     3     4     5     6     7             │ │
│ │ ████PRJ-PH-202512-001████████████████             │ │
│ │  8     9    10    11    12    13    14             │ │
│ │      ██████PRJ-PH-202512-002██████████            │ │
│ │ 15    16    17    18    19    20    21             │ │
│ │ ...                                                │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/pages/CalendarPage.tsx` | Remove empty state block, add project events, combine with milestones |

---

## Execution Order

1. Add `projectEvents` useMemo to transform projects to calendar events
2. Combine `projectEvents` with milestone events in `calendarEvents`
3. Remove the empty state early return block
4. Add info Alert above calendar (optional tip, closable)
5. Update `handleEventClick` to handle project clicks

---

## Success Criteria

- [ ] Calendar grid ALWAYS visible (no empty state hiding it)
- [ ] Projects shown as colored bars on calendar
- [ ] Clicking project bar navigates to project detail
- [ ] Tip message shown when no milestones (closable)
- [ ] Quick-add still works when clicking dates
