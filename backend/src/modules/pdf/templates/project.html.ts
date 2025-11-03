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
    statistics = null,
    scopeOfWork = null,
    createdAt = null,
    updatedAt = null,
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

    <!-- QUICK STATISTICS -->
    ${
      statistics
        ? `
    <div class="metrics-grid" style="margin-bottom: 4mm;">
      <div class="metric-box">
        <div class="metric-label">Quotations</div>
        <div class="metric-value">${statistics.quotationsCount}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Invoices</div>
        <div class="metric-value">${statistics.invoicesCount}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Expenses</div>
        <div class="metric-value">${statistics.expensesCount}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Cost Allocations</div>
        <div class="metric-value">${statistics.costAllocationsCount}</div>
      </div>
    </div>
    `
        : ""
    }

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

    <!-- SCOPE OF WORK -->
    ${
      scopeOfWork
        ? `
    <div class="card section">
      <div class="card-header">
        <div class="card-title">Ruang Lingkup Pekerjaan (Scope of Work)</div>
      </div>
      <div style="white-space: pre-wrap; font-size: 9px; line-height: 1.6;">
        ${scopeOfWork}
      </div>
    </div>
    `
        : ""
    }

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

    <!-- ESTIMATED COSTS & PROJECTED PROFIT (PLANNING PHASE) -->
    ${
      profitMargin &&
      (profitMargin.projectedGrossMargin !== null ||
       profitMargin.projectedNetMargin !== null ||
       profitMargin.estimatedTotalCosts > 0)
        ? `
    <div class="card section">
      <div class="card-header">
        <div>
          <div class="card-title">Estimasi Biaya & Proyeksi Profit</div>
          <div class="card-subtitle">Projected margins and estimated costs from planning phase</div>
        </div>
      </div>

      <!-- Projected Margins Summary (4 Statistics Cards) -->
      <div class="metrics-grid" style="grid-template-columns: 1fr 1fr 1fr 1fr; margin-bottom: 4mm;">
        <div class="metric-box" style="border-left-color: ${
          profitMargin.projectedGrossMargin >= 20
            ? "#22c55e"
            : profitMargin.projectedGrossMargin >= 10
              ? "#3b82f6"
              : "#f59e0b"
        };">
          <div class="metric-label">Margin Bruto (Proyeksi)</div>
          <div class="metric-value" style="color: ${
            profitMargin.projectedGrossMargin >= 20
              ? "#22c55e"
              : profitMargin.projectedGrossMargin >= 10
                ? "#3b82f6"
                : "#f59e0b"
          };">
            ${profitMargin.projectedGrossMargin?.toFixed(2) || 0}%
          </div>
        </div>

        <div class="metric-box" style="border-left-color: ${
          profitMargin.projectedNetMargin >= 20
            ? "#22c55e"
            : profitMargin.projectedNetMargin >= 10
              ? "#3b82f6"
              : profitMargin.projectedNetMargin >= 0
                ? "#f59e0b"
                : "#ef4444"
        };">
          <div class="metric-label">Margin Netto (Proyeksi)</div>
          <div class="metric-value" style="color: ${
            profitMargin.projectedNetMargin >= 20
              ? "#22c55e"
              : profitMargin.projectedNetMargin >= 10
                ? "#3b82f6"
                : profitMargin.projectedNetMargin >= 0
                  ? "#f59e0b"
                  : "#ef4444"
          };">
            ${profitMargin.projectedNetMargin?.toFixed(2) || 0}%
          </div>
        </div>

        <div class="metric-box" style="border-left-color: ${
          profitMargin.projectedProfit >= 0 ? "#22c55e" : "#ef4444"
        };">
          <div class="metric-label">Proyeksi Profit</div>
          <div class="metric-value" style="color: ${
            profitMargin.projectedProfit >= 0 ? "#22c55e" : "#ef4444"
          };">
            ${formatIDR(profitMargin.projectedProfit || 0)}
          </div>
        </div>

        <div class="metric-box" style="border-left-color: #ef4444;">
          <div class="metric-label">Total Estimasi Biaya</div>
          <div class="metric-value" style="color: #ef4444;">
            ${formatIDR(profitMargin.estimatedTotalCosts || 0)}
          </div>
        </div>
      </div>

      <!-- Detailed Expense Breakdown Table (Rincian Estimasi Biaya) -->
      ${
        expenses && expenses.length > 0
          ? `
      <div style="margin-top: 3mm;">
        <div style="font-weight: 700; font-size: 10px; margin-bottom: 2mm; color: #1f2937;">
          Rincian Estimasi Biaya
        </div>

        <table class="table">
          <thead>
            <tr>
              <th style="width: 60%;">Kategori</th>
              <th style="width: 20%; text-align: right;">Estimasi</th>
              <th style="width: 20%;">Catatan</th>
            </tr>
          </thead>
          <tbody>
            ${expenses
              .map(
                (expense: any) => `
            <tr>
              <td>
                <div style="display: flex; align-items: center; gap: 2mm;">
                  <span style="
                    display: inline-block;
                    padding: 0.5mm 1.5mm;
                    background-color: ${expense.costType === "direct" ? "#dbeafe" : "#fed7aa"};
                    color: ${expense.costType === "direct" ? "#1e40af" : "#c2410c"};
                    border-radius: 1px;
                    font-size: 7px;
                    font-weight: 600;
                    text-transform: uppercase;
                  ">
                    ${expense.costType === "direct" ? "Langsung" : "Tidak Langsung"}
                  </span>
                  <span>${expense.categoryNameId || expense.categoryName || "N/A"}</span>
                </div>
              </td>
              <td class="table-amount">${formatIDR(expense.amount)}</td>
              <td style="font-size: 7px; color: #666;">${expense.notes || "-"}</td>
            </tr>
            `
              )
              .join("")}

            <!-- Subtotal: Direct Costs -->
            <tr style="background-color: #dbeafe; font-weight: 700;">
              <td colspan="2" style="text-align: left; padding-left: 3mm;">
                <strong>Total Biaya Langsung</strong>
              </td>
              <td class="table-amount">
                <strong style="color: #1e40af;">
                  ${formatIDR(profitMargin?.estimatedDirectCosts || 0)}
                </strong>
              </td>
            </tr>

            <!-- Subtotal: Indirect Costs -->
            <tr style="background-color: #fed7aa; font-weight: 700;">
              <td colspan="2" style="text-align: left; padding-left: 3mm;">
                <strong>Total Biaya Tidak Langsung</strong>
              </td>
              <td class="table-amount">
                <strong style="color: #c2410c;">
                  ${formatIDR(profitMargin?.estimatedIndirectCosts || 0)}
                </strong>
              </td>
            </tr>

            <!-- Grand Total -->
            <tr class="table-total">
              <td colspan="2" style="text-align: left; padding-left: 3mm;">
                <strong style="font-size: 11px;">TOTAL ESTIMASI</strong>
              </td>
              <td class="table-amount">
                <strong style="font-size: 11px; color: #22c55e;">
                  ${formatIDR(profitMargin?.estimatedTotalCosts || 0)}
                </strong>
              </td>
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

    <!-- COMPREHENSIVE PROFIT MARGIN ANALYSIS -->
    ${
      profitMargin && (profitMargin.grossMargin !== 0 || profitMargin.netMargin !== 0)
        ? `
    <div class="card section">
      <div class="card-header">
        <div class="card-title">Analisis Margin Laba (Profit Margin Analysis)</div>
        ${
          profitMargin.calculatedAt
            ? `
        <div class="card-subtitle">Terakhir dihitung: ${formatDate(profitMargin.calculatedAt)}</div>
        `
            : ""
        }
      </div>

      <!-- Actual Margins (Realized) -->
      <div style="margin-bottom: 4mm;">
        <div style="font-weight: 700; font-size: 10px; margin-bottom: 2mm; color: #1f2937;">
          📊 Margin Aktual (Realized Performance)
        </div>

        <div class="metrics-grid">
          <div class="metric-box">
            <div class="metric-label">Margin Laba Kotor</div>
            <div class="metric-value" style="color: ${profitMargin.grossMargin >= 20 ? "#22c55e" : profitMargin.grossMargin >= 10 ? "#3b82f6" : profitMargin.grossMargin >= 0 ? "#f59e0b" : "#ef4444"};">
              ${profitMargin.grossMargin.toFixed(2)}%
            </div>
            <div style="font-size: 7px; color: #666; margin-top: 1mm;">
              ${profitMargin.grossMargin >= 20 ? "Sangat Baik" : profitMargin.grossMargin >= 10 ? "Baik" : profitMargin.grossMargin >= 0 ? "Impas" : "Rugi"}
            </div>
          </div>

          <div class="metric-box">
            <div class="metric-label">Margin Laba Neto</div>
            <div class="metric-value" style="color: ${profitMargin.netMargin >= 20 ? "#22c55e" : profitMargin.netMargin >= 10 ? "#3b82f6" : profitMargin.netMargin >= 0 ? "#f59e0b" : "#ef4444"};">
              ${profitMargin.netMargin.toFixed(2)}%
            </div>
            <div style="font-size: 7px; color: #666; margin-top: 1mm;">
              ${profitMargin.netMargin >= 20 ? "Sangat Baik" : profitMargin.netMargin >= 10 ? "Baik" : profitMargin.netMargin >= 0 ? "Impas" : "Rugi"}
            </div>
          </div>

          <div class="metric-box">
            <div class="metric-label">Laba Bersih</div>
            <div class="metric-value" style="color: ${profitMargin.netProfit >= 0 ? "#22c55e" : "#ef4444"};">
              ${formatIDR(profitMargin.netProfit)}
            </div>
          </div>
        </div>
      </div>

      <!-- Revenue & Cost Breakdown -->
      <div style="margin-bottom: 4mm;">
        <div style="font-weight: 700; font-size: 10px; margin-bottom: 2mm; color: #1f2937;">
          💰 Breakdown Pendapatan & Biaya
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Total Pendapatan (Terbayar)</span>
            <span class="info-value amount">${formatIDR(profitMargin.totalRevenue)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Total Biaya Teralokasi</span>
            <span class="info-value amount">${formatIDR(profitMargin.totalCosts)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Biaya Langsung</span>
            <span class="info-value">${formatIDR(profitMargin.directCosts)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Biaya Tidak Langsung</span>
            <span class="info-value">${formatIDR(profitMargin.indirectCosts)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Laba Kotor</span>
            <span class="info-value" style="color: ${profitMargin.grossProfit >= 0 ? "#22c55e" : "#ef4444"};">
              ${formatIDR(profitMargin.grossProfit)}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Laba Bersih</span>
            <span class="info-value" style="color: ${profitMargin.netProfit >= 0 ? "#22c55e" : "#ef4444"};">
              ${formatIDR(profitMargin.netProfit)}
            </span>
          </div>
        </div>
      </div>

      <!-- Budget Variance Analysis -->
      ${
        profitMargin.budgetVariance !== 0 || profitMargin.budgetVariancePercent !== 0
          ? `
      <div style="margin-bottom: 4mm;">
        <div style="font-weight: 700; font-size: 10px; margin-bottom: 2mm; color: #1f2937;">
          📈 Analisis Variansi Anggaran
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Variansi Anggaran (IDR)</span>
            <span class="info-value" style="color: ${profitMargin.budgetVariance >= 0 ? "#22c55e" : "#ef4444"};">
              ${profitMargin.budgetVariance >= 0 ? "+" : ""}${formatIDR(profitMargin.budgetVariance)}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Variansi Anggaran (%)</span>
            <span class="info-value" style="color: ${profitMargin.budgetVariancePercent >= 0 ? "#22c55e" : "#ef4444"};">
              ${profitMargin.budgetVariancePercent >= 0 ? "+" : ""}${profitMargin.budgetVariancePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
      `
          : ""
      }

      <!-- Projected vs Actual Comparison -->
      ${
        profitMargin.projectedGrossMargin !== null
          ? `
      <div>
        <div style="font-weight: 700; font-size: 10px; margin-bottom: 2mm; color: #1f2937;">
          🎯 Proyeksi vs Aktual
        </div>

        <table class="table" style="font-size: 8px;">
          <thead>
            <tr>
              <th>Metrik</th>
              <th style="text-align: right;">Proyeksi</th>
              <th style="text-align: right;">Aktual</th>
              <th style="text-align: right;">Selisih</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Margin Bruto</td>
              <td style="text-align: right;">${profitMargin.projectedGrossMargin?.toFixed(2) || 0}%</td>
              <td style="text-align: right;">${profitMargin.grossMargin.toFixed(2)}%</td>
              <td style="text-align: right; color: ${(profitMargin.grossMargin - (profitMargin.projectedGrossMargin || 0)) >= 0 ? "#22c55e" : "#ef4444"};">
                ${(profitMargin.grossMargin - (profitMargin.projectedGrossMargin || 0)) >= 0 ? "+" : ""}${(profitMargin.grossMargin - (profitMargin.projectedGrossMargin || 0)).toFixed(2)}%
              </td>
            </tr>
            <tr>
              <td>Margin Netto</td>
              <td style="text-align: right;">${profitMargin.projectedNetMargin?.toFixed(2) || 0}%</td>
              <td style="text-align: right;">${profitMargin.netMargin.toFixed(2)}%</td>
              <td style="text-align: right; color: ${(profitMargin.netMargin - (profitMargin.projectedNetMargin || 0)) >= 0 ? "#22c55e" : "#ef4444"};">
                ${(profitMargin.netMargin - (profitMargin.projectedNetMargin || 0)) >= 0 ? "+" : ""}${(profitMargin.netMargin - (profitMargin.projectedNetMargin || 0)).toFixed(2)}%
              </td>
            </tr>
            <tr style="font-weight: 700; background-color: #f3f4f6;">
              <td>Profit</td>
              <td style="text-align: right;">${formatIDR(profitMargin.projectedProfit || 0)}</td>
              <td style="text-align: right;">${formatIDR(profitMargin.profit)}</td>
              <td style="text-align: right; color: ${(profitMargin.profit - (profitMargin.projectedProfit || 0)) >= 0 ? "#22c55e" : "#ef4444"};">
                ${formatIDR(profitMargin.profit - (profitMargin.projectedProfit || 0))}
              </td>
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

    <!-- AUDIT TRAIL -->
    <div style="margin-top: 5mm; padding-top: 3mm; border-top: 1px solid #e5e7eb; font-size: 8px; color: #999;">
      <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
        ${createdAt ? `<span style="margin-right: 2mm;">Dibuat: ${formatDate(createdAt)}</span>` : ""}
        ${updatedAt ? `<span style="margin-right: 2mm;">Terakhir diubah: ${formatDate(updatedAt)}</span>` : ""}
        ${profitMargin?.calculatedBy ? `<span>Profit dihitung oleh: ${profitMargin.calculatedBy}</span>` : ""}
      </div>
    </div>

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
