# Media Collaboration - Collaborators & Sharing Guide

**Date**: 2025-11-17
**Status**: Feature Implemented - Requires Backend Enhancement

---

## Overview

The media collaboration system now includes full collaborator management and project sharing capabilities. This guide explains how to use these features and what enhancements are needed.

---

## Features Implemented

### 1. Collaborator Management Button ✅

**Location**: Media Project Detail Page header

**What it does**:
- Opens the Collaborator Management modal
- Shows current collaborator count in button text
- Displays all project collaborators with their roles

**How to access**:
```
Navigate to: /media/project/{projectId}
Click: "Collaborators (X)" button in header
```

**Features**:
- View all collaborators
- See user details (name, email)
- View roles (OWNER, EDITOR, COMMENTER, VIEWER)
- Update collaborator roles (OWNER permission required)
- Remove collaborators (OWNER permission required)

---

### 2. Share Link Feature ✅

**Location**: Media Project Detail Page header

**What it does**:
- Generates shareable project link
- Provides one-click copy to clipboard
- Shows instructions for adding collaborators
- Displays current collaborator count

**How to use**:
```
Navigate to: /media/project/{projectId}
Click: "Share" button in header
Modal opens with:
  - Project URL (auto-generated)
  - Copy button (clipboard integration)
  - Instructions for inviting collaborators
  - Current stats
```

**Share Link Format**:
```
http://localhost:3001/media/project/{projectId}
```

---

## How to Add Collaborators

### Current UI Flow

1. **Open Project**
   ```
   Navigate to Media Project Detail page
   ```

2. **Click "Collaborators" Button**
   ```
   Opens CollaboratorManagement modal
   ```

3. **Enter Email Address**
   ```
   Type collaborator's email in input field
   ```

4. **Select Role**
   ```
   Choose from dropdown:
   - Editor (default)
   - Commenter
   - Viewer
   ```

5. **Click "Add" Button**
   ```
   Sends request to backend
   ```

---

## Current Implementation Status

### ✅ Fully Implemented (Frontend)

**CollaboratorManagement Component**:
- Location: `frontend/src/components/media/CollaboratorManagement.tsx`
- Features:
  - Display collaborators table
  - Role icons and colors
  - Permission badges
  - Update role dropdown
  - Remove collaborator button
  - Add collaborator form

**MediaProjectDetailPage**:
- Location: `frontend/src/pages/MediaProjectDetailPage.tsx`
- Features:
  - "Collaborators" button with count
  - "Share" button
  - Share link modal with copy functionality
  - Integration with CollaboratorManagement component

**Service Methods**:
- Location: `frontend/src/services/media-collab.ts`
- Methods:
  - `getProjectCollaborators(projectId)` ✅
  - `addCollaborator(projectId, data)` ✅
  - `updateCollaboratorRole(projectId, collaboratorId, role)` ✅
  - `removeCollaborator(projectId, collaboratorId)` ✅

---

### ⚠️ Requires Enhancement

**Issue**: Email to User ID Conversion

**Problem**:
- Frontend collects **email address** from user
- Backend expects **userId** in `CreateCollaboratorDto`
- No automatic conversion exists

**Current DTO (Backend)**:
```typescript
export class CreateCollaboratorDto {
  userId: string;  // ❌ Frontend doesn't have this
  role: CollaboratorRole;
}
```

**Frontend sends**:
```typescript
{
  email: string,  // ✅ User enters this
  role: string
}
```

---

## Solutions to Implement

### Option 1: Add User Lookup Endpoint (RECOMMENDED)

**Backend Enhancement**:
```typescript
// New endpoint in UsersController or MediaCollabController
@Get('users/lookup-by-email/:email')
async getUserByEmail(@Param('email') email: string) {
  const user = await this.usersService.findByEmail(email);
  if (!user) {
    throw new NotFoundException('User not found');
  }
  return { id: user.id, name: user.name, email: user.email };
}
```

**Frontend Update** (CollaboratorManagement.tsx):
```typescript
const addMutation = useMutation({
  mutationFn: async (data: { email: string; role: string }) => {
    // Step 1: Look up user by email
    const userResponse = await apiClient.get(`/users/lookup-by-email/${data.email}`);
    const userId = userResponse.data.id;

    // Step 2: Add collaborator with userId
    return mediaCollabService.addCollaborator(projectId, {
      userId,
      role: data.role as CollaboratorRole,
    });
  },
  // ... rest of mutation
});
```

