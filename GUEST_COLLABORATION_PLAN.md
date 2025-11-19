# Guest Collaboration System Implementation Plan

## Overview
Implement Frame.io/Notion-style guest access for media collaboration projects, allowing external collaborators (clients, freelancers) to access specific projects WITHOUT gaining access to the entire system (invoices, financial data, etc.).

---

## Current Problem

**Security Risk:**
- Adding collaborators currently creates full User accounts
- Guests can potentially access:
  - Financial data
  - Invoices
  - Clients
  - All other system features
- **Not suitable for external collaborators**

---

## Target Solution

### Two-Tier Access System

#### Tier 1: Internal Users (Full System Access)
- Employees and team members
- Have User accounts with login credentials
- Access: Media + Invoices + Clients + All Features
- Authentication: JWT token-based

#### Tier 2: Guest Collaborators (Project-Only Access)
- Clients, freelancers, external reviewers
- **NO User account required**
- Access: **ONLY the specific media project** they're invited to
- Authentication: Magic link with secure token
- Token expiration: 30 days (configurable)
- Cannot see anything else in the system

---

## Implementation Phases

### Phase 1: Database Schema Updates

#### 1.1 Update MediaCollaborator Model

**File:** `backend/prisma/schema.prisma`

```prisma
model MediaCollaborator {
  id          String   @id @default(cuid())
  projectId   String

  // EITHER linked to internal user OR guest email
  userId      String?   // NULL for guests
  guestEmail  String?   // NULL for internal users
  guestName   String?   // Guest's display name

  role        CollaboratorRole
  inviteToken String?   @unique  // For pending invites
  status      InviteStatus @default(PENDING)

  // Guest-specific fields
  lastAccessAt DateTime?
  expiresAt    DateTime?  // Optional expiration (30 days default)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project     MediaProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user        User?        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@unique([projectId, guestEmail])
  @@index([inviteToken])
  @@index([guestEmail])
  @@index([status])
}

enum InviteStatus {
  PENDING   // Invite sent, not accepted yet
  ACCEPTED  // Guest has accessed the project
  EXPIRED   // Invite expired
  REVOKED   // Access revoked by owner
}
```

#### 1.2 Create Migration

```bash
cd backend
npx prisma migrate dev --name add_guest_collaboration_support
```

---

### Phase 2: Backend Implementation

#### 2.1 Guest Authentication Guard

**File:** `backend/src/modules/media-collab/guards/guest-auth.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GuestAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Get token from query or header
    const token = request.query.token || request.headers['x-guest-token'];

    if (!token) {
      throw new UnauthorizedException('Guest token required');
    }

    // Validate guest token
    const collaborator = await this.prisma.mediaCollaborator.findUnique({
      where: { inviteToken: token },
      include: {
        project: true,
      },
    });

    if (!collaborator) {
      throw new UnauthorizedException('Invalid guest token');
    }

    // Check if expired
    if (collaborator.expiresAt && collaborator.expiresAt < new Date()) {
      throw new UnauthorizedException('Guest token expired');
    }

    // Check if revoked
    if (collaborator.status === 'REVOKED') {
      throw new UnauthorizedException('Guest access revoked');
    }

    // Update last access time
    await this.prisma.mediaCollaborator.update({
      where: { id: collaborator.id },
      data: {
        lastAccessAt: new Date(),
        status: 'ACCEPTED', // Auto-accept on first access
      },
    });

    // Attach collaborator to request (NOT full user)
    request.guestCollaborator = collaborator;
    request.isGuest = true;

    return true;
  }
}
```

#### 2.2 Token Generation Utility

**File:** `backend/src/modules/media-collab/utils/token.util.ts`

```typescript
import * as crypto from 'crypto';

export function generateSecureToken(): string {
  // Generate 32-byte random token, encode as base64url
  return crypto
    .randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function generateGuestInviteLink(token: string): string {
  const baseUrl = process.env.APP_URL || 'http://localhost:3001';
  return `${baseUrl}/guest/accept?token=${token}`;
}
```

#### 2.3 Guest Invite Service Methods

**File:** `backend/src/modules/media-collab/services/collaborators.service.ts`

