# Logo Implementation - Quick Reference

## Files Modified

### Frontend Changes
```
frontend/index.html
  - Line 5: Changed favicon from /vite.svg to /favicon.png
  - Line 6: Added apple-touch-icon reference

frontend/src/components/layout/MainLayout.tsx
  - Line 37: Added logo import
  - Lines 302-338: Replaced text header with logo image component

frontend/src/components/ui/MobileEntityNav.tsx
  - Line 25: Added logo import
  - Lines 334-350: Enhanced drawer title with logo

frontend/public/favicon.png (NEW)
frontend/public/logo.png (NEW)
```

### Backend Changes
```
backend/src/modules/pdf/pdf.service.ts
  - Line 14: Added logoBase64 property
  - Lines 16-29: Added constructor and initializeLogo() method
  - Line 805: Added logo to invoice template header
  - Line 1607: Added logo to quotation template header

backend/src/modules/pdf/assets/company-logo.png (NEW)
```

## Key Code Snippets

### Frontend Logo Import
```typescript
import logoImage from '../../assets/logos/monomi-logo-1.png'
```

### Desktop Sidebar Logo
```tsx
<img
  src={logoImage}
  alt="Monomi Logo"
  style={{
    width: collapsed ? '40px' : '80px',
    height: collapsed ? '40px' : '80px',
    objectFit: 'contain',
    transition: 'all 0.2s ease',
  }}
/>
```

### Backend Logo Loading
```typescript
private initializeLogo() {
  try {
    const logoPath = join(__dirname, "assets", "company-logo.png");
    const logoBuffer = readFileSync(logoPath);
    this.logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
    this.logger.log("Company logo loaded successfully");
  } catch (error) {
    this.logger.warn("Failed to load company logo, PDFs will render without logo");
    this.logoBase64 = null;
  }
}
```

### PDF Template Logo Insertion
```typescript
${this.logoBase64 ? `<img src="${this.logoBase64}" alt="Company Logo" class="company-logo" />` : ""}
```

## Testing Commands

```bash
# Verify all logo files exist
ls -lh frontend/src/assets/logos/
ls -lh frontend/public/*.png
ls -lh backend/src/modules/pdf/assets/

# Rebuild containers
docker compose -f docker-compose.dev.yml build

# Start services
docker compose -f docker-compose.dev.yml up

# Check for logo loading in backend logs
docker compose -f docker-compose.dev.yml logs app | grep -i logo
```

## Browser Testing Checklist

- [ ] Browser tab shows Monomi favicon
- [ ] Desktop sidebar shows logo (expanded mode)
- [ ] Desktop sidebar shows small logo (collapsed mode)
- [ ] Mobile menu drawer shows logo in header
- [ ] Generated invoice PDF shows logo in header
- [ ] Generated quotation PDF shows logo in header

## Rollback Instructions

If needed, revert these files:
```bash
git checkout frontend/index.html
git checkout frontend/src/components/layout/MainLayout.tsx
git checkout frontend/src/components/ui/MobileEntityNav.tsx
git checkout backend/src/modules/pdf/pdf.service.ts

# Remove new files
rm frontend/public/favicon.png
rm frontend/public/logo.png
rm backend/src/modules/pdf/assets/company-logo.png
```

## Docker Considerations

The backend logo file needs to be included in Docker image. Verify Dockerfile includes:

```dockerfile
# If using multi-stage build, ensure assets are copied
COPY backend/src/modules/pdf/assets backend/dist/modules/pdf/assets
```

For development with volumes, assets should mount automatically.