---

### Option 2: Modify Backend to Accept Email

**Update CreateCollaboratorDto**:
```typescript
export class CreateCollaboratorDto {
  @IsString()
  @IsEmail()
  email: string;  // Changed from userId

  @IsEnum(CollaboratorRole)
  role: CollaboratorRole;
}
```

**Update MediaCollaboratorsService**:
```typescript
async addCollaborator(projectId: string, dto: CreateCollaboratorDto, invitedBy: string) {
  // Look up user by email
  const user = await this.prisma.user.findUnique({
    where: { email: dto.email },
  });

  if (!user) {
    throw new NotFoundException(`User with email ${dto.email} not found`);
  }

  // Rest of implementation using user.id
  // ...
}
```

---

### Option 3: Use Autocomplete with User List

**Frontend Enhancement**:
```typescript
// Add user search
const { data: users = [] } = useQuery({
  queryKey: ['users', searchEmail],
  queryFn: () => usersService.searchUsers(searchEmail),
  enabled: searchEmail.length >= 3,
});

// Use AutoComplete component
<AutoComplete
  value={searchEmail}
  onChange={setSearchEmail}
  onSelect={(userId, option) => {
    setSelectedUserId(userId);
    setSearchEmail(option.label);
  }}
  options={users.map(user => ({
    value: user.id,
    label: `${user.name} (${user.email})`
  }))}
  placeholder="Search by name or email"
/>
```

---

## Recommended Implementation (Option 1 Enhanced)

### Step 1: Create User Lookup Endpoint

**File**: `backend/src/modules/users/users.controller.ts`

```typescript
@Get('lookup-by-email')
@ApiOperation({ summary: 'Find user by email address' })
async findByEmail(@Query('email') email: string) {
  const user = await this.usersService.findByEmail(email);
  if (!user) {
    throw new NotFoundException('User with this email not found');
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}
```

### Step 2: Add UsersService Method

**File**: `backend/src/modules/users/users.service.ts`

```typescript
async findByEmail(email: string) {
  return this.prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}
```

### Step 3: Update Frontend Service

