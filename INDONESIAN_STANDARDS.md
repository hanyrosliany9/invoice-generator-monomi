# Indonesian Financial Reporting Standards for Monomi Invoice Generator

## Research Summary - Indonesian Accounting Standards (SAK)

Based on comprehensive research into Indonesian financial reporting standards, this document outlines the requirements that our Excel export functionality must follow to comply with Indonesian business and accounting practices.

## 1. Indonesian Accounting Framework (SAK)

### Four-Tier SAK System (2025):
1. **SAK Internasional** - Full IFRS adoption
2. **SAK Indonesia** - Indonesian PSAK aligned with IFRS 
3. **SAK EP** - Private entities (effective Jan 1, 2025)
4. **SAK EMKM** - Micro, small, medium enterprises

**For Monomi**: As a business management system serving Indonesian SMEs, we should follow **SAK EMKM** standards.

## 2. Sales Reports (Laporan Penjualan) Requirements

### Mandatory Elements:
- **Nomor Invoice** - Sequential format: INV-YYYY-MM-NNN
- **Tanggal Invoice** - Indonesian date format (dd/mm/yyyy)
- **Nama Client** - Full client legal name
- **Deskripsi Project** - Project description
- **Jumlah Penjualan** - Sales amount in IDR

### Report Structure:
- **Detail Reports**: Line-by-line transaction listing
- **Rekap per Bulan**: Monthly summary with all 12 months
- **Rekap per Client**: Client-wise summary with totals

## 3. Accounts Receivable (Laporan Piutang) Requirements

### Core Formula:
```
Saldo Akhir = Saldo Awal + Penjualan - Pembayaran
```

### Mandatory Columns:
1. **Nama Client** - Client name
2. **Project** - Project description  
3. **Tanggal Invoice** - Invoice date
4. **No. Invoice** - Invoice number
5. **Saldo Awal** - Beginning balance
6. **Jml Penjualan** - Sales amount
7. **Pembayaran** - Payments received
8. **Saldo Akhir** - Ending balance

### Indonesian Terminology:
- "Saldo Awal" = Beginning Balance
- "Saldo Akhir" = Ending Balance
- "Piutang Usaha" = Accounts Receivable
- "Pembayaran" = Payments
- "Jumlah" = Total (for summary rows)

## 4. Chart of Accounts (Daftar Akun) Standards

### Standard Indonesian COA Structure:
- **1000-1999**: Aktiva (Assets)
  - 1200: Piutang Usaha (Accounts Receivable)
- **2000-2999**: Kewajiban (Liabilities)
- **3000-3999**: Modal (Equity)
- **4000-4999**: Pendapatan (Revenue)
  - 4100: Penjualan (Sales)
- **5000-5999**: Beban (Expenses)

## 5. Indonesian Business Document Standards

### Invoice Requirements:
- **Format**: Systematic numbering (INV-YYYY-MM-NNN)
- **Language**: Bahasa Indonesia mandatory
- **Currency**: Indonesian Rupiah (IDR) only
- **Materai**: Required for invoices > IDR 5,000,000
- **Date Format**: dd/mm/yyyy (Indonesian standard)

### Formatting Standards:
- **Currency**: "Rp #,##0" format
- **Numbers**: Comma as thousands separator
- **Dates**: DD/MM/YYYY format
- **Month Names**: Full Indonesian names (JANUARI, FEBRUARI, etc.)

## 6. Legal Compliance Requirements

### Materai (Stamp Duty):
- Required for documents > IDR 5,000,000
- E-Materai (electronic) at IDR 10,000
- Must be signed (physical) or digitally verified
- Failure to apply can result in 200% penalty

### Document Retention:
- Financial records must be kept for minimum periods
- Documents must be in Bahasa Indonesia
- Electronic documents require proper digital signatures

## 7. Implementation Guidelines for Monomi

### Excel Export Requirements:
1. **All text in Bahasa Indonesia**
2. **Indonesian month names (JANUARI, FEBRUARI, etc.)**
3. **Proper balance calculations (Saldo Awal → Saldo Akhir)**
4. **Sequential invoice numbering**
5. **IDR currency formatting**
6. **Summary rows with "Jumlah" totals**

### Report Structure:
1. **Company header (MONOMI)**
2. **Report title in Indonesian**
3. **Period specification (month/year)**
4. **Detailed data rows**
5. **Summary totals**

### Data Quality:
- Ensure running balance calculations are accurate
- Validate that Saldo Awal + Penjualan - Pembayaran = Saldo Akhir
- Cross-reference totals between detail and summary reports
- Maintain consistency across all sheets

## 8. References

- Standar Akuntansi Keuangan Indonesia (SAK) 2025
- Indonesian Institute of Accountants (IAI) guidelines
- Law No. 10 of 2020 on Stamp Duty
- Indonesian business reporting best practices
- PSAK (Pernyataan Standar Akuntansi Keuangan) standards

---

*This document serves as the authoritative guide for implementing Indonesian-compliant financial reporting in the Monomi Invoice Generator system.*