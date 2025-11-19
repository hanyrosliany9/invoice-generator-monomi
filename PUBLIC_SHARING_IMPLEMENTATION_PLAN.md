# Public Sharing Links Implementation Plan

## Overview
Implement Google Drive / Dropbox-style public sharing links for media collaboration projects. Anyone with the link can view the project without requiring an account, email invite, or authentication.

**Key Difference from Guest Collaboration**:
- **Guest Collaboration**: Email-based invites, per-person tokens, role-based permissions
- **Public Sharing**: Single shareable link, anonymous access, view-only

---

## Use Cases

1. **Client Previews**: Share project with client for quick review without formal invitation
2. **Portfolio Showcase**: Public gallery of work samples
3. **Social Media Sharing**: Share project link on social platforms
4. **Quick Feedback**: Get feedback from multiple people without managing individual invites
5. **Embedded Galleries**: Embed project in website as public gallery

---

## Implementation Phases

### Phase 1: Database Schema Updates

#### 1.1 Update MediaProject Model

**File**: `backend/prisma/schema.prisma`

```prisma
model MediaProject {
  id          String   @id @default(cuid())
  name        String
  description String?

  // ... existing fields ...

  // PUBLIC SHARING FIELDS
  isPublic           Boolean   @default(false)  // Enable/disable public access
  publicShareToken   String?   @unique          // Unique token for public link
  publicShareUrl     String?                    // Full URL for sharing
  publicViewCount    Int       @default(0)      // Track how many times viewed
  publicSharedAt     DateTime?                  // When sharing was enabled
  publicAccessLevel  PublicAccessLevel @default(VIEW_ONLY)  // Future: allow downloads, comments

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // ... existing relations ...
}

enum PublicAccessLevel {
  VIEW_ONLY        // Can only view assets
  DOWNLOAD         // Can view and download
  COMMENT          // Can view and comment (future)
}
```

#### 1.2 Create Migration

```bash
cd backend
npx prisma migrate dev --name add_public_sharing_to_media_projects
```

---

### Phase 2: Backend Implementation

#### 2.1 Public Sharing Token Utility

**File**: `backend/src/modules/media-collab/utils/public-share.util.ts`

```typescript
import * as crypto from 'crypto';

/**
 * Generate a URL-safe public share token
 * Shorter and more readable than guest tokens
 */
export function generatePublicShareToken(): string {
  // Generate 16-byte token (shorter for public URLs)
  return crypto
    .randomBytes(16)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate public share URL
 */
export function generatePublicShareUrl(token: string): string {
  const baseUrl = process.env.APP_URL || 'http://localhost:3001';
  return `${baseUrl}/public/${token}`;
}
```

#### 2.2 PublicViewGuard

**File**: `backend/src/modules/media-collab/guards/public-view.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard to validate public share tokens
 * Less strict than guest auth - anyone with token can access
 */
@Injectable()
export class PublicViewGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Get token from URL path or query
    const token = request.params.token || request.query.token;

    if (!token) {
      throw new NotFoundException('Public share token required');
    }

    // Find project by public share token
    const project = await this.prisma.mediaProject.findUnique({
      where: { publicShareToken: token },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Public share link not found');
    }

    // Check if public sharing is enabled
    if (!project.isPublic) {
      throw new NotFoundException('Public sharing is disabled for this project');
    }

    // Increment view count (async, don't wait)
    this.prisma.mediaProject.update({
      where: { id: project.id },
      data: { publicViewCount: { increment: 1 } },
    }).catch(() => {}); // Ignore errors

    // Attach project to request
    request.publicProject = project;

    return true;
  }
}
```

#### 2.3 Service Methods

**File**: `backend/src/modules/media-collab/services/media-projects.service.ts`

Add these methods:

