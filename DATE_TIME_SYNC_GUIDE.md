# Date/Time Synchronization System

## Overview

The webapp now has an intelligent date/time synchronization system that ensures accurate timestamps using free time APIs. The system automatically syncs with WorldTimeAPI and falls back to timeapi.io if needed.

## Features

✅ **Automatic Synchronization**: Syncs every 30 minutes and on tab focus
✅ **Indonesian Timezone (WIB)**: Properly configured for `Asia/Jakarta`
✅ **Fallback APIs**: Uses WorldTimeAPI with timeapi.io as backup
✅ **Clock Offset Detection**: Detects and corrects local clock drift
✅ **React Hooks**: Easy-to-use hooks for components
✅ **Type-Safe**: Full TypeScript support

## API Endpoints Used

### Primary: WorldTimeAPI (Free)
- Endpoint: `https://worldtimeapi.org/api/timezone/Asia/Jakarta`
- No API key required
- Rate limit: Generous for personal/small business use
- Docs: https://worldtimeapi.org/

### Fallback: TimeAPI.io (Free)
- Endpoint: `https://timeapi.io/api/Time/current/zone?timeZone=Asia/Jakarta`
- No API key required
- Docs: https://timeapi.io/

## Usage

### 1. Basic Date/Time Access

Replace `new Date()` with `now()` from the date utils:

```typescript
// ❌ OLD WAY (uses local system clock)
const currentDate = new Date()

// ✅ NEW WAY (uses synchronized time)
import { now } from '@/utils/date'
const currentDate = now()
```

### 2. Using React Hooks

#### Get Current Time (Auto-updating)
```typescript
import { useSyncedTime } from '@/hooks/useSyncedTime'

function MyComponent() {
  const currentTime = useSyncedTime() // Updates every second

  return <div>{currentTime.toLocaleString('id-ID')}</div>
}
```

#### Check Sync Status
```typescript
import { useTimeSyncStatus } from '@/hooks/useSyncedTime'

function SyncIndicator() {
  const { isSynced, offset, lastSync, timezone } = useTimeSyncStatus()

  return (
    <div>
      Status: {isSynced ? '✓ Synced' : '⏳ Syncing...'}
      Offset: {Math.round(offset / 60000)} minutes
      Timezone: {timezone}
    </div>
  )
}
```

#### Force Manual Sync
```typescript
import { useForceTimeSync } from '@/hooks/useSyncedTime'

function SyncButton() {
  const forceSync = useForceTimeSync()

  return (
    <button onClick={() => forceSync()}>
      Sync Now
    </button>
  )
}
```

### 3. Date Utility Functions

The new `/utils/date.ts` provides many helpful functions:

```typescript
import {
  now,              // Get current synced time
  formatShortDate,  // "10 Nov 2025"
  formatLongDate,   // "10 November 2025, 21:30 WIB"
  formatFormDate,   // "2025-11-10" (for forms)
  formatTime,       // "21:30"
  startOfDay,       // Today at 00:00:00
  endOfDay,         // Today at 23:59:59
  startOfMonth,     // First day of month
  endOfMonth,       // Last day of month
  startOfYear,      // First day of year
  endOfYear,        // Last day of year
  addDays,          // Add days to date
  addMonths,        // Add months to date
  addYears,         // Add years to date
  diffDays,         // Difference in days
  isOverdue,        // Check if date is overdue
  isToday,          // Check if date is today
  isPast,           // Check if date is past
  isFuture,         // Check if date is future
  getRelativeTime,  // "2 hari lagi", "3 hari yang lalu"
} from '@/utils/date'

// Examples:
const today = startOfDay()
const nextWeek = addDays(now(), 7)
const isLate = isOverdue(invoice.dueDate)
const relative = getRelativeTime(project.deadline) // "5 hari lagi"
```

### 4. Visual Indicator Component

Add the sync indicator to show users the time is accurate:

```typescript
import { DateTimeSyncIndicator } from '@/components/DateTimeSyncIndicator'

function Header() {
  return (
    <div>
      {/* Full indicator with date and time */}
      <DateTimeSyncIndicator showDate showTime />

      {/* Compact badge only */}
      <DateTimeSyncIndicator compact />

      {/* Time only */}
      <DateTimeSyncIndicator showDate={false} showTime />
    </div>
  )
}
```

## Synchronization Behavior

