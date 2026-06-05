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

  /**
   * Defense-in-depth: load a document and verify its parent entity still exists.
   * Throws NotFoundException if the document or its linked parent is not found.
   * Used by download/preview routes so a dangling document (orphaned after
   * the parent was deleted outside a cascade) cannot be served.
   */
  async getDocumentWithParentCheck(id: string): Promise<Document> {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document not found: ${id}`);
    }

    // Verify parent entity still exists (defense against orphaned documents)
    if (document.invoiceId) {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: document.invoiceId },
        select: { id: true },
      });
      if (!invoice) {
        throw new NotFoundException(`Parent invoice not found for document: ${id}`);
      }
    } else if (document.quotationId) {
      const quotation = await this.prisma.quotation.findUnique({
        where: { id: document.quotationId },
        select: { id: true },
      });
      if (!quotation) {
        throw new NotFoundException(`Parent quotation not found for document: ${id}`);
      }
    } else if (document.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: document.projectId },
        select: { id: true },
      });
      if (!project) {
        throw new NotFoundException(`Parent project not found for document: ${id}`);
      }
    }

    return document;
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
