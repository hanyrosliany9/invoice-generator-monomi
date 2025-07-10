# Claude Code Execution Plan for Invoice System Fixes

**Generated**: 2025-07-10  
**Context**: Systematic fix plan optimized for Claude Code execution  
**Approach**: Incremental, testable changes with continuous validation  
**Timeline**: 14 days with clear daily tasks and verification steps

---

## Executive Summary

This plan is specifically designed for **Claude Code execution**, focusing on:
- ✅ **Small, atomic changes** that can be verified immediately
- ✅ **Docker-first approach** respecting the project's containerized nature
- ✅ **Continuous testing** after each change
- ✅ **Clear file paths** and exact code locations
- ✅ **Rollback safety** with git commits after each successful change

---

## Pre-Execution Checklist

### **Environment Verification**
```bash
# Verify Docker is running
docker compose -f docker-compose.dev.yml ps

# Check current git status (ensure clean working tree)
git status

# Create backup branch
git checkout -b invoice-fixes-backup

# Return to master
git checkout master

# Pull latest changes
git pull origin master
```

### **Test Current State**
```bash
# Run current tests to establish baseline
docker compose -f docker-compose.dev.yml exec app npm test

# Try creating an invoice (expect failure)
# Use the frontend at http://localhost:3000
```

---

## Day 1: Fix Core Validation Issues

### **Task 1.1: Add materaiApplied to DTO (30 min)**

**File**: `backend/src/modules/invoices/dto/create-invoice.dto.ts`

**Changes**:
1. Add imports at top if missing:
```typescript
import { IsBoolean } from 'class-validator';
```

2. Add field after line 85 (after `terms` field):
```typescript
  @ApiProperty({
    description: 'Apakah materai sudah ditempel',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Materai applied harus berupa boolean' })
  materaiApplied?: boolean;
```

**Test**:
```bash
# Compile backend
docker compose -f docker-compose.dev.yml exec app npm run build

# Run DTO tests
docker compose -f docker-compose.dev.yml exec app npm test -- create-invoice.dto
```

**Commit**:
```bash
git add backend/src/modules/invoices/dto/create-invoice.dto.ts
git commit -m "fix: Add materaiApplied field to invoice DTO"
```

### **Task 1.2: Fix ID Validation in Service (1 hour)**

**File**: `backend/src/modules/invoices/invoices.service.ts`

**Changes**:
1. Add import at top:
```typescript
import { NotFoundException } from '@nestjs/common';
```

2. Update the `create` method (around line 11):
```typescript
async create(createInvoiceDto: CreateInvoiceDto, userId: string) {
  // Validate client exists
  const client = await this.prisma.client.findUnique({ 
    where: { id: createInvoiceDto.clientId } 
  });
  if (!client) {
    throw new NotFoundException(`Client dengan ID ${createInvoiceDto.clientId} tidak ditemukan`);
  }
  
  // Validate project exists
  const project = await this.prisma.project.findUnique({ 
    where: { id: createInvoiceDto.projectId } 
  });
  if (!project) {
    throw new NotFoundException(`Project dengan ID ${createInvoiceDto.projectId} tidak ditemukan`);
  }

  // Generate invoice number
  const invoiceNumber = await this.generateInvoiceNumber();
  
  // Auto-calculate materai
  const materaiRequired = createInvoiceDto.totalAmount > 5000000;
  
  return this.prisma.invoice.create({
    data: {
      ...createInvoiceDto,
      invoiceNumber,
      materaiRequired,
      materaiApplied: createInvoiceDto.materaiApplied || false,
      createdBy: userId,
    },
    include: {
      client: true,
      project: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}
```

**Test**:
```bash
# Test service compilation
docker compose -f docker-compose.dev.yml exec app npm run build

# Get valid client and project IDs from database
docker compose -f docker-compose.dev.yml exec db psql -U monomi -d invoice_db -c "SELECT id, name FROM clients LIMIT 3;"
docker compose -f docker-compose.dev.yml exec db psql -U monomi -d invoice_db -c "SELECT id, number, description FROM projects LIMIT 3;"

# Test with curl using real IDs
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@monomi.id","password":"password123"}' | jq -r '.access_token')

curl -X POST http://localhost:5000/api/v1/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "PASTE_REAL_CLIENT_ID_HERE",
    "projectId": "PASTE_REAL_PROJECT_ID_HERE",
    "totalAmount": 1000000,
    "amountPerProject": 1000000,
    "dueDate": "2025-08-01",
    "paymentInfo": "Bank BCA 123456",
    "terms": "Net 30"
  }'
```