```typescript
/**
 * Enable public sharing for a project
 */
async enablePublicSharing(projectId: string, userId: string): Promise<MediaProject> {
  // Verify user is owner
  const project = await this.prisma.mediaProject.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new NotFoundException('Project not found');
  }

  if (project.createdBy !== userId) {
    throw new ForbiddenException('Only project owner can enable public sharing');
  }

  // Generate token if not exists
  const publicShareToken = project.publicShareToken || generatePublicShareToken();
  const publicShareUrl = generatePublicShareUrl(publicShareToken);

  return this.prisma.mediaProject.update({
    where: { id: projectId },
    data: {
      isPublic: true,
      publicShareToken,
      publicShareUrl,
      publicSharedAt: project.publicSharedAt || new Date(),
    },
  });
}

/**
 * Disable public sharing for a project
 */
async disablePublicSharing(projectId: string, userId: string): Promise<MediaProject> {
  // Verify user is owner
  const project = await this.prisma.mediaProject.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new NotFoundException('Project not found');
  }

  if (project.createdBy !== userId) {
    throw new ForbiddenException('Only project owner can disable public sharing');
  }

  return this.prisma.mediaProject.update({
    where: { id: projectId },
    data: {
      isPublic: false,
      // Keep token for re-enabling (don't regenerate)
    },
  });
}

/**
 * Regenerate public share link (invalidate old one)
 */
async regeneratePublicShareLink(projectId: string, userId: string): Promise<MediaProject> {
  // Verify user is owner
  const project = await this.prisma.mediaProject.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new NotFoundException('Project not found');
  }

  if (project.createdBy !== userId) {
    throw new ForbiddenException('Only project owner can regenerate link');
  }

  const publicShareToken = generatePublicShareToken();
  const publicShareUrl = generatePublicShareUrl(publicShareToken);

  return this.prisma.mediaProject.update({
    where: { id: projectId },
    data: {
      publicShareToken,
      publicShareUrl,
      publicViewCount: 0, // Reset view count
    },
  });
}

/**
 * Get project by public share token (no auth required)
 */
async getPublicProject(token: string): Promise<MediaProject> {
  const project = await this.prisma.mediaProject.findUnique({
    where: { publicShareToken: token },
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          assets: true,
        },
      },
    },
  });

  if (!project || !project.isPublic) {
    throw new NotFoundException('Public share link not found or disabled');
  }

  // Increment view count
  await this.prisma.mediaProject.update({
    where: { id: project.id },
    data: { publicViewCount: { increment: 1 } },
  });

  return project;
}

/**
 * Get public project assets (no auth required)
 */
async getPublicProjectAssets(token: string): Promise<MediaAsset[]> {
  const project = await this.prisma.mediaProject.findUnique({
    where: { publicShareToken: token },
  });

  if (!project || !project.isPublic) {
    throw new NotFoundException('Public share link not found or disabled');
  }

  return this.prisma.mediaAsset.findMany({
    where: { projectId: project.id },
    include: {
      uploader: {
        select: {
          id: true,
          name: true,
        },
      },
      versions: {
        orderBy: { versionNumber: 'desc' },
        take: 1,
      },
      metadata: true,
    },
    orderBy: { uploadedAt: 'desc' },
  });
}
```

#### 2.4 Controller Endpoints

**File**: `backend/src/modules/media-collab/controllers/media-projects.controller.ts`

Add these endpoints:

```typescript
// Enable public sharing
@Post(':id/enable-public-sharing')
@UseGuards(JwtAuthGuard)
@ApiOperation({ summary: 'Enable public sharing for project' })
async enablePublicSharing(
  @Param('id') id: string,
  @Request() req: AuthenticatedRequest,
) {
  return this.projectsService.enablePublicSharing(id, req.user.id);
}

// Disable public sharing
@Post(':id/disable-public-sharing')
@UseGuards(JwtAuthGuard)
@ApiOperation({ summary: 'Disable public sharing for project' })
async disablePublicSharing(
  @Param('id') id: string,
  @Request() req: AuthenticatedRequest,
) {
  return this.projectsService.disablePublicSharing(id, req.user.id);
}

// Regenerate public share link
@Post(':id/regenerate-public-link')
@UseGuards(JwtAuthGuard)
@ApiOperation({ summary: 'Regenerate public share link' })
async regeneratePublicLink(
  @Param('id') id: string,
  @Request() req: AuthenticatedRequest,
) {
  return this.projectsService.regeneratePublicShareLink(id, req.user.id);
}
```

**File**: `backend/src/modules/media-collab/controllers/public.controller.ts` (NEW)

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MediaProjectsService } from '../services/media-projects.service';

/**
 * Public API Controller
 * No authentication required - anyone with link can access
 */
@ApiTags('Public Sharing')
@Controller('media-collab/public')
export class PublicController {
  constructor(
    private readonly projectsService: MediaProjectsService,
  ) {}

