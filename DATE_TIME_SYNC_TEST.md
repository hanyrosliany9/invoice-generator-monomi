# Testing Date/Time Synchronization

## Quick Test (Browser Console)

1. Open the webapp: http://localhost:3001
2. Open browser DevTools (F12)
3. Go to Console tab
4. Look for initialization logs:

```
[DateTimeSync] Initializing date/time synchronization...
[DateTimeSync] Successfully synced with WorldTimeAPI
[DateTimeSync] Clock is synchronized (offset < 1 minute)
[DateTimeSync] Periodic sync started (every 30 minutes)
```

## Manual Test in Console

Once the app loads, run these commands in the browser console:

### 1. Check if date/time is synced
```javascript
// Import and check sync state
const { dateTimeSync } = await import('/src/services/dateTimeSync.ts')
const state = dateTimeSync.getSyncState()
console.log('Sync State:', state)
console.log('Is Synced:', state.isSynced)
console.log('Offset (minutes):', Math.round(state.offset / 60000))
console.log('Timezone:', state.timezone)
```

### 2. Get current synchronized time
```javascript
const { getCurrentDateTime } = await import('/src/services/dateTimeSync.ts')
const now = getCurrentDateTime()
console.log('Synced Time:', now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }))
console.log('System Time:', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }))
```

### 3. Compare with system time
```javascript
const { dateTimeSync } = await import('/src/services/dateTimeSync.ts')
const syncedTime = dateTimeSync.now()
const systemTime = new Date()
const diffMs = syncedTime.getTime() - systemTime.getTime()
const diffMin = Math.round(diffMs / 60000)

console.log('=== TIME COMPARISON ===')
console.log('Synced Time:', syncedTime.toISOString())
console.log('System Time:', systemTime.toISOString())
console.log('Difference:', diffMin, 'minutes')

if (Math.abs(diffMin) < 1) {
  console.log('✅ Clock is accurate!')
} else {
  console.log('⚠️ Clock offset detected:', diffMin, 'minutes')
}
```

### 4. Force manual synchronization
```javascript
const { dateTimeSync } = await import('/src/services/dateTimeSync.ts')
console.log('Forcing synchronization...')
await dateTimeSync.forceSync()
console.log('✅ Sync complete!')
console.log('New state:', dateTimeSync.getSyncState())
```

### 5. Test date utilities
```javascript
const {
  now,
  formatShortDate,
  formatLongDate,
  getRelativeTime,
  isOverdue,
  addDays
} = await import('/src/utils/date.ts')

const currentTime = now()
const nextWeek = addDays(currentTime, 7)
const lastWeek = addDays(currentTime, -7)

console.log('=== DATE UTILITIES TEST ===')
console.log('Current Time:', formatLongDate(currentTime))
console.log('Short Format:', formatShortDate(currentTime))
console.log('Next Week:', getRelativeTime(nextWeek))
console.log('Last Week:', getRelativeTime(lastWeek))
console.log('Is Last Week Overdue?', isOverdue(lastWeek))
```

## Expected Results

### If System Clock is Correct
```
[DateTimeSync] Clock is synchronized (offset < 1 minute)
✅ Clock is accurate!
```

### If System Clock is Wrong
```
[DateTimeSync] Clock offset detected: 5 minutes.
Server time: 2025-11-10T14:30:00.000Z
Local time: 2025-11-10T14:25:00.000Z
⚠️ Clock offset detected: 5 minutes
```

But don't worry - the app automatically corrects all timestamps!

## Network Test

### Check if time APIs are accessible

```bash
# Test WorldTimeAPI
curl "https://worldtimeapi.org/api/timezone/Asia/Jakarta"

# Test TimeAPI.io (fallback)
curl "https://timeapi.io/api/Time/current/zone?timeZone=Asia/Jakarta"
```

Expected response (WorldTimeAPI):
```json
{
  "abbreviation": "WIB",
  "datetime": "2025-11-10T21:30:45.123456+07:00",
  "timezone": "Asia/Jakarta",
  ...
}
```

## Integration Test

### Test with Invoice Due Date

1. Go to Invoices page: http://localhost:3001/invoices
2. Open browser console
3. Run this test:

```javascript
// Get current synced time
const { now, isOverdue, diffDays } = await import('/src/utils/date.ts')

// Test with sample due date
const dueDate = new Date('2025-11-05') // Past date
const currentDate = now()

console.log('=== INVOICE DUE DATE TEST ===')
console.log('Due Date:', dueDate.toLocaleDateString('id-ID'))
console.log('Current Date (Synced):', currentDate.toLocaleDateString('id-ID'))
console.log('Is Overdue?', isOverdue(dueDate))
console.log('Days Past Due:', diffDays(dueDate, currentDate))
```

## Monitoring

### Watch for Periodic Syncs

The system syncs every 30 minutes. To watch it in action:

1. Keep browser console open
2. Wait 30 minutes
3. You should see:
```
[DateTimeSync] Successfully synced with WorldTimeAPI
[DateTimeSync] Clock is synchronized (offset < 1 minute)
```

### Watch for Tab Focus Sync

1. Switch to another tab/application
2. Wait a few minutes
3. Switch back to the webapp tab
4. Check console - should see sync attempt

## Troubleshooting

### No sync logs appearing

**Problem**: Console is empty, no sync logs

**Solution**:
1. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. Clear cache and reload
3. Check if containers are running: `docker compose -f docker-compose.dev.yml ps`

### API errors in console

**Problem**: "Failed to fetch" or network errors

**Solution**:
1. Check internet connection
2. Try accessing APIs directly in browser:
   - https://worldtimeapi.org/api/timezone/Asia/Jakarta
   - https://timeapi.io/api/Time/current/zone?timeZone=Asia/Jakarta
3. Check if corporate firewall is blocking
4. The app will fallback to local time if APIs fail

### TypeScript errors

**Problem**: Import errors or type mismatches

**Solution**:
```bash
# Rebuild the app
docker compose -f docker-compose.dev.yml exec app sh -c "cd frontend && npm run build"
```

## Visual Test

### Add Sync Indicator to UI

To see the sync status visually, add this to any page:

1. Open `/frontend/src/pages/DashboardPage.tsx`
2. Add at the top of the component:

```typescript
import { DateTimeSyncIndicator } from '../components/DateTimeSyncIndicator'

// Inside the component:
<DateTimeSyncIndicator showDate showTime />
```

You should see:
- 🟢 Green badge = Synced and accurate
- 🟡 Yellow badge = Synced but offset detected
- ⚪ Gray badge = Currently syncing

## Performance Test

### Check Sync Performance

```javascript
const { dateTimeSync } = await import('/src/services/dateTimeSync.ts')

console.time('Sync Time')
await dateTimeSync.forceSync()
console.timeEnd('Sync Time')
```

Expected: < 2 seconds (depending on network speed)

## Success Criteria

✅ Sync logs appear in console
✅ `isSynced: true` in sync state
✅ Clock offset < 2 minutes (or corrected if larger)
✅ Timezone shows "Asia/Jakarta"
✅ Date utilities work correctly
✅ No TypeScript errors in build

---

**All tests passing? Your date/time sync is working perfectly! 🎉**
