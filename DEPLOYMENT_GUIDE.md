# 🇮🇩 Indonesian Business Management System - Deployment Guide

## Complete Deployment & Configuration Guide

This guide provides step-by-step instructions for deploying the Indonesian Business Management System with all accessibility, performance, cultural validation, and safe deployment features.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Docker Deployment](#docker-deployment)
4. [Manual Deployment](#manual-deployment)
5. [Indonesian Business Configuration](#indonesian-business-configuration)
6. [Feature Flags Setup](#feature-flags-setup)
7. [Monitoring & Health Checks](#monitoring--health-checks)
8. [Security Configuration](#security-configuration)
9. [Cultural Validation Setup](#cultural-validation-setup)
10. [Performance Optimization](#performance-optimization)
11. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### Required Software
```bash
# Core requirements
Docker >= 24.0
Docker Compose >= 2.20
Node.js >= 18.0
npm >= 9.0
PostgreSQL >= 15.0
Redis >= 7.0

# Optional (for manual deployment)
PM2 >= 5.0 (for process management)
Nginx >= 1.20 (for reverse proxy)
```

### Indonesian Business Requirements
- Indonesian timezone support (Asia/Jakarta)
- Bahasa Indonesia localization files
- Indonesian currency formatting (IDR)
- Materai compliance libraries
- Cultural validation data

### System Requirements
```bash
# Minimum specifications
CPU: 2 cores
RAM: 4GB
Storage: 20GB SSD
Network: Stable internet for Indonesian API integrations

# Recommended specifications
CPU: 4+ cores
RAM: 8GB+
Storage: 50GB+ SSD
Network: High-speed internet with CDN support
```

---

## 🌍 Environment Configuration

### Base Environment Setup

Create environment files:

```bash
# Main environment file
cp .env.example .env.local

# Backend environment
cp backend/.env.example backend/.env

# Frontend environment  
cp frontend/.env.example frontend/.env.local
```

### Indonesian Business Environment Variables

```bash
# .env.local
# Indonesian Business Management System Configuration

# Core Settings
NODE_ENV=production
NEXT_PUBLIC_APP_NAME="Indonesian Business Management System"
NEXT_PUBLIC_APP_VERSION="2.0.0"

# Indonesian Localization
NEXT_PUBLIC_LOCALE=id-ID
NEXT_PUBLIC_TIMEZONE=Asia/Jakarta
NEXT_PUBLIC_CURRENCY=IDR
NEXT_PUBLIC_COUNTRY=ID

# Indonesian Business Context
INDONESIA_BUSINESS_CONTEXT=enabled
CULTURAL_VALIDATION=enabled
MATERAI_COMPLIANCE=enabled
WHATSAPP_BUSINESS_INTEGRATION=enabled

# Regional Settings
INDONESIAN_REGIONS=Jakarta,Surabaya,Bandung,Yogyakarta,Medan
DEFAULT_REGION=Jakarta
BUSINESS_HOURS_START=08:00
BUSINESS_HOURS_END=17:00

# Feature Flags
FEATURE_FLAGS_ENABLED=true
FEATURE_FLAGS_PROVIDER=database
SAFE_DEPLOYMENT=enabled
AUTO_ROLLBACK=enabled

# Performance Settings
PERFORMANCE_MONITORING=enabled
CORE_WEB_VITALS_TRACKING=enabled
INDONESIAN_NETWORK_OPTIMIZATION=enabled

# Security & Compliance
SECURITY_LEVEL=high
XSS_PREVENTION=enabled
INDONESIAN_DATA_PROTECTION=enabled
AUDIT_LOGGING=enabled

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/indonesian_business_db
REDIS_URL=redis://localhost:6379

# Cultural Validation
CULTURAL_VALIDATION_API_KEY=your_cultural_api_key
MATERAI_VALIDATION_THRESHOLD=5000000
HONORIFIC_VALIDATION=strict

# Performance Thresholds (Indonesian Networks)
PERFORMANCE_LCP_THRESHOLD=4000
PERFORMANCE_FCP_THRESHOLD=3000
PERFORMANCE_TTFB_THRESHOLD=1800
```

### Backend Environment Configuration

```bash
# backend/.env
# Indonesian Business Management System Backend

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/indonesian_business_db
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_TTL=3600
REDIS_PREFIX=indonesian_business

# Indonesian Business Services
CULTURAL_VALIDATION_SERVICE_URL=http://localhost:3001/cultural-validation
MATERAI_COMPLIANCE_SERVICE_URL=http://localhost:3002/materai-compliance
WHATSAPP_BUSINESS_API_URL=https://api.whatsapp.com/business
INDONESIAN_HOLIDAY_API_URL=https://api.indonesian-holidays.com

# Authentication & Security
JWT_SECRET=your_strong_jwt_secret_for_indonesian_business
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12
SESSION_SECRET=your_session_secret

# Feature Flags Database
FEATURE_FLAGS_TABLE=feature_flags
FEATURE_FLAGS_EVENTS_TABLE=feature_flag_events
ROLLBACK_LOGS_TABLE=rollback_logs

# Monitoring & Logging
LOG_LEVEL=info
AUDIT_LOG_ENABLED=true
PERFORMANCE_LOGGING=enabled
CULTURAL_VALIDATION_LOGGING=enabled

# Indonesian Business Compliance
MATERAI_THRESHOLD=5000000
TAX_CALCULATION_PRECISION=2
CURRENCY_CODE=IDR
BUSINESS_REGISTRATION_VALIDATION=enabled

# Email & Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM="Indonesian Business System <noreply@monomi.id>"

# WhatsApp Business Configuration
WHATSAPP_BUSINESS_ACCOUNT_ID=your_whatsapp_business_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token
```

---

## 🐳 Docker Deployment

### Quick Start with Docker Compose

```bash
# Clone repository
git clone https://github.com/monomi/indonesian-business-system.git
cd indonesian-business-system

# Create and configure environment files
cp .env.example .env.local
# Edit .env.local with your Indonesian business configuration

# Start development environment
docker compose -f docker-compose.dev.yml up -d

# Initialize Indonesian business database
docker compose -f docker-compose.dev.yml exec app npm run db:init:indonesian

# Setup cultural validation data
docker compose -f docker-compose.dev.yml exec app npm run setup:cultural-validation

# Verify Indonesian business context
curl -H "Accept-Language: id-ID" http://localhost:3000/api/health/indonesian
```

### Production Docker Deployment

```bash
# Build optimized images
docker compose -f docker-compose.prod.yml build

# Pull required Indonesian business data
docker compose -f docker-compose.prod.yml run --rm app npm run download:indonesian-data

# Deploy production environment
docker compose -f docker-compose.prod.yml up -d

# Run Indonesian business database migrations
docker compose -f docker-compose.prod.yml exec app npm run db:migrate:production

# Setup Indonesian business seed data
docker compose -f docker-compose.prod.yml exec app npm run db:seed:indonesian-business

# Verify deployment health
docker compose -f docker-compose.prod.yml exec app npm run health:indonesian-comprehensive
```

### Docker Compose Configuration

#### Development Environment
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
      args:
        - INDONESIAN_LOCALE=id-ID
        - ENABLE_CULTURAL_VALIDATION=true
    environment:
      - NODE_ENV=development
      - INDONESIA_TIMEZONE=Asia/Jakarta
      - CULTURAL_VALIDATION=enabled
      - MATERAI_COMPLIANCE=enabled
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    depends_on:
      - db
      - redis
      - cultural-validation-service

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=indonesian_business_dev
      - POSTGRES_USER=dev_user
      - POSTGRES_PASSWORD=dev_password
      - POSTGRES_TIMEZONE=Asia/Jakarta
    volumes:
      - postgres_data_dev:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --timezone Asia/Jakarta
    volumes:
      - redis_data_dev:/data
    ports:
      - "6379:6379"

  cultural-validation-service:
    build:
      context: ./services/cultural-validation
      dockerfile: Dockerfile
    environment:
      - INDONESIAN_CULTURAL_DATA_PATH=/app/data/indonesian
      - BAHASA_VALIDATION_STRICT=true
    volumes:
      - ./data/indonesian-cultural:/app/data/indonesian

volumes:
  postgres_data_dev:
  redis_data_dev:
```

#### Production Environment
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
      args:
        - INDONESIAN_OPTIMIZATION=true
        - CULTURAL_VALIDATION=strict
    environment:
      - NODE_ENV=production
      - INDONESIA_TIMEZONE=Asia/Jakarta
      - PERFORMANCE_MONITORING=enabled
      - AUDIT_LOGGING=enabled
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health/indonesian"]
      interval: 30s
      timeout: 10s
      retries: 3
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=indonesian_business_prod
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
      - ./database/backup:/backup
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data_prod:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/indonesian-business.conf:/etc/nginx/conf.d/default.conf
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data_prod:
  redis_data_prod:
```

---

## 🛠️ Manual Deployment

### Backend Deployment

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm ci --production

# Setup Indonesian business environment
export NODE_ENV=production
export INDONESIA_TIMEZONE=Asia/Jakarta
export CULTURAL_VALIDATION=enabled
export MATERAI_COMPLIANCE=enabled

# Database setup
npx prisma migrate deploy
npx prisma generate

# Indonesian business data initialization
npm run db:seed:indonesian-business
npm run setup:cultural-validation
npm run setup:materai-compliance

# Build application
npm run build

# Start with PM2 (recommended)
pm2 start ecosystem.config.js --env production

# Or start directly
npm start
```

### Frontend Deployment

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm ci --production

# Setup Indonesian business build environment
export NEXT_PUBLIC_LOCALE=id-ID
export NEXT_PUBLIC_TIMEZONE=Asia/Jakarta
export NEXT_PUBLIC_CURRENCY=IDR
export NEXT_PUBLIC_CULTURAL_VALIDATION=enabled

# Build optimized production bundle
npm run build

# Start production server
npm start

# Or serve with PM2
pm2 start npm --name "indonesian-business-frontend" -- start
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/indonesian-business
server {
    listen 80;
    server_name indonesian-business.monomi.id;
    
    # Indonesian timezone
    location /api/time {
        proxy_pass http://localhost:3001;
        proxy_set_header X-Timezone "Asia/Jakarta";
    }
    
    # Cultural validation endpoints
    location /api/cultural {
        proxy_pass http://localhost:3001;
        proxy_set_header X-Cultural-Context "Indonesian-Business";
        proxy_set_header Accept-Language "id-ID";
    }
    
    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Indonesian-Business-Context "enabled";
        
        # Indonesian business headers
        add_header X-Cultural-Validation "enabled";
        add_header X-Materai-Compliance "enabled";
        add_header X-Timezone "Asia/Jakarta";
    }
    
    # Static assets with Indonesian optimization
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Indonesian-Optimization "enabled";
    }
}

# HTTPS redirect for Indonesian business security
server {
    listen 443 ssl http2;
    server_name indonesian-business.monomi.id;
    
    ssl_certificate /etc/ssl/certs/indonesian-business.crt;
    ssl_certificate_key /etc/ssl/private/indonesian-business.key;
    
    # Indonesian business security headers
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Indonesian-Security "enabled";
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Indonesian-HTTPS "enabled";
    }
}
```

---

## 🇮🇩 Indonesian Business Configuration

### Cultural Validation Setup

```bash
# Download Indonesian cultural data
npm run download:indonesian-cultural-data

# Initialize cultural validation service
npm run init:cultural-validation

# Setup regional business styles
npm run setup:regional-styles

# Configure honorific validation
npm run config:honorific-validation --strict
```

### Materai Compliance Configuration

```bash
# Setup materai compliance service
npm run setup:materai-compliance

# Configure Indonesian tax thresholds
npm run config:tax-thresholds --threshold=5000000

# Initialize stamp duty calculations
npm run init:stamp-duty-service

# Verify compliance setup
npm run verify:materai-compliance
```

### WhatsApp Business Integration

```bash
# Configure WhatsApp Business API
export WHATSAPP_BUSINESS_ACCOUNT_ID=your_account_id
export WHATSAPP_ACCESS_TOKEN=your_access_token

# Setup Indonesian business message templates
npm run setup:whatsapp-templates:indonesian

# Initialize WhatsApp webhook
npm run init:whatsapp-webhook

# Test Indonesian business messaging
npm run test:whatsapp:indonesian-business
```

### Regional Business Styles

```javascript
// config/regional-business-styles.js
export const INDONESIAN_REGIONAL_STYLES = {
  jakarta: {
    businessStyle: 'fast-paced',
    formality: 'formal',
    communicationStyle: 'direct-respectful',
    preferredGreeting: 'Selamat pagi/siang/sore',
    honorificUsage: 'standard'
  },
  yogyakarta: {
    businessStyle: 'traditional',
    formality: 'very-formal',
    communicationStyle: 'indirect-highly-respectful',
    preferredGreeting: 'Sugeng rawuh',
    honorificUsage: 'enhanced'
  },
  surabaya: {
    businessStyle: 'commercial',
    formality: 'formal',
    communicationStyle: 'professional-straightforward',
    preferredGreeting: 'Selamat pagi',
    honorificUsage: 'standard'
  },
  bandung: {
    businessStyle: 'tech-savvy',
    formality: 'semi-formal',
    communicationStyle: 'modern-respectful',
    preferredGreeting: 'Wilujeng',
    honorificUsage: 'adaptive'
  },
  medan: {
    businessStyle: 'multicultural',
    formality: 'formal',
    communicationStyle: 'diverse-inclusive',
    preferredGreeting: 'Horas / Selamat',
    honorificUsage: 'cultural-adaptive'
  }
};
```

---

## 🚀 Feature Flags Setup

### Initialize Feature Flags System

```bash
# Setup feature flags database tables
npm run db:create:feature-flags-tables

# Initialize Indonesian business feature flags
npm run init:feature-flags:indonesian-business

# Setup safety checks
npm run setup:safety-checks:indonesian

# Configure rollback automation
npm run config:auto-rollback:indonesian-context
```

### Configure Indonesian Business Feature Flags

```bash
# Enable core compliance features (always on)
npm run feature-flags:enable enhanced_accessibility --rollout=100
npm run feature-flags:enable cultural_validation --rollout=100
npm run feature-flags:enable materai_compliance_system --rollout=100

# Configure progressive rollout features
npm run feature-flags:enable smart_tables_architecture --rollout=25 --strategy=gradual
npm run feature-flags:configure enhanced_business_journey --target-regions=Jakarta,Surabaya

# Setup business size targeting
npm run feature-flags:target price_inheritance_flow --business-size=medium --region=Jakarta
```

### Safety Checks Configuration

```javascript
// config/safety-checks.js
export const INDONESIAN_SAFETY_CHECKS = {
  businessHours: {
    enabled: true,
    timezone: 'Asia/Jakarta',
    start: '08:00',
    end: '17:00',
    blockOutsideHours: false
  },
  prayerTime: {
    enabled: true,
    friday: { start: '11:30', end: '13:00' },
    blockDuringPrayer: true
  },
  culturalValidation: {
    enabled: true,
    minimumScore: 70,
    blockOnFailure: true
  },
  materaiCompliance: {
    enabled: true,
    threshold: 5000000,
    blockOnFailure: true
  },
  performanceThresholds: {
    lcp: 4000,
    fcp: 3000,
    ttfb: 1800
  }
};
```

---

## 📊 Monitoring & Health Checks

### Setup Monitoring Services

```bash
# Initialize Indonesian business monitoring
npm run init:monitoring:indonesian-business

# Setup performance tracking
npm run setup:performance-monitoring:indonesian-networks

# Configure cultural compliance monitoring
npm run setup:cultural-monitoring

# Initialize business metrics tracking
npm run setup:business-metrics:indonesian
```

### Health Check Endpoints

```bash
# Comprehensive Indonesian business health check
curl -H "Accept-Language: id-ID" \
     -H "X-Business-Context: Indonesian" \
     http://localhost:3000/api/health/comprehensive

# Cultural validation health
curl http://localhost:3000/api/health/cultural-validation

# Materai compliance health
curl http://localhost:3000/api/health/materai-compliance

# Performance health (Indonesian networks)
curl http://localhost:3000/api/health/performance/indonesian

# Feature flags health
curl http://localhost:3000/api/health/feature-flags

# WhatsApp integration health
curl http://localhost:3000/api/health/whatsapp-business
```

### Monitoring Dashboard Setup

```bash
# Install monitoring dashboard
npm run install:monitoring-dashboard

# Configure Indonesian business metrics
npm run config:dashboard:indonesian-metrics

# Setup alerting for Indonesian business context
npm run setup:alerts:indonesian-business

# Initialize real-time monitoring
npm run start:monitoring:real-time
```

---

## 🔒 Security Configuration

### Security Hardening

```bash
# Setup XSS prevention for Indonesian business context
npm run security:setup-xss-prevention

# Configure Indonesian data protection
npm run security:setup-data-protection:indonesian

# Initialize audit logging
npm run security:setup-audit-logging

# Setup security monitoring
npm run security:setup-monitoring
```

### Authentication & Authorization

```bash
# Setup multi-factor authentication
npm run auth:setup-mfa

# Configure Indonesian business role-based access
npm run auth:setup-rbac:indonesian-business

# Initialize session management
npm run auth:setup-session-management

# Setup password policies for Indonesian users
npm run auth:setup-password-policies:indonesian
```

### Compliance Configuration

```bash
# Setup Indonesian data protection compliance
npm run compliance:setup-data-protection

# Configure financial regulation compliance
npm run compliance:setup-financial:indonesian

# Setup audit trail for Indonesian business
npm run compliance:setup-audit-trail

# Initialize compliance reporting
npm run compliance:setup-reporting
```

---

## ⚡ Performance Optimization

### Indonesian Network Optimization

```bash
# Setup CDN for Indonesian regions
npm run perf:setup-cdn:indonesian

# Configure image optimization for Indonesian networks
npm run perf:setup-image-optimization:indonesian

# Setup bundle optimization for 3G/4G
npm run perf:setup-bundle-optimization:mobile

# Configure caching for Indonesian business data
npm run perf:setup-caching:indonesian-business
```

### Core Web Vitals Configuration

```bash
# Setup Core Web Vitals tracking for Indonesian networks
npm run perf:setup-vitals:indonesian

# Configure performance budgets
npm run perf:setup-budgets:indonesian-thresholds

# Setup performance monitoring
npm run perf:setup-monitoring:real-time

# Initialize performance alerts
npm run perf:setup-alerts:indonesian-networks
```

### Database Optimization

```bash
# Optimize database for Indonesian business queries
npm run db:optimize:indonesian-business

# Setup database caching
npm run db:setup-caching

# Configure connection pooling
npm run db:setup-connection-pooling

# Setup database monitoring
npm run db:setup-monitoring
```

---

## 🧪 Testing & Validation

### Run Comprehensive Tests

```bash
# Indonesian business functionality tests
npm run test:business:indonesian-comprehensive

# Cultural validation tests
npm run test:cultural:comprehensive

# Accessibility tests with Indonesian context
npm run test:accessibility:indonesian

# Performance tests on Indonesian networks
npm run test:performance:indonesian-networks

# Security tests for Indonesian business data
npm run test:security:indonesian-business
```

### Validation Commands

```bash
# Validate Indonesian business configuration
npm run validate:indonesian-business-config

# Validate cultural appropriateness
npm run validate:cultural-appropriateness

# Validate materai compliance setup
npm run validate:materai-compliance

# Validate accessibility compliance
npm run validate:accessibility:wcag-2-1-aa

# Validate performance thresholds
npm run validate:performance:indonesian-thresholds
```

---

## 🔧 Troubleshooting

### Common Issues

#### Cultural Validation Failures
```bash
# Debug cultural validation
npm run debug:cultural-validation --verbose

# Check Indonesian language patterns
npm run check:bahasa-indonesia-patterns

# Validate honorific usage
npm run check:honorific-usage --strict

# Review regional business styles
npm run review:regional-styles
```

#### Performance Issues
```bash
# Debug Indonesian network performance
npm run debug:performance:indonesian-networks

# Check Core Web Vitals
npm run check:core-web-vitals

# Analyze bundle size for Indonesian users
npm run analyze:bundle-size:indonesian

# Monitor real-time performance
npm run monitor:performance:real-time
```

#### Feature Flags Issues
```bash
# Debug feature flags system
npm run debug:feature-flags --flagId=enhanced_business_journey

# Check safety validation
npm run check:safety-validation

# Review rollback logs
npm run review:rollback-logs --recent

# Test automated rollback
npm run test:auto-rollback --dry-run
```

#### Database Issues
```bash
# Check Indonesian business database health
npm run check:db:health:indonesian-business

# Validate database migrations
npm run validate:db:migrations

# Check database performance
npm run check:db:performance

# Review audit logs
npm run review:db:audit-logs
```

### Log Analysis

```bash
# View Indonesian business application logs
docker compose logs app | grep "Indonesian-Business"

# Check cultural validation logs
docker compose logs app | grep "Cultural-Validation"

# Review performance logs
docker compose logs app | grep "Performance"

# Check security logs
docker compose logs app | grep "Security"
```

### Emergency Procedures

```bash
# Emergency rollback all features
npm run emergency:rollback-all --reason="Critical issue"

# Emergency disable cultural validation (if needed)
npm run emergency:disable-cultural-validation

# Emergency performance mode (reduce features)
npm run emergency:performance-mode

# Emergency maintenance mode
npm run emergency:maintenance-mode --message="Indonesian system maintenance"
```

---

## 📞 Support & Assistance

### Technical Support
- **System Issues**: tech-support@monomi.id
- **Performance Problems**: performance-team@monomi.id
- **Security Concerns**: security-team@monomi.id

### Indonesian Business Support
- **Cultural Validation**: cultural-expert@monomi.id
- **Materai Compliance**: compliance-officer@monomi.id
- **Regional Adaptation**: regional-specialist@monomi.id

### Emergency Support
- **Critical System Issues**: +62-21-EMERGENCY
- **Security Incidents**: security-emergency@monomi.id
- **Compliance Violations**: compliance-emergency@monomi.id

---

## 📚 Additional Resources

- [Implementation Summary](./docs/implementation-summary.md)
- [Feature Flags & Rollback System](./docs/feature-flags-rollback-system.md)
- [Indonesian Cultural UX Guidelines](./docs/indonesian-cultural-ux.md)
- [Performance Optimization Guide](./docs/performance-optimization-indonesian.md)
- [Security & Compliance Guide](./docs/security-compliance.md)

---

*This deployment guide ensures successful implementation of the Indonesian Business Management System with all accessibility, performance, cultural validation, and safe deployment features.*

**Last Updated**: January 2024  
**Deployment Version**: 2.0.0  
**Indonesian Business Compliance**: Certified