  /**
   * Get public project by share token
   */
  @Get(':token')
  @ApiOperation({ summary: 'Get public project (no auth required)' })
  @ApiResponse({ status: 200, description: 'Project retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Link not found or disabled' })
  async getPublicProject(@Param('token') token: string) {
    const project = await this.projectsService.getPublicProject(token);
    return {
      data: project,
      message: 'Project retrieved successfully',
    };
  }

  /**
   * Get public project assets
   */
  @Get(':token/assets')
  @ApiOperation({ summary: 'Get public project assets (no auth required)' })
  @ApiResponse({ status: 200, description: 'Assets retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Link not found or disabled' })
  async getPublicAssets(@Param('token') token: string) {
    const assets = await this.projectsService.getPublicProjectAssets(token);
    return {
      data: assets,
      message: 'Assets retrieved successfully',
    };
  }
}
```

---

### Phase 3: Frontend Implementation

#### 3.1 Update Media Collab Service

**File**: `frontend/src/services/media-collab.ts`

```typescript
// Public sharing methods
async enablePublicSharing(projectId: string): Promise<MediaProject> {
  const response = await apiClient.post(`/media-collab/projects/${projectId}/enable-public-sharing`);
  return response.data.data;
}

async disablePublicSharing(projectId: string): Promise<MediaProject> {
  const response = await apiClient.post(`/media-collab/projects/${projectId}/disable-public-sharing`);
  return response.data.data;
}

async regeneratePublicLink(projectId: string): Promise<MediaProject> {
  const response = await apiClient.post(`/media-collab/projects/${projectId}/regenerate-public-link`);
  return response.data.data;
}

async getPublicProject(token: string): Promise<MediaProject> {
  const response = await apiClient.get(`/media-collab/public/${token}`);
  return response.data.data;
}

async getPublicAssets(token: string): Promise<MediaAsset[]> {
  const response = await apiClient.get(`/media-collab/public/${token}/assets`);
  return response.data.data;
}
```

#### 3.2 Public Project View Page

**File**: `frontend/src/pages/PublicProjectViewPage.tsx`

```typescript
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout, Card, Empty, Image, Tag, Typography, Spin, Result } from 'antd';
import { EyeOutlined, GlobalOutlined } from '@ant-design/icons';
import { mediaCollabService } from '../services/media-collab';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export const PublicProjectViewPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ['public-project', token],
    queryFn: () => mediaCollabService.getPublicProject(token!),
    enabled: !!token,
  });

  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['public-assets', token],
    queryFn: () => mediaCollabService.getPublicAssets(token!),
    enabled: !!token,
  });

  if (!token) {
    return (
      <Layout className="min-h-screen">
        <Content className="flex items-center justify-center p-4">
          <Result status="error" title="Invalid Link" />
        </Content>
      </Layout>
    );
  }

  if (projectLoading || assetsLoading) {
    return (
      <Layout className="min-h-screen">
        <Content className="flex items-center justify-center">
          <Spin size="large" tip="Loading project..." />
        </Content>
      </Layout>
    );
  }

  if (projectError) {
    return (
      <Layout className="min-h-screen">
        <Content className="flex items-center justify-center p-4">
          <Result
            status="404"
            title="Link Not Found"
            subTitle="This public link is invalid or has been disabled."
          />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className="min-h-screen bg-gray-50">
      {/* Public header */}
      <Header className="bg-white shadow-sm px-6 flex items-center justify-between">
        <div>
          <Title level={4} className="m-0">
            {project?.name}
          </Title>
          <Text type="secondary" className="text-sm flex items-center gap-2">
            <GlobalOutlined /> Public Gallery
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Tag icon={<EyeOutlined />} color="blue">
            {project?.publicViewCount || 0} views
          </Tag>
        </div>
      </Header>

      <Content className="p-6">
        {project?.description && (
          <Card className="mb-6">
            <Text>{project.description}</Text>
          </Card>
        )}

        <Card
          title={
            <div className="flex items-center justify-between">
              <span>Media Gallery</span>
              <Text type="secondary">{assets?.length || 0} items</Text>
            </div>
          }
        >
          {assets && assets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {assets.map((asset) => (
                <Card
                  key={asset.id}
                  hoverable
                  cover={
                    asset.thumbnailUrl ? (
                      <Image
                        src={asset.thumbnailUrl}
                        alt={asset.originalName}
                        className="object-cover h-48"
                        preview={{
                          src: asset.url,
                        }}
                      />
                    ) : (
                      <div className="h-48 bg-gray-200 flex items-center justify-center">
                        <Text type="secondary">{asset.mediaType}</Text>
                      </div>
                    )
                  }
                >
                  <Card.Meta
                    title={
                      <div className="truncate" title={asset.originalName}>
                        {asset.originalName}
                      </div>
                    }
                    description={
                      <div className="space-y-1">
                        {asset.description && (
                          <Text className="text-xs block truncate">
                            {asset.description}
                          </Text>
                        )}
                        <Tag color="default" className="text-xs">
                          {asset.mediaType}
                        </Tag>
                      </div>
                    }
                  />
                </Card>
              ))}
            </div>
          ) : (
            <Empty description="No media in this project yet" />
          )}
        </Card>

        {/* Footer with branding */}
        <div className="text-center mt-8">
          <Text type="secondary" className="text-sm">
            Powered by Media Collaboration Platform
          </Text>
        </div>
      </Content>
    </Layout>
  );
};

