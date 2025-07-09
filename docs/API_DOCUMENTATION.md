# Indonesian Business Management System - API Documentation

## 🌐 API Overview

The Indonesian Business Management System provides a comprehensive RESTful API for managing quotations, invoices, clients, and projects with full Indonesian business compliance.

**Base URL**: `https://yourdomain.com/api/v1`

## 🔐 Authentication

### JWT Authentication

All protected endpoints require JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Login

**POST** `/auth/login`

```json
{
  "email": "admin@bisnis.co.id",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "admin@bisnis.co.id",
    "name": "Admin User",
    "role": "ADMIN"
  }
}
```

### Register

**POST** `/auth/register`

```json
{
  "email": "newuser@bisnis.co.id",
  "password": "password123",
  "name": "New User"
}
```

## 🏢 Clients API

### List Clients

**GET** `/clients`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by name, email, phone, or company

**Response:**
```json
{
  "data": [
    {
      "id": "client-1",
      "name": "PT Teknologi Maju",
      "email": "info@teknologimaju.co.id",
      "phone": "021-1234567",
      "address": "Jl. Sudirman No. 123, Jakarta",
      "company": "PT Teknologi Maju",
      "contactPerson": "Budi Santoso",
      "paymentTerms": "NET 30",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "_count": {
        "quotations": 5,
        "invoices": 3,
        "projects": 2
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### Get Client

**GET** `/clients/:id`

**Response:** Single client object with related quotations, invoices, and projects

### Create Client

**POST** `/clients`

```json
{
  "name": "PT Teknologi Maju",
  "email": "info@teknologimaju.co.id",
  "phone": "021-1234567",
  "address": "Jl. Sudirman No. 123, Jakarta",
  "company": "PT Teknologi Maju",
  "contactPerson": "Budi Santoso",
  "paymentTerms": "NET 30"
}
```

### Update Client

**PATCH** `/clients/:id`

### Delete Client

**DELETE** `/clients/:id`

### Client Statistics

**GET** `/clients/stats`

**Response:**
```json
{
  "total": 25,
  "recent": [
    {
      "id": "client-1",
      "name": "PT Teknologi Maju",
      "email": "info@teknologimaju.co.id",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "_count": {
        "quotations": 5,
        "invoices": 3
      }
    }
  ]
}
```

## 📋 Projects API

### List Projects

**GET** `/projects`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status (PLANNING, IN_PROGRESS, COMPLETED, CANCELLED)
- `type` (optional): Filter by type (PRODUCTION, SOCIAL_MEDIA)

### Get Project

**GET** `/projects/:id`

### Create Project

**POST** `/projects`

```json
{
  "number": "PRJ-202501-001",
  "description": "Pembuatan Website E-commerce",
  "output": "Website e-commerce lengkap dengan dashboard admin",
  "type": "PRODUCTION",
  "clientId": "client-1",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-03-31T00:00:00.000Z",
  "estimatedBudget": 75000000,
  "status": "PLANNING"
}
```

### Update Project

**PATCH** `/projects/:id`

### Delete Project

**DELETE** `/projects/:id`

### Project Statistics

**GET** `/projects/stats`

**Response:**
```json
{
  "total": 15,
  "byStatus": {
    "PLANNING": 3,
    "IN_PROGRESS": 8,
    "COMPLETED": 4,
    "CANCELLED": 0
  },
  "byType": {
    "PRODUCTION": 10,
    "SOCIAL_MEDIA": 5
  }
}
```

## 💼 Quotations API

### List Quotations

**GET** `/quotations`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status

### Get Quotation

**GET** `/quotations/:id`

### Create Quotation

**POST** `/quotations`

```json
{
  "clientId": "client-1",
  "projectId": "project-1",
  "date": "2025-01-01T00:00:00.000Z",
  "validUntil": "2025-01-15T00:00:00.000Z",
  "amountPerProject": 75000000,
  "totalAmount": 75000000,
  "terms": "Pembayaran dapat dilakukan dalam 3 termin"
}
```

### Update Quotation

**PATCH** `/quotations/:id`

### Update Quotation Status

**PATCH** `/quotations/:id/status`

```json
{
  "status": "APPROVED"
}
```

**Available statuses:**
- `DRAFT`: Draft quotation
- `SENT`: Sent to client
- `APPROVED`: Approved by client
- `DECLINED`: Declined by client
- `REVISED`: Needs revision

### Delete Quotation

**DELETE** `/quotations/:id`

Note: Only draft quotations can be deleted

### Recent Quotations

**GET** `/quotations/recent`

**Query Parameters:**
- `limit` (optional): Number of items (default: 5)

### Quotation Statistics

**GET** `/quotations/stats`

**Response:**
```json
{
  "total": 50,
  "byStatus": {
    "DRAFT": 5,
    "SENT": 10,
    "APPROVED": 25,
    "DECLINED": 8,
    "REVISED": 2
  }
}
```

## 🧾 Invoices API

### List Invoices

**GET** `/invoices`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status

### Get Invoice

**GET** `/invoices/:id`

**Response includes:**
- Invoice details
- Client information
- Project information
- Quotation reference (if applicable)
- Payment history
- Materai (stamp duty) information

### Create Invoice

**POST** `/invoices`

```json
{
  "clientId": "client-1",
  "projectId": "project-1",
  "quotationId": "quotation-1",
  "amountPerProject": 75000000,
  "totalAmount": 75000000,
  "dueDate": "2025-02-01T00:00:00.000Z",
  "paymentInfo": "Bank BCA: 1234567890 a.n. Perusahaan",
  "terms": "Pembayaran dalam 30 hari"
}
```

**Note:** Materai requirement is automatically calculated for amounts > 5,000,000 IDR

### Create Invoice from Quotation

**POST** `/invoices/from-quotation/:quotationId`

Creates an invoice from an approved quotation. The quotation must have status `APPROVED`.

### Update Invoice

**PATCH** `/invoices/:id`

### Update Invoice Status

**PATCH** `/invoices/:id/status`

```json
{
  "status": "PAID"
}
```

**Available statuses:**
- `DRAFT`: Draft invoice
- `SENT`: Sent to client
- `PAID`: Payment received
- `OVERDUE`: Payment overdue
- `CANCELLED`: Invoice cancelled

### Update Materai Status

**PATCH** `/invoices/:id/materai`

```json
{
  "materaiApplied": true
}
```

**Indonesian Compliance:** For invoices > 5,000,000 IDR, materai (stamp duty) is required by law.

### Delete Invoice

**DELETE** `/invoices/:id`

Note: Only draft invoices can be deleted

### Recent Invoices

**GET** `/invoices/recent`

### Overdue Invoices

**GET** `/invoices/overdue`

Returns invoices that are overdue or have status `OVERDUE`.

### Invoice Statistics

**GET** `/invoices/stats`

**Response:**
```json
{
  "total": 75,
  "byStatus": {
    "DRAFT": 5,
    "SENT": 15,
    "PAID": 45,
    "OVERDUE": 8,
    "CANCELLED": 2
  },
  "totalRevenue": 750000000,
  "overdueCount": 8
}
```

## 📄 PDF Generation API

### Generate Invoice PDF

**GET** `/pdf/invoice/:id`

Downloads invoice as PDF file with Indonesian formatting.

### Generate Quotation PDF

**GET** `/pdf/quotation/:id`

Downloads quotation as PDF file with Indonesian formatting.

### Preview Invoice PDF

**GET** `/pdf/invoice/:id/preview`

Opens invoice PDF in browser for preview.

### Preview Quotation PDF

**GET** `/pdf/quotation/:id/preview`

Opens quotation PDF in browser for preview.

**PDF Features:**
- Indonesian language support
- Proper IDR currency formatting
- Materai compliance notifications
- Professional business layout
- Company branding

## 👥 Users API

### List Users

**GET** `/users`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

### Get User

**GET** `/users/:id`

### Create User

**POST** `/users`

```json
{
  "email": "user@bisnis.co.id",
  "password": "password123",
  "name": "New User",
  "role": "USER"
}
```

**Available roles:**
- `ADMIN`: Full system access
- `USER`: Standard business operations
- `VIEWER`: Read-only access

### Update User

**PATCH** `/users/:id`

### Delete User

**DELETE** `/users/:id`

## 🏥 Health & Metrics API

### Health Check

**GET** `/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-08T12:00:00.000Z",
  "uptime": 1234.56,
  "environment": "production",
  "version": "1.0.0"
}
```

### System Metrics

**GET** `/metrics/health`

**Response:**
```json
{
  "timestamp": "2025-01-08T12:00:00.000Z",
  "system": {
    "uptime": 1234.56,
    "memory": {
      "rss": 50000000,
      "heapUsed": 30000000,
      "heapTotal": 40000000
    },
    "version": "v20.0.0",
    "environment": "production"
  },
  "database": {
    "status": "healthy",
    "latency": 5
  },
  "business": {
    "users": 10,
    "clients": 25,
    "projects": 15,
    "quotations": 50,
    "invoices": 75,
    "totalRevenue": 750000000,
    "monthlyRevenue": 150000000,
    "pendingRevenue": 200000000
  }
}
```

### Performance Metrics

**GET** `/metrics/performance`

**Response:**
```json
{
  "timestamp": "2025-01-08T12:00:00.000Z",
  "response_time": 12,
  "database": {
    "query_time": 5,
    "connection_pool": {
      "active": 1,
      "idle": 2,
      "total": 3
    }
  },
  "memory": {
    "rss": 50000000,
    "heap_used": 30000000,
    "heap_total": 40000000
  },
  "cpu": {
    "user": 123456,
    "system": 78901
  }
}
```

### Prometheus Metrics

**GET** `/metrics/prometheus`

Returns metrics in Prometheus format for monitoring integration.

## 📊 Indonesian Business Features

### Materai (Stamp Duty) Compliance

- **Automatic calculation**: Invoices > 5,000,000 IDR require materai
- **Status tracking**: Track whether materai has been applied
- **Compliance notifications**: PDF generation includes materai reminders
- **Legal compliance**: Follows Indonesian tax law requirements

### Currency Formatting

- **IDR formatting**: Proper Indonesian Rupiah formatting
- **Localization**: Numbers formatted according to Indonesian standards
- **Business documents**: All PDFs use Indonesian business formatting

### Business Workflow

1. **Client Management**: Indonesian company information
2. **Project Creation**: Production or Social Media projects
3. **Quotation Process**: Draft → Sent → Approved/Declined
4. **Invoice Generation**: Automatic from approved quotations
5. **Payment Tracking**: Indonesian payment methods
6. **Compliance**: Materai and tax requirements

## 🔧 Error Handling

### Error Response Format

```json
{
  "statusCode": 400,
  "timestamp": "2025-01-08T12:00:00.000Z",
  "path": "/api/v1/invoices",
  "method": "POST",
  "message": "Validation failed"
}
```

### Common Error Codes

- **400**: Bad Request - Invalid input data
- **401**: Unauthorized - Invalid or missing JWT token
- **403**: Forbidden - Insufficient permissions
- **404**: Not Found - Resource not found
- **409**: Conflict - Resource already exists
- **429**: Too Many Requests - Rate limit exceeded
- **500**: Internal Server Error - Server error

### Indonesian Error Messages

All error messages are provided in Bahasa Indonesia for better user experience:

- `"Email atau password salah"` - Invalid credentials
- `"Quotation tidak ditemukan"` - Quotation not found
- `"Hanya quotation yang disetujui yang dapat dibuat menjadi invoice"` - Only approved quotations can become invoices
- `"Invoice ini memerlukan materai"` - This invoice requires materai

## 🚀 Rate Limiting

- **API endpoints**: 10 requests per second
- **Login endpoint**: 5 requests per minute
- **Burst allowance**: 20 requests for API, 5 for login

## 🔒 Security

- **JWT authentication**: All protected endpoints
- **Password hashing**: bcrypt with salt rounds
- **Input validation**: All request data validated
- **SQL injection protection**: Prisma ORM
- **XSS protection**: Security headers configured
- **CORS**: Configurable origins
- **Rate limiting**: Prevents abuse

---

**Indonesian Business Management System** - Complete API documentation for Indonesian business operations with full compliance support.