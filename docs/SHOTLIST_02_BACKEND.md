# Shot List - Backend Implementation

## Directory Structure
```
backend/src/modules/shot-lists/
├── shot-lists.module.ts
├── shot-lists.controller.ts
├── shot-lists.service.ts
├── scenes.controller.ts
├── scenes.service.ts
├── shots.controller.ts
├── shots.service.ts
└── dto/
    ├── create-shot-list.dto.ts
    ├── create-scene.dto.ts
    ├── create-shot.dto.ts
    ├── update-shot.dto.ts
    └── reorder-shots.dto.ts
```

---

## Task 1: Create DTOs

### File: `dto/create-shot-list.dto.ts`
```typescript
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateShotListDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  projectId: string;
}
```

### File: `dto/create-scene.dto.ts`
```typescript
import { IsString, IsOptional, IsUUID, IsInt } from 'class-validator';

export class CreateSceneDto {
  @IsUUID()
  shotListId: string;

  @IsString()
  sceneNumber: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  intExt?: string;

  @IsOptional()
  @IsString()
  dayNight?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
```

### File: `dto/create-shot.dto.ts`
```typescript
import { IsString, IsOptional, IsUUID, IsInt, IsEnum } from 'class-validator';

export class CreateShotDto {
  @IsUUID()
  sceneId: string;

  @IsString()
  shotNumber: string;

  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsString() shotSize?: string;
  @IsOptional() @IsString() shotType?: string;
  @IsOptional() @IsString() cameraAngle?: string;
  @IsOptional() @IsString() cameraMovement?: string;
  @IsOptional() @IsString() lens?: string;
  @IsOptional() @IsString() frameRate?: string;
  @IsOptional() @IsString() camera?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsString() dialogue?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsInt() setupNumber?: number;
  @IsOptional() @IsInt() estimatedTime?: number;
  @IsOptional() @IsString() vfx?: string;
  @IsOptional() @IsString() sfx?: string;
}
```

### File: `dto/update-shot.dto.ts`
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateShotDto } from './create-shot.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export class UpdateShotDto extends PartialType(CreateShotDto) {
  @IsOptional()
  @IsEnum(['PLANNED', 'IN_PROGRESS', 'SHOT', 'WRAPPED', 'CUT'])
  status?: string;

  @IsOptional()
  @IsString()
  storyboardUrl?: string;

  @IsOptional()
  @IsString()
  storyboardKey?: string;
}
```

### File: `dto/reorder-shots.dto.ts`
```typescript
import { IsArray, IsUUID } from 'class-validator';

export class ReorderShotsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  shotIds: string[];
}
```

---

## Task 2: Create Service

### File: `shot-lists.service.ts`
```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShotListDto } from './dto/create-shot-list.dto';

@Injectable()
export class ShotListsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateShotListDto) {
    return this.prisma.shotList.create({
      data: { ...dto, createdById: userId },
      include: { scenes: { include: { shots: true } } },
    });
  }

  async findByProject(projectId: string) {
    return this.prisma.shotList.findMany({
      where: { projectId },
      include: {
        scenes: { orderBy: { order: 'asc' }, include: { shots: { orderBy: { order: 'asc' } } } },
        _count: { select: { scenes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const list = await this.prisma.shotList.findUnique({
      where: { id },
      include: {
        project: true,
        createdBy: { select: { id: true, name: true } },
        scenes: {
          orderBy: { order: 'asc' },
          include: { shots: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!list) throw new NotFoundException('Shot list not found');
    return list;
  }

  async remove(id: string) {
    await this.prisma.shotList.delete({ where: { id } });
    return { success: true };
  }
}
```

### File: `shots.service.ts`
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShotDto } from './dto/create-shot.dto';
import { UpdateShotDto } from './dto/update-shot.dto';
import { ReorderShotsDto } from './dto/reorder-shots.dto';

@Injectable()
export class ShotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateShotDto) {
    const maxOrder = await this.prisma.shot.aggregate({
      where: { sceneId: dto.sceneId },
      _max: { order: true },
    });
    return this.prisma.shot.create({
      data: { ...dto, order: dto.order ?? (maxOrder._max.order ?? -1) + 1 },
    });
  }

  async update(id: string, dto: UpdateShotDto) {
    return this.prisma.shot.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.prisma.shot.delete({ where: { id } });
    return { success: true };
  }

  async reorder(sceneId: string, dto: ReorderShotsDto) {
    const updates = dto.shotIds.map((id, index) =>
      this.prisma.shot.update({ where: { id }, data: { order: index } })
    );
    await this.prisma.$transaction(updates);
    return this.prisma.shot.findMany({
      where: { sceneId },
      orderBy: { order: 'asc' },
    });
  }

  async duplicate(id: string) {
    const shot = await this.prisma.shot.findUnique({ where: { id } });
    if (!shot) throw new NotFoundException('Shot not found');

    const { id: _, createdAt, updatedAt, ...data } = shot;
    return this.prisma.shot.create({
      data: { ...data, shotNumber: `${shot.shotNumber}-copy`, order: shot.order + 1 },
    });
  }
}
```

---

## Task 3: Create Controller

### File: `shot-lists.controller.ts`
```typescript
import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ShotListsService } from './shot-lists.service';
import { CreateShotListDto } from './dto/create-shot-list.dto';

@Controller('shot-lists')
@UseGuards(JwtAuthGuard)
export class ShotListsController {
  constructor(private readonly service: ShotListsService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateShotListDto) {
    return { data: this.service.create(req.user.id, dto) };
  }

  @Get()
  findByProject(@Query('projectId') projectId: string) {
    return { data: this.service.findByProject(projectId) };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return { data: this.service.findOne(id) };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
```

### File: `shots.controller.ts`
```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ShotsService } from './shots.service';
import { CreateShotDto } from './dto/create-shot.dto';
import { UpdateShotDto } from './dto/update-shot.dto';
import { ReorderShotsDto } from './dto/reorder-shots.dto';

@Controller('shots')
@UseGuards(JwtAuthGuard)
export class ShotsController {
  constructor(private readonly service: ShotsService) {}

  @Post()
  create(@Body() dto: CreateShotDto) {
    return { data: this.service.create(dto) };
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateShotDto) {
    return { data: this.service.update(id, dto) };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('reorder/:sceneId')
  reorder(@Param('sceneId') sceneId: string, @Body() dto: ReorderShotsDto) {
    return { data: this.service.reorder(sceneId, dto) };
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string) {
    return { data: this.service.duplicate(id) };
  }
}
```

---

## Task 4: Create Module

### File: `shot-lists.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { ShotListsController } from './shot-lists.controller';
import { ShotListsService } from './shot-lists.service';
import { ShotsController } from './shots.controller';
import { ShotsService } from './shots.service';
import { ScenesController } from './scenes.controller';
import { ScenesService } from './scenes.service';

@Module({
  controllers: [ShotListsController, ShotsController, ScenesController],
  providers: [ShotListsService, ShotsService, ScenesService],
  exports: [ShotListsService],
})
export class ShotListsModule {}
```

---

## Task 5: Register Module

### File: `backend/src/app.module.ts`

Add import:
```typescript
import { ShotListsModule } from './modules/shot-lists/shot-lists.module';
```

Add to imports array:
```typescript
ShotListsModule,
```

---

## Verification

```bash
cd backend && npm run start:dev
```

Test endpoint:
```bash
curl http://localhost:5000/api/shot-lists?projectId=test
```