export default PublicProjectViewPage;
```

#### 3.3 Public Sharing Toggle Component

**File**: `frontend/src/components/media/PublicSharingToggle.tsx`

```typescript
import React, { useState } from 'react';
import { Card, Switch, Button, Input, Space, Typography, Tag, message, Modal } from 'antd';
import { LinkOutlined, CopyOutlined, SyncOutlined, EyeOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaCollabService, MediaProject } from '../../services/media-collab';

const { Text } = Typography;

interface PublicSharingToggleProps {
  project: MediaProject;
}

export const PublicSharingToggle: React.FC<PublicSharingToggleProps> = ({ project }) => {
  const queryClient = useQueryClient();
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const enableMutation = useMutation({
    mutationFn: () => mediaCollabService.enablePublicSharing(project.id),
    onSuccess: () => {
      message.success('Public sharing enabled');
      queryClient.invalidateQueries({ queryKey: ['media-project', project.id] });
    },
  });

  const disableMutation = useMutation({
    mutationFn: () => mediaCollabService.disablePublicSharing(project.id),
    onSuccess: () => {
      message.success('Public sharing disabled');
      queryClient.invalidateQueries({ queryKey: ['media-project', project.id] });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () => mediaCollabService.regeneratePublicLink(project.id),
    onSuccess: () => {
      message.success('New public link generated! Old link is now invalid.');
      queryClient.invalidateQueries({ queryKey: ['media-project', project.id] });
      setShowRegenerateConfirm(false);
    },
  });

  const handleToggle = (checked: boolean) => {
    if (checked) {
      enableMutation.mutate();
    } else {
      disableMutation.mutate();
    }
  };

  const handleCopyLink = () => {
    if (project.publicShareUrl) {
      navigator.clipboard.writeText(project.publicShareUrl);
      message.success('Link copied to clipboard!');
    }
  };

  return (
    <Card
      title={
        <Space>
          <LinkOutlined />
          Public Sharing
        </Space>
      }
    >
      <Space direction="vertical" className="w-full" size="middle">
        <div className="flex items-center justify-between">
          <div>
            <Text strong>Allow anyone with the link to view</Text>
            <br />
            <Text type="secondary" className="text-sm">
              No account or sign-in required
            </Text>
          </div>
          <Switch
            checked={project.isPublic}
            onChange={handleToggle}
            loading={enableMutation.isPending || disableMutation.isPending}
          />
        </div>

        {project.isPublic && project.publicShareUrl && (
          <>
            <div className="bg-gray-50 p-3 rounded">
              <Space direction="vertical" className="w-full" size="small">
                <div className="flex items-center gap-2">
                  <Tag icon={<EyeOutlined />} color="blue">
                    {project.publicViewCount || 0} views
                  </Tag>
                  <Text type="secondary" className="text-xs">
                    Shared on {new Date(project.publicSharedAt!).toLocaleDateString()}
                  </Text>
                </div>

                <Input
                  value={project.publicShareUrl}
                  readOnly
                  addonAfter={
                    <Button
                      type="text"
                      icon={<CopyOutlined />}
                      onClick={handleCopyLink}
                      size="small"
                    >
                      Copy
                    </Button>
                  }
                />
              </Space>
            </div>

            <Space>
              <Button
                icon={<SyncOutlined />}
                onClick={() => setShowRegenerateConfirm(true)}
                danger
              >
                Regenerate Link
              </Button>
              <Text type="secondary" className="text-xs">
                This will invalidate the old link
              </Text>
            </Space>
          </>
        )}
      </Space>

      <Modal
        title="Regenerate Public Link?"
        open={showRegenerateConfirm}
        onOk={() => regenerateMutation.mutate()}
        onCancel={() => setShowRegenerateConfirm(false)}
        okText="Regenerate"
        okButtonProps={{ danger: true, loading: regenerateMutation.isPending }}
      >
        <Text>
          This will create a new public link and invalidate the old one.
          Anyone with the old link will no longer be able to access this project.
        </Text>
      </Modal>
    </Card>
  );
};
```

#### 3.4 Add to Project Detail Page

**File**: `frontend/src/pages/MediaProjectDetailPage.tsx`

Add the PublicSharingToggle component:

```typescript
import { PublicSharingToggle } from '../components/media/PublicSharingToggle';

// Inside the component, add to the settings/sharing section:
<PublicSharingToggle project={project} />
```

#### 3.5 Add Route

**File**: `frontend/src/App.tsx`

```typescript
// Add import
import PublicProjectViewPage from './pages/PublicProjectViewPage'

// Add route (with guest routes, before auth routes)
<Route path='/public/:token' element={<PublicProjectViewPage />} />
```

---

## Security Considerations

### ✅ Implemented
1. **Token-based access** - Unique URL per project
2. **Owner-only control** - Only project owner can enable/disable
3. **View tracking** - Monitor access patterns
4. **Regenerable links** - Invalidate leaked links
5. **No sensitive data** - Only shows project name, description, assets

### 🔒 Future Enhancements
1. **Password protection** - Optional password for extra security
2. **Expiration dates** - Auto-disable after X days
3. **IP restrictions** - Whitelist/blacklist IPs
4. **Download limits** - Limit number of downloads
5. **Watermarking** - Add watermarks to public assets
6. **Analytics** - Track views, referrers, geographic data

---

## Comparison: Guest vs Public Sharing

| Feature | Guest Collaboration | Public Sharing |
|---------|-------------------|----------------|
| **Access Method** | Email invite | Anyone with link |
| **Authentication** | Per-person token | Single shared token |
| **Permission Levels** | VIEWER, COMMENTER, EDITOR | VIEW_ONLY (future: DOWNLOAD) |
| **Tracking** | Individual last access | Total view count |
| **Revocation** | Per-guest | All-or-nothing (disable link) |
| **Expiration** | 30 days default | None (manual disable) |
| **Use Case** | Formal collaboration | Quick previews, portfolios |
| **Email Required** | Yes | No |
| **Anonymous** | No | Yes |

---

## API Endpoints Summary

### Internal User (JWT Auth)
```bash
POST /api/v1/media-collab/projects/:id/enable-public-sharing
POST /api/v1/media-collab/projects/:id/disable-public-sharing
POST /api/v1/media-collab/projects/:id/regenerate-public-link
```

### Public (No Auth)
```bash
GET /api/v1/media-collab/public/:token
GET /api/v1/media-collab/public/:token/assets
```

---

## Testing Checklist

- [ ] Enable public sharing on project
- [ ] Verify public URL is generated
- [ ] Access public URL without login
- [ ] Verify assets are displayed
- [ ] Check view counter increments
- [ ] Copy link to clipboard
- [ ] Disable public sharing
- [ ] Verify link becomes invalid
- [ ] Regenerate link
- [ ] Verify old link is invalid
- [ ] Verify new link works

---

## Next Steps

1. ✅ Review this plan
2. Implement Phase 1 (Database)
3. Implement Phase 2 (Backend)
4. Implement Phase 3 (Frontend)
5. Test end-to-end
6. Document in README

---

## Future Feature Ideas

1. **Embed Codes**: `<iframe>` embed for websites
2. **QR Codes**: Generate QR code for easy mobile sharing
3. **Social Media Cards**: OpenGraph/Twitter cards for rich previews
4. **Public Collections**: Share specific asset collections, not entire project
5. **Custom Domains**: `yourcompany.com/portfolio/project-name`
6. **Themes**: Customize public gallery appearance
7. **Password Protection**: Optional password prompt
8. **Expiring Links**: Auto-disable after X days/views