**File**: `frontend/src/services/users.ts` (create if doesn't exist)

```typescript
export const usersService = {
  async findByEmail(email: string) {
    const response = await apiClient.get('/users/lookup-by-email', {
      params: { email },
    });
    return response.data;
  },
};
```

### Step 4: Update CollaboratorManagement Component

**File**: `frontend/src/components/media/CollaboratorManagement.tsx`

Replace the placeholder add mutation (lines 63-76) with:

```typescript
const addMutation = useMutation({
  mutationFn: async (data: { email: string; role: string }) => {
    try {
      // Look up user by email
      const user = await usersService.findByEmail(data.email);

      // Add collaborator with user ID
      return await mediaCollabService.addCollaborator(projectId, {
        userId: user.id,
        role: data.role as CollaboratorRole,
      });
    } catch (error) {
      if ((error as any).response?.status === 404) {
        throw new Error('No user found with that email address');
      }
      throw error;
    }
  },
  onSuccess: () => {
    message.success('Collaborator added successfully');
    queryClient.invalidateQueries({ queryKey: ['collaborators', projectId] });
    setSearchEmail('');
  },
  onError: (error: unknown) => {
    message.error(getErrorMessage(error, 'Failed to add collaborator'));
  },
});
```

---

## Role-Based Access Control (RBAC)

### Permission Matrix

| Role | View Assets | Upload | Edit | Delete | Comment | Manage Collaborators | Delete Project |
|------|-------------|--------|------|--------|---------|---------------------|----------------|
| **OWNER** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **EDITOR** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **COMMENTER** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **VIEWER** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### UI Behavior

**OWNER only**:
- Can change any collaborator's role
- Can remove collaborators
- Cannot remove themselves
- Cannot change project creator's role

**All Users**:
- Can remove themselves from project
- Can view all collaborators
- See role badges and permissions

---

## User Workflow Examples

### Example 1: Adding a Collaborator

```
1. Project owner navigates to project detail page
2. Clicks "Collaborators (1)" button
3. Modal opens showing current collaborators
4. Enters colleague's email: "john@example.com"
5. Selects role: "Editor"
6. Clicks "Add" button
7. System:
   - Looks up john@example.com → finds user ID
   - Adds user as Editor
   - Sends notification (if implemented)
   - Updates UI showing john in collaborators list
8. John can now access the project at the share link
```

### Example 2: Sharing Project Link

```
1. User clicks "Share" button
2. Modal opens with auto-generated link:
   http://localhost:3001/media/project/abc123
3. User clicks copy icon
4. Link copied to clipboard
5. User pastes link in email/Slack/Teams
6. Recipient clicks link
7. If recipient is already a collaborator → Access granted
8. If not → Shows "Access denied" or login prompt
```

### Example 3: Changing Collaborator Role

```
1. Project owner opens Collaborators modal
2. Sees collaborator list with role dropdowns
3. Finds "Jane Doe" currently as "Viewer"
4. Changes dropdown to "Editor"
5. System immediately updates:
   - Updates database
   - Refreshes UI
   - Jane now has editor permissions
```

---

## Security Considerations

### Access Control

1. **Only project collaborators can view project**
   - Enforce in backend via guards/middleware
   - Check user is in collaborators table

2. **Role-based permissions enforced**
   - Backend validates all operations
   - Frontend hides unauthorized actions

3. **Project creator cannot be removed**
   - Validation in backend service
   - UI prevents removal attempt

### Share Link Security

**Current**: Simple URL sharing
**Recommended Enhancements**:
1. Add expiring share tokens
2. Require email verification
3. Add public/private project settings
4. Implement invitation system with email confirmation

---

## Testing Guide

### Manual Testing Checklist

#### Collaborator Management
- [ ] Open collaborators modal
- [ ] View existing collaborators
- [ ] Add new collaborator by email
- [ ] Try invalid email → See error
- [ ] Try email not in system → See "user not found"
- [ ] Change collaborator role
- [ ] Try to remove OWNER → See disabled state
- [ ] Remove regular collaborator → Success
- [ ] Verify collaborator count updates

#### Share Link
- [ ] Click "Share" button
- [ ] See generated link
- [ ] Click copy icon
- [ ] Paste in browser → Link works
- [ ] Share via email
- [ ] Non-collaborator clicks link → Access denied
- [ ] Collaborator clicks link → Access granted

#### Permissions
- [ ] Login as OWNER → See all controls
- [ ] Login as EDITOR → Cannot manage collaborators
- [ ] Login as COMMENTER → Can only comment
- [ ] Login as VIEWER → Read-only access

---

## Files Modified

### Frontend
1. `frontend/src/pages/MediaProjectDetailPage.tsx`
   - Added CollaboratorManagement import
   - Added "Collaborators" button
   - Added "Share" button
   - Added share link modal
   - Added copy to clipboard handler

2. `frontend/src/components/media/CollaboratorManagement.tsx`
   - Already fully implemented
   - **Needs**: Update addMutation to use user lookup

### Backend
**No changes needed** - All endpoints already exist!
- GET `/media-collab/collaborators/project/:projectId`
- POST `/media-collab/collaborators/project/:projectId`
- PUT `/media-collab/collaborators/project/:projectId/:collaboratorId`
- DELETE `/media-collab/collaborators/project/:projectId/:collaboratorId`

**Optional Enhancement**:
- Add `GET /users/lookup-by-email?email=...` endpoint

---

## Quick Start Guide

### For Users

1. **Open your media project**
2. **Click "Collaborators" button** to manage team
3. **Click "Share" button** to get project link
4. **Copy link** and share with team
5. **Add collaborators** by email address
6. **Assign roles** based on their responsibilities

### For Developers

1. **Implement user lookup endpoint** (Option 1 recommended)
2. **Update CollaboratorManagement.tsx** add mutation
3. **Test end-to-end**:
   - Add collaborator by email
   - Verify role permissions
   - Test share link
4. **Deploy to production**

---

## Summary

✅ **UI Fully Implemented**
- Collaborator management modal
- Share link feature
- Role management
- Permission-based UI

⚠️ **Requires**:
- User lookup by email endpoint
- Update add collaborator mutation

⏱️ **Estimated Time to Complete**:
- Backend endpoint: 30 minutes
- Frontend update: 15 minutes
- Testing: 30 minutes
- **Total**: ~1.5 hours

Once the user lookup endpoint is added, the collaborator system will be 100% functional!
