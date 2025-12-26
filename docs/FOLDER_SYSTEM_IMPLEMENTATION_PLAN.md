# Media Collaboration Folder System Implementation Plan

## Executive Summary

This document provides a comprehensive plan to implement a **Google Drive/Frame.io-like folder organization system** for the Media Collaboration module. The database schema is already in place - only backend services and frontend components need to be implemented.

**Status**: ✅ Database Ready | ❌ Backend Missing | ❌ Frontend Missing

**Estimated Time**: 12-17 hours total
- Backend: 4-6 hours
- Frontend: 6-8 hours
- Testing: 2-3 hours

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Research & Best Practices](#research--best-practices)
3. [Database Schema](#database-schema)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Advanced Features](#advanced-features)
7. [API Documentation](#api-documentation)
8. [UI/UX Design](#uiux-design)
9. [Testing Strategy](#testing-strategy)
10. [Performance Considerations](#performance-considerations)
11. [Security Considerations](#security-considerations)
12. [Implementation Checklist](#implementation-checklist)

---

## Current State Analysis

### Database Schema Status: ✅ READY

The `MediaFolder` model **already exists** in `backend/prisma/schema.prisma`:

```prisma
model MediaFolder {
  id              String            @id @default(cuid())
  name            String
  parentId        String?
  parent          MediaFolder?      @relation("FolderHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children        MediaFolder[]     @relation("FolderHierarchy")

  projects        MediaProject[]

  createdBy       String
  creator         User              @relation("MediaFolderCreator", fields: [createdBy], references: [id])

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([parentId])
  @@index([createdBy])
  @@map("media_folders")
}

model MediaProject {
  // ... other fields
  folderId        String?
  folder          MediaFolder?      @relation(fields: [folderId], references: [id], onDelete: SetNull)
  // ...
}
```

**Key Features Already Designed:**
- ✅ Hierarchical parent-child relationship (self-referencing)
- ✅ Projects belong to folders
- ✅ Cascade deletion (deleting parent deletes children)
- ✅ User ownership tracking
- ✅ Proper indexing for performance
- ✅ SetNull on project deletion (projects float to root level)

### Backend Status: ❌ NOT IMPLEMENTED

**Missing Components:**
- FolderService (media-folders.service.ts)
- FolderController (media-folders.controller.ts)
- DTOs (CreateFolderDto, UpdateFolderDto, MoveProjectDto)
- API endpoints

### Frontend Status: ❌ NOT IMPLEMENTED

**Missing Components:**
- Folder UI components
- Folder service methods
- Folder navigation
- Breadcrumb system
- Drag-and-drop folder management

---

## Research & Best Practices

### Frame.io Approach

**Organization Strategy:**
- Uses "Collections" as primary organization
- Supports nested folder trees for navigation
- Metadata-driven organization (tags, assignees, status)
- Focus on flexible, dynamic organization

**Key Features:**
- Project-based structure
- Version control for assets
- Comment threading on specific frames
- Review and approval workflows

### Google Drive Approach

**Organization Strategy:**
- Hierarchical folders with parent-child relationships
- Breadcrumb navigation for easy traversal
- Drag-and-drop file/folder movement
- Folder sharing and permissions

**Key Features:**
- "Starred" items for quick access
- Recent files view
- Powerful search
- Multiple views (list, grid)

### Recommended Hybrid Approach

**Folders (Physical Organization)**
- Like file system directories
- Hierarchical structure
- Contains projects
- Can be nested
- **Good for**: Client separation, project types, campaigns, departments

**Collections (Virtual Organization)** *(Already Implemented)*
- Like playlists or smart folders
- Contains assets across projects
- Dynamic filtering
- **Good for**: Star ratings, status, tags, unresolved comments

**Terminology**: Use **"Folders"** (not Albums) for familiarity with Google Drive/Finder/Explorer

---

## Database Schema

### Current Schema (Already Exists)

```prisma
model MediaFolder {
  id              String            @id @default(cuid())
  name            String
  parentId        String?
  parent          MediaFolder?      @relation("FolderHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children        MediaFolder[]     @relation("FolderHierarchy")

  projects        MediaProject[]

  createdBy       String
  creator         User              @relation("MediaFolderCreator", fields: [createdBy], references: [id])

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([parentId])
  @@index([createdBy])
  @@map("media_folders")
}
```

### Potential Future Enhancements

```prisma
model MediaFolder {
  // ... existing fields

  // Enhancement: Add description field
  description     String?           @db.Text

  // Enhancement: Add folder metadata
  color           String?           // Hex color for UI (#FF5733)
  icon            String?           // Icon name (folder-open, briefcase)
  starred         Boolean           @default(false)

  // Enhancement: Add folder sharing
  isShared        Boolean           @default(false)
  shares          FolderShare[]

  // Enhancement: Add soft delete
  deletedAt       DateTime?

  // ... existing relations
}

// Enhancement: Folder sharing model
model FolderShare {
  id          String       @id @default(cuid())
  folderId    String
  folder      MediaFolder  @relation(fields: [folderId], references: [id], onDelete: Cascade)
  userId      String
  user        User         @relation(fields: [userId], references: [id])
  permission  Permission   @default(VIEW)
  createdAt   DateTime     @default(now())

  @@unique([folderId, userId])
  @@map("folder_shares")
}

enum Permission {
  VIEW
  EDIT
  ADMIN
}
```

### Database Relationships

```
User (1) ──────> (N) MediaFolder
                      │
MediaFolder (1) ──────> (N) MediaFolder (parent-child)
                      │
MediaFolder (1) ──────> (N) MediaProject
```

---

## Backend Implementation

### Phase 1: Create DTOs

#### File: `backend/src/modules/media-collab/dto/create-folder.dto.ts`

```typescript
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFolderDto {
  @ApiProperty({
    example: 'Q4 2025 Campaigns',
    description: 'Folder name'
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'All marketing campaigns for Q4 2025',
    description: 'Optional folder description'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'cm3abc123',
    description: 'Parent folder ID for nested folders (null for root level)'
  })
  @IsString()
  @IsOptional()
  parentId?: string;
}
```

#### File: `backend/src/modules/media-collab/dto/update-folder.dto.ts`

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateFolderDto } from './create-folder.dto';

export class UpdateFolderDto extends PartialType(CreateFolderDto) {}
```

#### File: `backend/src/modules/media-collab/dto/move-project.dto.ts`

```typescript
import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MoveProjectDto {
  @ApiPropertyOptional({
    example: 'cm3abc123',
    description: 'Target folder ID (null for root level)'
  })
  @IsString()
  @IsOptional()
  folderId?: string | null;
}
```

### Phase 2: Create MediaFoldersService

#### File: `backend/src/modules/media-collab/services/media-folders.service.ts`

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFolderDto } from '../dto/create-folder.dto';
import { UpdateFolderDto } from '../dto/update-folder.dto';

/**
 * MediaFoldersService
 *
 * Handles hierarchical folder organization for media projects.
 * Supports nested folders with breadcrumb navigation.
 */
@Injectable()
export class MediaFoldersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new folder
   */
  async create(userId: string, createDto: CreateFolderDto) {
    // Verify parent folder exists if provided
    if (createDto.parentId) {
      const parent = await this.prisma.mediaFolder.findUnique({
        where: { id: createDto.parentId },
      });

      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }

      // Verify user owns parent folder
      if (parent.createdBy !== userId) {
        throw new ForbiddenException(
          'Cannot create subfolder in folder you do not own',
        );
      }
    }

    const folder = await this.prisma.mediaFolder.create({
      data: {
        name: createDto.name,
        parentId: createDto.parentId,
        createdBy: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            projects: true,
            children: true,
          },
        },
      },
    });

    return folder;
  }

  /**
   * Get all root-level folders for a user
   */
  async findRootFolders(userId: string) {
    return this.prisma.mediaFolder.findMany({
      where: {
        createdBy: userId,
        parentId: null, // Root level only
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            projects: true,
            children: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Get a single folder with its children and projects
   */
  async findOne(folderId: string, userId: string) {
    const folder = await this.prisma.mediaFolder.findUnique({
      where: { id: folderId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          include: {
            _count: {
              select: {
                projects: true,
                children: true,
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        },
        projects: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                assets: true,
                collaborators: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
        _count: {
          select: {
            projects: true,
            children: true,
          },
        },
      },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    // Verify user owns folder
    if (folder.createdBy !== userId) {
      throw new ForbiddenException('Access denied to this folder');
    }

    return folder;
  }

  /**
   * Get breadcrumb path for a folder
   * Returns array from root to current folder
   */
  async getBreadcrumbs(folderId: string, userId: string) {
    const breadcrumbs = [];
    let currentId = folderId;

    while (currentId) {
      const folder = await this.prisma.mediaFolder.findUnique({
        where: { id: currentId },
        select: {
          id: true,
          name: true,
          parentId: true,
          createdBy: true,
        },
      });

      if (!folder) {
        throw new NotFoundException('Folder not found in breadcrumb path');
      }

      // Verify user owns folder
      if (folder.createdBy !== userId) {
        throw new ForbiddenException('Access denied to folder in breadcrumb path');
      }

      breadcrumbs.unshift({
        id: folder.id,
        name: folder.name,
      });

      currentId = folder.parentId;
    }

    return breadcrumbs;
  }

  /**
   * Update folder (rename or move)
   */
  async update(folderId: string, userId: string, updateDto: UpdateFolderDto) {
    const folder = await this.prisma.mediaFolder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if (folder.createdBy !== userId) {
      throw new ForbiddenException('Only folder owner can update folder');
    }

    // If moving to new parent
    if (updateDto.parentId !== undefined) {
      // Prevent circular reference
      if (updateDto.parentId === folderId) {
        throw new BadRequestException('Folder cannot be its own parent');
      }

      // Check if target parent exists
      if (updateDto.parentId) {
        const parent = await this.prisma.mediaFolder.findUnique({
          where: { id: updateDto.parentId },
        });

        if (!parent) {
          throw new NotFoundException('Target parent folder not found');
        }

        if (parent.createdBy !== userId) {
          throw new ForbiddenException('Cannot move to folder you do not own');
        }

        // Prevent moving parent into its own child (circular reference check)
        const isDescendant = await this.isDescendant(
          updateDto.parentId,
          folderId,
        );
        if (isDescendant) {
          throw new BadRequestException(
            'Cannot move folder into its own descendant',
          );
        }
      }
    }

    return this.prisma.mediaFolder.update({
      where: { id: folderId },
      data: updateDto,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            projects: true,
            children: true,
          },
        },
      },
    });
  }

  /**
   * Delete folder (must be empty)
   */
  async remove(folderId: string, userId: string) {
    const folder = await this.prisma.mediaFolder.findUnique({
      where: { id: folderId },
      include: {
        _count: {
          select: {
            projects: true,
            children: true,
          },
        },
      },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if (folder.createdBy !== userId) {
      throw new ForbiddenException('Only folder owner can delete folder');
    }

    // Check if folder is empty
    if (folder._count.projects > 0) {
      throw new BadRequestException(
        `Cannot delete folder with ${folder._count.projects} project(s). Move or delete projects first.`,
      );
    }

    if (folder._count.children > 0) {
      throw new BadRequestException(
        `Cannot delete folder with ${folder._count.children} subfolder(s). Delete subfolders first.`,
      );
    }

    await this.prisma.mediaFolder.delete({
      where: { id: folderId },
    });

    return { message: 'Folder deleted successfully' };
  }

  /**
   * Move project to folder (or root)
   */
  async moveProject(projectId: string, folderId: string | null, userId: string) {
    // Verify project exists and user has access
    const project = await this.prisma.mediaProject.findUnique({
      where: { id: projectId },
      include: {
        collaborators: {
          where: { userId },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.collaborators.length === 0) {
      throw new ForbiddenException('Access denied to this project');
    }

    const collaborator = project.collaborators[0];
    if (collaborator.role !== 'OWNER' && collaborator.role !== 'EDITOR') {
      throw new ForbiddenException('Only OWNER or EDITOR can move projects');
    }

    // If moving to folder, verify folder exists and user owns it
    if (folderId) {
      const folder = await this.prisma.mediaFolder.findUnique({
        where: { id: folderId },
      });

      if (!folder) {
        throw new NotFoundException('Target folder not found');
      }

      if (folder.createdBy !== userId) {
        throw new ForbiddenException('Cannot move project to folder you do not own');
      }
    }

    // Move project
    return this.prisma.mediaProject.update({
      where: { id: projectId },
      data: { folderId },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Helper: Check if folderA is a descendant of folderB
   * Prevents circular references when moving folders
   */
  private async isDescendant(folderA: string, folderB: string): Promise<boolean> {
    let currentId = folderA;

    while (currentId) {
      if (currentId === folderB) {
        return true;
      }

      const folder = await this.prisma.mediaFolder.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      if (!folder || !folder.parentId) {
        return false;
      }

      currentId = folder.parentId;
    }

    return false;
  }
}
```

### Phase 3: Create MediaFoldersController

#### File: `backend/src/modules/media-collab/controllers/media-folders.controller.ts`

```typescript
import {
  Controller,
  UseGuards,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MediaFoldersService } from '../services/media-folders.service';
import { CreateFolderDto } from '../dto/create-folder.dto';
import { UpdateFolderDto } from '../dto/update-folder.dto';
import { MoveProjectDto } from '../dto/move-project.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

@ApiTags('Media Collaboration - Folders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media-collab/folders')
export class MediaFoldersController {
  constructor(private readonly foldersService: MediaFoldersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new folder' })
  @ApiResponse({ status: 201, description: 'Folder created successfully' })
  @ApiResponse({ status: 404, description: 'Parent folder not found' })
  @ApiResponse({ status: 403, description: 'Cannot create subfolder in folder you do not own' })
  async createFolder(
    @Body() createDto: CreateFolderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.foldersService.create(req.user.id, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all root-level folders for current user' })
  @ApiResponse({ status: 200, description: 'Root folders retrieved successfully' })
  async getRootFolders(@Req() req: AuthenticatedRequest) {
    return this.foldersService.findRootFolders(req.user.id);
  }

  @Get(':folderId')
  @ApiOperation({ summary: 'Get folder details with children and projects' })
  @ApiResponse({ status: 200, description: 'Folder retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  @ApiResponse({ status: 403, description: 'Access denied to this folder' })
  async getFolder(
    @Param('folderId') folderId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.foldersService.findOne(folderId, req.user.id);
  }

  @Get(':folderId/breadcrumbs')
  @ApiOperation({ summary: 'Get breadcrumb path for folder navigation' })
  @ApiResponse({ status: 200, description: 'Breadcrumbs retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Folder not found in breadcrumb path' })
  @ApiResponse({ status: 403, description: 'Access denied to folder in breadcrumb path' })
  async getBreadcrumbs(
    @Param('folderId') folderId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.foldersService.getBreadcrumbs(folderId, req.user.id);
  }

  @Put(':folderId')
  @ApiOperation({ summary: 'Update folder (rename or move)' })
  @ApiResponse({ status: 200, description: 'Folder updated successfully' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  @ApiResponse({ status: 403, description: 'Only folder owner can update folder' })
  @ApiResponse({ status: 400, description: 'Cannot move folder into its own descendant' })
  async updateFolder(
    @Param('folderId') folderId: string,
    @Body() updateDto: UpdateFolderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.foldersService.update(folderId, req.user.id, updateDto);
  }

  @Delete(':folderId')
  @ApiOperation({ summary: 'Delete empty folder' })
  @ApiResponse({ status: 200, description: 'Folder deleted successfully' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  @ApiResponse({ status: 403, description: 'Only folder owner can delete folder' })
  @ApiResponse({ status: 400, description: 'Cannot delete folder with projects or subfolders' })
  async deleteFolder(
    @Param('folderId') folderId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.foldersService.remove(folderId, req.user.id);
  }

  @Put('projects/:projectId/move')
  @ApiOperation({ summary: 'Move project to folder (or root)' })
  @ApiResponse({ status: 200, description: 'Project moved successfully' })
  @ApiResponse({ status: 404, description: 'Project or folder not found' })
  @ApiResponse({ status: 403, description: 'Only OWNER or EDITOR can move projects' })
  async moveProject(
    @Param('projectId') projectId: string,
    @Body() moveDto: MoveProjectDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.foldersService.moveProject(
      projectId,
      moveDto.folderId,
      req.user.id,
    );
  }
}
```

### Phase 4: Register in Module

#### File: `backend/src/modules/media-collab/media-collab.module.ts`

Add imports:

```typescript
import { MediaFoldersService } from './services/media-folders.service';
import { MediaFoldersController } from './controllers/media-folders.controller';
```

Update module:

```typescript
@Module({
  imports: [
    // ... existing imports
  ],
  providers: [
    // ... existing services
    MediaFoldersService,
  ],
  controllers: [
    // ... existing controllers
    MediaFoldersController,
  ],
  exports: [
    // ... existing exports
    MediaFoldersService,
  ],
})
export class MediaCollabModule {}
```

---

## Frontend Implementation

### Phase 1: Update Service Interface

#### File: `frontend/src/services/media-collab.ts`

Add interfaces:

```typescript
export interface MediaFolder {
  id: string;
  name: string;
  parentId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  parent?: {
    id: string;
    name: string;
  };
  children?: MediaFolder[];
  projects?: MediaProject[];
  _count: {
    projects: number;
    children: number;
  };
}

export interface CreateFolderDto {
  name: string;
  parentId?: string;
}

export interface UpdateFolderDto {
  name?: string;
  parentId?: string;
}

export interface Breadcrumb {
  id: string;
  name: string;
}
```

Add service methods:

```typescript
class MediaCollabService {
  // ... existing methods

  // ============================================
  // FOLDER MANAGEMENT
  // ============================================

  /**
   * Create a new folder
   */
  async createFolder(data: CreateFolderDto): Promise<MediaFolder> {
    const response = await apiClient.post('/media-collab/folders', data);
    return response.data.data;
  }

  /**
   * Get all root-level folders
   */
  async getRootFolders(): Promise<MediaFolder[]> {
    const response = await apiClient.get('/media-collab/folders');
    return response.data.data;
  }

  /**
   * Get folder details with children and projects
   */
  async getFolder(folderId: string): Promise<MediaFolder> {
    const response = await apiClient.get(`/media-collab/folders/${folderId}`);
    return response.data.data;
  }

  /**
   * Get breadcrumb path for folder
   */
  async getFolderBreadcrumbs(folderId: string): Promise<Breadcrumb[]> {
    const response = await apiClient.get(`/media-collab/folders/${folderId}/breadcrumbs`);
    return response.data.data;
  }

  /**
   * Update folder (rename or move)
   */
  async updateFolder(folderId: string, data: UpdateFolderDto): Promise<MediaFolder> {
    const response = await apiClient.put(`/media-collab/folders/${folderId}`, data);
    return response.data.data;
  }

  /**
   * Delete folder (must be empty)
   */
  async deleteFolder(folderId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/media-collab/folders/${folderId}`);
    return response.data.data;
  }

  /**
   * Move project to folder (or root)
   */
  async moveProjectToFolder(projectId: string, folderId: string | null): Promise<MediaProject> {
    const response = await apiClient.put(
      `/media-collab/folders/projects/${projectId}/move`,
      { folderId }
    );
    return response.data.data;
  }
}
```

### Phase 2: Create Folder Components

#### File: `frontend/src/components/media/FolderBreadcrumb.tsx`

```typescript
import React from 'react';
import { Breadcrumb } from 'antd';
import { FolderOutlined, HomeOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { mediaCollabService, Breadcrumb as BreadcrumbItem } from '../../services/media-collab';

interface FolderBreadcrumbProps {
  folderId?: string;
  onNavigate: (folderId: string | null) => void;
}

export const FolderBreadcrumb: React.FC<FolderBreadcrumbProps> = ({
  folderId,
  onNavigate,
}) => {
  const { data: breadcrumbs } = useQuery({
    queryKey: ['folder-breadcrumbs', folderId],
    queryFn: () => folderId ? mediaCollabService.getFolderBreadcrumbs(folderId) : [],
    enabled: !!folderId,
  });

  const items = [
    {
      title: (
        <a onClick={() => onNavigate(null)}>
          <HomeOutlined /> All Folders
        </a>
      ),
    },
    ...(breadcrumbs || []).map((crumb: BreadcrumbItem) => ({
      title: (
        <a onClick={() => onNavigate(crumb.id)}>
          <FolderOutlined /> {crumb.name}
        </a>
      ),
    })),
  ];

  return <Breadcrumb items={items} style={{ marginBottom: 16 }} />;
};
```

#### File: `frontend/src/components/media/FolderTree.tsx`

```typescript
import React, { useState } from 'react';
import { Tree, Button, Modal, Form, Input, message, Dropdown } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderAddOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaCollabService, MediaFolder, CreateFolderDto } from '../../services/media-collab';

interface FolderTreeProps {
  onFolderSelect: (folderId: string | null) => void;
  selectedFolderId?: string | null;
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  onFolderSelect,
  selectedFolderId,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<MediaFolder | null>(null);
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);

  // Fetch root folders
  const { data: folders, isLoading } = useQuery({
    queryKey: ['root-folders'],
    queryFn: () => mediaCollabService.getRootFolders(),
  });

  // Create folder mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateFolderDto) => mediaCollabService.createFolder(data),
    onSuccess: () => {
      message.success('Folder created successfully');
      queryClient.invalidateQueries({ queryKey: ['root-folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-details'] });
      setIsCreateModalOpen(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to create folder');
    },
  });

  // Update folder mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      mediaCollabService.updateFolder(id, data),
    onSuccess: () => {
      message.success('Folder renamed successfully');
      queryClient.invalidateQueries({ queryKey: ['root-folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-details'] });
      setIsEditModalOpen(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to rename folder');
    },
  });

  // Delete folder mutation
  const deleteMutation = useMutation({
    mutationFn: (folderId: string) => mediaCollabService.deleteFolder(folderId),
    onSuccess: () => {
      message.success('Folder deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['root-folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-details'] });
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to delete folder');
    },
  });

  // Convert folders to tree data
  const buildTreeData = (folders: MediaFolder[]): any[] => {
    return folders.map((folder) => ({
      key: folder.id,
      title: (
        <Dropdown
          menu={{
            items: [
              {
                key: 'open',
                label: 'Open',
                icon: <FolderOpenOutlined />,
                onClick: () => onFolderSelect(folder.id),
              },
              {
                key: 'add-subfolder',
                label: 'Add Subfolder',
                icon: <FolderAddOutlined />,
                onClick: () => {
                  setParentFolderId(folder.id);
                  setIsCreateModalOpen(true);
                },
              },
              {
                key: 'rename',
                label: 'Rename',
                icon: <EditOutlined />,
                onClick: () => {
                  setSelectedFolder(folder);
                  form.setFieldsValue({ name: folder.name });
                  setIsEditModalOpen(true);
                },
              },
              {
                type: 'divider',
              },
              {
                key: 'delete',
                label: 'Delete',
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => {
                  Modal.confirm({
                    title: 'Delete Folder',
                    content: `Are you sure you want to delete "${folder.name}"? Folder must be empty.`,
                    okText: 'Delete',
                    okType: 'danger',
                    onOk: () => deleteMutation.mutate(folder.id),
                  });
                },
              },
            ],
          }}
          trigger={['contextMenu']}
        >
          <span>
            {folder.name} ({folder._count.projects}p, {folder._count.children}f)
          </span>
        </Dropdown>
      ),
      icon: <FolderOutlined />,
      children: folder.children ? buildTreeData(folder.children) : [],
    }));
  };

  const handleCreateFolder = () => {
    form.validateFields().then((values) => {
      createMutation.mutate({
        name: values.name,
        parentId: parentFolderId || undefined,
      });
    });
  };

  const handleUpdateFolder = () => {
    form.validateFields().then((values) => {
      if (selectedFolder) {
        updateMutation.mutate({
          id: selectedFolder.id,
          data: { name: values.name },
        });
      }
    });
  };

  return (
    <div>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => {
          setParentFolderId(null);
          setIsCreateModalOpen(true);
        }}
        style={{ marginBottom: 16, width: '100%' }}
      >
        New Folder
      </Button>

      <Tree
        showIcon
        defaultExpandAll
        selectedKeys={selectedFolderId ? [selectedFolderId] : []}
        onSelect={(keys) => onFolderSelect(keys[0] as string)}
        treeData={buildTreeData(folders || [])}
        loading={isLoading}
      />

      {/* Create Folder Modal */}
      <Modal
        title={parentFolderId ? 'Create Subfolder' : 'Create Folder'}
        open={isCreateModalOpen}
        onOk={handleCreateFolder}
        onCancel={() => {
          setIsCreateModalOpen(false);
          form.resetFields();
        }}
        okText="Create"
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Folder Name"
            rules={[{ required: true, message: 'Please enter folder name' }]}
          >
            <Input placeholder="e.g., Q4 2025 Campaigns" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Folder Modal */}
      <Modal
        title="Rename Folder"
        open={isEditModalOpen}
        onOk={handleUpdateFolder}
        onCancel={() => {
          setIsEditModalOpen(false);
          form.resetFields();
        }}
        okText="Rename"
        confirmLoading={updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Folder Name"
            rules={[{ required: true, message: 'Please enter folder name' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
```

#### File: `frontend/src/components/media/FolderView.tsx`

```typescript
import React from 'react';
import { Card, Row, Col, Typography, Empty, Spin } from 'antd';
import { FolderOutlined, FileOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { mediaCollabService } from '../../services/media-collab';

const { Title, Text } = Typography;

interface FolderViewProps {
  folderId: string | null;
  onFolderClick: (folderId: string) => void;
  onProjectClick: (projectId: string) => void;
}

export const FolderView: React.FC<FolderViewProps> = ({
  folderId,
  onFolderClick,
  onProjectClick,
}) => {
  // Fetch folder details if folderId provided
  const { data: folder, isLoading } = useQuery({
    queryKey: ['folder-details', folderId],
    queryFn: () => folderId ? mediaCollabService.getFolder(folderId) : null,
    enabled: !!folderId,
  });

  // Fetch root folders if no folderId
  const { data: rootFolders, isLoading: isLoadingRoot } = useQuery({
    queryKey: ['root-folders'],
    queryFn: () => mediaCollabService.getRootFolders(),
    enabled: !folderId,
  });

  if (isLoading || isLoadingRoot) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  const folders = folderId ? folder?.children || [] : rootFolders || [];
  const projects = folder?.projects || [];

  return (
    <div>
      <Title level={3}>{folder?.name || 'All Folders'}</Title>

      {/* Subfolders */}
      {folders.length > 0 && (
        <>
          <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>
            Folders
          </Title>
          <Row gutter={[16, 16]}>
            {folders.map((subfolder) => (
              <Col key={subfolder.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  onClick={() => onFolderClick(subfolder.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <FolderOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                    <Title level={5} style={{ marginTop: 8 }}>
                      {subfolder.name}
                    </Title>
                    <Text type="secondary">
                      {subfolder._count.projects} projects
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <>
          <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>
            Projects
          </Title>
          <Row gutter={[16, 16]}>
            {projects.map((project) => (
              <Col key={project.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  onClick={() => onProjectClick(project.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <FileOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                    <Title level={5} style={{ marginTop: 8 }}>
                      {project.name}
                    </Title>
                    <Text type="secondary">
                      {project._count.assets} assets
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}

      {/* Empty state */}
      {folders.length === 0 && projects.length === 0 && (
        <Empty
          description={
            folderId ? 'This folder is empty' : 'No folders yet. Create one to get started!'
          }
          style={{ marginTop: 48 }}
        />
      )}
    </div>
  );
};
```

### Phase 3: Update MediaCollaborationPage

#### File: `frontend/src/pages/MediaCollaborationPage.tsx`

Replace entire content with folder-enabled version:

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, theme } from 'antd';
import { FolderTree } from '../components/media/FolderTree';
import { FolderBreadcrumb } from '../components/media/FolderBreadcrumb';
import { FolderView } from '../components/media/FolderView';

const { Sider, Content } = Layout;

/**
 * MediaCollaborationPage
 *
 * Main page with folder organization system.
 * Left sidebar: Folder tree navigation
 * Right content: Current folder contents (subfolders and projects)
 */
export const MediaCollaborationPage: React.FC = () => {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId);
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/media-collab/projects/${projectId}`);
  };

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      {/* Left Sidebar: Folder Tree */}
      <Sider
        width={300}
        theme="light"
        style={{
          padding: 16,
          borderRight: `1px solid ${token.colorBorder}`,
        }}
      >
        <FolderTree
          onFolderSelect={handleFolderSelect}
          selectedFolderId={selectedFolderId}
        />
      </Sider>

      {/* Right Content: Folder Contents */}
      <Content style={{ padding: 24 }}>
        <FolderBreadcrumb
          folderId={selectedFolderId}
          onNavigate={handleFolderSelect}
        />
        <FolderView
          folderId={selectedFolderId}
          onFolderClick={handleFolderSelect}
          onProjectClick={handleProjectClick}
        />
      </Content>
    </Layout>
  );
};

export default MediaCollaborationPage;
```

---

## Advanced Features

### 1. Drag-and-Drop Project Movement

Install dependencies:

```bash
npm install react-dnd react-dnd-html5-backend
```

Update FolderView to accept dropped projects:

```typescript
import { useDrop } from 'react-dnd';

const [{ isOver }, drop] = useDrop({
  accept: 'PROJECT',
  drop: (item: { id: string }) => {
    // Move project to this folder
    moveProjectToFolder(item.id, folderId);
  },
  collect: (monitor) => ({
    isOver: !!monitor.isOver(),
  }),
});
```

### 2. Folder Sharing (Future Enhancement)

Add to schema (requires new migration):

```prisma
model FolderShare {
  id          String       @id @default(cuid())
  folderId    String
  folder      MediaFolder  @relation(fields: [folderId], references: [id], onDelete: Cascade)
  userId      String
  user        User         @relation(fields: [userId], references: [id])
  permission  Permission   @default(VIEW)
  createdAt   DateTime     @default(now())

  @@unique([folderId, userId])
  @@map("folder_shares")
}

enum Permission {
  VIEW
  EDIT
  ADMIN
}
```

### 3. Folder Templates

Create predefined folder structures:

```typescript
const templates = {
  client: {
    name: '{Client Name}',
    children: [
      { name: 'Projects' },
      { name: 'Drafts' },
      { name: 'Final Deliverables' },
    ],
  },
  campaign: {
    name: '{Campaign Name}',
    children: [
      { name: 'Social Media' },
      { name: 'Print Materials' },
      { name: 'Video Content' },
      { name: 'Photography' },
    ],
  },
  quarterly: {
    name: '{Year} - {Quarter}',
    children: [
      { name: 'January' },
      { name: 'February' },
      { name: 'March' },
    ],
  },
};
```

### 4. Bulk Operations

Add to FolderView:

```typescript
const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

const handleBulkMove = async (targetFolderId: string) => {
  await Promise.all(
    selectedProjects.map(projectId =>
      mediaCollabService.moveProjectToFolder(projectId, targetFolderId)
    )
  );
  message.success(`Moved ${selectedProjects.length} projects`);
};
```

### 5. Folder Search

Add search functionality to FolderTree:

```typescript
const [searchQuery, setSearchQuery] = useState('');

const filteredFolders = folders?.filter(folder =>
  folder.name.toLowerCase().includes(searchQuery.toLowerCase())
);
```

### 6. Folder Metadata (Color & Icons)

Add to schema:

```prisma
model MediaFolder {
  // ... existing fields
  color           String?           // Hex color: #FF5733
  icon            String?           // Icon name: briefcase, camera
  starred         Boolean           @default(false)
}
```

Update UI to use custom colors and icons:

```typescript
<FolderOutlined style={{ color: folder.color || '#1890ff' }} />
```

---

## API Documentation

### Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/media-collab/folders` | Create folder |
| GET | `/media-collab/folders` | Get root folders |
| GET | `/media-collab/folders/:id` | Get folder details |
| GET | `/media-collab/folders/:id/breadcrumbs` | Get breadcrumb path |
| PUT | `/media-collab/folders/:id` | Update folder |
| DELETE | `/media-collab/folders/:id` | Delete empty folder |
| PUT | `/media-collab/folders/projects/:id/move` | Move project to folder |

### Request/Response Examples

#### Create Folder

**Request:**
```http
POST /api/v1/media-collab/folders
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Q4 2025 Campaigns",
  "parentId": null
}
```

**Response:**
```json
{
  "data": {
    "id": "cm3abc123",
    "name": "Q4 2025 Campaigns",
    "parentId": null,
    "createdBy": "user123",
    "creator": {
      "id": "user123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "_count": {
      "projects": 0,
      "children": 0
    },
    "createdAt": "2025-11-17T12:00:00Z",
    "updatedAt": "2025-11-17T12:00:00Z"
  },
  "message": "Operation successful",
  "status": "success",
  "timestamp": "2025-11-17T12:00:00Z"
}
```

#### Get Folder with Children

**Request:**
```http
GET /api/v1/media-collab/folders/cm3abc123
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": {
    "id": "cm3abc123",
    "name": "Q4 2025 Campaigns",
    "parentId": null,
    "creator": { ... },
    "children": [
      {
        "id": "cm3def456",
        "name": "Instagram Ads",
        "_count": { "projects": 3, "children": 0 }
      },
      {
        "id": "cm3ghi789",
        "name": "YouTube Videos",
        "_count": { "projects": 5, "children": 2 }
      }
    ],
    "projects": [
      {
        "id": "proj123",
        "name": "Holiday Campaign 2025",
        "_count": { "assets": 24, "collaborators": 3 }
      }
    ],
    "_count": { "projects": 1, "children": 2 }
  },
  "message": "Operation successful",
  "status": "success"
}
```

#### Get Breadcrumbs

**Request:**
```http
GET /api/v1/media-collab/folders/cm3xyz789/breadcrumbs
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": [
    { "id": "cm3abc123", "name": "Q4 2025 Campaigns" },
    { "id": "cm3def456", "name": "Instagram Ads" },
    { "id": "cm3xyz789", "name": "Holiday Campaign" }
  ],
  "message": "Operation successful",
  "status": "success"
}
```

#### Move Project

**Request:**
```http
PUT /api/v1/media-collab/folders/projects/proj123/move
Authorization: Bearer {token}
Content-Type: application/json

{
  "folderId": "cm3abc123"
}
```

**Response:**
```json
{
  "data": {
    "id": "proj123",
    "name": "Holiday Campaign 2025",
    "folderId": "cm3abc123",
    "folder": {
      "id": "cm3abc123",
      "name": "Q4 2025 Campaigns"
    }
  },
  "message": "Operation successful",
  "status": "success"
}
```

---

## UI/UX Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Media Collaboration                                     │
├──────────────┬──────────────────────────────────────────┤
│              │  Breadcrumb: Home > Q4 2025 > Instagram │
│  [New Folder]│                                          │
│              │  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  📁 Clients  │  │ 📁      │ │ 📁      │ │ 📁      │   │
│    │         │  │ Holiday │ │ Summer  │ │ Sports  │   │
│    └─ Acme   │  │ 3 proj  │ │ 2 proj  │ │ 5 proj  │   │
│    └─ TechCo │  └─────────┘ └─────────┘ └─────────┘   │
│              │                                          │
│  📁 Campaigns│  ┌─────────┐ ┌─────────┐               │
│    │         │  │ 📄      │ │ 📄      │               │
│    └─ Q4     │  │ Project │ │ Project │               │
│       └─ Inst│  │ 24 imgs │ │ 12 vids │               │
│              │  └─────────┘ └─────────┘               │
└──────────────┴──────────────────────────────────────────┘
```

### Interaction Patterns

#### 1. Folder Creation
- Click "New Folder" button
- Modal opens with name input
- Optionally select parent folder
- Click "Create"

#### 2. Folder Navigation
- Click folder card to enter
- Click breadcrumb to go back
- Right-click folder for context menu

#### 3. Project Movement
- In project detail page, click "Move" button
- Select destination folder from tree
- Confirm move

#### 4. Folder Management
- Right-click folder for context menu
- Rename, delete, add subfolder options
- Keyboard shortcuts (F2 for rename, Del for delete)

### Empty States

**No Folders:**
```
"No folders yet. Create one to organize your projects!"
[Create First Folder] button
```

**Empty Folder:**
```
"This folder is empty. Add a project or create a subfolder."
[Create Subfolder] [Move Project Here] buttons
```

**No Projects in Folder:**
```
"No projects in this folder yet."
[Create Project] [Move Existing Project] buttons
```

---

## Testing Strategy

### Unit Tests

#### Backend Service Tests

```typescript
describe('MediaFoldersService', () => {
  it('should create root folder', async () => {
    // Test creating folder at root level
  });

  it('should create nested folder', async () => {
    // Test creating subfolder
  });

  it('should prevent circular reference', async () => {
    // Test moving folder into its own child
  });

  it('should generate correct breadcrumbs', async () => {
    // Test breadcrumb path generation
  });

  it('should prevent deleting non-empty folder', async () => {
    // Test deletion validation
  });

  it('should move project to folder', async () => {
    // Test project movement
  });

  it('should prevent moving to non-owned folder', async () => {
    // Test permission checks
  });
});
```

#### Frontend Component Tests

```typescript
describe('FolderTree', () => {
  it('should render folder tree', () => {});
  it('should handle folder creation', () => {});
  it('should handle folder deletion', () => {});
  it('should show context menu on right-click', () => {});
});

describe('FolderBreadcrumb', () => {
  it('should render breadcrumb path', () => {});
  it('should navigate on breadcrumb click', () => {});
});

describe('FolderView', () => {
  it('should display subfolders and projects', () => {});
  it('should navigate on folder click', () => {});
  it('should show empty state when empty', () => {});
});
```

### Integration Tests

#### API Endpoint Tests

```typescript
describe('FoldersController (e2e)', () => {
  it('POST /folders - should create folder', async () => {});
  it('GET /folders - should return root folders', async () => {});
  it('GET /folders/:id - should return folder details', async () => {});
  it('PUT /folders/:id - should update folder', async () => {});
  it('DELETE /folders/:id - should delete empty folder', async () => {});
  it('PUT /folders/projects/:id/move - should move project', async () => {});
});
```

### E2E Tests

#### User Workflow Tests

1. User creates root folder
2. User creates nested folder
3. User creates project in folder
4. User moves project between folders
5. User renames folder
6. User deletes empty folder
7. User navigates via breadcrumbs

---

## Performance Considerations

### Database Optimization

#### 1. Breadcrumb Generation

**Current Approach:** N queries (one per level)

**Optimization:** Use recursive CTE in PostgreSQL

```sql
WITH RECURSIVE breadcrumb AS (
  SELECT id, name, parentId FROM media_folders WHERE id = $1
  UNION ALL
  SELECT f.id, f.name, f.parentId
  FROM media_folders f
  JOIN breadcrumb b ON f.id = b.parentId
)
SELECT id, name FROM breadcrumb ORDER BY id;
```

#### 2. Folder Tree Loading

- Use lazy loading for deep trees
- Only load 2 levels at a time
- Implement pagination for 50+ subfolders

#### 3. Project Count Caching

- Use Prisma `_count` aggregation
- Cache counts in Redis for large folders
- Invalidate cache on project add/remove

### Frontend Performance

#### 1. Virtual Scrolling

Use react-window for large folder lists:

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={folders.length}
  itemSize={50}
>
  {FolderItem}
</FixedSizeList>
```

#### 2. Caching Strategy

```typescript
const { data } = useQuery({
  queryKey: ['folder-details', folderId],
  queryFn: () => mediaCollabService.getFolder(folderId),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

#### 3. Optimistic Updates

```typescript
const updateMutation = useMutation({
  mutationFn: updateFolder,
  onMutate: async (newFolder) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries(['folders']);

    // Snapshot previous value
    const previous = queryClient.getQueryData(['folders']);

    // Optimistically update
    queryClient.setQueryData(['folders'], newFolder);

    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['folders'], context?.previous);
  },
});
```

---

## Security Considerations

### 1. Ownership Verification

Always verify folder ownership:

```typescript
if (folder.createdBy !== userId) {
  throw new ForbiddenException('Access denied to this folder');
}
```

### 2. Circular Reference Prevention

Implement descendant check:

```typescript
const isDescendant = await this.isDescendant(targetParentId, currentFolderId);
if (isDescendant) {
  throw new BadRequestException('Cannot move folder into its own descendant');
}
```

### 3. Project Access Control

Verify user is collaborator:

```typescript
const project = await this.prisma.mediaProject.findUnique({
  where: { id: projectId },
  include: {
    collaborators: {
      where: { userId },
    },
  },
});

if (project.collaborators.length === 0) {
  throw new ForbiddenException('Access denied to this project');
}
```

### 4. Input Validation

- Sanitize folder names
- Limit folder depth (max 10 levels)
- Limit folder name length (255 chars)
- Prevent SQL injection via parameterized queries

### 5. Rate Limiting

Implement rate limiting for folder operations:

```typescript
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 10 requests per minute
@Post()
async createFolder() {}
```

---

## Implementation Checklist

### Backend Tasks

- [ ] **Create DTOs**
  - [ ] `CreateFolderDto`
  - [ ] `UpdateFolderDto`
  - [ ] `MoveProjectDto`

- [ ] **Create MediaFoldersService**
  - [ ] `create()` - Create folder
  - [ ] `findRootFolders()` - Get root folders
  - [ ] `findOne()` - Get folder details
  - [ ] `getBreadcrumbs()` - Get breadcrumb path
  - [ ] `update()` - Update folder
  - [ ] `remove()` - Delete folder
  - [ ] `moveProject()` - Move project to folder
  - [ ] `isDescendant()` - Helper for circular reference check

- [ ] **Create MediaFoldersController**
  - [ ] `POST /folders` - Create folder
  - [ ] `GET /folders` - Get root folders
  - [ ] `GET /folders/:id` - Get folder
  - [ ] `GET /folders/:id/breadcrumbs` - Get breadcrumbs
  - [ ] `PUT /folders/:id` - Update folder
  - [ ] `DELETE /folders/:id` - Delete folder
  - [ ] `PUT /folders/projects/:id/move` - Move project

- [ ] **Register in MediaCollabModule**
  - [ ] Add service to providers
  - [ ] Add controller to controllers
  - [ ] Add to exports

- [ ] **Test API Endpoints**
  - [ ] Test create folder
  - [ ] Test nested folders
  - [ ] Test move project
  - [ ] Test breadcrumb generation
  - [ ] Test circular reference prevention
  - [ ] Test empty folder deletion

### Frontend Tasks

- [ ] **Update media-collab service**
  - [ ] Add `MediaFolder` interface
  - [ ] Add `CreateFolderDto` interface
  - [ ] Add `UpdateFolderDto` interface
  - [ ] Add `Breadcrumb` interface
  - [ ] Add `createFolder()` method
  - [ ] Add `getRootFolders()` method
  - [ ] Add `getFolder()` method
  - [ ] Add `getFolderBreadcrumbs()` method
  - [ ] Add `updateFolder()` method
  - [ ] Add `deleteFolder()` method
  - [ ] Add `moveProjectToFolder()` method

- [ ] **Create Components**
  - [ ] `FolderBreadcrumb` component
  - [ ] `FolderTree` component
  - [ ] `FolderView` component

- [ ] **Update MediaCollaborationPage**
  - [ ] Add folder navigation state
  - [ ] Integrate FolderTree in sidebar
  - [ ] Integrate FolderBreadcrumb
  - [ ] Integrate FolderView
  - [ ] Add project click handler

- [ ] **Add folder actions to MediaProjectDetailPage**
  - [ ] Show current folder in project header
  - [ ] Add "Move to Folder" button
  - [ ] Add folder selector modal

- [ ] **Test UI**
  - [ ] Test create folder
  - [ ] Test rename folder
  - [ ] Test delete folder
  - [ ] Test nested folder navigation
  - [ ] Test move project
  - [ ] Test breadcrumb navigation
  - [ ] Test right-click context menu

### Optional Advanced Tasks

- [ ] Drag-and-drop project movement
- [ ] Folder sharing and permissions
- [ ] Folder templates
- [ ] Bulk project movement
- [ ] Folder search
- [ ] Folder favorites/pinning
- [ ] Folder color coding
- [ ] Folder icons customization

---

## Comparison: Folders vs Collections

| Feature | Folders | Collections |
|---------|---------|-------------|
| **Purpose** | Physical organization | Virtual organization |
| **Contains** | Projects | Assets |
| **Structure** | Hierarchical tree | Flat list |
| **Nesting** | Unlimited | No nesting |
| **Dynamic** | No | Yes (smart collections) |
| **Sharing** | Per folder | Per project |
| **Use Case** | Client/campaign separation | Star ratings, status, tags |

### When to Use Folders

- Organizing projects by client
- Organizing projects by campaign
- Organizing projects by date/quarter
- Team-based organization
- Department separation

### When to Use Collections

- Grouping assets by star rating
- Grouping assets by status (approved, needs changes)
- Grouping assets with unresolved comments
- Creating "best of" galleries
- Social platform-specific collections

---

## Migration Strategy

### Current State

The database schema is already in place via the baseline migration. No new migration is needed unless adding enhancements.

### If Enhancements Needed

```bash
# Generate migration
cd backend
npx prisma migrate dev --name add_folder_metadata

# Apply migration in production
npx prisma migrate deploy
```

Example migration for folder metadata:

```sql
-- Add description column
ALTER TABLE "media_folders" ADD COLUMN "description" TEXT;

-- Add color column
ALTER TABLE "media_folders" ADD COLUMN "color" VARCHAR(7);

-- Add starred column
ALTER TABLE "media_folders" ADD COLUMN "starred" BOOLEAN DEFAULT false;

-- Add icon column
ALTER TABLE "media_folders" ADD COLUMN "icon" VARCHAR(50);
```

---

## Future Enhancements

### Phase 1: Core Features (Covered in This Plan)
- ✅ Hierarchical folders
- ✅ Breadcrumb navigation
- ✅ Create/rename/delete folders
- ✅ Move projects between folders

### Phase 2: Enhanced Organization
- [ ] Folder search with filters
- [ ] Folder favorites/pinning
- [ ] Recent folders view
- [ ] Folder color coding
- [ ] Custom folder icons

### Phase 3: Collaboration
- [ ] Folder sharing with team members
- [ ] Role-based folder permissions (view/edit/admin)
- [ ] Shared folder notifications
- [ ] Folder activity log

### Phase 4: Productivity
- [ ] Folder templates (client, campaign, quarterly)
- [ ] Bulk operations (move, delete, merge)
- [ ] Folder duplication
- [ ] Folder export/import (JSON)

### Phase 5: Analytics
- [ ] Folder usage statistics
- [ ] Storage usage per folder
- [ ] Popular folders dashboard
- [ ] Folder access patterns

### Phase 6: Advanced Features
- [ ] Smart folders (auto-organize by rules)
- [ ] Folder tags and labels
- [ ] Folder descriptions with rich text
- [ ] Folder cover images
- [ ] Folder-level permissions inheritance

---

## Conclusion

This implementation plan provides a complete **Google Drive/Frame.io-like folder system** for the media collaboration module. The database schema is already in place, requiring only backend services, controllers, and frontend components to be implemented.

### Key Benefits

1. ✅ **Clean hierarchical organization** for projects
2. ✅ **Intuitive navigation** with breadcrumbs
3. ✅ **Flexible folder nesting** (unlimited depth)
4. ✅ **Drag-and-drop support** (optional)
5. ✅ **Complements existing Collections** feature
6. ✅ **Industry-standard UI/UX** (familiar to users)

### Estimated Implementation Time

- **Backend**: 4-6 hours
  - DTOs: 30 minutes
  - Service: 2-3 hours
  - Controller: 1 hour
  - Testing: 30-60 minutes

- **Frontend**: 6-8 hours
  - Service methods: 1 hour
  - FolderTree component: 2-3 hours
  - FolderView component: 1-2 hours
  - FolderBreadcrumb component: 1 hour
  - Integration: 1-2 hours

- **Testing**: 2-3 hours
  - Unit tests: 1 hour
  - Integration tests: 1 hour
  - E2E tests: 1 hour

**Total: 12-17 hours**

### Next Steps

1. **Phase 1**: Create backend DTOs and service
2. **Phase 2**: Create backend controller
3. **Phase 3**: Register in module
4. **Phase 4**: Test API endpoints with Postman/Swagger
5. **Phase 5**: Create frontend service methods
6. **Phase 6**: Create frontend components
7. **Phase 7**: Integrate into MediaCollaborationPage
8. **Phase 8**: Add drag-and-drop (optional)
9. **Phase 9**: User acceptance testing
10. **Phase 10**: Deploy to production

---

## Additional Resources

### Documentation Links

- [Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [NestJS Controllers](https://docs.nestjs.com/controllers)
- [NestJS Services](https://docs.nestjs.com/providers)
- [React Query](https://tanstack.com/query/latest)
- [Ant Design Tree](https://ant.design/components/tree)

### Related Files

- Database Schema: `backend/prisma/schema.prisma`
- Existing Module: `backend/src/modules/media-collab/media-collab.module.ts`
- Existing Service: `backend/src/modules/media-collab/services/media-projects.service.ts`
- Frontend Service: `frontend/src/services/media-collab.ts`
- Current Page: `frontend/src/pages/MediaCollaborationPage.tsx`

---

**Document Version**: 1.0
**Last Updated**: 2025-11-17
**Author**: Claude (Anthropic)
**Status**: Ready for Implementation
