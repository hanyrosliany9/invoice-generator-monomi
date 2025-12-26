# Calendar Full Redesign Plan

## Scope
- **Approach**: Full Redesign
- **Backend**: New CalendarEvent model for meetings, reminders, tasks
- **Frontend**: 3-panel layout like Eventime/Cascal

---

## Target Design

```
┌──────────────┬─────────────────────────────────┬───────────────┐
│   SIDEBAR    │         MAIN CALENDAR           │ DETAIL PANEL  │
│   (280px)    │                                 │   (400px)     │
│              │                                 │               │
│ ┌──────────┐ │  December 2025    < Today >     │ Meeting with  │
│ │ Dec 2025 │ │  Month | Week | Day | List      │ CEO           │
│ │ [  26  ] │ │                                 │               │
│ └──────────┘ │  Mon   Tue   Wed   Thu   Fri    │ 📅 Dec 26     │
│              │                                 │ ⏰ 14:00-15:00│
│ Upcoming     │  08:00 ┌────────────────┐       │ 📁 Project X  │
│ ──────────── │        │ Team Meeting   │       │               │
│ • Team Mtg   │        │ 08:00-10:00    │       │ Attendees:    │
│   Today 14:00│  09:00 │ 👤👤👤         │       │ 👤 John       │
│              │        └────────────────┘       │ 👤 Jane       │
│ • Review     │                                 │               │
│   Tomorrow   │  10:00 ┌─────────┐              │ [Edit] [Del]  │
│              │        │ Review  │              │               │
│ Filters      │        └─────────┘              │ Category:     │
│ ──────────── │                                 │ [Meeting]     │
│ □ Meetings   │  11:00                          │ [Project]     │
│ □ Projects   │                                 │               │
│ □ Milestones │  + Add Event                    │               │
└──────────────┴─────────────────────────────────┴───────────────┘
```

---

## Backend Implementation

### 1. Prisma Schema

**File:** `backend/prisma/schema.prisma`

```prisma
enum EventCategory {
  MEETING
  PROJECT_WORK
  MILESTONE
  TASK
  REMINDER
  PHOTOSHOOT
  DELIVERY
  OTHER
}

enum EventStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model CalendarEvent {
  id          String        @id @default(cuid())
  title       String
  description String?
  location    String?

  // Timing
  startTime   DateTime
  endTime     DateTime
  allDay      Boolean       @default(false)
  timezone    String        @default("Asia/Jakarta")

  // Categorization
  category    EventCategory @default(OTHER)
  status      EventStatus   @default(SCHEDULED)
  color       String?       // Custom color override
  priority    Priority?     @default(MEDIUM)

  // Relations
  projectId   String?
  project     Project?      @relation(fields: [projectId], references: [id])

  milestoneId String?
  milestone   ProjectMilestone? @relation(fields: [milestoneId], references: [id])

  clientId    String?
  client      Client?       @relation(fields: [clientId], references: [id])

  // Ownership
  createdById String
  createdBy   User          @relation("CreatedEvents", fields: [createdById], references: [id])

  assigneeId  String?
  assignee    User?         @relation("AssignedEvents", fields: [assigneeId], references: [id])

  // Multiple attendees
  attendees   EventAttendee[]

  // Recurrence (future feature)
  recurrence  String?       // RRULE format
  parentId    String?       // For recurring event instances
  parent      CalendarEvent? @relation("RecurringSeries", fields: [parentId], references: [id])
  instances   CalendarEvent[] @relation("RecurringSeries")

  // Reminders
  reminders   EventReminder[]

  // Metadata
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([startTime, endTime])
  @@index([createdById])
  @@index([assigneeId])
  @@index([projectId])
  @@index([category])
}

model EventAttendee {
  id        String        @id @default(cuid())
  eventId   String
  event     CalendarEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId    String
  user      User          @relation(fields: [userId], references: [id])
  status    AttendeeStatus @default(PENDING)

  @@unique([eventId, userId])
}

enum AttendeeStatus {
  PENDING
  ACCEPTED
  DECLINED
  TENTATIVE
}

model EventReminder {
  id        String        @id @default(cuid())
  eventId   String
  event     CalendarEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  minutes   Int           // Minutes before event
  sent      Boolean       @default(false)

  @@index([eventId])
}
```

### 2. Backend Module

**Create:** `backend/src/modules/calendar-events/`

```
calendar-events/
├── calendar-events.module.ts
├── calendar-events.controller.ts
├── calendar-events.service.ts
├── dto/
│   ├── create-event.dto.ts
│   ├── update-event.dto.ts
│   └── query-events.dto.ts
└── entities/
    └── calendar-event.entity.ts
```

**Key Endpoints:**
```typescript
GET    /calendar-events           // List events (with date range, filters)
GET    /calendar-events/:id       // Get single event
POST   /calendar-events           // Create event
PATCH  /calendar-events/:id       // Update event
DELETE /calendar-events/:id       // Delete event
POST   /calendar-events/:id/reschedule  // Drag-drop reschedule
GET    /calendar-events/upcoming  // Upcoming events for sidebar
```