**Commit**:
```bash
git add backend/src/modules/invoices/invoices.service.ts
git commit -m "fix: Add ID validation and materai calculation in invoice service"
```

### **Task 1.3: Debug Frontend Client/Project Selection (30 min)**

**File**: `frontend/src/pages/InvoicesPage.tsx`

**Changes**:
1. Add debugging after line 90 (after queries):
```typescript
  // Debug: Log available data
  React.useEffect(() => {
    console.log('Available clients:', clients);
    console.log('Available projects:', projects);
  }, [clients, projects]);
```

2. Update form submit handler (around line 239) to add debugging:
```typescript
  const handleFormSubmit = (values: any) => {
    console.log('Form values being submitted:', values);
    
    const data = {
      ...values,
      dueDate: values.dueDate.format('YYYY-MM-DD'),
      amountPerProject: safeNumber(values.amountPerProject),
      totalAmount: safeNumber(values.totalAmount),
      materaiRequired: requiresMaterai(safeNumber(values.totalAmount)),
      materaiApplied: values.materaiApplied || false
    };
    
    console.log('Data being sent to API:', data);

    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data })
    } else {
      createMutation.mutate(data)
    }
  }
```

**Test**:
```bash
# Restart frontend to see console logs
docker compose -f docker-compose.dev.yml restart app

# Open browser console (F12) and try creating an invoice
# Check console for client/project IDs being used
```

**Verify Day 1 Success**:
- [ ] Invoice creation no longer shows "materaiApplied should not exist" error
- [ ] Client and Project IDs are properly validated with clear error messages
- [ ] Console shows actual IDs being sent

---

## Day 2: Fix Amount Field Redundancy

### **Task 2.1: Update Invoice Form - Remove Duplicate Field (1 hour)**

**File**: `frontend/src/pages/InvoicesPage.tsx`

**Changes**:
1. Replace the entire Row with amount fields (lines 900-937) with single field:
```typescript
          <Form.Item
            name="totalAmount"
            label="Total Jumlah"
            rules={[
              { required: true, message: 'Masukkan total jumlah' },
              { type: 'number', min: 0, message: 'Total harus lebih dari 0' }
            ]}
          >
            <InputNumber
              placeholder="0"
              prefix="IDR"
              formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
              parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : ''}
              style={{ width: '100%' }}
            />
          </Form.Item>
```

2. Update handleFormSubmit to auto-set amountPerProject (line ~243):
```typescript
  const handleFormSubmit = (values: any) => {
    const totalAmount = safeNumber(values.totalAmount);
    
    const data = {
      ...values,
      dueDate: values.dueDate.format('YYYY-MM-DD'),
      amountPerProject: totalAmount, // Set same as total
      totalAmount: totalAmount,
      materaiRequired: requiresMaterai(totalAmount),
      materaiApplied: values.materaiApplied || false
    };

    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data })
    } else {
      createMutation.mutate(data)
    }
  }
```

**Test**:
```bash
# Check TypeScript compilation
docker compose -f docker-compose.dev.yml exec app sh -c "cd frontend && npx tsc --noEmit"

# Test in browser - form should only show one amount field
```

### **Task 2.2: Update Quotation Form - Remove Duplicate Field (30 min)**

**File**: `frontend/src/pages/QuotationsPage.tsx`

**Changes**:
1. Replace the Row with amount fields (lines 722-759) with single field:
```typescript
          <Form.Item
            name="totalAmount"
            label="Total Jumlah"
            rules={[
              { required: true, message: 'Masukkan total jumlah' },
              { type: 'number', min: 0, message: 'Total harus lebih dari 0' }
            ]}
          >
            <InputNumber
              placeholder="0"
              prefix="IDR"
              formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
              parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : ''}
              style={{ width: '100%' }}
            />
          </Form.Item>
```