### Initial Load
1. App starts → Date/time sync initializes immediately
2. Fetches time from WorldTimeAPI
3. If WorldTimeAPI fails → tries timeapi.io
4. If all APIs fail → uses local system time
5. Calculates offset between server time and local time

### Periodic Sync
- Automatically syncs every 30 minutes
- Syncs when user returns to tab (visibility change)
- Can force manual sync via `forceSync()`

### Offset Correction
- If offset > 1 minute: Shows warning in console
- If offset > 2 minutes: Shows warning badge in UI
- All timestamps automatically corrected using calculated offset

## Migration Guide

### Update Existing Code

1. **Replace `new Date()` calls:**
```typescript
// Before
const createdAt = new Date()

// After
import { now } from '@/utils/date'
const createdAt = now()
```

2. **Replace date formatting:**
```typescript
// Before
const formatted = new Date().toLocaleDateString('id-ID')

// After
import { formatShortDate } from '@/utils/date'
const formatted = formatShortDate(now())
```

3. **Replace date calculations:**
```typescript
// Before
const nextMonth = new Date()
nextMonth.setMonth(nextMonth.getMonth() + 1)

// After
import { addMonths, now } from '@/utils/date'
const nextMonth = addMonths(now(), 1)
```

## Testing

### Check if Sync is Working

1. Open browser console
2. Look for these logs:
```
[DateTimeSync] Initializing date/time synchronization...
[DateTimeSync] Successfully synced with WorldTimeAPI
[DateTimeSync] Clock is synchronized (offset < 1 minute)
[DateTimeSync] Periodic sync started (every 30 minutes)
```

### Test Clock Offset Detection

If your system clock is wrong, you'll see:
```
[DateTimeSync] Clock offset detected: 5 minutes.
Server time: 2025-11-10T14:30:00.000Z, Local time: 2025-11-10T14:25:00.000Z
```

### Force Sync in Console

```javascript
// Import the service
import { dateTimeSync } from './services/dateTimeSync'

// Check current state
dateTimeSync.getSyncState()

// Force immediate sync
await dateTimeSync.forceSync()

// Get current synced time
dateTimeSync.now()
```

## Configuration

Edit `/frontend/src/services/dateTimeSync.ts` to customize:

```typescript
this.config = {
  timezone: 'Asia/Jakarta',        // Indonesian WIB
  syncIntervalMinutes: 30,         // Sync every 30 minutes
  retryAttempts: 3,                // Retry 3 times on failure
  retryDelayMs: 2000,             // 2 second delay between retries
}
```

## Troubleshooting

### Time is not syncing

1. Check browser console for errors
2. Test if APIs are accessible:
   - https://worldtimeapi.org/api/timezone/Asia/Jakarta
   - https://timeapi.io/api/Time/current/zone?timeZone=Asia/Jakarta
3. Check if behind firewall/proxy blocking API access
4. Force manual sync: `dateTimeSync.forceSync()`

### Clock offset warning

If you see clock offset warnings:
1. Check your system date/time settings
2. Enable automatic time synchronization in OS
3. Restart browser after fixing system time
4. The app will auto-correct timestamps regardless

### Build errors

If TypeScript errors occur:
```bash
cd frontend
npm run build
```

All types are properly defined in the new files.

## Benefits

✅ **Accurate Timestamps**: No more relying on potentially incorrect system clocks
✅ **Overdue Detection**: Correctly identifies overdue invoices
✅ **Accounting Periods**: Proper date filtering for financial reports
✅ **Indonesian Compliance**: Proper WIB timezone handling
✅ **User Trust**: Shows users the time is synchronized and accurate

## Files Created

- `/frontend/src/services/dateTimeSync.ts` - Core sync service
- `/frontend/src/utils/date.ts` - Date utility functions
- `/frontend/src/hooks/useSyncedTime.ts` - React hooks
- `/frontend/src/components/DateTimeSyncIndicator.tsx` - UI component
- `/frontend/src/App.tsx` - Updated to initialize sync

## Next Steps

1. ✅ System is now active and syncing
2. 🔄 Gradually migrate existing `new Date()` calls to `now()`
3. 🎨 Add `DateTimeSyncIndicator` to header/footer
4. 📊 Use in critical date-sensitive features (invoices, accounting)
5. 🧪 Test with different system clock settings

---

**Date/Time is now synchronized! 🎉**
