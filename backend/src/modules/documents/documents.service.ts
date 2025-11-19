import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Document, DocumentCategory } from "@prisma/client";
import * as fs from "fs/promises";
import * as path from "path";

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private prisma: PrismaService) {}

  async uploadDocument(
    file: Express.Multer.File,
    uploadedBy: string,
    invoiceId?: string,
    quotationId?: string,
    projectId?: string,
    category: DocumentCategory = DocumentCategory.OTHER,
    description?: string,
  ): Promise<Document> {
    return this.prisma.document.create({
      data: {
        fileName: file.filename,
        originalFileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        category,
        description,
        invoiceId,
        quotationId,
        projectId,
        uploadedBy,
      },
    });
  }

  async getDocumentsByInvoice(invoiceId: string): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: { invoiceId },
      orderBy: { uploadedAt: "desc" },
    });
  }

  async getDocumentsByQuotation(quotationId: string): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: { quotationId },
      orderBy: { uploadedAt: "desc" },
    });
  }

  async getDocumentsByProject(projectId: string): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: { projectId },
      orderBy: { uploadedAt: "desc" },
    });
  }

  async getDocumentById(id: string): Promise<Document | null> {
    return this.prisma.document.findUnique({
      where: { id },
    });
  }

  async deleteDocument(id: string): Promise<Document> {
    // Get document to retrieve file path
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document not found: ${id}`);
    }

    // Delete file from filesystem
    try {
      if (document.filePath) {
        await fs.unlink(document.filePath);
        this.logger.log(`Deleted file from filesystem: ${document.filePath}`);
      }
    } catch (error) {
      // Log error but don't fail the deletion
      // File might already be deleted or path invalid
      this.logger.warn(
        `Failed to delete file from filesystem: ${document.filePath}`,
        error,
      );
    }

    // Delete from database
    return this.prisma.document.delete({
      where: { id },
    });
  }

  /**
   * Delete all documents for an invoice (called during cascade deletion)
   * CRITICAL: Also deletes files from local filesystem
   */
  async deleteDocumentsByInvoice(invoiceId: string): Promise<number> {
    const documents = await this.prisma.document.findMany({
      where: { invoiceId },
    });

    let deletedFiles = 0;
    for (const doc of documents) {
      try {
        if (doc.filePath) {
          await fs.unlink(doc.filePath);
          deletedFiles++;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to delete file from filesystem: ${doc.filePath}`,
          error,
        );
      }
    }

    // Delete from database
    const result = await this.prisma.document.deleteMany({
      where: { invoiceId },
    });

    this.logger.log(
      `Deleted ${result.count} documents for invoice ${invoiceId}, removed ${deletedFiles} files from filesystem`,
    );

    return result.count;
  }

  /**
   * Delete all documents for a quotation (called during cascade deletion)
   * CRITICAL: Also deletes files from local filesystem
   */
  async deleteDocumentsByQuotation(quotationId: string): Promise<number> {
    const documents = await this.prisma.document.findMany({
      where: { quotationId },
    });

    let deletedFiles = 0;
    for (const doc of documents) {
      try {
        if (doc.filePath) {
          await fs.unlink(doc.filePath);
          deletedFiles++;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to delete file from filesystem: ${doc.filePath}`,
          error,
        );
      }
    }

    // Delete from database
    const result = await this.prisma.document.deleteMany({
      where: { quotationId },
    });

    this.logger.log(
      `Deleted ${result.count} documents for quotation ${quotationId}, removed ${deletedFiles} files from filesystem`,
    );

    return result.count;
  }

  /**
   * Delete all documents for a project (called during cascade deletion)
   * CRITICAL: Also deletes files from local filesystem
   */
  async deleteDocumentsByProject(projectId: string): Promise<number> {
    const documents = await this.prisma.document.findMany({
      where: { projectId },
    });

    let deletedFiles = 0;
    for (const doc of documents) {
      try {
        if (doc.filePath) {
          await fs.unlink(doc.filePath);
          deletedFiles++;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to delete file from filesystem: ${doc.filePath}`,
          error,
        );
      }
    }

    // Delete from database
    const result = await this.prisma.document.deleteMany({
      where: { projectId },
    });

    this.logger.log(
      `Deleted ${result.count} documents for project ${projectId}, removed ${deletedFiles} files from filesystem`,
    );

    return result.count;
  }
}
