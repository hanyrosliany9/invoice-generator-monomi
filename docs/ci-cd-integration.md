# Enhanced CI/CD Integration Guide
**Indonesian Business Management System - Docker & CI/CD Integration**

## 🇮🇩 Overview

This document outlines the comprehensive CI/CD integration for the Indonesian Business Management System, featuring enhanced Docker configurations, automated testing, security scanning, and deployment strategies tailored for Indonesian business requirements.

## 🏗️ Architecture

### Multi-Stage Docker Build
- **Base Stage**: Alpine Linux with Indonesian timezone and locale support
- **Dependencies**: Optimized dependency installation with caching
- **Build Stages**: Separate backend and frontend builds with Indonesian business validations
- **Testing Stage**: Comprehensive test execution with Indonesian business logic validation
- **Production**: Optimized runtime with security hardening and Indonesian compliance
- **Development**: Full-featured development environment with hot reloading

### CI/CD Pipeline Components
1. **Environment Validation**: Node.js, Docker, and Indonesian business configuration checks
2. **Code Quality**: Linting, TypeScript checking, and Indonesian localization validation
3. **Security Scanning**: Vulnerability assessments and Indonesian financial compliance checks
4. **Comprehensive Testing**: Unit, integration, performance, and accessibility tests
5. **Docker Operations**: Multi-platform builds with security scanning
6. **Performance Testing**: Indonesian business workflow optimization
7. **Accessibility Testing**: WCAG 2.1 AA compliance with Indonesian language support
8. **Deployment**: GitOps with ArgoCD for staging and production environments

## 📁 File Structure

```
.
├── .github/workflows/
│   ├── ci-cd-enhanced.yml          # Main CI/CD pipeline
│   ├── gitops-argocd.yml           # GitOps deployment workflow
│   └── docker-security.yml         # Docker security scanning
├── docker-compose.test.yml         # Comprehensive testing environment
├── Dockerfile.optimized            # Multi-stage optimized Dockerfile
├── scripts/
│   └── ci-cd-helper.sh             # Automation helper script
├── tests/load/
│   └── indonesian-business-load-test.js  # K6 load testing
├── .container-structure-test.yaml  # Container security validation
└── docs/
    └── ci-cd-integration.md        # This documentation
```

## 🚀 Getting Started

### Prerequisites

- Docker 20.x or higher
- Docker Compose 2.x
- Node.js 20.x
- Git
- Bash (for scripts)

### Quick Start

1. **Run Full CI/CD Pipeline**:
   ```bash
   ./scripts/ci-cd-helper.sh all
   ```

2. **Run Individual Components**:
   ```bash
   # Environment validation
   ./scripts/ci-cd-helper.sh validate
   
   # Install dependencies
   ./scripts/ci-cd-helper.sh deps
   
   # Code quality checks
   ./scripts/ci-cd-helper.sh quality
   
   # Run tests
   ./scripts/ci-cd-helper.sh test
   
   # Security scanning
   ./scripts/ci-cd-helper.sh security
   
   # Build Docker images
   ./scripts/ci-cd-helper.sh build
   
   # Performance testing
   ./scripts/ci-cd-helper.sh performance
   
   # Accessibility testing
   ./scripts/ci-cd-helper.sh accessibility
   ```

3. **Testing Environment**:
   ```bash
   # Start comprehensive test environment
   docker-compose -f docker-compose.test.yml up -d
   
   # Run specific test services
   docker-compose -f docker-compose.test.yml up performance-test
   docker-compose -f docker-compose.test.yml up accessibility-test
   docker-compose -f docker-compose.test.yml up security-test
   ```

## 🔧 Configuration

### Environment Variables

#### Development/Testing
```bash
NODE_ENV=test
DATABASE_URL=postgresql://testuser:testpassword@db-test:5432/invoices_test
REDIS_URL=redis://redis-test:6379
INDONESIA_TIMEZONE=Asia/Jakarta
DEFAULT_CURRENCY=IDR
MATERAI_THRESHOLD=5000000
ENABLE_PERFORMANCE_MONITORING=true
```

