import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequireAdmin } from "../auth/decorators/auth.decorators";
import { PortalContactsService } from "./portal-contacts.service";
import { CreatePortalContactDto, UpdatePortalContactDto } from "./dto/portal.dto";

/**
 * Staff API to manage who can log in to a client's portal.
 * Staff JWT + ADMIN/SUPER_ADMIN (RequireAdmin = JwtAuthGuard + RolesGuard).
 */
@ApiTags("Client Portal - Contacts (staff)")
@ApiBearerAuth()
@RequireAdmin()
@Controller("clients/:clientId/portal-contacts")
export class PortalContactsController {
  constructor(private readonly contacts: PortalContactsService) {}

  @Get()
  @ApiOperation({ summary: "List portal contacts of a client" })
  list(@Param("clientId") clientId: string) {
    return this.contacts.list(clientId);
  }

  @Post()
  @ApiOperation({ summary: "Add a portal contact (400 for internal clients, 409 duplicate)" })
  create(
    @Param("clientId") clientId: string,
    @Body() dto: CreatePortalContactDto,
    @Request() req: any,
  ) {
    return this.contacts.create(clientId, dto, req.user?.id);
  }

  @Patch(":contactId")
  @ApiOperation({ summary: "Rename / activate / deactivate (revokes sessions) a contact" })
  update(
    @Param("clientId") clientId: string,
    @Param("contactId") contactId: string,
    @Body() dto: UpdatePortalContactDto,
  ) {
    return this.contacts.update(clientId, contactId, dto);
  }

  @Delete(":contactId")
  @ApiOperation({ summary: "Delete a contact (revokes access immediately)" })
  remove(
    @Param("clientId") clientId: string,
    @Param("contactId") contactId: string,
  ) {
    return this.contacts.remove(clientId, contactId);
  }

  @Post(":contactId/invite")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Email the contact a portal invitation (503 if SMTP fails)" })
  invite(
    @Param("clientId") clientId: string,
    @Param("contactId") contactId: string,
  ) {
    return this.contacts.invite(clientId, contactId);
  }
}