```typescript
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { generateSecureToken } from '../utils/token.util';
import { addDays } from 'date-fns';

@Injectable()
export class CollaboratorsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Invite a guest collaborator (external user)
   */
  async inviteGuest(
    projectId: string,
    userId: string,
    data: { email: string; name: string; role: 'VIEWER' | 'COMMENTER' | 'EDITOR'; expiresInDays?: number }
  ) {
    // Verify user has OWNER role on project
    await this.verifyOwnerAccess(projectId, userId);

    // Check if guest already invited
    const existing = await this.prisma.mediaCollaborator.findUnique({
      where: {
        projectId_guestEmail: {
          projectId,
          guestEmail: data.email,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Guest already invited to this project');
    }

    // Generate secure invite token
    const inviteToken = generateSecureToken();
    const expiresAt = addDays(new Date(), data.expiresInDays || 30);

    // Create guest collaborator
    const collaborator = await this.prisma.mediaCollaborator.create({
      data: {
        projectId,
        guestEmail: data.email,
        guestName: data.name,
        role: data.role,
        inviteToken,
        status: 'PENDING',
        expiresAt,
      },
      include: {
        project: true,
      },
    });

    // TODO: Send email with invite link (Phase 3)
    // await this.emailService.sendGuestInvite({
    //   to: data.email,
    //   projectName: collaborator.project.name,
    //   inviteLink: generateGuestInviteLink(inviteToken),
    // });

    return {
      ...collaborator,
      inviteLink: generateGuestInviteLink(inviteToken), // Return link for now
    };
  }

  /**
   * Accept guest invite
   */
  async acceptGuestInvite(token: string) {
    const collaborator = await this.prisma.mediaCollaborator.findUnique({
      where: { inviteToken: token },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!collaborator) {
      throw new NotFoundException('Invalid invite token');
    }

    if (collaborator.expiresAt && collaborator.expiresAt < new Date()) {
      throw new BadRequestException('Invite has expired');
    }

    if (collaborator.status === 'REVOKED') {
      throw new ForbiddenException('Invite has been revoked');
    }

    // Mark as accepted
    await this.prisma.mediaCollaborator.update({
      where: { id: collaborator.id },
      data: {
        status: 'ACCEPTED',
        lastAccessAt: new Date(),
      },
    });

    return collaborator;
  }

  /**
   * Revoke guest access
   */
  async revokeGuestAccess(projectId: string, collaboratorId: string, userId: string) {
    await this.verifyOwnerAccess(projectId, userId);

    const collaborator = await this.prisma.mediaCollaborator.findUnique({
      where: { id: collaboratorId },
    });

    if (!collaborator || collaborator.projectId !== projectId) {
      throw new NotFoundException('Collaborator not found');
    }

    if (collaborator.userId) {
      throw new BadRequestException('Cannot revoke internal user access through this endpoint');
    }

    await this.prisma.mediaCollaborator.update({
      where: { id: collaboratorId },
      data: { status: 'REVOKED' },
    });

    return { message: 'Guest access revoked' };
  }

  /**
   * Regenerate guest invite link
   */
  async regenerateGuestInvite(projectId: string, collaboratorId: string, userId: string) {
    await this.verifyOwnerAccess(projectId, userId);

    const newToken = generateSecureToken();
    const expiresAt = addDays(new Date(), 30);

    const collaborator = await this.prisma.mediaCollaborator.update({
      where: { id: collaboratorId },
      data: {
        inviteToken: newToken,
        status: 'PENDING',
        expiresAt,
      },
    });

    return {
      ...collaborator,
      inviteLink: generateGuestInviteLink(newToken),
    };
  }

  private async verifyOwnerAccess(projectId: string, userId: string) {
    const collaborator = await this.prisma.mediaCollaborator.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!collaborator || collaborator.role !== 'OWNER') {
      throw new ForbiddenException('Only project owners can manage collaborators');
    }
  }
}
```

#### 2.4 Guest API Controllers

**File:** `backend/src/modules/media-collab/controllers/guest.controller.ts`

