import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  Body,
  Res,
  Req,
  Query,
  UseGuards,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { DocumentsService } from "./documents.service";
import { DocumentCategory } from "@prisma/client";
import { diskStorage } from "multer";
import { extname } from "path";
import * as fs from "fs";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RequireAdmin } from "../auth/decorators/auth.decorators";

@Controller("documents")
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post("upload")
  @RequireAdmin()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: process.env.UPLOAD_PATH || "./uploads",
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/gif",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException("File type not allowed"), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  async uploadFile(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body("invoiceId") invoiceId?: string,
    @Body("quotationId") quotationId?: string,
    @Body("projectId") projectId?: string,
    @Body("category") category: DocumentCategory = DocumentCategory.OTHER,
    @Body("description") description?: string,
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    // FIX 1: derive uploadedBy from the authenticated JWT principal, not caller-supplied body
    const uploadedBy: string = (req as any).user?.id;
    if (!uploadedBy) {
      throw new BadRequestException("Could not resolve authenticated user");
    }

    try {
      const document = await this.documentsService.uploadDocument(
        file,
        uploadedBy,
        invoiceId,
        quotationId,
        projectId,
        category,
        description,
      );

      return {
        message: "File uploaded successfully",
        document,
      };
    } catch (error) {
      // Clean up the uploaded file if database save fails
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  @Get("invoice/:invoiceId")
  async getInvoiceDocuments(@Param("invoiceId") invoiceId: string) {
    return this.documentsService.getDocumentsByInvoice(invoiceId);
  }

  @Get("quotation/:quotationId")
  async getQuotationDocuments(@Param("quotationId") quotationId: string) {
    return this.documentsService.getDocumentsByQuotation(quotationId);
  }

  @Get("project/:projectId")
  async getProjectDocuments(@Param("projectId") projectId: string) {
    return this.documentsService.getDocumentsByProject(projectId);
  }

  @Get("download/:id")
  async downloadDocument(@Param("id") id: string, @Res() res: Response) {
    const document = await this.documentsService.getDocumentById(id);

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    if (!fs.existsSync(document.filePath)) {
      throw new NotFoundException("File not found on disk");
    }

    // FIX 2a: harden Content-Type for downloads — always force attachment so the
    // browser never renders the file inline regardless of stored mimeType.
    res.setHeader("Content-Type", document.mimeType);
    res.setHeader("X-Content-Type-Options", "nosniff");

    // FIX 2b: sanitize filename before embedding in Content-Disposition header.
    // Strip double-quotes, newlines, and other control characters, then provide
    // an RFC 5987 encoded filename* fallback for non-ASCII characters.
    const rawName = document.originalFileName ?? "download";
    const safeAsciiName = rawName.replace(/[\x00-\x1f"\\]/g, "_");
    const encodedName = encodeURIComponent(rawName);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodedName}`,
    );

    return res.sendFile(document.filePath);
  }

  @Get("preview/:id")
  async previewDocument(@Param("id") id: string, @Res() res: Response) {
    const document = await this.documentsService.getDocumentById(id);

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    if (!fs.existsSync(document.filePath)) {
      throw new NotFoundException("File not found on disk");
    }

    // FIX 2a: only serve inline for explicitly safe MIME types to prevent a
    // client-supplied mimeType (e.g. text/html) from executing in the browser.
    const SAFE_INLINE_TYPES = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ]);
    const isSafeInline = SAFE_INLINE_TYPES.has(document.mimeType);
    const disposition = isSafeInline ? "inline" : "attachment";

    res.setHeader("Content-Type", document.mimeType);
    res.setHeader("X-Content-Type-Options", "nosniff");

    // FIX 2b: sanitize filename — same approach as download route.
    const rawName = document.originalFileName ?? "preview";
    const safeAsciiName = rawName.replace(/[\x00-\x1f"\\]/g, "_");
    const encodedName = encodeURIComponent(rawName);
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${safeAsciiName}"; filename*=UTF-8''${encodedName}`,
    );

    return res.sendFile(document.filePath);
  }

  @Delete(":id")
  @RequireAdmin()
  async deleteDocument(@Param("id") id: string) {
    const document = await this.documentsService.getDocumentById(id);

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    // Delete file from disk
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // Delete from database
    await this.documentsService.deleteDocument(id);

    return {
      message: "Document deleted successfully",
    };
  }
}