2. Update handleFormSubmit (line ~211):
```typescript
  const handleFormSubmit = (values: any) => {
    const totalAmount = safeNumber(values.totalAmount);
    
    const data = {
      ...values,
      validUntil: values.validUntil.format('YYYY-MM-DD'),
      amountPerProject: totalAmount, // Set same as total
      totalAmount: totalAmount
    };

    if (editingQuotation) {
      updateMutation.mutate({ id: editingQuotation.id, data })
    } else {
      createMutation.mutate(data)
    }
  }
```

**Test**:
```bash
# Test both forms in browser
# Create a quotation and an invoice - both should work with single amount field
```

**Commit**:
```bash
git add frontend/src/pages/InvoicesPage.tsx frontend/src/pages/QuotationsPage.tsx
git commit -m "fix: Remove duplicate amount fields from forms"
```

---

## Day 3: Fix Error Handling

### **Task 3.1: Fix Validation Interceptor (1 hour)**

**File**: `backend/src/common/interceptors/validation.interceptor.ts`

**Current content check**:
```bash
docker compose -f docker-compose.dev.yml exec app cat src/common/interceptors/validation.interceptor.ts
```

**Changes** (create or update the file):
```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ValidationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof BadRequestException) {
          const response = error.getResponse();
          
          // Format validation errors properly
          if (typeof response === 'object' && 'message' in response) {
            const formattedError = {
              statusCode: 400,
              timestamp: new Date().toISOString(),
              message: 'Validation failed',
              errors: this.formatValidationErrors(response.message)
            };
            
            return throwError(() => new BadRequestException(formattedError));
          }
        }
        return throwError(() => error);
      }),
    );
  }

  private formatValidationErrors(messages: string | string[]): Record<string, string> {
    const errors: Record<string, string> = {};
    
    if (Array.isArray(messages)) {
      messages.forEach(msg => {
        // Extract field name from validation message
        const match = msg.match(/^(\w+)\s/);
        if (match) {
          const field = match[1];
          errors[field] = msg;
        } else {
          errors['general'] = msg;
        }
      });
    } else {
      errors['general'] = messages;
    }
    
    return errors;
  }
}
```

**Test**:
```bash
# Test with invalid data to see formatted errors
curl -X POST http://localhost:5000/api/v1/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "invalid-id",
    "projectId": "invalid-id",
    "totalAmount": -100
  }'
```

### **Task 3.2: Add Request ID Support (30 min)**

**File**: `frontend/src/services/invoices.ts`

**Changes**:
```typescript
// Update createInvoice method to include request ID
async createInvoice(data: any): Promise<Invoice> {
  const requestId = `invoice_${Date.now()}_${Math.random()}`;
  
  const response = await api.post('/invoices', data, {
    headers: {
      'X-Request-ID': requestId
    }
  });
  
  return response.data;
}
```

**Test**:
```bash
# Check network tab in browser DevTools
# Should see X-Request-ID header in invoice creation requests
```

**Commit**:
```bash
git add backend/src/common/interceptors/validation.interceptor.ts frontend/src/services/invoices.ts
git commit -m "fix: Improve error handling and add request ID support"
```

---

## Day 4-7: Business Logic & Security (Condensed)

### **Task 4.1: Add Input Sanitization (Day 4)**

**File**: `backend/src/modules/invoices/invoices.service.ts`

**Changes** (add simple sanitization):
```typescript
// Add at top of create method
private sanitizeInput(input: string): string {
  return input.trim().replace(/<[^>]*>/g, '');
}

// In create method, sanitize text fields
const sanitizedData = {
  ...createInvoiceDto,
  paymentInfo: this.sanitizeInput(createInvoiceDto.paymentInfo),
  terms: createInvoiceDto.terms ? this.sanitizeInput(createInvoiceDto.terms) : null,
  // ... other fields
};
```

### **Task 5.1: Add Business Rules (Day 5)**

**File**: `backend/src/modules/invoices/invoices.service.ts`

