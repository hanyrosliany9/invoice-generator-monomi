# Indonesian Business Management System
## Complete Quotation-to-Invoice Platform

A comprehensive business management system designed specifically for Indonesian businesses, featuring quotation workflow, project-based billing, and full Indonesian business compliance.

> **📋 For complete documentation, see [COMPREHENSIVE_GUIDE.md](COMPREHENSIVE_GUIDE.md)**

## 🇮🇩 Key Features

### **Business Workflow**
- **Quotation Management**: Create, send, approve/decline quotations
- **Automatic Invoice Generation**: From approved quotations  
- **Project-Based Billing**: Manage projects with descriptions and outputs
- **Payment Tracking**: Monitor payment status and overdue invoices
- **Dashboard Analytics**: Financial metrics and business intelligence

### **Indonesian Compliance**
- **Materai (Stamp Duty)**: Smart reminder system for invoices > 5 million IDR
- **Bahasa Indonesia**: Full Indonesian language localization
- **IDR Currency**: Proper Indonesian Rupiah formatting
- **Indonesian Payment Gateways**: Midtrans, GoPay integration ready
- **Business Document Standards**: Compliant with Indonesian regulations

## 🚀 Tech Stack (2025)

### **Backend**
- **NestJS 11.1.3** - Enterprise TypeScript framework
- **PostgreSQL 15** - Robust database with Prisma ORM
- **JWT Authentication** - Secure user authentication
- **Puppeteer** - Server-side PDF generation
- **i18next** - Indonesian localization support

### **Frontend**
- **React 19** - Latest React with Server Components
- **Vite 6/7** - Ultra-fast build tool with SWC
- **Tailwind CSS 4.0** - Modern utility-first styling
- **Ant Design 5.x** - Enterprise UI component library
- **AG Grid** - High-performance data tables
- **TypeScript** - Type-safe development

### **State Management**
- **Zustand** - Lightweight global state management
- **TanStack Query** - Server state and caching
- **React 19 Actions** - Modern form handling

## 📁 Project Structure

```
├── backend/              # NestJS API server
│   ├── src/modules/     # Feature modules (quotations, invoices, projects)
│   └── prisma/          # Database schema and migrations
├── frontend/            # React application
│   ├── src/features/    # Feature-based organization
│   ├── src/components/  # Reusable UI components
│   └── src/locales/     # Indonesian translations
├── shared/              # Shared types and utilities
├── COMPREHENSIVE_GUIDE.md # Complete documentation
└── docs/                # Visual references and samples
```

## 🛠️ Development Setup

### **Prerequisites**
- Docker & Docker Compose
- Node.js 20+ (for local development)
- Git

### **Quick Start**
```bash
# Clone repository
git clone <repository-url>
cd invoice-generator

# Setup development environment
./scripts/setup-dev.sh

# Start development server
docker-compose -f docker-compose.dev.yml up

# Access application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# Database: localhost:5432
```

### **Environment Configuration**
```bash
# Copy environment template
cp .env.example .env

# Update with your configuration
# - Database credentials
# - JWT secrets
# - Payment gateway keys
# - Email service settings
```

## 📊 Business Workflow

```
Client Dealing → [Production/Social Media] → New Quotation
                                                ↓
                                    [Approved ✅ / Declined ❌]
                                        ↓         ↓
                                    Invoice   Rev Quotation
                                        ↓
                                [Paid-Off ✅ / Pending 🟡]
```

## 🔧 Key Scripts

```bash
# Development
docker-compose -f docker-compose.dev.yml up    # Start dev environment
npm run dev                                     # Frontend dev server
npm run start:dev                              # Backend dev server

# Production
docker-compose -f docker-compose.prod.yml up  # Start production
./scripts/backup.sh                           # Database backup

# Maintenance
docker system prune -af                       # Clean Docker cache
./scripts/setup-dev.sh                        # Reset dev environment
```

## 📚 Documentation

- **[COMPREHENSIVE_GUIDE.md](COMPREHENSIVE_GUIDE.md)** - Complete documentation covering:
  - Tech stack and architecture decisions
  - Complete project structure
  - Database schema and business logic
  - Indonesian business compliance
  - Free API integrations
  - Development and deployment guides
  - Implementation roadmap

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🆘 Support

- **Documentation**: Check the `/docs` directory
- **Issues**: Create GitHub issues for bugs or feature requests
- **Discord**: Join our Indonesian developer community

## 🎯 Development Status

### **✅ Phase 1: Core Features** (COMPLETED)
- ✅ Project structure and tech stack
- ✅ Authentication and user management
- ✅ Basic quotation and invoice functionality
- ✅ Indonesian localization setup

### **✅ Phase 2: Business Features** (COMPLETED)
- ✅ Complete quotation workflow
- ✅ Project management system
- ✅ Payment tracking and reminders
- ✅ PDF generation with Indonesian templates

### **✅ Phase 3: Advanced Features** (COMPLETED)
- ✅ Dashboard analytics and reporting
- ✅ Enhanced materai compliance tracking
- ✅ Production deployment setup
- ✅ Comprehensive testing suite

### **✅ Phase 4: Production Ready** (COMPLETED)
- ✅ Docker production deployment
- ✅ Monitoring and logging
- ✅ Security implementation
- ✅ Performance optimization
- ✅ Complete documentation

## 🎉 **System Status: PRODUCTION READY**

The Indonesian Business Management System is now **fully implemented** and ready for production use with:

- **Complete Business Workflow**: Quotation → Invoice → Payment
- **Indonesian Compliance**: Materai, IDR formatting, Bahasa Indonesia
- **Production Deployment**: Docker, SSL, monitoring, backups
- **Professional PDFs**: Indonesian invoice and quotation templates
- **Comprehensive Testing**: Unit tests, E2E tests, security tests
- **Full Documentation**: API docs, deployment guides, monitoring

### **🚀 Quick Production Deployment**

```bash
# 1. Configure environment
cp .env.production .env
# Edit with your production settings

# 2. Deploy with single command
./scripts/deploy.sh

# 3. Access your system
# https://yourdomain.com
```

### **📊 Test Accounts**
- **Admin**: `admin@bisnis.co.id` / `password123`
- **User**: `user@bisnis.co.id` / `password123`

### **📚 Complete Documentation**
- **API Documentation**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Original Guide**: [COMPREHENSIVE_GUIDE.md](COMPREHENSIVE_GUIDE.md)

---

Built with ❤️ for Indonesian businesses by the Indonesian developer community.