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
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { DocumentCategory } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: '/app/uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('File type not allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('invoiceId') invoiceId?: string,
    @Body('quotationId') quotationId?: string,
    @Body('projectId') projectId?: string,
    @Body('category') category: DocumentCategory = DocumentCategory.OTHER,
    @Body('description') description?: string,
    @Body('uploadedBy') uploadedBy?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!uploadedBy) {
      throw new BadRequestException('uploadedBy is required');
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
        message: 'File uploaded successfully',
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

  @Get('invoice/:invoiceId')
  async getInvoiceDocuments(@Param('invoiceId') invoiceId: string) {
    return this.documentsService.getDocumentsByInvoice(invoiceId);
  }

  @Get('quotation/:quotationId')
  async getQuotationDocuments(@Param('quotationId') quotationId: string) {
    return this.documentsService.getDocumentsByQuotation(quotationId);
  }

  @Get('project/:projectId')
  async getProjectDocuments(@Param('projectId') projectId: string) {
    return this.documentsService.getDocumentsByProject(projectId);
  }

  @Get('download/:id')
  async downloadDocument(@Param('id') id: string, @Res() res: Response) {
    const document = await this.documentsService.getDocumentById(id);
    
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!fs.existsSync(document.filePath)) {
      throw new NotFoundException('File not found on disk');
    }

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${document.originalFileName}"`,
    );
    
    return res.sendFile(document.filePath);
  }

  @Get('preview/:id')
  async previewDocument(@Param('id') id: string, @Res() res: Response) {
    const document = await this.documentsService.getDocumentById(id);
    
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!fs.existsSync(document.filePath)) {
      throw new NotFoundException('File not found on disk');
    }

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${document.originalFileName}"`,
    );
    
    return res.sendFile(document.filePath);
  }

  @Delete(':id')
  async deleteDocument(@Param('id') id: string) {
    const document = await this.documentsService.getDocumentById(id);
    
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Delete file from disk
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // Delete from database
    await this.documentsService.deleteDocument(id);

    return {
      message: 'Document deleted successfully',
    };
  }
}