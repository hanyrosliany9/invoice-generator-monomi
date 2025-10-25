/**
 * Project PDF Template
 * Modern design matching web UI (Ant Design theme)
 * Uses professional styling with cards, progress bars, and visual hierarchy
 */

export function generateProjectHTML(projectData: any): string {
  const {
    number,
    status,
    projectType,
    description,
    output,
    client,
    startDate,
    endDate,
    estimatedBudget,
    basePrice,
    totalRevenue,
    priceBreakdown = {},
    estimatedExpenses = [],
    progress = 0,
    daysRemaining = 0,
    profitMargin = null,
  } = projectData;

  // Format currency in Indonesian Rupiah
  const formatIDR = (amount: number | undefined | null) => {
    if (!amount) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date in Indonesian format
  const formatDate = (date: string | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Status badge color
  const getStatusColor = (stat: string) => {
    const statusMap: { [key: string]: string } = {
      active: "#22c55e",
      pending: "#f59e0b",
      completed: "#3b82f6",
      on_hold: "#ef4444",
      cancelled: "#6b7280",
    };
    return statusMap[stat?.toLowerCase()] || "#6b7280";
  };

  // Progress bar color based on percentage
  const getProgressColor = (percent: number) => {
    if (percent >= 80) return "#22c55e";
    if (percent >= 50) return "#3b82f6";
    if (percent >= 25) return "#f59e0b";
    return "#ef4444";
  };

  // Days remaining color coding
  const getDaysRemainingColor = (days: number) => {
    if (days > 14) return "#22c55e";
    if (days > 7) return "#f59e0b";
    if (days > 0) return "#ef4444";
    return "#991b1b";
  };

  // Parse products from priceBreakdown
  const products = Array.isArray(priceBreakdown) ? priceBreakdown : (priceBreakdown.products || []);

  // Calculate expense totals - ensure estimatedExpenses is an array
  const expenses = estimatedExpenses ? (Array.isArray(estimatedExpenses) ? estimatedExpenses : []) : [];
  const directCosts = expenses
    .filter((e: any) => e.costType === "direct")
    .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  const indirectCosts = expenses
    .filter((e: any) => e.costType === "indirect")
    .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  const totalCosts = directCosts + indirectCosts;

  // Status badge styling
  const statusColor = getStatusColor(status);
  const progressColor = getProgressColor(progress);
  const daysColor = getDaysRemainingColor(daysRemaining);

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laporan Proyek - ${number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
      font-size: 10px;
      line-height: 1.4;
      color: #333;
      background-color: #fff;
    }

    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 12mm 12mm;
      background-color: white;
    }

    /* ===== HEADER SECTION ===== */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4mm;
      padding-bottom: 3mm;
      border-bottom: 2px solid #dc2626;
    }

    .header-left {
      flex: 1;
    }

    .header-title {
      font-size: 22px;
      font-weight: 700;
      color: #dc2626;
      margin-bottom: 0.5mm;
      letter-spacing: -0.5px;
    }

    .header-subtitle {
      font-size: 8px;
      color: #666;
      margin-bottom: 1mm;
    }

    .header-right {
      text-align: right;
      flex: 0 0 auto;
    }

    .project-number {
      font-size: 10px;
      font-weight: 600;
      color: #555;
      margin-bottom: 1mm;
    }

    .print-date {
      font-size: 8px;
      color: #999;
      margin-bottom: 1mm;
    }

    .status-badge {
      display: inline-block;
      padding: 1.5mm 3mm;
      border-radius: 2px;
      font-size: 9px;
      font-weight: 600;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-top: 1mm;
    }

    /* ===== CARD LAYOUT ===== */
    .card {
      background-color: #f9f9f9;
      border: 1px solid #e5e7eb;
      border-radius: 3px;
      padding: 3mm;
      margin-bottom: 3mm;
      page-break-inside: avoid;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2mm;
      padding-bottom: 1.5mm;
      border-bottom: 1.5px solid #dc2626;
    }

    .card-title {
      font-size: 11px;
      font-weight: 700;
      color: #1f2937;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .card-subtitle {
      font-size: 8px;
      color: #999;
    }

    /* ===== INFO GRID ===== */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2mm;
      margin-bottom: 2mm;
    }

    .info-item {
      display: flex;
      flex-direction: column;
    }

    .info-label {
      font-size: 7px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      margin-bottom: 0.5mm;
    }

    .info-value {
      font-size: 9px;
      font-weight: 500;
      color: #1f2937;
    }

    .info-value.amount {
      font-weight: 700;
      color: #dc2626;
    }

    /* ===== PROGRESS BAR ===== */
    .progress-section {
      margin-bottom: 2mm;
    }

    .progress-bar {
      width: 100%;
      height: 4mm;
      background-color: #e5e7eb;
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 0.5mm;
    }

    .progress-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .progress-text {
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      color: #666;
    }

    .progress-percent {
      font-weight: 600;
      color: #1f2937;
    }

    /* ===== METRICS GRID ===== */
    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 2mm;
      margin-bottom: 2mm;
    }

    .metric-box {
      background-color: white;
      border-left: 2px solid #dc2626;
      padding: 2mm;
      border-radius: 2px;
    }

    .metric-label {
      font-size: 7px;
      color: #999;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 0.5mm;
      letter-spacing: 0.2px;
    }

    .metric-value {
      font-size: 10px;
      font-weight: 700;
      color: #dc2626;
    }

    /* ===== TABLE ===== */
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2mm;
      font-size: 8px;
    }

    .table thead {
      background-color: #dc2626;
      color: white;
    }

    .table th {
      padding: 1.5mm 2mm;
      text-align: left;
      font-weight: 600;
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }

    .table td {
      padding: 1.5mm 2mm;
      border-bottom: 1px solid #e5e7eb;
    }

    .table tbody tr:nth-child(even) {
      background-color: #f9f9f9;
    }

    .table tbody tr:hover {
      background-color: #f3f4f6;
    }

    .table-amount {
      text-align: right;
      font-weight: 600;
      color: #1f2937;
    }

    .table-total {
      background-color: #f3f4f6;
      font-weight: 700;
      border-top: 1.5px solid #dc2626;
    }

    /* ===== SECTION DIVIDER ===== */
    .divider {
      height: 0;
      border: none;
      border-top: 1px dashed #d1d5db;
      margin: 2mm 0;
      page-break-inside: avoid;
    }

    /* ===== FOOTER ===== */
    .footer {
      margin-top: 5mm;
      padding-top: 3mm;
      border-top: 1px solid #d1d5db;
      font-size: 7px;
      color: #999;
      text-align: center;
    }

    .footer-text {
      margin-bottom: 0.5mm;
    }

    /* ===== PRINT STYLES ===== */
    @media print {
      body {
        margin: 0;
        padding: 0;
      }

      .container {
        padding: 15mm;
        max-width: 100%;
      }

      .card {
        page-break-inside: avoid;
      }

      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- HEADER -->
    <div class="header">
      <div class="header-left">
        <div class="header-title">LAPORAN PROYEK</div>
        <div class="header-subtitle">Project Details & Financial Summary</div>
      </div>
      <div class="header-right">
        <div class="project-number">Proyek #${number || "N/A"}</div>
        <div class="print-date">Dicetak: ${formatDate(new Date().toISOString())}</div>
        <div class="status-badge" style="background-color: ${statusColor};">${status?.toUpperCase() || "N/A"}</div>
      </div>
    </div>

    <div class="divider"></div>

    <!-- PROJECT INFORMATION -->
    <div class="card section">
      <div class="card-header">
        <div>
          <div class="card-title">Informasi Proyek</div>
          <div class="card-subtitle">Project overview and basic details</div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Nomor Proyek</span>
          <span class="info-value">${number || "N/A"}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Tipe Proyek</span>
          <span class="info-value">${projectType?.name || "N/A"}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Tanggal Mulai</span>
          <span class="info-value">${formatDate(startDate)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Tanggal Selesai</span>
          <span class="info-value">${formatDate(endDate)}</span>
        </div>
      </div>

      <div style="margin-bottom: 2mm;">
        <span class="info-label" style="display: block; margin-bottom: 1mm;">Deskripsi</span>
        <span class="info-value">${description || "Tidak ada deskripsi"}</span>
      </div>

      <div>
        <span class="info-label" style="display: block; margin-bottom: 1mm;">Output</span>
        <span class="info-value">${output || "Tidak ada output"}</span>
      </div>
    </div>

    <!-- CLIENT INFORMATION -->
    <div class="card section">
      <div class="card-header">
        <div class="card-title">Informasi Klien</div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Nama Klien</span>
          <span class="info-value">${client?.name || "N/A"}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Perusahaan</span>
          <span class="info-value">${client?.company || "N/A"}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Email</span>
          <span class="info-value">${client?.email || "N/A"}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Telepon</span>
          <span class="info-value">${client?.phone || "N/A"}</span>
        </div>
      </div>
    </div>

    <!-- PROGRESS & TIMELINE -->
    <div class="card section">
      <div class="card-header">
        <div class="card-title">Progress & Timeline</div>
      </div>

      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%; background-color: ${progressColor};"></div>
        </div>
        <div class="progress-text">
          <span>Progress Proyek</span>
          <span class="progress-percent">${progress}% Selesai</span>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Hari Tersisa</span>
          <span class="info-value" style="color: ${daysColor}; font-weight: 700;">
            ${daysRemaining > 0 ? daysRemaining + " hari" : "Terlambat"}
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">Status</span>
          <span class="info-value" style="color: ${statusColor}; font-weight: 700;">
            ${status?.toUpperCase() || "N/A"}
          </span>
        </div>
      </div>
    </div>

    <!-- PRODUCTS & SERVICES -->
    ${
      products && products.length > 0
        ? `
    <div class="card section">
      <div class="card-header">
        <div class="card-title">Produk & Layanan</div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 50%;">Produk</th>
            <th style="width: 15%;">Harga</th>
            <th style="width: 15%;">Qty</th>
            <th style="width: 15%;" class="table-amount">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          ${products
            .map(
              (product: any, index: number) => `
          <tr>
            <td style="text-align: center; font-weight: 600;">${String(index + 1).padStart(2, "0")}</td>
            <td>
              <strong>${product.name || "N/A"}</strong>
              ${product.description ? `<div style="font-size: 9px; color: #666;">` + product.description + `</div>` : ""}
            </td>
            <td class="table-amount">${formatIDR(product.price || 0)}</td>
            <td style="text-align: center;">${product.quantity || 1}</td>
            <td class="table-amount">${formatIDR((product.price || 0) * (product.quantity || 1))}</td>
          </tr>
            `
            )
            .join("")}
          <tr class="table-total">
            <td colspan="4" style="text-align: right; padding-right: 3mm;">TOTAL</td>
            <td class="table-amount">${formatIDR(
              products.reduce((sum: number, p: any) => sum + (p.price || 0) * (p.quantity || 1), 0)
            )}</td>
          </tr>
        </tbody>
      </table>
    </div>
    `
        : ""
    }

    <!-- FINANCIAL SUMMARY -->
    <div class="card section">
      <div class="card-header">
        <div class="card-title">Ringkasan Keuangan</div>
      </div>

      <div class="metrics-grid">
        <div class="metric-box">
          <div class="metric-label">Budget Estimasi</div>
          <div class="metric-value">${formatIDR(estimatedBudget)}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Harga Dasar</div>
          <div class="metric-value">${formatIDR(basePrice)}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Total Pendapatan</div>
          <div class="metric-value">${formatIDR(totalRevenue)}</div>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-box">
          <div class="metric-label">Biaya Langsung</div>
          <div class="metric-value">${formatIDR(directCosts)}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Biaya Tidak Langsung</div>
          <div class="metric-value">${formatIDR(indirectCosts)}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Total Biaya</div>
          <div class="metric-value">${formatIDR(totalCosts)}</div>
        </div>
      </div>
    </div>

    <!-- EXPENSE BREAKDOWN -->
    ${
      expenses && expenses.length > 0
        ? `
    <div class="card section">
      <div class="card-header">
        <div class="card-title">Detail Estimasi Biaya</div>
      </div>

      ${
        expenses.filter((e: any) => e.costType === "direct").length > 0
          ? `
      <div style="margin-bottom: 4mm;">
        <div style="font-weight: 700; color: #1f2937; margin-bottom: 2mm; font-size: 11px;">Biaya Langsung</div>
        <table class="table">
          <thead>
            <tr>
              <th style="width: 70%;">Kategori</th>
              <th style="width: 30%;" class="table-amount">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            ${expenses
              .filter((e: any) => e.costType === "direct")
              .map(
                (expense: any) => `
            <tr>
              <td>${expense.categoryNameId || expense.categoryName || "N/A"}</td>
              <td class="table-amount">${formatIDR(expense.amount)}</td>
            </tr>
            `
              )
              .join("")}
            <tr class="table-total">
              <td style="text-align: right; padding-right: 3mm;">SUBTOTAL BIAYA LANGSUNG</td>
              <td class="table-amount">${formatIDR(directCosts)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      `
          : ""
      }

      ${
        expenses.filter((e: any) => e.costType === "indirect").length > 0
          ? `
      <div>
        <div style="font-weight: 700; color: #1f2937; margin-bottom: 2mm; font-size: 11px;">Biaya Tidak Langsung</div>
        <table class="table">
          <thead>
            <tr>
              <th style="width: 70%;">Kategori</th>
              <th style="width: 30%;" class="table-amount">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            ${expenses
              .filter((e: any) => e.costType === "indirect")
              .map(
                (expense: any) => `
            <tr>
              <td>${expense.categoryNameId || expense.categoryName || "N/A"}</td>
              <td class="table-amount">${formatIDR(expense.amount)}</td>
            </tr>
            `
              )
              .join("")}
            <tr class="table-total">
              <td style="text-align: right; padding-right: 3mm;">SUBTOTAL BIAYA TIDAK LANGSUNG</td>
              <td class="table-amount">${formatIDR(indirectCosts)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      `
          : ""
      }
    </div>
    `
        : ""
    }

    <!-- PROFIT PROJECTION -->
    ${
      profitMargin
        ? `
    <div class="card section">
      <div class="card-header">
        <div class="card-title">Proyeksi Keuntungan</div>
      </div>

      <div class="metrics-grid">
        <div class="metric-box">
          <div class="metric-label">Margin Bruto</div>
          <div class="metric-value">${profitMargin.grossMargin?.toFixed(2) || 0}%</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Margin Netto</div>
          <div class="metric-value">${profitMargin.netMargin?.toFixed(2) || 0}%</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Proyeksi Profit</div>
          <div class="metric-value">${formatIDR(profitMargin.profit)}</div>
        </div>
      </div>
    </div>
    `
        : ""
    }

    <!-- FOOTER -->
    <div class="footer">
      <div class="footer-text">Monomi Project Management System</div>
      <div class="footer-text">Professional Business Solutions</div>
      <div class="footer-text" style="margin-top: 2mm; color: #ccc;">---</div>
      <div class="footer-text" style="font-size: 8px;">Dokumen ini dibuat secara otomatis dan merupakan bagian dari sistem manajemen proyek Monomi.</div>
    </div>
  </div>
</body>
</html>
  `;
}
