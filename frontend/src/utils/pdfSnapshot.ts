/**
 * PDF Snapshot Utilities
 * Captures rendered HTML and styles from visual builder for pixel-perfect PDF generation
 * Implements the "Looker Studio Pattern" for 100% parity between canvas and PDF
 */

export interface ReportSnapshot {
  html: string;
  styles: string;
  dimensions: {
    width: number;
    rowHeight: number;
    cols: number;
  };
  metadata: {
    timestamp: string;
    userAgent: string;
  };
}

/**
 * Extract CSS rules relevant to report rendering
 */
const extractStyles = (): string => {
  const relevantRules: string[] = [];

  // Keywords to identify relevant CSS rules
  const keywords = [
    'react-grid',
    'widget',
    'chart',
    'report-canvas',
    'recharts',
    'ant-',
  ];

  try {
    for (const sheet of document.styleSheets) {
      try {
        // Skip cross-origin stylesheets
        if (sheet.href && !sheet.href.startsWith(window.location.origin)) {
          continue;
        }

        for (const rule of Array.from(sheet.cssRules || [])) {
          const ruleText = rule.cssText;

          // Check if rule is relevant to our report
          const isRelevant = keywords.some(keyword =>
            ruleText.toLowerCase().includes(keyword.toLowerCase())
          );

          if (isRelevant) {
            relevantRules.push(ruleText);
          }
        }
      } catch (e) {
        // Cross-origin or restricted stylesheet - skip
        console.warn('Skipping stylesheet:', sheet.href, e);
      }
    }
  } catch (error) {
    console.error('Error extracting styles:', error);
  }

  // Add essential print styles
  const printStyles = `
    @media print {
      .react-grid-item {
        page-break-inside: avoid;
      }
      .no-print {
        display: none !important;
      }
    }
  `;

  return relevantRules.join('\n') + '\n' + printStyles;
};

/**
 * Capture report canvas HTML for PDF generation
 * Returns complete snapshot with HTML, styles, and metadata
 */
export const captureReportSnapshot = (): ReportSnapshot | null => {
  const canvas = document.querySelector('.report-canvas');

  if (!canvas) {
    // Silently return null if canvas not found (user may be on detail page, not builder)
    return null;
  }

  // Get inner HTML of canvas
  const html = canvas.innerHTML;

  if (!html) {
    console.error('Canvas HTML is empty');
    return null;
  }

  // Extract relevant styles
  const styles = extractStyles();

  // Get dimensions from constants (should match ReportBuilderCanvas)
  const dimensions = {
    width: 794,   // A4 width at 96 DPI
    rowHeight: 30, // DEFAULT_ROW_HEIGHT
    cols: 12,      // DEFAULT_GRID_COLS
  };

  // Create snapshot
  const snapshot: ReportSnapshot = {
    html,
    styles,
    dimensions,
    metadata: {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    },
  };

  return snapshot;
};

/**
 * Capture snapshot and validate it's ready for PDF generation
 */
export const captureAndValidateSnapshot = (): ReportSnapshot | null => {
  const snapshot = captureReportSnapshot();

  if (!snapshot) {
    return null;
  }

  // Validation checks
  if (snapshot.html.length < 100) {
    console.warn('Snapshot HTML seems too small', snapshot.html.length);
    return null;
  }

  if (!snapshot.html.includes('react-grid-item')) {
    console.warn('Snapshot HTML missing react-grid-item elements');
    return null;
  }

  console.log('Snapshot captured successfully:', {
    htmlLength: snapshot.html.length,
    stylesLength: snapshot.styles.length,
    dimensions: snapshot.dimensions,
  });

  return snapshot;
};

/**
 * Wait for all charts and images to finish loading before capturing
 */
export const waitForContentLoaded = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if all images are loaded
    const images = Array.from(document.querySelectorAll('.report-canvas img'));
    const imagePromises = images.map(img => {
      if ((img as HTMLImageElement).complete) {
        return Promise.resolve();
      }
      return new Promise(res => {
        img.addEventListener('load', () => res(true));
        img.addEventListener('error', () => res(true)); // Resolve even on error
      });
    });

    // Check if all charts are rendered (look for canvas elements)
    const canvases = Array.from(document.querySelectorAll('.report-canvas canvas'));
    const allCanvasesRendered = canvases.every(canvas => {
      const ctx = (canvas as HTMLCanvasElement).getContext('2d');
      // Simple check: if canvas has been drawn to, it has content
      return ctx && (canvas as HTMLCanvasElement).width > 0;
    });

    Promise.all(imagePromises).then(() => {
      // Small delay to ensure rendering is complete
      setTimeout(() => {
        resolve(allCanvasesRendered);
      }, 500);
    });
  });
};

/**
 * Capture snapshot with content loading wait
 */
export const captureSnapshotSafe = async (): Promise<ReportSnapshot | null> => {
  // Check if canvas exists first (user might be on detail page, not builder page)
  const canvas = document.querySelector('.report-canvas');
  if (!canvas) {
    console.log('No visual builder canvas found on this page - will use calculation-based PDF generation');
    return null;
  }

  console.log('Visual builder canvas found, capturing snapshot for pixel-perfect PDF...');

  const loaded = await waitForContentLoaded();

  if (!loaded) {
    console.warn('Some content may not have finished loading');
  }

  return captureAndValidateSnapshot();
};