#### Production
```bash
NODE_ENV=production
TZ=Asia/Jakarta
LANG=id_ID.UTF-8
DEFAULT_CURRENCY=IDR
MATERAI_THRESHOLD=5000000
BUSINESS_REGION=Indonesia
COMPLIANCE_MODE=enabled
```

### Docker Build Targets

```bash
# Development
docker build -f Dockerfile.optimized --target development -t indonesian-business:dev .

# Testing
docker build -f Dockerfile.optimized --target testing -t indonesian-business:test .

# Production
docker build -f Dockerfile.optimized --target production -t indonesian-business:prod .

# CI/CD
docker build -f Dockerfile.optimized --target ci-cd -t indonesian-business:ci-cd .
```

## 🧪 Testing Framework

### Test Categories

#### 1. Unit Tests
- **Backend**: Jest with Indonesian business logic validation
- **Frontend**: Vitest with Indonesian UX component testing
- **Coverage**: Minimum 80% code coverage required

#### 2. Integration Tests
- **Database**: Prisma migrations with Indonesian business schema
- **API**: End-to-end API testing with Indonesian business workflows
- **Services**: Redis caching and session management

#### 3. Performance Tests
- **Load Testing**: K6 with Indonesian business scenarios
- **Core Web Vitals**: Lighthouse performance auditing
- **Business Metrics**: Quotation, invoice, and materai calculation performance

#### 4. Accessibility Tests
- **WCAG 2.1 AA**: Axe-core accessibility testing
- **Indonesian Language**: Bahasa Indonesia accessibility validation
- **Screen Readers**: Indonesian business context screen reader testing

#### 5. Security Tests
- **Vulnerability Scanning**: Trivy and Docker Scout
- **OWASP Testing**: ZAP security scanning
- **Dependency Audit**: npm audit with Indonesian financial compliance

### Indonesian Business Test Scenarios

#### Quotation-to-Invoice Workflow
```javascript
// K6 load test example
export default function() {
  const quotationData = {
    clientName: 'Budi Santoso',
    companyName: 'PT Maju Bersama Indonesia',
    amount: 5500000, // Above materai threshold
    currency: 'IDR'
  };
  
  // Test quotation creation
  const quotationResponse = http.post('/api/quotations', quotationData);
  
  // Test materai calculation
  const materaiResponse = http.get(`/api/materai/calculate?amount=${quotationData.amount}`);
  
  // Test invoice generation
  const invoiceResponse = http.post('/api/invoices/from-quotation', {
    quotationId: quotationResponse.json('id')
  });
}
```

#### Indonesian Localization Testing
```javascript
// Accessibility test for Indonesian language
axe('http://localhost:3000?lang=id', {
  rules: {
    'html-has-lang': { enabled: true },
    'lang': { enabled: true }
  }
});
```

## 🔐 Security & Compliance

### Security Measures
1. **Container Security**: Non-root user execution
2. **Dependency Scanning**: Automated vulnerability detection
3. **Secrets Management**: No hardcoded credentials
4. **HTTPS Enforcement**: Production-ready SSL configuration
5. **Input Validation**: Indonesian business data validation

### Indonesian Compliance
1. **Materai Compliance**: 5 million IDR threshold validation
2. **Currency Handling**: IDR formatting and calculations
3. **Timezone Support**: Asia/Jakarta timezone enforcement
4. **Language Support**: Bahasa Indonesia localization
5. **Business Hours**: Indonesian business hour considerations

### Container Structure Tests
```yaml
# Validation example
commandTests:
  - name: "Indonesian timezone configured"
    command: "date"
    args: ["+%Z"]
    expectedOutput: ["WIB"]
  
  - name: "Materai threshold configuration"
    command: "echo"
    args: ["$MATERAI_THRESHOLD"]
    expectedOutput: ["5000000"]
```

