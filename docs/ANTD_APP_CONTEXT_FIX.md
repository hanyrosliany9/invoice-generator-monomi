# Ant Design App Context Warning Fix

## Issue

**Warning Message**:
```
Warning: [antd: message] Static function can not consume context like dynamic theme.
Please use 'App' component instead.
```

**Location**: `PublicSharingToggle.tsx:67` (handleCopyLink function)

---

## Root Cause

### **Problem 1: Static Import**
The `PublicSharingToggle` component was importing `message` directly from `antd`:

```typescript
// WRONG - Static import
import { message } from 'antd';

// Using it directly
message.success('Link copied!');
```

**Why This Fails**:
- Static `message` API cannot access React Context
- Cannot consume dynamic theme tokens
- Cannot access `ConfigProvider` configuration
- Results in warning and potential styling inconsistencies

### **Problem 2: Missing App Component**
The ThemeProvider was missing the `<App>` component wrapper:

```typescript
// BEFORE - Missing App wrapper
<ConfigProvider theme={antdThemeConfig}>
  {children}
</ConfigProvider>
```

**Why This Matters**:
- Ant Design's `App.useApp()` hook requires `<App>` component in the tree
- Without it, hooks cannot access message/notification/modal context
- Components using `App.useApp()` will fail

---

## Solution

### **Fix 1: Use Hook-Based API**

Changed `PublicSharingToggle.tsx` to use `App.useApp()`:

```typescript
// CORRECT - Hook-based API
import { App } from 'antd';

export const PublicSharingToggle: React.FC<Props> = ({ project }) => {
  const { message } = App.useApp(); // ✅ Get from context

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(url);
    message.success('Link copied!'); // ✅ Uses theme context
  };
};
```

**Changes Made**:
- Removed `message` from antd imports
- Added `App` to antd imports
- Added `const { message } = App.useApp()` hook

### **Fix 2: Add App Component to Theme Provider**

Updated `ThemeContext.tsx` to wrap children with `<App>`:

```typescript
// CORRECT - With App wrapper
import { App } from 'antd';

export const ThemeProvider: React.FC<Props> = ({ children }) => {
  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider theme={antdThemeConfig}>
        <App> {/* ✅ Added App wrapper */}
          {children}
        </App>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};
```

**Changes Made**:
- Imported `App` from antd
- Wrapped `{children}` with `<App>` component

---

## Benefits

### **Before (Static API)**
❌ Cannot access theme context
❌ Cannot access ConfigProvider settings
❌ Console warnings in development
❌ Inconsistent styling with dynamic themes
❌ Limited customization options

### **After (Hook-Based API)**
✅ Full theme context access
✅ Respects ConfigProvider settings
✅ No console warnings
✅ Consistent styling with app theme
✅ Can customize per-instance
✅ Better TypeScript support

---

## Migration Pattern

For any component using static Ant Design APIs:

### **Message API**
```typescript
// BEFORE
import { message } from 'antd';
message.success('Done!');

// AFTER
import { App } from 'antd';
const { message } = App.useApp();
message.success('Done!');
```

### **Modal API**
```typescript
// BEFORE
import { Modal } from 'antd';
Modal.confirm({ title: 'Confirm?' });

// AFTER
import { App } from 'antd';
const { modal } = App.useApp();
modal.confirm({ title: 'Confirm?' });
```

### **Notification API**
```typescript
// BEFORE
import { notification } from 'antd';
notification.info({ message: 'Info' });

// AFTER
import { App } from 'antd';
const { notification } = App.useApp();
notification.info({ message: 'Info' });
```

---

## Component Tree Structure

```
<ThemeProvider>
  ├─ <ThemeContext.Provider>
  │   └─ <ConfigProvider theme={...}>
  │       └─ <App>                        ← ✅ Provides context
  │           └─ <BrowserRouter>
  │               └─ <Routes>
  │                   └─ <MediaProjectDetailPage>
  │                       └─ <PublicSharingToggle>
  │                           ├─ const { message } = App.useApp()  ← ✅ Consumes context
  │                           └─ message.success()                 ← ✅ Works!
```

---

## Verification

### **Check 1: No Console Warnings**
✅ Warning should be gone from console
✅ No errors when clicking "Copy Link"

### **Check 2: Theme Integration**
✅ Message toasts use current theme colors
✅ Dark mode → dark message background
✅ Light mode → light message background

### **Check 3: Functionality**
✅ "Copy Link" button still works
✅ Success message appears
✅ Link copied to clipboard

---

## Other Affected Components

Components that may need similar fixes:

### **Search for Static Usage**
```bash
# Find components using static message
grep -r "import.*message.*from 'antd'" frontend/src/

# Find components using static Modal
grep -r "Modal\.confirm\|Modal\.info" frontend/src/

# Find components using static notification
grep -r "notification\.(success|error|info)" frontend/src/
```

### **Priority Fixes**
1. ✅ `PublicSharingToggle.tsx` - FIXED
2. Check other media collaboration components
3. Check upload/download handlers
4. Check auth/user management components

---

## Best Practices

### **DO**
✅ Always use `App.useApp()` in functional components
✅ Wrap app root with `<App>` component
✅ Import `App` from antd, not static APIs
✅ Use hook-based message/modal/notification

### **DON'T**
❌ Don't import static `message`, `Modal`, `notification`
❌ Don't use static APIs in new components
❌ Don't nest multiple `<App>` components
❌ Don't use hooks outside component body

---

## Documentation Links

- [Ant Design App Component](https://ant.design/components/app)
- [Message Hook API](https://ant.design/components/message#why-cant-i-use-message-api-in-provider)
- [ConfigProvider](https://ant.design/components/config-provider)
- [Theme Customization](https://ant.design/docs/react/customize-theme)

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| **API Type** | Static import | Hook-based |
| **Theme Access** | ❌ No | ✅ Yes |
| **Console Warnings** | ❌ Yes | ✅ None |
| **Customization** | Limited | Full |
| **Type Safety** | Good | Better |
| **Best Practice** | ❌ Outdated | ✅ Modern |

---

**Status**: ✅ FIXED

**Files Modified**:
1. `frontend/src/components/media/PublicSharingToggle.tsx` - Changed to use `App.useApp()`
2. `frontend/src/theme/ThemeContext.tsx` - Added `<App>` wrapper

**Testing**: Verified that copy link functionality works and no console warnings appear.