```typescript
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GuestAuthGuard } from '../guards/guest-auth.guard';
import { MediaAssetsService } from '../services/media-assets.service';
import { GuestCollaborator } from '../decorators/guest-collaborator.decorator';

@ApiTags('Guest Collaboration')
@Controller('media-collab/guest')
export class GuestController {
  constructor(
    private readonly assetsService: MediaAssetsService,
  ) {}

  /**
   * Accept guest invite (no auth required)
   */
  @Post('accept')
  @ApiOperation({ summary: 'Accept guest invite and get project access' })
  async acceptInvite(@Query('token') token: string) {
    const collaborator = await this.collaboratorsService.acceptGuestInvite(token);
    return {
      data: collaborator,
      message: 'Invite accepted successfully',
    };
  }

  /**
   * Get project assets (guest token required)
   */
  @Get('projects/:projectId/assets')
  @UseGuards(GuestAuthGuard)
  @ApiOperation({ summary: 'Get media assets for guest' })
  async getAssets(
    @Param('projectId') projectId: string,
    @GuestCollaborator() collaborator: any,
  ) {
    // Verify guest has access to this project
    if (collaborator.projectId !== projectId) {
      throw new ForbiddenException('Access denied to this project');
    }

    const assets = await this.assetsService.findAll(projectId, null, {});
    return {
      data: assets,
      message: 'Assets retrieved successfully',
    };
  }

  // Add more guest endpoints for comments, frames, etc.
}
```

#### 2.5 Update Existing Collaborators Controller

**File:** `backend/src/modules/media-collab/controllers/collaborators.controller.ts`

Add new endpoints:

```typescript
@Post('projects/:projectId/invite-guest')
@UseGuards(JwtAuthGuard)
async inviteGuest(
  @Param('projectId') projectId: string,
  @CurrentUser() user: any,
  @Body() inviteDto: InviteGuestDto,
) {
  return this.collaboratorsService.inviteGuest(projectId, user.id, inviteDto);
}

@Post('projects/:projectId/collaborators/:collaboratorId/revoke')
@UseGuards(JwtAuthGuard)
async revokeGuest(
  @Param('projectId') projectId: string,
  @Param('collaboratorId') collaboratorId: string,
  @CurrentUser() user: any,
) {
  return this.collaboratorsService.revokeGuestAccess(projectId, collaboratorId, user.id);
}

@Post('projects/:projectId/collaborators/:collaboratorId/regenerate')
@UseGuards(JwtAuthGuard)
async regenerateInvite(
  @Param('projectId') projectId: string,
  @Param('collaboratorId') collaboratorId: string,
  @CurrentUser() user: any,
) {
  return this.collaboratorsService.regenerateGuestInvite(projectId, collaboratorId, user.id);
}
```

---

### Phase 3: Frontend Implementation

#### 3.1 Guest Invite UI Component

**File:** `frontend/src/components/media/GuestInviteForm.tsx`

```typescript
import React, { useState } from 'react';
import { Input, Select, Button, Space, Form, message } from 'antd';
import { UserAddOutlined, LinkOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaCollabService } from '../../services/media-collab';

interface GuestInviteFormProps {
  projectId: string;
}

export const GuestInviteForm: React.FC<GuestInviteFormProps> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; name: string; role: string }) =>
      mediaCollabService.inviteGuest(projectId, data),
    onSuccess: (result) => {
      message.success('Guest invited successfully!');

      // Show invite link (until email is implemented)
      Modal.info({
        title: 'Invite Link Generated',
        content: (
          <div>
            <p>Share this link with the guest:</p>
            <Input.TextArea
              value={result.inviteLink}
              readOnly
              autoSize
              style={{ marginBottom: 8 }}
            />
            <Button
              icon={<LinkOutlined />}
              onClick={() => {
                navigator.clipboard.writeText(result.inviteLink);
                message.success('Link copied!');
              }}
            >
              Copy Link
            </Button>
          </div>
        ),
      });

      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['collaborators', projectId] });
    },
    onError: (error) => {
      message.error(getErrorMessage(error, 'Failed to invite guest'));
    },
  });

  return (
    <Form form={form} layout="inline" onFinish={inviteMutation.mutate}>
      <Form.Item
        name="email"
        rules={[
          { required: true, message: 'Email required' },
          { type: 'email', message: 'Invalid email' },
        ]}
      >
        <Input placeholder="Guest email" prefix={<UserAddOutlined />} />
      </Form.Item>

      <Form.Item
        name="name"
        rules={[{ required: true, message: 'Name required' }]}
      >
        <Input placeholder="Guest name" />
      </Form.Item>

      <Form.Item name="role" initialValue="VIEWER">
        <Select style={{ width: 140 }}>
          <Select.Option value="VIEWER">Viewer</Select.Option>
          <Select.Option value="COMMENTER">Commenter</Select.Option>
          <Select.Option value="EDITOR">Editor</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={inviteMutation.isPending}>
          Invite Guest
        </Button>
      </Form.Item>
    </Form>
  );
};
```

