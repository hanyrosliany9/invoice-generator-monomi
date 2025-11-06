import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InvoicesService } from '../../invoices/invoices.service';
import { QuotationsService } from '../../quotations/quotations.service';
import { ProjectsService } from '../../projects/projects.service';

@Injectable()
export class PdfAccessGuard implements CanActivate {
  constructor(
    private invoicesService: InvoicesService,
    private quotationsService: QuotationsService,
    private projectsService: ProjectsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const path = request.route.path;
    const resourceId = request.params.id;

    // Admin and Super Admin can access all PDFs
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Determine resource type from path
    let resourceType: 'invoice' | 'quotation' | 'project' | null = null;
    if (path.includes('/pdf/invoice/')) {
      resourceType = 'invoice';
    } else if (path.includes('/pdf/quotation/')) {
      resourceType = 'quotation';
    } else if (path.includes('/pdf/project/')) {
      resourceType = 'project';
    }

    if (!resourceType) {
      throw new ForbiddenException('Invalid resource type');
    }

    // Check resource ownership or access
    try {
      switch (resourceType) {
        case 'invoice':
          const invoice = await this.invoicesService.findOne(resourceId);
          if (!invoice) {
            throw new NotFoundException('Invoice not found');
          }
          // Check if user is creator or client owner
          if (invoice.createdBy !== user.userId && invoice.client?.createdBy !== user.userId) {
            throw new ForbiddenException('You do not have access to this invoice');
          }
          break;

        case 'quotation':
          const quotation = await this.quotationsService.findOne(resourceId);
          if (!quotation) {
            throw new NotFoundException('Quotation not found');
          }
          // Check if user is creator or client owner
          if (quotation.createdBy !== user.userId && quotation.client?.createdBy !== user.userId) {
            throw new ForbiddenException('You do not have access to this quotation');
          }
          break;

        case 'project':
          const project = await this.projectsService.findOne(resourceId);
          if (!project) {
            throw new NotFoundException('Project not found');
          }
          // Projects don't have createdBy field - allow all authenticated users
          // or check client relationship if client field exists
          break;
      }

      return true;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('Access denied');
    }
  }
}