## 📊 Performance Monitoring

### Metrics Collection
- **Core Web Vitals**: LCP, FID, CLS, FCP, TTFB
- **Business Metrics**: Quotation load time, invoice render time, materai calculation
- **Indonesian Metrics**: Currency formatting, timezone handling, language switching

### Performance Thresholds
```javascript
// Adjusted for Indonesian internet conditions
const thresholds = {
  lcp: { good: 2500, poor: 4000 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 800, poor: 1800 },
  quotationLoad: { good: 2000, poor: 5000 },
  materaiCalculation: { good: 500, poor: 1500 }
};
```

## 🚀 Deployment

### GitOps Workflow
1. **Code Push**: Triggers CI/CD pipeline
2. **Build & Test**: Comprehensive validation
3. **Image Build**: Multi-platform Docker images
4. **Security Scan**: Vulnerability assessment
5. **GitOps Update**: Kubernetes manifest updates
6. **ArgoCD Sync**: Automated deployment
7. **Health Checks**: Indonesian business validation

### Environment Promotion
```
feature/* → staging → production
    ↓         ↓         ↓
   CI/CD    Full      Health
   Tests    Tests     Checks
```

### Rollback Strategy
- **Automated**: Health check failures trigger rollback
- **Manual**: ArgoCD manual rollback capability
- **Database**: Prisma migration rollback procedures

## 🛠️ Troubleshooting

### Common Issues

#### 1. Docker Build Failures
```bash
# Clear Docker cache
docker system prune -af

# Rebuild with no cache
docker build --no-cache -f Dockerfile.optimized --target production .
```

#### 2. Test Environment Issues
```bash
# Reset test environment
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d

# Check service health
docker-compose -f docker-compose.test.yml ps
```

#### 3. Performance Test Failures
```bash
# Check system resources
docker stats

# Increase test timeouts for Indonesian internet conditions
export TEST_TIMEOUT=300000
```

#### 4. Indonesian Business Logic Issues
```bash
# Validate Indonesian configuration
./scripts/ci-cd-helper.sh validate

# Check Indonesian business metrics
curl http://localhost:5000/api/health/indonesian
```

### Debugging
```bash
# Enable debug logging
export DEBUG=true
export LOG_LEVEL=debug

# Run with verbose output
./scripts/ci-cd-helper.sh all 2>&1 | tee ci-cd-debug.log
```

## 📋 Maintenance

### Regular Tasks
1. **Weekly**: Security vulnerability scans
2. **Monthly**: Performance baseline updates
3. **Quarterly**: Indonesian compliance reviews
4. **Annually**: Full infrastructure audit

### Monitoring
- **GitHub Actions**: Pipeline execution monitoring
- **ArgoCD**: Deployment status monitoring
- **Lighthouse CI**: Performance regression detection
- **Security Alerts**: Automated vulnerability notifications

## 🤝 Contributing

### Development Workflow
1. Create feature branch
2. Run local CI/CD validation: `./scripts/ci-cd-helper.sh all`
3. Push changes (triggers CI/CD pipeline)
4. Create pull request
5. Automated testing and security scanning
6. Code review with Indonesian business context
7. Merge to staging/production

### Indonesian Business Considerations
- Always test materai calculations for amounts ≥ 5,000,000 IDR
- Validate Bahasa Indonesia localization
- Test timezone handling for Asia/Jakarta
- Ensure WhatsApp integration compatibility

## 📚 Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [K6 Load Testing Guide](https://k6.io/docs/)
- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/AA/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Indonesian Business Regulations](https://www.bi.go.id/)

---

## 🇮🇩 Indonesian Business Management System
**Comprehensive CI/CD Integration for Financial Compliance and Performance**

This CI/CD integration ensures robust, secure, and performant deployment of the Indonesian Business Management System with full support for local business requirements, regulations, and user expectations.