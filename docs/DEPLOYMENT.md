# Indonesian Business Management System - Deployment Guide

## 🚀 Production Deployment

### Prerequisites

- Docker 24.0+ and Docker Compose 2.0+
- SSL certificates for HTTPS
- Environment variables configured
- Domain name configured with DNS

### Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.production .env
   ```

2. **Configure required variables:**
   ```bash
   # Database
   DB_PASSWORD=your_secure_database_password
   
   # JWT
   JWT_SECRET=your_jwt_secret_key_minimum_32_characters
   
   # Email
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   FROM_EMAIL=noreply@yourdomain.com
   
   # Redis
   REDIS_PASSWORD=your_redis_password
   ```

3. **Set up SSL certificates:**
   ```bash
   # Create SSL directory
   mkdir -p ssl
   
   # Copy your SSL certificates
   cp /path/to/fullchain.pem ssl/
   cp /path/to/privkey.pem ssl/
   
   # Set proper permissions
   chmod 600 ssl/*.pem
   ```

### Deployment Steps

1. **Run deployment script:**
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

2. **Verify deployment:**
   ```bash
   # Check service status
   docker-compose -f docker-compose.prod.yml ps
   
   # Check logs
   docker-compose -f docker-compose.prod.yml logs -f
   
   # Test health endpoint
   curl -k https://yourdomain.com/health
   ```

### Manual Deployment (Alternative)

1. **Build and start services:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

2. **Run database migrations:**
   ```bash
   docker-compose -f docker-compose.prod.yml exec app sh -c "cd backend && npx prisma db push"
   ```

3. **Seed database (optional):**
   ```bash
   docker-compose -f docker-compose.prod.yml exec app sh -c "cd backend && npm run db:seed"
   ```

## 🛠️ Development Setup

### Quick Start

1. **Start development environment:**
   ```bash
   chmod +x scripts/dev.sh
   ./scripts/dev.sh
   ```

2. **Access services:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Documentation: http://localhost:5000/api/docs
   - Database: localhost:5432

### Manual Development Setup

1. **Start services:**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Install dependencies:**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd frontend && npm install
   ```

3. **Run database setup:**
   ```bash
   cd backend
   npx prisma db push
   npx prisma generate
   npm run db:seed
   ```

4. **Start development servers:**
   ```bash
   # Backend (terminal 1)
   cd backend && npm run start:dev
   
   # Frontend (terminal 2)
   cd frontend && npm run dev
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment | development | No |
| `PORT` | Server port | 5000 | No |
| `DATABASE_URL` | PostgreSQL connection | - | Yes |
| `JWT_SECRET` | JWT secret key | - | Yes |
| `SMTP_HOST` | Email server | - | Yes |
| `SMTP_PORT` | Email port | 587 | No |
| `SMTP_USER` | Email username | - | Yes |
| `SMTP_PASSWORD` | Email password | - | Yes |
| `FROM_EMAIL` | Sender email | - | Yes |
| `REDIS_URL` | Redis connection | - | Yes |
| `CORS_ORIGIN` | CORS origins | * | No |

### SSL Configuration

For production deployment, ensure:

1. **SSL certificates are properly configured**
2. **Nginx is configured for HTTPS**
3. **HTTP redirects to HTTPS**
4. **Security headers are set**

### Database Configuration

The system uses PostgreSQL with optimized settings:

- **Max connections**: 200
- **Shared buffers**: 256MB
- **Effective cache size**: 1GB
- **Maintenance work mem**: 64MB

## 📊 Monitoring

### Health Checks

- **Application**: `/health`
- **Metrics**: `/metrics/health`
- **Performance**: `/metrics/performance`
- **Prometheus**: `/metrics/prometheus`

### Logging

Logs are collected in:
- **Application logs**: `logs/app.log`
- **Nginx logs**: `logs/nginx/`
- **Database logs**: Available via Docker logs

### Backup

**Automated backups** run daily:
```bash
# Manual backup
docker-compose -f docker-compose.prod.yml exec backup sh -c 'pg_dump -h db -U invoiceuser invoices > /backup/manual_backup_$(date +%Y%m%d_%H%M%S).sql'

# Restore backup
docker-compose -f docker-compose.prod.yml exec db psql -U invoiceuser -d invoices < /backup/backup_file.sql
```

## 🔒 Security

### Security Features

1. **Authentication**: JWT-based with bcrypt password hashing
2. **Rate limiting**: API and login endpoints
3. **CORS**: Configured for production domains
4. **Security headers**: HSTS, CSP, XSS protection
5. **Input validation**: All endpoints validated
6. **SQL injection protection**: Prisma ORM
7. **File upload limits**: 10MB maximum

### Security Checklist

- [ ] SSL certificates installed
- [ ] Strong JWT secret configured
- [ ] Database credentials secured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] File upload restrictions applied
- [ ] Environment variables secured

## 🚦 Troubleshooting

### Common Issues

1. **Database connection failed**
   ```bash
   # Check database status
   docker-compose -f docker-compose.prod.yml logs db
   
   # Verify connection
   docker-compose -f docker-compose.prod.yml exec db psql -U invoiceuser -d invoices -c "SELECT 1"
   ```

2. **Application not starting**
   ```bash
   # Check application logs
   docker-compose -f docker-compose.prod.yml logs app
   
   # Verify environment variables
   docker-compose -f docker-compose.prod.yml exec app env | grep -E "(DATABASE|JWT|SMTP)"
   ```

3. **PDF generation failing**
   ```bash
   # Check Puppeteer/Chrome installation
   docker-compose -f docker-compose.prod.yml exec app chromium-browser --version
   
   # Test PDF endpoint
   curl -k https://yourdomain.com/api/v1/pdf/invoice/test-id/preview
   ```

4. **High memory usage**
   ```bash
   # Monitor container resources
   docker stats
   
   # Check memory usage
   docker-compose -f docker-compose.prod.yml exec app node -e "console.log(process.memoryUsage())"
   ```

### Performance Optimization

1. **Database optimization**: Use connection pooling
2. **Caching**: Redis for session management
3. **CDN**: Serve static assets via CDN
4. **Load balancing**: Multiple app instances
5. **Monitoring**: Set up APM tools

## 📋 Maintenance

### Regular Tasks

1. **Weekly**: Check logs and metrics
2. **Monthly**: Database backup verification
3. **Quarterly**: Security updates
4. **Annually**: SSL certificate renewal

### Updates

1. **Update dependencies:**
   ```bash
   # Backend
   cd backend && npm update
   
   # Frontend
   cd frontend && npm update
   ```

2. **Update Docker images:**
   ```bash
   docker-compose -f docker-compose.prod.yml pull
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Database migrations:**
   ```bash
   docker-compose -f docker-compose.prod.yml exec app sh -c "cd backend && npx prisma migrate deploy"
   ```

## 🆘 Support

### Log Collection

For support issues, collect:

1. **Application logs**: `docker-compose -f docker-compose.prod.yml logs app`
2. **Database logs**: `docker-compose -f docker-compose.prod.yml logs db`
3. **Nginx logs**: `docker-compose -f docker-compose.prod.yml logs nginx`
4. **System metrics**: Visit `/metrics/health`

### Contact

- **Technical Issues**: Check logs and error messages
- **Business Logic**: Review API documentation
- **Security Concerns**: Follow security checklist

---

**Indonesian Business Management System** - Production deployment guide for secure, scalable business operations.