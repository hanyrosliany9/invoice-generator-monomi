import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard to authenticate guest collaborators via invite token
 * Token can be provided as query parameter or header
 */
@Injectable()
export class GuestAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Get token from query parameter or header
    const token =
      request.query.token ||
      request.headers['x-guest-token'] ||
      request.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('Guest token required');
    }

    // Validate guest token
    const collaborator = await this.prisma.mediaCollaborator.findUnique({
      where: { inviteToken: token },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            clientId: true,
          },
        },
      },
    });

    if (!collaborator) {
      throw new UnauthorizedException('Invalid guest token');
    }

    // Check if expired
    if (collaborator.expiresAt && collaborator.expiresAt < new Date()) {
      await this.prisma.mediaCollaborator.update({
        where: { id: collaborator.id },
        data: { status: 'EXPIRED' },
      });
      throw new UnauthorizedException('Guest token expired');
    }

    // Check if revoked
    if (collaborator.status === 'REVOKED') {
      throw new UnauthorizedException('Guest access revoked');
    }

    // Update last access time and mark as accepted on first use
    await this.prisma.mediaCollaborator.update({
      where: { id: collaborator.id },
      data: {
        lastAccessAt: new Date(),
        status: collaborator.status === 'PENDING' ? 'ACCEPTED' : collaborator.status,
      },
    });

    // Attach collaborator to request (NOT full user object)
    request.guestCollaborator = collaborator;
    request.isGuest = true;

    return true;
  }
}
