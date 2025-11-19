import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to extract guest collaborator from request
 * Used with GuestAuthGuard
 */
export const GuestCollaborator = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.guestCollaborator;
  },
);