#### 3.2 Update CollaboratorManagement Component

**File:** `frontend/src/components/media/CollaboratorManagement.tsx`

Add tabs to separate internal users and guests:

```typescript
<Tabs defaultActiveKey="guests">
  <Tabs.TabPane tab="Guest Collaborators" key="guests">
    <GuestInviteForm projectId={projectId} />
    <Table
      dataSource={collaborators?.filter(c => c.guestEmail) || []}
      columns={guestColumns}
      // ... guest-specific actions (revoke, regenerate link)
    />
  </Tabs.TabPane>

  <Tabs.TabPane tab="Internal Team" key="internal">
    {/* Existing internal user management */}
  </Tabs.TabPane>
</Tabs>
```

#### 3.3 Guest Accept Invite Page

**File:** `frontend/src/pages/GuestAcceptInvitePage.tsx`

```typescript
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Result, Button, Spin } from 'antd';
import { mediaCollabService } from '../services/media-collab';

export const GuestAcceptInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const { data, isLoading, error } = useQuery({
    queryKey: ['guest-accept', token],
    queryFn: () => mediaCollabService.acceptGuestInvite(token!),
    enabled: !!token,
  });

  if (isLoading) {
    return <Spin size="large" />;
  }

  if (error) {
    return (
      <Result
        status="error"
        title="Invalid or Expired Invite"
        subTitle="This invite link is invalid or has expired."
      />
    );
  }

  return (
    <Result
      status="success"
      title="Welcome!"
      subTitle={`You've been invited to collaborate on "${data.project.name}"`}
      extra={
        <Button
          type="primary"
          onClick={() => navigate(`/guest/project/${data.projectId}?token=${token}`)}
        >
          View Project
        </Button>
      }
    />
  );
};
```

#### 3.4 Isolated Guest Project View

**File:** `frontend/src/pages/GuestProjectViewPage.tsx`

```typescript
import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout, Result } from 'antd';
import { MediaLibrary } from '../components/media/MediaLibrary';

export const GuestProjectViewPage: React.FC = () => {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { data: assets, isLoading } = useQuery({
    queryKey: ['guest-assets', projectId, token],
    queryFn: () => apiClient.get(`/media-collab/guest/projects/${projectId}/assets?token=${token}`),
    enabled: !!projectId && !!token,
  });

  if (!token) {
    return <Result status="error" title="Missing access token" />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Simple header (no navigation) */}
      <Layout.Header style={{ background: '#fff', padding: '0 24px' }}>
        <h2>Project Collaboration</h2>
      </Layout.Header>

      <Layout.Content style={{ padding: 24 }}>
        <MediaLibrary
          assets={assets?.data}
          readOnly={false} // Based on role from token
        />
      </Layout.Content>
    </Layout>
  );
};
```

#### 3.5 Update API Service

**File:** `frontend/src/services/media-collab.ts`

```typescript
class MediaCollabService {
  // ... existing methods

  async inviteGuest(projectId: string, data: { email: string; name: string; role: string }) {
    const response = await apiClient.post(`/media-collab/collaborators/projects/${projectId}/invite-guest`, data);
    return response.data;
  }

  async acceptGuestInvite(token: string) {
    const response = await apiClient.post(`/media-collab/guest/accept?token=${token}`);
    return response.data;
  }

  async revokeGuestAccess(projectId: string, collaboratorId: string) {
    const response = await apiClient.post(`/media-collab/collaborators/projects/${projectId}/collaborators/${collaboratorId}/revoke`);
    return response.data;
  }

  async regenerateGuestInvite(projectId: string, collaboratorId: string) {
    const response = await apiClient.post(`/media-collab/collaborators/projects/${projectId}/collaborators/${collaboratorId}/regenerate`);
    return response.data;
  }
}
```

#### 3.6 Add Routes

**File:** `frontend/src/App.tsx`

```typescript
<Routes>
  {/* ... existing routes */}

  {/* Guest routes (no auth required) */}
  <Route path="/guest/accept" element={<GuestAcceptInvitePage />} />
  <Route path="/guest/project/:projectId" element={<GuestProjectViewPage />} />
