import { PartialType } from '@nestjs/swagger';
import { CreateVendorInvoiceDto } from './create-vendor-invoice.dto';

export class UpdateVendorInvoiceDto extends PartialType(CreateVendorInvoiceDto) {}