**Query DTO:**
```typescript
export class QueryEventsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsArray()
  categories?: EventCategory[]

  @IsOptional()
  @IsString()
  projectId?: string

  @IsOptional()
  @IsString()
  assigneeId?: string

  @IsOptional()
  @Type(() => Number)
  limit?: number = 100
}
```

---

## Frontend Implementation

### 3. New Components

**File Structure:**
```
frontend/src/components/calendar/
├── CalendarPage.tsx              # Main page (redesigned)
├── CalendarLayout.tsx            # 3-panel grid layout
├── sidebar/
│   ├── CalendarSidebar.tsx       # Sidebar container
│   ├── MiniCalendar.tsx          # Small month calendar
│   ├── UpcomingEvents.tsx        # Today's events list
│   └── CalendarFilters.tsx       # Category/project filters
├── main/
│   ├── CalendarMain.tsx          # FullCalendar wrapper
│   ├── CalendarToolbar.tsx       # View toggles, add button
│   └── CustomEventRenderer.tsx   # Custom event display
├── detail/
│   ├── EventDetailPanel.tsx      # Right panel
│   └── EventForm.tsx             # Create/edit form
└── hooks/
    ├── useCalendarEvents.ts      # TanStack Query hooks
    └── useCalendarNavigation.ts  # Date navigation state
```

### 4. CalendarLayout Component

```tsx
// CalendarLayout.tsx
export const CalendarLayout: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [view, setView] = useState<'month' | 'week' | 'day' | 'list'>('week')

  return (
    <div className="calendar-layout">
      {/* Left Sidebar - Always visible */}
      <CalendarSidebar
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
      />

      {/* Main Calendar - Always visible */}
      <CalendarMain
        view={view}
        onViewChange={setView}
        selectedDate={selectedDate}
        onEventClick={setSelectedEvent}
        onDateClick={handleDateClick}
      />

      {/* Right Panel - Conditional */}
      <EventDetailDrawer
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  )
}
```

### 5. MiniCalendar Component

```tsx
// Using Ant Design Calendar in panel mode
import { Calendar } from 'antd'

export const MiniCalendar: React.FC<{
  value: Date
  onChange: (date: Date) => void
}> = ({ value, onChange }) => {
  return (
    <Calendar
      fullscreen={false}
      value={dayjs(value)}
      onChange={(date) => onChange(date.toDate())}
      headerRender={({ value, onChange }) => (
        <div className="mini-calendar-header">
          <Button onClick={() => onChange(value.subtract(1, 'month'))}>
            <LeftOutlined />
          </Button>
          <span>{value.format('MMM YYYY')}</span>
          <Button onClick={() => onChange(value.add(1, 'month'))}>
            <RightOutlined />
          </Button>
        </div>
      )}
    />
  )
}
```

### 6. UpcomingEvents Component

```tsx
export const UpcomingEvents: React.FC = () => {
  const { data: events } = useUpcomingEvents()

  return (
    <div className="upcoming-events">
      <h4>Upcoming</h4>
      <List
        dataSource={events}
        renderItem={(event) => (
          <List.Item>
            <div className="event-item">
              <Badge color={getCategoryColor(event.category)} />
              <div>
                <div className="event-title">{event.title}</div>
                <div className="event-time">
                  {formatRelativeTime(event.startTime)}
                </div>
              </div>
            </div>
          </List.Item>
        )}
      />
    </div>
  )
}
```

### 7. Enhanced FullCalendar Config

```tsx
// CalendarMain.tsx
<FullCalendar
  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
  initialView="timeGridWeek"

  // Time slots
  slotMinTime="06:00:00"
  slotMaxTime="22:00:00"
  slotDuration="00:30:00"

  // Week starts Monday (Indonesia)
  firstDay={1}

  // Locale
  locale="id"

  // Header
  headerToolbar={{
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
  }}

  // Interactions
  editable={true}
  selectable={true}
  selectMirror={true}

  // Event handlers
  eventDrop={handleEventDrop}
  eventResize={handleEventResize}
  select={handleDateRangeSelect}
  eventClick={handleEventClick}

  // Custom rendering
  eventContent={renderEventContent}

  // Event sources
  events={calendarEvents}

  // Styling
  eventDisplay="block"
  dayMaxEvents={3}
  moreLinkClick="popover"
/>
```

### 8. Event Aggregation

```tsx
// Combine all event sources
const calendarEvents = useMemo(() => {
  const events: EventInput[] = []

  // 1. Calendar Events (meetings, tasks, reminders)
  calendarEventsData?.forEach(e => {
    events.push({
      id: e.id,
      title: e.title,
      start: e.startTime,
      end: e.endTime,
      allDay: e.allDay,
      backgroundColor: getCategoryColor(e.category),
      borderColor: getCategoryColor(e.category),
      extendedProps: { type: 'event', data: e }
    })
  })

  // 2. Project Milestones (as events)
  milestones?.forEach(m => {
    events.push({
      id: `milestone-${m.id}`,
      title: `◆ ${m.name}`,
      start: m.plannedStartDate,
      end: m.plannedEndDate,
      backgroundColor: '#722ed1',
      extendedProps: { type: 'milestone', data: m }
    })
  })

  // 3. Projects (as background)
  projects?.forEach(p => {
    if (p.startDate) {
      events.push({
        id: `project-${p.id}`,
        title: p.number,
        start: p.startDate,
        end: p.endDate || p.startDate,
        display: 'background',
        backgroundColor: projectColors[p.id] + '20',
        extendedProps: { type: 'project', data: p }
      })
    }
  })

  return events
}, [calendarEventsData, milestones, projects])
```

