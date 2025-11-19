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
    this.prisma.mediaProject
      .update({
        where: { id: project.id },
        data: { publicViewCount: { increment: 1 } },
      })
      .catch(() => {}); // Ignore errors

    // Attach project to request
    request.publicProject = project;

    return true;
  }
}
