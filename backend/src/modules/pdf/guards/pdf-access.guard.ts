import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { InvoicesService } from "../../invoices/invoices.service";
import { QuotationsService } from "../../quotations/quotations.service";
import { ProjectsService } from "../../projects/projects.service";
import { SchedulesService } from "../../schedules/schedules.service";
import { CallSheetsService } from "../../call-sheets/call-sheets.service";
import { ShotListsService } from "../../shot-lists/shot-lists.service";

@Injectable()
export class PdfAccessGuard implements CanActivate {
  constructor(
    private invoicesService: InvoicesService,
    private quotationsService: QuotationsService,
    private projectsService: ProjectsService,
    private schedulesService: SchedulesService,
    private callSheetsService: CallSheetsService,
    private shotListsService: ShotListsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const path = request.route.path;
    const resourceId = request.params.id;

    // Admin and Super Admin can access all PDFs
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      return true;
    }

    // Determine resource type from path
    let resourceType:
      | "invoice"
      | "quotation"
      | "project"
      | "schedule"
      | "call-sheet"
      | "shot-list"
      | null = null;
    if (path.includes("/pdf/invoice/")) {
      resourceType = "invoice";
    } else if (path.includes("/pdf/quotation/")) {
      resourceType = "quotation";
    } else if (path.includes("/pdf/project/")) {
      resourceType = "project";
    } else if (path.includes("/pdf/schedule/")) {
      resourceType = "schedule";
    } else if (path.includes("/pdf/call-sheet/")) {
      resourceType = "call-sheet";
    } else if (path.includes("/pdf/shot-list/")) {
      resourceType = "shot-list";
    }

    if (!resourceType) {
      throw new ForbiddenException("Invalid resource type");
    }

    // Check resource ownership or access
    try {
      switch (resourceType) {
        case "invoice":
          const invoice = await this.invoicesService.findOne(resourceId);
          if (!invoice) {
            throw new NotFoundException("Invoice not found");
          }
          // Check if user is creator or client owner
          if (
            invoice.createdBy !== user.userId &&
            invoice.client?.createdBy !== user.userId
          ) {
            throw new ForbiddenException(
              "You do not have access to this invoice",
            );
          }
          break;

        case "quotation":
          const quotation = await this.quotationsService.findOne(resourceId);
          if (!quotation) {
            throw new NotFoundException("Quotation not found");
          }
          // Check if user is creator or client owner
          if (
            quotation.createdBy !== user.userId &&
            quotation.client?.createdBy !== user.userId
          ) {
            throw new ForbiddenException(
              "You do not have access to this quotation",
            );
          }
          break;

        case "project":
          const project = await this.projectsService.findOne(resourceId);
          if (!project) {
            throw new NotFoundException("Project not found");
          }
          // Projects don't have createdBy field - allow all authenticated users
          // or check client relationship if client field exists
          break;

        case "schedule":
          const schedule = await this.schedulesService.findOne(resourceId);
          if (!schedule) {
            throw new NotFoundException("Schedule not found");
          }
          // Check if user is creator
          if (schedule.createdBy !== user.userId) {
            throw new ForbiddenException(
              "You do not have access to this schedule",
            );
          }
          break;

        case "call-sheet":
          const callSheet = await this.callSheetsService.findOne(resourceId);
          if (!callSheet) {
            throw new NotFoundException("Call Sheet not found");
          }
          // Check if user is creator
          if (callSheet.createdBy !== user.userId) {
            throw new ForbiddenException(
              "You do not have access to this call sheet",
            );
          }
          break;

        case "shot-list":
          const shotList = await this.shotListsService.findOne(resourceId);
          if (!shotList) {
            throw new NotFoundException("Shot List not found");
          }
          // Check if user is creator
          if (shotList.createdBy !== user.userId) {
            throw new ForbiddenException(
              "You do not have access to this shot list",
            );
          }
          break;
      }

      return true;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new ForbiddenException("Access denied");
    }
  }
}