---

## Execution Order

### Phase 1: Backend (COMPLETE ✅)
1. ✅ Add CalendarEvent, EventAttendee, EventReminder to schema
2. ✅ Run `npx prisma db push` (schema synced)
3. ✅ Create calendar-events module, service, controller
4. ✅ Create DTOs for CRUD operations
5. ✅ Registered in AppModule

**Status:** Backend API fully functional with all CRUD endpoints ready

### Phase 2: Frontend Layout (READY FOR IMPLEMENTATION)
1. Create CalendarLayout 3-panel grid
2. Create CalendarSidebar component
3. Create MiniCalendar using Ant Design Calendar
4. Create UpcomingEvents list
5. Wire up date navigation

### Phase 3: Main Calendar (Day 3)
1. Create CalendarMain with FullCalendar
2. Add view toggle toolbar
3. Implement event aggregation (events + milestones + projects)
4. Add custom event rendering
5. Add "+ Add Event" button

### Phase 4: Event CRUD (Day 4)
1. Create EventDetailPanel drawer
2. Create EventForm for create/edit
3. Wire up create/update/delete mutations
4. Add drag-drop reschedule
5. Add drag-to-resize

### Phase 5: Polish (Day 5)
1. Add CalendarFilters component
2. Add category color coding
3. Add attendee avatars
4. Add mobile responsive layout
5. Testing and bug fixes

---

## Files to Create/Modify

### Backend (New Files)
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Add CalendarEvent model |
| `modules/calendar-events/calendar-events.module.ts` | Module definition |
| `modules/calendar-events/calendar-events.service.ts` | Business logic |
| `modules/calendar-events/calendar-events.controller.ts` | API endpoints |
| `modules/calendar-events/dto/*.ts` | Request/Response DTOs |

### Frontend (New Files)
| File | Purpose |
|------|---------|
| `components/calendar/CalendarLayout.tsx` | 3-panel layout |
| `components/calendar/sidebar/CalendarSidebar.tsx` | Left sidebar |
| `components/calendar/sidebar/MiniCalendar.tsx` | Mini calendar |
| `components/calendar/sidebar/UpcomingEvents.tsx` | Events list |
| `components/calendar/sidebar/CalendarFilters.tsx` | Filters |
| `components/calendar/main/CalendarMain.tsx` | FullCalendar |
| `components/calendar/main/CalendarToolbar.tsx` | Toolbar |
| `components/calendar/detail/EventDetailPanel.tsx` | Right panel |
| `components/calendar/detail/EventForm.tsx` | Event form |
| `hooks/useCalendarEvents.ts` | TanStack Query hooks |
| `services/calendar-events.ts` | API service |

### Frontend (Modify)
| File | Change |
|------|--------|
| `pages/CalendarPage.tsx` | Replace with CalendarLayout |

---

## Success Criteria

### Backend (COMPLETE ✅)
- [x] CalendarEvent model with full CRUD operations
- [x] EventAttendee model with status tracking
- [x] EventReminder model with time-based triggers
- [x] Proper relations to Project, Milestone, Client
- [x] Query filtering (date range, categories, project, assignee)
- [x] Drag-drop reschedule endpoint
- [x] Upcoming events endpoint for sidebar
- [x] Full validation and error handling

### Frontend (PENDING - See calendar-full-redesign-progress.md)
- [ ] 3-panel layout: Sidebar | Calendar | Detail Panel
- [ ] Mini calendar for date navigation in sidebar
- [ ] Upcoming events list in sidebar
- [ ] Week view with time slots (default view)
- [ ] Month/Week/Day/List view toggles
- [ ] Events show time + title + category color
- [ ] Click event → detail panel opens
- [ ] Create new event via form
- [ ] Drag-drop to reschedule
- [ ] Drag to resize duration
- [ ] Filter by category
- [ ] Projects shown as background events
- [ ] Milestones shown as foreground events
- [ ] Mobile responsive

## Implementation Status

**PHASE 1 (Backend): COMPLETE ✅**
- Duration: Completed in current session
- Files Created: 7 (DTOs, Service, Controller, Module)
- Database: Synced and ready
- API Endpoints: 7 endpoints fully functional

**PHASES 2-5 (Frontend): READY FOR IMPLEMENTATION**
- Architecture planned and documented
- Backend API ready to consume
- Detailed component breakdown provided
- See `calendar-full-redesign-progress.md` for implementation guide
