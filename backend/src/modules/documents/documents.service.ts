import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Document, DocumentCategory } from "@prisma/client";

@Injectable()
export class DocumentsService {
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
    return this.prisma.document.delete({
      where: { id },
    });
  }
}