**Changes** (add validation method):
```typescript
private async validateBusinessRules(dto: CreateInvoiceDto) {
  // Check due date is in future
  const dueDate = new Date(dto.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (dueDate <= today) {
    throw new BadRequestException('Tanggal jatuh tempo harus di masa depan');
  }
  
  // Check amount is reasonable
  if (dto.totalAmount < 1000) {
    throw new BadRequestException('Jumlah invoice minimal Rp 1.000');
  }
  
  if (dto.totalAmount > 1000000000) {
    throw new BadRequestException('Jumlah invoice melebihi batas maksimal');
  }
}

// Call in create method before saving
await this.validateBusinessRules(createInvoiceDto);
```

### **Task 6.1: Add Database Transaction (Day 6)**

**File**: `backend/src/modules/invoices/invoices.service.ts`

**Changes**:
```typescript
async create(createInvoiceDto: CreateInvoiceDto, userId: string) {
  return this.prisma.$transaction(async (prisma) => {
    // All validation here...
    
    const invoice = await prisma.invoice.create({
      data: invoiceData,
      include: {
        client: true,
        project: true,
        user: true
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'invoice',
        entityId: invoice.id,
        newValues: invoice as any,
        userId: userId
      }
    });
    
    return invoice;
  });
}
```

---

## Daily Execution Checklist

### **Before Starting Each Day**:
```bash
# Check Docker is running
docker compose -f docker-compose.dev.yml ps

# Pull any changes
git pull origin master

# Create daily branch
git checkout -b day-X-fixes
```

### **After Each Task**:
```bash
# Run tests
docker compose -f docker-compose.dev.yml exec app npm test

# Test manually in browser
# Commit if successful
git add -A
git commit -m "fix: [description]"
```

### **End of Each Day**:
```bash
# Merge to master if all tests pass
git checkout master
git merge day-X-fixes

# Tag the day's work
git tag day-X-complete

# Push changes
git push origin master --tags
```

---

## Validation Commands

### **Test Invoice Creation**:
```bash
# Get auth token
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@monomi.id","password":"password123"}' | jq -r '.access_token')

# Get valid IDs
docker compose -f docker-compose.dev.yml exec db psql -U monomi -d invoice_db -c "SELECT id, name FROM clients WHERE id IS NOT NULL LIMIT 1;"
docker compose -f docker-compose.dev.yml exec db psql -U monomi -d invoice_db -c "SELECT id, number FROM projects WHERE id IS NOT NULL LIMIT 1;"

# Create invoice
curl -X POST http://localhost:5000/api/v1/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "YOUR_CLIENT_ID",
    "projectId": "YOUR_PROJECT_ID",
    "totalAmount": 7500000,
    "dueDate": "2025-08-01",
    "paymentInfo": "Bank BCA 123-456-789",
    "terms": "Pembayaran 30 hari"
  }' | jq
```

### **Check Materai Calculation**:
- Amount < 5,000,000: materaiRequired = false
- Amount >= 5,000,000: materaiRequired = true

### **Verify Error Messages**:
- Invalid client ID: "Client dengan ID xxx tidak ditemukan"
- Invalid project ID: "Project dengan ID xxx tidak ditemukan"
- Past due date: "Tanggal jatuh tempo harus di masa depan"

---

## Key Differences for Claude Code Execution

1. **Atomic Changes**: Each task is self-contained and testable
2. **Clear File Paths**: Exact locations specified
3. **Docker Commands**: All commands use docker compose
4. **Immediate Testing**: Test after each change
5. **Git Safety**: Commit working changes immediately
6. **Debugging First**: Add console.log before fixing
7. **Rollback Ready**: Can revert to any tag if needed

---

## Emergency Rollback

If something breaks:
```bash
# Check current status
git status

# Discard all changes
git checkout -- .

# Or rollback to specific tag
git checkout day-X-complete

# Restart containers
docker compose -f docker-compose.dev.yml restart
```

---

## Success Criteria Summary

**Day 1**: ✅ Basic invoice creation works
**Day 2**: ✅ Single amount field, no duplication  
**Day 3**: ✅ Clear error messages, no duplicate requests
**Day 7**: ✅ All validation rules enforced
**Day 14**: ✅ Full system working with monitoring

This plan is optimized for Claude Code's execution capabilities, focusing on incremental, verifiable changes that can be tested immediately in the containerized environment.