</Routes>
```

---

### Phase 4: Email Integration (Optional - Future Enhancement)

#### 4.1 Email Service Setup

**File:** `backend/src/modules/email/email.service.ts`

Use Nodemailer or SendGrid to send invite emails:

```typescript
@Injectable()
export class EmailService {
  async sendGuestInvite(data: {
    to: string;
    projectName: string;
    inviterName: string;
    inviteLink: string;
  }) {
    const subject = `You've been invited to collaborate on "${data.projectName}"`;
    const html = `
      <h2>Collaboration Invite</h2>
      <p>${data.inviterName} invited you to collaborate on <strong>${data.projectName}</strong>.</p>
      <p><a href="${data.inviteLink}">Click here to accept invite</a></p>
      <p><small>This link expires in 30 days.</small></p>
    `;

    // Send email via SendGrid/Nodemailer
    await this.mailer.sendMail({
      to: data.to,
      subject,
      html,
    });
  }
}
```

---

## Security Considerations

### ✅ Implemented Security Measures:

1. **Token-based authentication** - Secure random tokens (32 bytes)
2. **Expiration dates** - Default 30 days, configurable
3. **Revocable access** - Owners can revoke anytime
4. **Project isolation** - Guests can ONLY access invited project
5. **No system access** - Guests cannot see invoices, clients, etc.
6. **Status tracking** - PENDING → ACCEPTED → REVOKED/EXPIRED
7. **Last access tracking** - Monitor guest activity

### 🔒 Additional Security (Future):

1. Rate limiting on invite acceptance
2. IP logging for guest access
3. Audit trail for guest actions
4. Two-factor authentication for sensitive projects
5. Watermarking for downloaded assets

---

## Migration Strategy

### Step 1: Add Schema (Non-Breaking)
- Add optional fields to MediaCollaborator
- Keep existing userId functionality intact

### Step 2: Deploy Backend Changes
- Deploy new endpoints
- Existing collaborators continue to work

### Step 3: Deploy Frontend Changes
- Add guest invite UI
- Existing internal user flow unchanged

### Step 4: Gradual Adoption
- New projects use guest invites
- Existing projects can migrate individually

---

## Testing Checklist

### Backend Tests:
- [ ] Generate secure token (32 bytes, unique)
- [ ] Create guest collaborator with valid data
- [ ] Reject duplicate guest emails per project
- [ ] Accept valid invite token
- [ ] Reject expired invite token
- [ ] Reject revoked invite token
- [ ] Verify guest can only access invited project
- [ ] Owner can revoke guest access
- [ ] Regenerate invite link updates token

### Frontend Tests:
- [ ] Invite form validation (email, name required)
- [ ] Display invite link after creation
- [ ] Accept invite page handles invalid tokens
- [ ] Guest view shows only project assets
- [ ] Guest view respects role permissions (VIEWER vs EDITOR)
- [ ] Guest cannot navigate to other system pages
- [ ] Collaborator list shows guests and internal users separately

---

## Success Metrics

1. **Security**: 0 guest access to non-invited projects
2. **UX**: Guest can access project within 30 seconds of invite
3. **Adoption**: 80% of external collaborators use guest access (not User accounts)
4. **Performance**: Guest invite creation < 500ms
5. **Reliability**: 99.9% invite acceptance success rate

---

## Open Questions / Decisions Needed

1. **Email Service**: Which provider? (SendGrid, AWS SES, Mailgun)
2. **Expiration**: 30 days default? Allow custom per-invite?
3. **Permissions**: Should guests be able to download assets?
4. **Branding**: Custom invite email templates per organization?
5. **Analytics**: Track guest activity (views, downloads, comments)?

---

## Timeline Estimate

- **Phase 1 (Schema)**: 1 day
- **Phase 2 (Backend)**: 3-4 days
- **Phase 3 (Frontend)**: 3-4 days
- **Phase 4 (Email)**: 2 days (optional)
- **Testing**: 2 days
- **Total**: 11-14 days

---

## Future Enhancements

1. **Public sharing links** (view-only, no login required)
2. **Embed codes** (iframe project in client's website)
3. **Guest activity analytics** (most viewed assets, engagement)
4. **Custom permissions** (download yes/no, comment yes/no)
5. **Batch invites** (CSV upload, invite multiple guests)
6. **Guest onboarding tutorial** (first-time user guide)
7. **Mobile app support** (guest access via mobile)
