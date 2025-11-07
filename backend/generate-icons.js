const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Read the SVG file
    const svgPath = path.join(__dirname, '..', 'frontend', 'public', 'icon.svg');
    const svgContent = fs.readFileSync(svgPath, 'utf8');

    // Generate favicon (192x192)
    console.log('Generating favicon.png (192x192)...');
    await page.setViewport({ width: 192, height: 192 });
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 0;
              width: 192px;
              height: 192px;
              background: white;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            svg {
              width: 100%;
              height: 100%;
            }
          </style>
        </head>
        <body>${svgContent}</body>
      </html>
    `);

    const faviconPath = path.join(__dirname, '..', 'frontend', 'public', 'favicon.png');
    await page.screenshot({
      path: faviconPath,
      omitBackground: false,
      type: 'png'
    });
    console.log(`✓ Generated ${faviconPath}`);

    // Generate apple-touch-icon (180x180)
    console.log('Generating logo.png (180x180)...');
    await page.setViewport({ width: 180, height: 180 });
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 0;
              width: 180px;
              height: 180px;
              background: white;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            svg {
              width: 100%;
              height: 100%;
            }
          </style>
        </head>
        <body>${svgContent}</body>
      </html>
    `);

    const logoPath = path.join(__dirname, '..', 'frontend', 'public', 'logo.png');
    await page.screenshot({
      path: logoPath,
      omitBackground: false,
      type: 'png'
    });
    console.log(`✓ Generated ${logoPath}`);

    console.log('\n✓ All icons generated successfully!');

  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

generateIcons();
