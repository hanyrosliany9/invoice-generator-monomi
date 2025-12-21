# Shot List - PDF Export

## Task: Add PDF export for shot lists

---

## Backend: Export Endpoint

### File: `backend/src/modules/shot-lists/shot-lists.controller.ts`

Add to controller:
```typescript
import { Response } from 'express';
import { Res } from '@nestjs/common';

@Get(':id/export/pdf')
async exportPdf(@Param('id') id: string, @Res() res: Response) {
  const pdf = await this.service.generatePdf(id);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="shot-list-${id}.pdf"`,
  });
  res.send(pdf);
}
```

### File: `backend/src/modules/shot-lists/shot-lists.service.ts`

Add method:
```typescript
import * as puppeteer from 'puppeteer';

async generatePdf(id: string): Promise<Buffer> {
  const shotList = await this.findOne(id);

  const html = this.generateHtml(shotList);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdf = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
  });

  await browser.close();
  return Buffer.from(pdf);
}

private generateHtml(shotList: any): string {
  const scenesHtml = shotList.scenes.map((scene: any) => `
    <div class="scene">
      <div class="scene-header">
        <strong>${scene.sceneNumber}</strong> - ${scene.name}
        ${scene.intExt ? `(${scene.intExt})` : ''}
        ${scene.dayNight ? `/ ${scene.dayNight}` : ''}
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Size</th>
            <th>Type</th>
            <th>Movement</th>
            <th>Lens</th>
            <th>Description</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${scene.shots.map((shot: any) => `
            <tr>
              <td>${shot.shotNumber}</td>
              <td>${shot.shotSize || '-'}</td>
              <td>${shot.shotType || '-'}</td>
              <td>${shot.cameraMovement || '-'}</td>
              <td>${shot.lens || '-'}</td>
              <td>${shot.description || '-'}</td>
              <td>${shot.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
        h1 { font-size: 18px; margin-bottom: 10px; }
        .meta { color: #666; margin-bottom: 20px; }
        .scene { margin-bottom: 20px; page-break-inside: avoid; }
        .scene-header { background: #1f2937; color: #fff; padding: 8px 12px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: bold; }
        tr:nth-child(even) { background: #fafafa; }
      </style>
    </head>
    <body>
      <h1>${shotList.name}</h1>
      <div class="meta">
        Project: ${shotList.project?.name || 'N/A'} |
        Created: ${new Date(shotList.createdAt).toLocaleDateString()}
      </div>
      ${scenesHtml}
    </body>
    </html>
  `;
}
```

---

## Frontend: Export Button

### File: `frontend/src/components/shot-list/ExportPdfButton.tsx`
```typescript
import { Button, Dropdown, App } from 'antd';
import { FilePdfOutlined, DownOutlined } from '@ant-design/icons';
import { apiClient } from '../../config/api';

interface Props {
  shotListId: string;
  shotListName: string;
}

export default function ExportPdfButton({ shotListId, shotListName }: Props) {
  const { message } = App.useApp();

  const handleExport = async () => {
    try {
      message.loading('Generating PDF...', 0);
      const response = await apiClient.get(`/shot-lists/${shotListId}/export/pdf`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${shotListName.replace(/\s+/g, '_')}_shot_list.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.destroy();
      message.success('PDF exported successfully');
    } catch (error) {
      message.destroy();
      message.error('Failed to export PDF');
    }
  };

  return (
    <Button icon={<FilePdfOutlined />} onClick={handleExport}>
      Export PDF
    </Button>
  );
}
```

---

## Update Editor Page

### File: `frontend/src/pages/ShotListEditorPage.tsx`

Replace the export button:
```typescript
import ExportPdfButton from '../components/shot-list/ExportPdfButton';

// In the header, replace:
// <Button icon={<FilePdfOutlined />} type="primary">Export PDF</Button>
// With:
<ExportPdfButton shotListId={id!} shotListName={shotList.name} />
```

---

## Verification

1. Open a shot list with scenes and shots
2. Click "Export PDF"
3. Verify PDF downloads
4. Open PDF and verify formatting
