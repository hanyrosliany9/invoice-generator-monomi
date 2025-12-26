# BAGAN AKUNTANSI (Chart of Accounts)
## Alur Transaksi dari Awal hingga Pelaporan Keuangan

**Document Status:** ✅ Comprehensive Guide
**Last Updated:** October 26, 2025
**Language:** Bahasa Indonesia / Indonesian

---

## 📋 DAFTAR ISI

1. [Standar Akuntansi & Compliance](#standar-akuntansi--compliance)
2. [Bagan Akun Lengkap](#bagan-akun-lengkap)
3. [Siklus Akuntansi Lengkap](#siklus-akuntansi-lengkap)
4. [Alur Transaksi Penjualan](#alur-transaksi-penjualan)
5. [Alur Transaksi Pembelian](#alur-transaksi-pembelian)
6. [Alur Kas & Bank](#alur-kas--bank)
7. [Laporan Keuangan](#laporan-keuangan)
8. [Penutupan Periode & Closing](#penutupan-periode--closing)

---

## STANDAR AKUNTANSI & COMPLIANCE

### Standar yang Diterapkan

| Standar | Deskripsi | Status |
|---------|-----------|--------|
| **PSAK 72** | Pengakuan Pendapatan dari Kontrak dengan Pelanggan | ✅ Implemented |
| **PSAK 71** | Instrumen Keuangan - Provisi Piutang Tidak Tertagih (ECL) | ✅ Implemented |
| **PSAK 16** | Aset Tetap - Penyusutan & Amortisasi | ✅ Implemented |
| **PSAK 57** | Akuntansi Kontrak Konstruksi | ✅ Implemented |
| **Standar Pajak Indonesia** | PPN, PPh, Materai | ✅ Implemented |

### Prinsip Double-Entry Bookkeeping

Setiap transaksi menciptakan **minimal 2 jurnal entry**:
- **Debit** = Akun yang menerima/mengalami peningkatan
- **Credit** = Akun yang memberikan/mengalami penurunan
- **Total Debit = Total Credit** (harus selalu seimbang)

---

## BAGAN AKUN LENGKAP

### Level 1: Kelompok Akun Utama (5000-9999 = Kontrol)

```
BAGAN AKUN MONOMI SYSTEM
════════════════════════════════════════════════════════════════

1-XXXX  ASET (ASSET)
        ↓ Sumber daya yang dimiliki perusahaan

2-XXXX  KEWAJIBAN (LIABILITY)
        ↓ Hutang perusahaan

3-XXXX  EKUITAS (EQUITY)
        ↓ Hak pemilik

4-XXXX  PENDAPATAN (REVENUE)
        ↓ Penghasilan dari usaha

5-XXXX  HARGA POKOK PENJUALAN (COGS)
        ↓ Biaya langsung produk terjual

6-XXXX  BEBAN OPERASIONAL (OPERATING EXPENSES)
        ↓ Biaya menjalankan operasi

8-XXXX  PENDAPATAN/BEBAN LAIN-LAIN (OTHER INCOME/EXPENSES)
        ↓ Transaksi di luar operasi utama
```

---

### DETAIL BAGAN AKUN PER KELOMPOK

#### **KELOMPOK 1: ASET (ASET)**

```
1-XXXX  ASET
├─ 1-1000  ASET LANCAR (Current Assets)
│  ├─ 1-1010  Kas (Cash on Hand)
│  │          Saldo: Uang tunai di kasir/tangan
│  │
│  ├─ 1-1020  Rekening Bank (Bank Account - IDR)
│  │          Saldo: Dana di rekening bank rupiah
│  │
│  ├─ 1-1030  Rekening Bank USD
│  │          Saldo: Dana di rekening bank dolar
│  │
│  ├─ 1-1040  Rekening Bank (Multi-Currency)
│  │          Saldo: Dana di rekening bank lainnya
│  │
│  ├─ 1-2000  PIUTANG (Receivables)
│  │  ├─ 1-2010  Piutang Usaha (Accounts Receivable)
│  │  │          Saldo: Tagihan ke klien atas invoice
│  │  │          Debit: saat invoice dikirim
│  │  │          Credit: saat pembayaran diterima
│  │  │
│  │  ├─ 1-2020  Piutang Lain-Lain (Other Receivables)
│  │  │          Saldo: Tagihan non-operasional
│  │  │
│  │  └─ 1-2030  Cadangan Piutang Tidak Tertagih (ECL)
│  │             Saldo: Offset dari 1-2010 (contra-asset)
│  │
│  ├─ 1-3000  PERSEDIAAN (Inventory)
│  │  ├─ 1-3010  Persediaan Barang Dagang
│  │  │          Saldo: Stok barang untuk dijual
│  │  │
│  │  └─ 1-3020  Persediaan Supplies
│  │             Saldo: Stok perlengkapan kantor
│  │
│  └─ 1-4000  ASET LANCAR LAINNYA (Other Current Assets)
│     └─ 1-4010  Beban Dibayar Dimuka (Prepaid Expenses)
│                Saldo: Pembayaran di muka (asuransi, sewa, dll)
│
└─ 1-5000  ASET TETAP (Fixed Assets)
   ├─ 1-5010  Peralatan Kantor (Office Equipment)
   │          Saldo: Nilai buku equipment (harga perolehan)
   │
   ├─ 1-5020  Furniture & Fixtures
   │          Saldo: Nilai buku furniture
   │
   ├─ 1-5030  Kendaraan (Vehicles)
   │          Saldo: Nilai buku kendaraan
   │
   ├─ 1-5040  Bangunan (Building)
   │          Saldo: Nilai buku bangunan
   │
   ├─ 1-5050  Tanah (Land)
   │          Saldo: Nilai tanah (tidak didepresiasi)
   │
   └─ 1-6000  AKUMULASI PENYUSUTAN (Accumulated Depreciation)
      ├─ 1-6010  Akum. Penyusutan - Equipment
      │          Saldo: Penyusutan kumulatif (credit/offset)
      │
      ├─ 1-6020  Akum. Penyusutan - Furniture
      │          Saldo: Penyusutan kumulatif
      │
      ├─ 1-6030  Akum. Penyusutan - Kendaraan
      │          Saldo: Penyusutan kumulatif
      │
      └─ 1-6040  Akum. Penyusutan - Bangunan
                 Saldo: Penyusutan kumulatif
```

---

#### **KELOMPOK 2: KEWAJIBAN (LIABILITY)**

```
2-XXXX  KEWAJIBAN
├─ 2-1000  KEWAJIBAN JANGKA PENDEK (Current Liabilities)
│  ├─ 2-1010  Hutang Usaha (Accounts Payable)
│  │          Saldo: Hutang ke supplier atas pembelian
│  │          Debit: saat pembayaran
│  │          Credit: saat expense diterima dari vendor
│  │
│  ├─ 2-1020  Hutang Gaji & Upah (Salaries Payable)
│  │          Saldo: Gaji karyawan yang belum dibayar
│  │
│  ├─ 2-1030  Hutang Bunga (Interest Payable)
│  │          Saldo: Bunga yang masih harus dibayar
│  │
│  └─ 2-1040  Hutang Lancar Lainnya (Other Current Liabilities)
│             Saldo: Hutang jangka pendek lainnya
│
├─ 2-2000  HUTANG PAJAK (Tax Liabilities)
│  ├─ 2-2010  PPN Keluaran (PPN Payable)
│  │          Saldo: PPN atas penjualan yang harus disetor
│  │          Debit: saat pembayaran pajak
│  │          Credit: saat mencatat PPN atas invoice penjualan
│  │
│  ├─ 2-2020  PPN Masukan (PPN Input)
│  │          Saldo: PPN atas pembelian (offset untuk PPN Output)
│  │
│  ├─ 2-2030  PPh 23 Payable (Withholding Tax)
│  │          Saldo: PPh yang dipotong dari supplier
│  │
│  └─ 2-2040  PPh 21 Payable (Income Tax - Employees)
│             Saldo: PPh atas gaji karyawan
│
├─ 2-3000  PENDAPATAN DITERIMA DIMUKA (Deferred Revenue)
│  └─ 2-3010  Pendapatan Diterima Dimuka
│             Saldo: Uang dari klien untuk pekerjaan belum selesai
│             Debit: saat pengakuan pendapatan
│             Credit: saat uang diterima
│
└─ 2-4000  KEWAJIBAN JANGKA PANJANG (Long-term Liabilities)
   ├─ 2-4010  Hutang Bank Jangka Panjang
   │          Saldo: Pinjaman dengan jatuh tempo > 12 bulan
   │
   └─ 2-4020  Kewajiban Sewa (Lease Obligation)
              Saldo: Kewajiban sewa jangka panjang
```

---

#### **KELOMPOK 3: EKUITAS (EQUITY)**

```
3-XXXX  EKUITAS
├─ 3-1000  MODAL (Owner's Capital)
│  ├─ 3-1010  Modal Pemilik (Owner's Capital Account)
│  │          Saldo: Investasi awal pemilik
│  │          Credit: saat pemilik menginvestasikan uang
│  │          Debit: saat pemilik mengambil uang
│  │
│  ├─ 3-1020  Kontribusi Tambahan (Additional Capital Contribution)
│  │          Saldo: Investasi tambahan selama tahun berjalan
│  │
│  └─ 3-1030  Pengambilan Pribadi (Owner's Drawings)
│             Saldo: Uang/aset yang diambil pemilik untuk pribadi
│             Debit: mencatat pengambilan
│
├─ 3-2000  LABA DITAHAN (Retained Earnings)
│  ├─ 3-2010  Laba Ditahan - Tahun Sebelumnya
│  │          Saldo: Akumulasi laba dari tahun-tahun sebelumnya
│  │          Credit: saat penutupan tahun lalu
│  │
│  └─ 3-2020  Laba Tahun Berjalan (Current Year Earnings)
│             Saldo: Laba/rugi tahun ini
│             Credit: saat persiapan closing (dari 4-xxxx & 6-xxxx)
```

---

#### **KELOMPOK 4: PENDAPATAN (REVENUE)**

```
4-XXXX  PENDAPATAN (Revenue)
├─ 4-1000  PENDAPATAN USAHA UTAMA (Primary Revenue)
│  ├─ 4-1010  Pendapatan Jasa (Service Revenue)
│  │          Saldo: Revenue dari layanan/jasa yang diberikan
│  │          Credit: saat invoice dikirim (accrual basis)
│  │          Debit: saat revenue direverse/dikoreksi
│  │
│  ├─ 4-1020  Pendapatan Penjualan (Sales Revenue)
│  │          Saldo: Revenue dari penjualan barang
│  │
│  ├─ 4-1030  Pendapatan Konsultasi (Consulting Revenue)
│  │          Saldo: Revenue dari konsultasi
│  │
│  └─ 4-1040  Pendapatan Lainnya (Other Operating Revenue)
│             Saldo: Revenue lainnya dari operasi utama
│
└─ 4-9000  POTONGAN & RETUR (Sales Discounts & Returns)
   ├─ 4-9010  Diskon Penjualan (Sales Discount)
   │          Saldo: Potongan harga untuk pelanggan
   │          Debit: saat diskon diberikan
   │
   └─ 4-9020  Retur Penjualan (Sales Return)
              Saldo: Barang/jasa yang dikembalikan pelanggan
              Debit: saat ada retur
```

---

#### **KELOMPOK 5: HARGA POKOK PENJUALAN (COGS)**

```
5-XXXX  HARGA POKOK PENJUALAN / BEBAN LANGSUNG
├─ 5-1010  Beban Bahan Baku (Raw Materials Expense)
│          Saldo: Biaya bahan untuk produk yang dijual
│          Debit: saat bahan digunakan
│
├─ 5-1020  Beban Tenaga Kerja Langsung (Direct Labor)
│          Saldo: Gaji tenaga kerja produksi
│          Debit: saat gaji dibayar/dicatat
│
├─ 5-1030  Beban Overhead Pabrik (Manufacturing Overhead)
│          Saldo: Biaya tidak langsung produksi
│
├─ 5-1040  Pengiriman & Logistik (Shipping & Logistics)
│          Saldo: Biaya pengiriman ke klien
│
└─ 5-1050  Biaya Subkontrak (Subcontracting Cost)
           Saldo: Biaya bekerja sama dengan vendor/kontraktor
```

---

#### **KELOMPOK 6: BEBAN OPERASIONAL (OPERATING EXPENSES)**

```
6-XXXX  BEBAN OPERASIONAL

├─ 6-1000  BEBAN GAJI & TUNJANGAN (Salaries & Benefits)
│  ├─ 6-1010  Gaji Pokok Karyawan (Base Salary)
│  │          Debit: setiap penggajian
│  │
│  ├─ 6-1020  Tunjangan Kesehatan (Health Benefits)
│  │          Debit: saat premi asuransi dibayar
│  │
│  ├─ 6-1030  Tunjangan Lainnya (Other Benefits)
│  │          Debit: bonus, insentif, dsb
│  │
│  └─ 6-1040  Beban Tenaga Kerja Lainnya (Other Labor)
│             Debit: outsourcing, training, dsb
│
├─ 6-2000  BEBAN OPERASIONAL KANTOR (Office Operation)
│  ├─ 6-2010  Sewa Kantor & Lokasi (Office Rent)
│  │          Debit: saat sewa dibayar/dicatat
│  │
│  ├─ 6-2020  Listrik, Air, & Gas (Utilities)
│  │          Debit: saat tagihan dibayar
│  │
│  ├─ 6-2030  Telepon & Internet (Communication)
│  │          Debit: saat tagihan telpon/internet dibayar
│  │
│  ├─ 6-2040  Pemeliharaan & Perbaikan (Maintenance & Repair)
│  │          Debit: saat ada perbaikan/maintenance
│  │
│  ├─ 6-2050  Asuransi (Insurance)
│  │          Debit: saat premi dibayar
│  │
│  └─ 6-2060  Kebersihan & Keamanan (Cleaning & Security)
│             Debit: saat dibayar ke penyedia jasa
│
├─ 6-3000  PENYUSUTAN & AMORTISASI (Depreciation & Amortization)
│  ├─ 6-3010  Penyusutan - Peralatan Kantor
│  │          Credit: 1-6010 (Accumulated Depreciation)
│  │          Debit: setiap periode (auto-calculated)
│  │
│  ├─ 6-3020  Penyusutan - Furniture & Fixtures
│  │          Credit: 1-6020
│  │
│  ├─ 6-3030  Penyusutan - Kendaraan
│  │          Credit: 1-6030
│  │
│  └─ 6-3040  Penyusutan - Bangunan
│             Credit: 1-6040
│
├─ 6-4000  BEBAN PEMASARAN & PENJUALAN (Marketing & Sales)
│  ├─ 6-4010  Iklan & Promosi (Advertising)
│  │          Debit: biaya iklan di media
│  │
│  ├─ 6-4020  Sponsorship & Event
│  │          Debit: biaya event/sponsorship
│  │
│  ├─ 6-4030  Komisi Penjualan (Sales Commission)
│  │          Debit: komisi untuk tim penjualan
│  │
│  └─ 6-4040  Presentasi & Proposal
│             Debit: biaya proposal ke prospek
│
├─ 6-5000  BEBAN ADMINISTRASI UMUM (General & Administrative)
│  ├─ 6-5010  Biaya Kantor & Supplies (Office Supplies)
│  │          Debit: alat tulis, kertas, tinta, dsb
│  │
│  ├─ 6-5020  Biaya Konsultan & Profesional (Professional Services)
│  │          Debit: honorarium akuntan, lawyer, consultant
│  │
│  ├─ 6-5030  Biaya Perizinan & Compliance (Licenses & Permits)
│  │          Debit: biaya perpanjangan NPWP, izin usaha, dsb
│  │
│  ├─ 6-5040  Biaya Perjalanan Dinas (Business Travel)
│  │          Debit: tiket, hotel, transport
│  │
│  ├─ 6-5050  Entertaint & Meals (Entertainment & Meals)
│  │          Debit: makan client, pertemuan bisnis
│  │
│  ├─ 6-5060  Biaya Bank & Service Charge
│  │          Debit: biaya administrasi bank, transfer fee
│  │
│  └─ 6-5070  Biaya Umum Lainnya (Miscellaneous Expenses)
│             Debit: pengeluaran tidak tergolong di atas
│
├─ 6-6000  BEBAN PENELITIAN & PENGEMBANGAN (R&D)
│  └─ 6-6010  Biaya Penelitian & Pengembangan
│             Debit: biaya develop produk/layanan baru
│
└─ 6-7000  BEBAN PAJAK & DENDA (Taxes & Penalties)
   ├─ 6-7010  Pajak Kendaraan (Vehicle Tax)
   │          Debit: saat membayar pajak kendaraan
   │
   ├─ 6-7020  Pajak Properti (Property Tax)
   │          Debit: saat membayar PBB
   │
   └─ 6-7030  Denda & Sangsi (Fines & Penalties)
              Debit: denda pajak atau denda lainnya
```

---

#### **KELOMPOK 8: PENDAPATAN/BEBAN LAIN-LAIN (OTHER INCOME/EXPENSES)**

```
8-XXXX  PENDAPATAN & BEBAN LAIN-LAIN

├─ 8-1000  PENDAPATAN LAIN-LAIN (Other Income)
│  ├─ 8-1010  Bunga Bank (Bank Interest)
│  │          Credit: saat terima bunga dari bank
│  │
│  ├─ 8-1020  Dividen (Dividend Income)
│  │          Credit: saat terima dividen investasi
│  │
│  ├─ 8-1030  Keuntungan Penjualan Aset (Gain on Sale)
│  │          Credit: saat jual aset dengan untung
│  │
│  ├─ 8-1040  Pengembalian Kas Semula (Refund Received)
│  │          Credit: saat dapat pengembalian dari supplier
│  │
│  └─ 8-1050  Pendapatan Lain-Lain (Miscellaneous Income)
│             Credit: pendapatan tidak tergolong di atas
│
└─ 8-2000  BEBAN LAIN-LAIN (Other Expenses)
   ├─ 8-2010  Beban Bunga (Interest Expense)
   │          Debit: saat bayar bunga hutang
   │
   ├─ 8-2020  Kerugian Penjualan Aset (Loss on Sale)
   │          Debit: saat jual aset dengan rugi
   │
   ├─ 8-2030  Donasi & CSR (Donation & CSR)
   │          Debit: saat memberikan donasi
   │
   ├─ 8-2040  Beban Kerugian Piutang (Bad Debt Expense)
   │          Debit: saat write-off piutang
   │
   ├─ 8-2050  Selisih Kurs (Exchange Rate Difference)
   │          Debit/Credit: saat ada kurs yang berubah
   │
   └─ 8-2060  Beban Lain-Lain (Miscellaneous Expenses)
              Debit: pengeluaran tidak tergolong di atas
```

---

## SIKLUS AKUNTANSI LENGKAP

```
SIKLUS AKUNTANSI BULANAN
════════════════════════════════════════════════════════════════

        AWAL BULAN
            ↓
    ┌───────────────────────────────────────┐
    │  1. PENCATATAN TRANSAKSI SEHARI-HARI  │ ← Proses Berlangsung
    │     ├─ Invoice Masuk/Keluar            │   Selama 30 hari
    │     ├─ Pembayaran Kas/Bank             │
    │     └─ Pengeluaran Operasional         │
    └───────────────────────────────────────┘
            ↓
        AKHIR BULAN
            ↓
    ┌───────────────────────────────────────┐
    │  2. PENYIAPAN JURNAL PENYESUAIAN       │
    │     ├─ Beban Dicatat Dimuka            │
    │     ├─ Pendapatan Diterima Dimuka      │
    │     ├─ Penyusutan Aset                 │
    │     ├─ Provisi Piutang Tidak Tertagih  │
    │     └─ Akrual Beban Belum Dibayar      │
    └───────────────────────────────────────┘
            ↓
    ┌───────────────────────────────────────┐
    │  3. POSTING KE BUKU BESAR (LEDGER)    │
    │     └─ Setiap jurnal di-post ke akun  │
    │        yang sesuai dengan double-entry │
    └───────────────────────────────────────┘
            ↓
    ┌───────────────────────────────────────┐
    │  4. PEMBUATAN NERACA SALDO (TB)       │
    │     ├─ List semua akun                 │
    │     ├─ Saldo Debit & Credit            │
    │     └─ Validasi Total DR = CR          │
    └───────────────────────────────────────┘
            ↓
        Seimbang? → TIDAK → Cek Error
            │                    ↓
            YES         (Re-verify Entries)
            ↓                    ↓
    ┌───────────────────────────────────────┐
    │  5. PEMBUATAN LAPORAN KEUANGAN        │
    │     ├─ Laporan Laba Rugi               │
    │     ├─ Neraca                          │
    │     ├─ Laporan Arus Kas                │
    │     └─ Catatan Laporan Keuangan        │
    └───────────────────────────────────────┘
            ↓
    ┌───────────────────────────────────────┐
    │  6. PENUTUPAN JURNAL (CLOSING)        │
    │     ├─ Close Revenue Accounts (4-xx)   │
    │     ├─ Close Expense Accounts (6-xx)   │
    │     └─ Close ke Retained Earnings      │
    └───────────────────────────────────────┘
            ↓
    ┌───────────────────────────────────────┐
    │  7. REKONSILIASI BANK                  │
    │     ├─ Bandingkan Laporan Bank         │
    │     ├─ Match dengan Transaksi          │
    │     └─ Catat Penyesuaian Jika Ada      │
    └───────────────────────────────────────┘
            ↓
    ┌───────────────────────────────────────┐
    │  8. PENUTUPAN PERIODE FISKAL           │
    │     ├─ Lock semua transaksi           │
    │     ├─ Prevent new entries            │
    │     └─ Archive Laporan                │
    └───────────────────────────────────────┘
            ↓
        LAPORAN FINAL SELESAI
        Siap untuk Analysis & Reporting
```

---

## ALUR TRANSAKSI PENJUALAN

### Skenario: Klien Memesan Jasa Konsultasi

#### **TAHAP 1: Penawaran (Quotation)**
```
Klien minta penawaran jasa konsultasi seharga Rp 10.000.000

Action:
├─ Buat Quotation di sistem
├─ Status: DRAFT
├─ Tidak ada jurnal entry dibuat
└─ Hanya dokumentasi proses bisnis
```

#### **TAHAP 2: Invoice Dikirim (Pengakuan Pendapatan)**

**PSAK 72 - Pengakuan Pendapatan Accrual Basis**

```
Ketika Invoice #INV-2025-10-001 dikirim ke klien:
Tanggal: 10 Oktober 2025
Jumlah: Rp 10.000.000

SISTEM OTOMATIS MEMBUAT JURNAL ENTRY:

Entry #: JE-2025-10-0001
Tanggal: 10 Oktober 2025
Deskripsi: Invoice Sent - Konsultasi

┌─────────────────────────────────────────────┐
│ LINE 1:                                      │
│   Akun: 1-2010 (Piutang Usaha)              │
│   Debit: Rp 10.000.000                       │
│   Penjelasan: Tagihan kepada klien          │
│                                              │
│ LINE 2:                                      │
│   Akun: 4-1030 (Pendapatan Konsultasi)      │
│   Credit: Rp 10.000.000                      │
│   Penjelasan: Pendapatan diakui             │
└─────────────────────────────────────────────┘

TOTAL DEBIT  = Rp 10.000.000  ✓
TOTAL CREDIT = Rp 10.000.000  ✓  (BALANCED!)

ACTION: Post to General Ledger

BUKU BESAR (General Ledger) SETELAH POSTING:

Akun 1-2010 (Piutang Usaha):
  10 Okt  Debit   Rp 10.000.000    Balance: Rp 10.000.000

Akun 4-1030 (Pendapatan Konsultasi):
  10 Okt  Credit  Rp 10.000.000    Balance: (Rp 10.000.000)
```

#### **TAHAP 3: Pembayaran Diterima (Cash Receipt)**

```
Tanggal 25 Oktober 2025, Klien transfer Rp 10.000.000

SISTEM OTOMATIS MEMBUAT JURNAL ENTRY KEDUA:

Entry #: JE-2025-10-0002
Tanggal: 25 Oktober 2025
Deskripsi: Invoice Paid

┌─────────────────────────────────────────────┐
│ LINE 1:                                      │
│   Akun: 1-1020 (Bank)                       │
│   Debit: Rp 10.000.000                       │
│   Penjelasan: Uang masuk ke bank            │
│                                              │
│ LINE 2:                                      │
│   Akun: 1-2010 (Piutang Usaha)              │
│   Credit: Rp 10.000.000                      │
│   Penjelasan: Piutang dilunasi              │
└─────────────────────────────────────────────┘

ACTION: Post to General Ledger

BUKU BESAR SETELAH POSTING:

Akun 1-1020 (Bank):
  25 Okt  Debit   Rp 10.000.000    Balance: Rp 10.000.000

Akun 1-2010 (Piutang Usaha):
  10 Okt  Debit   Rp 10.000.000    Balance: Rp 10.000.000
  25 Okt  Credit  Rp 10.000.000    Balance: Rp 0  (LUNAS!)

Akun 4-1030 (Pendapatan Konsultasi):
  10 Okt  Credit  Rp 10.000.000    Balance: (Rp 10.000.000)
```

#### **TAHAP 4: Neraca Saldo (Trial Balance)**

```
Tanggal 31 Oktober 2025

Akun                        Debit          Credit
─────────────────────────────────────────────────
1-1020  Bank               Rp 10.000.000
1-2010  Piutang Usaha      Rp 0
4-1030  Pendapatan Konsul.              Rp 10.000.000
─────────────────────────────────────────────────
TOTAL                      Rp 10.000.000  Rp 10.000.000

STATUS: ✓ SEIMBANG (Debit = Credit)
```

#### **TAHAP 5: Laporan Laba Rugi**

```
LAPORAN LABA RUGI
Periode: 1-31 Oktober 2025

Pendapatan:
  Pendapatan Konsultasi      Rp 10.000.000
────────────────────────────────────────
TOTAL PENDAPATAN             Rp 10.000.000

Beban:
  (Tidak ada beban)                    Rp 0
────────────────────────────────────────
TOTAL BEBAN                                 Rp 0
────────────────────────────────────────
LABA BERSIH                  Rp 10.000.000
====================================
```

---

## ALUR TRANSAKSI PEMBELIAN

### Skenario: Beli Supplies Kantor

#### **TAHAP 1: Pembelian (Purchase Order)**
```
Tanggal: 5 Oktober 2025
Beli alat tulis ke supplier seharga Rp 2.000.000
Status PO: DRAFT (tidak ada jurnal)
```

#### **TAHAP 2: Barang Diterima (Goods Receipt)**
```
Tanggal: 8 Oktober 2025
Barang sampai dan diterima di gudang
Status PO: RECEIVED

JURNAL ENTRY DIBUAT (saat barang diterima):

Entry #: JE-2025-10-0003
Deskripsi: Barang Diterima - Alat Tulis

┌─────────────────────────────────────────────┐
│ LINE 1:                                      │
│   Akun: 6-5010 (Supplies)                   │
│   Debit: Rp 2.000.000                        │
│   Penjelasan: Alat tulis diterima           │
│                                              │
│ LINE 2:                                      │
│   Akun: 2-1010 (Hutang Usaha)              │
│   Credit: Rp 2.000.000                       │
│   Penjelasan: Hutang ke supplier            │
└─────────────────────────────────────────────┘

BUKU BESAR:

Akun 6-5010 (Supplies):
  8 Okt  Debit   Rp 2.000.000    Balance: Rp 2.000.000

Akun 2-1010 (Hutang Usaha):
  8 Okt  Credit  Rp 2.000.000    Balance: (Rp 2.000.000)
```

#### **TAHAP 3: Invoice Vendor Diterima**
```
Tanggal: 10 Oktober 2025
Invoice dari supplier diterima
Status: APPROVED

(Jurnal sudah dibuat saat barang diterima - tidak ada jurnal baru)
```

#### **TAHAP 4: Pembayaran ke Supplier**
```
Tanggal: 20 Oktober 2025
Pembayaran Rp 2.000.000 via transfer bank

Entry #: JE-2025-10-0004
Deskripsi: Pembayaran Hutang Usaha

┌─────────────────────────────────────────────┐
│ LINE 1:                                      │
│   Akun: 2-1010 (Hutang Usaha)              │
│   Debit: Rp 2.000.000                        │
│   Penjelasan: Melunasi hutang               │
│                                              │
│ LINE 2:                                      │
│   Akun: 1-1020 (Bank)                       │
│   Credit: Rp 2.000.000                       │
│   Penjelasan: Uang keluar dari bank         │
└─────────────────────────────────────────────┘

BUKU BESAR FINAL:

Akun 6-5010 (Supplies):
  8 Okt  Debit   Rp 2.000.000    Balance: Rp 2.000.000

Akun 2-1010 (Hutang Usaha):
  8 Okt   Credit  Rp 2.000.000   Balance: (Rp 2.000.000)
  20 Okt  Debit   Rp 2.000.000   Balance: Rp 0

Akun 1-1020 (Bank):
  25 Okt (dari invoice)  Debit   Rp 10.000.000
  20 Okt (ke supplier)   Credit  Rp 2.000.000
  Balance: Rp 8.000.000
```

#### **TAHAP 5: Laporan Laba Rugi (Updated)**

```
LAPORAN LABA RUGI (UPDATED)
Periode: 1-31 Oktober 2025

Pendapatan:
  Pendapatan Konsultasi      Rp 10.000.000
────────────────────────────────────────
TOTAL PENDAPATAN             Rp 10.000.000

Beban:
  Supplies Kantor            Rp 2.000.000
────────────────────────────────────────
TOTAL BEBAN                              Rp 2.000.000
────────────────────────────────────────
LABA BERSIH                  Rp 8.000.000
```

---

## ALUR KAS & BANK

### Skenario: Kas Keluar untuk Gaji Karyawan

#### **TAHAP 1: Penggajian Bulanan**
```
Tanggal: 30 Oktober 2025
Gaji karyawan bulan Oktober:
  - Gaji pokok: Rp 5.000.000
  - Tunjangan: Rp 1.000.000
  - Total: Rp 6.000.000

Pembayaran dari Bank

Entry #: JE-2025-10-0005

┌─────────────────────────────────────────────┐
│ LINE 1:                                      │
│   Akun: 6-1010 (Gaji Pokok)                 │
│   Debit: Rp 5.000.000                        │
│                                              │
│ LINE 2:                                      │
│   Akun: 6-1020 (Tunjangan)                  │
│   Debit: Rp 1.000.000                        │
│                                              │
│ LINE 3:                                      │
│   Akun: 1-1020 (Bank)                       │
│   Credit: Rp 6.000.000                       │
└─────────────────────────────────────────────┘

BUKU BESAR:

Akun 6-1010 (Gaji Pokok):
  30 Okt  Debit   Rp 5.000.000    Balance: Rp 5.000.000

Akun 6-1020 (Tunjangan):
  30 Okt  Debit   Rp 1.000.000    Balance: Rp 1.000.000

Akun 1-1020 (Bank):
  25 Okt  Debit   Rp 10.000.000   (invoice paid)
  20 Okt  Credit  Rp 2.000.000    (hutang dibayar)
  30 Okt  Credit  Rp 6.000.000    (gaji dibayar)
  Balance: Rp 2.000.000
```

### Skenario: Penerimaan Kas (Cash Receipt) Manual

```
Tanggal: 15 Oktober 2025
Klien lain memberikan tunai Rp 5.000.000 (belum ada invoice)

ACTION: Buat Cash Receipt Manual

Entry #: JE-2025-10-0006
Deskripsi: Penerimaan Kas Tunai

┌─────────────────────────────────────────────┐
│ LINE 1:                                      │
│   Akun: 1-1010 (Kas Tunai)                  │
│   Debit: Rp 5.000.000                        │
│   Penjelasan: Kas masuk                     │
│                                              │
│ LINE 2:                                      │
│   Akun: 4-1010 (Pendapatan Jasa)            │
│   Credit: Rp 5.000.000                       │
│   Penjelasan: Pendapatan tunai              │
└─────────────────────────────────────────────┘

BUKU BESAR:

Akun 1-1010 (Kas):
  15 Okt  Debit   Rp 5.000.000    Balance: Rp 5.000.000

Akun 4-1010 (Pendapatan Jasa):
  15 Okt  Credit  Rp 5.000.000    Balance: (Rp 5.000.000)
```

---

## LAPORAN KEUANGAN

### A. NERACA (BALANCE SHEET)

```
PT MONOMI SYSTEM
NERACA (BALANCE SHEET)
Per 31 Oktober 2025

ASET
════════════════════════════════════════════════════════════

ASET LANCAR (Current Assets)

Kas & Bank:
  1-1010  Kas Tunai                      Rp 5.000.000
  1-1020  Bank                           Rp 2.000.000
                                                                Rp 7.000.000

Piutang Usaha:
  1-2010  Piutang Usaha                  Rp 0
                                                                Rp 0

Total Aset Lancar                                             Rp 7.000.000

ASET TETAP (Fixed Assets)

Peralatan:
  1-5010  Peralatan Kantor               Rp 50.000.000
  1-6010  Akum. Penyusutan - Peralatan  (Rp 5.000.000)
  Net Peralatan                                              Rp 45.000.000

Total Aset Tetap                                            Rp 45.000.000

TOTAL ASET                                                 Rp 52.000.000

════════════════════════════════════════════════════════════

KEWAJIBAN (LIABILITIES)

Hutang Usaha:
  2-1010  Hutang Usaha                  Rp 0

Hutang Pajak:
  2-2010  PPN Payable                   Rp 1.100.000

Total Kewajiban Lancar                                      Rp 1.100.000

TOTAL KEWAJIBAN                                            Rp 1.100.000

════════════════════════════════════════════════════════════

EKUITAS (EQUITY)

Modal:
  3-1010  Modal Pemilik                 Rp 40.000.000

Laba Tahun Berjalan:
  3-2020  Laba 2025                     Rp 10.900.000
                                        (15.000 revenue - 4.100 expenses)

Total Ekuitas                                              Rp 50.900.000

════════════════════════════════════════════════════════════

TOTAL KEWAJIBAN + EKUITAS                                 Rp 52.000.000

════════════════════════════════════════════════════════════

VALIDASI:
  Total Aset    = Rp 52.000.000  ✓
  Liab + Equity = Rp 52.000.000  ✓
  STATUS: BALANCED ✓
```

### B. LAPORAN LABA RUGI (INCOME STATEMENT)

```
PT MONOMI SYSTEM
LAPORAN LABA RUGI (INCOME STATEMENT)
Periode: 1-31 Oktober 2025

PENDAPATAN (REVENUE)
════════════════════════════════════════════════════════════

4-1010  Pendapatan Jasa (Tunai)              Rp 5.000.000
4-1030  Pendapatan Konsultasi (Kredit)       Rp 10.000.000
4-9010  Diskon Penjualan                     (Rp 0)
────────────────────────────────────────────────────────────
TOTAL PENDAPATAN                             Rp 15.000.000

════════════════════════════════════════════════════════════

BEBAN OPERASIONAL (OPERATING EXPENSES)

Beban Gaji & Tunjangan:
  6-1010  Gaji Pokok                    Rp 5.000.000
  6-1020  Tunjangan                     Rp 1.000.000
  Subtotal Gaji                                             Rp 6.000.000

Beban Kantor:
  6-5010  Supplies Kantor               Rp 2.000.000
  6-2020  Listrik & Air                 Rp 500.000
  Subtotal Kantor                                           Rp 2.500.000

Penyusutan:
  6-3010  Penyusutan - Peralatan        Rp 500.000
  Subtotal Penyusutan                                       Rp 500.000

────────────────────────────────────────────────────────────
TOTAL BEBAN OPERASIONAL                    Rp 9.000.000

════════════════════════════════════════════════════════════

LABA OPERASIONAL                            Rp 6.000.000

Beban Lain-Lain:
  8-2010  Beban Bunga                   (Rp 100.000)

Pendapatan Lain-Lain:
  8-1010  Bunga Bank                    Rp 0

────────────────────────────────────────────────────────────

LABA BERSIH (NET INCOME)                   Rp 5.900.000

════════════════════════════════════════════════════════════
```

### C. LAPORAN ARUS KAS (CASH FLOW STATEMENT)

```
PT MONOMI SYSTEM
LAPORAN ARUS KAS (CASH FLOW STATEMENT)
Periode: 1-31 Oktober 2025

ARUS KAS DARI OPERASIONAL
════════════════════════════════════════════════════════════

Net Income (Laba Bersih)                   Rp 5.900.000

Adjustment:
  + Penyusutan - Peralatan                Rp 500.000
  - (Increase) Piutang Usaha              (Rp 10.000.000)
  - (Increase) Supplies                   (Rp 2.000.000)
  + Hutang Usaha                          Rp 0

Net Cash from Operations                  (Rp 5.600.000)

════════════════════════════════════════════════════════════

ARUS KAS DARI INVESTASI

Purchase of Equipment                     (Rp 0)

Net Cash from Investments                 Rp 0

════════════════════════════════════════════════════════════

ARUS KAS DARI PENDANAAN

Owner's Capital Contribution               Rp 40.000.000
Owner's Drawings                           (Rp 0)

Net Cash from Financing                   Rp 40.000.000

════════════════════════════════════════════════════════════

NET CHANGE IN CASH

Beginning Cash Balance (1 Oct)             Rp 0
Change in Cash (operations)                (Rp 5.600.000)
Change in Cash (investments)               Rp 0
Change in Cash (financing)                 Rp 40.000.000
Ending Cash Balance (31 Oct)               Rp 34.400.000

VALIDASI:
  Cash (1-1010) + Bank (1-1020) = Rp 5.000.000 + Rp 2.000.000
                                 = Rp 7.000.000
  (Note: Remaining dari capital masih tersimpan atau dialokasikan)
```

---

## PENUTUPAN PERIODE & CLOSING

### TAHAP 1: PERSIAPAN PENUTUPAN

```
Tanggal: 31 Oktober 2025, akhir bulan

Checklist Penutupan:
  ✓ Semua transaksi bulan ini sudah tercatat
  ✓ Bank reconciliation sudah selesai
  ✓ Jurnal penyesuaian sudah dibuat (depresiasi, dll)
  ✓ Neraca saldo sudah seimbang
  ✓ Laporan keuangan sudah dibuat
  ✓ Management review sudah OK
```

### TAHAP 2: JURNAL PENUTUPAN (CLOSING ENTRIES)

```
Menutup semua akun Revenue dan Expense ke Retained Earnings

Entry #: JE-2025-10-9001 (Closing Revenue)
Tanggal: 31 Oktober 2025
Deskripsi: Close Revenue Accounts

┌─────────────────────────────────────────────┐
│ LINE 1: (Semua account revenue)             │
│   Akun: 4-1010 (Pendapatan Jasa)            │
│   Debit: Rp 5.000.000                        │
│                                              │
│   Akun: 4-1030 (Pendapatan Konsultasi)      │
│   Debit: Rp 10.000.000                       │
│                                              │
│ LINE 2:                                      │
│   Akun: 3-2020 (Laba Tahun Berjalan)       │
│   Credit: Rp 15.000.000                      │
└─────────────────────────────────────────────┘

BUKU BESAR SETELAH CLOSING:

4-1010 (Pendapatan Jasa):
  Saldo: Rp 0 (CLOSED)

4-1030 (Pendapatan Konsultasi):
  Saldo: Rp 0 (CLOSED)

3-2020 (Laba Tahun Berjalan):
  Awal Periode    (Rp 0)
  Credit Revenue  (Rp 15.000.000)
  Balance         (Rp 15.000.000)


Entry #: JE-2025-10-9002 (Closing Expenses)
Deskripsi: Close Expense Accounts

┌─────────────────────────────────────────────┐
│ LINE 1:                                      │
│   Akun: 3-2020 (Laba Tahun Berjalan)       │
│   Debit: Rp 9.000.000                        │
│                                              │
│ LINE 2: (Semua account expenses)            │
│   Akun: 6-1010 (Gaji Pokok)                 │
│   Credit: Rp 5.000.000                       │
│                                              │
│   Akun: 6-1020 (Tunjangan)                  │
│   Credit: Rp 1.000.000                       │
│                                              │
│   Akun: 6-5010 (Supplies)                   │
│   Credit: Rp 2.000.000                       │
│                                              │
│   Akun: 6-3010 (Penyusutan)                 │
│   Credit: Rp 500.000                        │
│                                              │
│   Akun: 8-2010 (Beban Bunga)                │
│   Credit: Rp 100.000                        │
└─────────────────────────────────────────────┘

BUKU BESAR SETELAH CLOSING:

6-1010 (Gaji Pokok):
  Saldo: Rp 0 (CLOSED)

6-1020 (Tunjangan):
  Saldo: Rp 0 (CLOSED)

6-5010 (Supplies):
  Saldo: Rp 0 (CLOSED)

6-3010 (Penyusutan):
  Saldo: Rp 0 (CLOSED)

8-2010 (Beban Bunga):
  Saldo: Rp 0 (CLOSED)

3-2020 (Laba Tahun Berjalan):
  Awal Periode        (Rp 0)
  Credit Revenue      (Rp 15.000.000)
  Debit Expenses      (Rp 9.000.000)
  Final Balance       (Rp 6.000.000)
```

### TAHAP 3: NERACA SALDO SETELAH CLOSING

```
PT MONOMI SYSTEM
NERACA SALDO SETELAH PENUTUPAN (POST-CLOSING TRIAL BALANCE)
31 Oktober 2025

Akun                            Debit           Credit
────────────────────────────────────────────────────────

1-1010  Kas                     Rp 5.000.000
1-1020  Bank                    Rp 2.000.000
1-2010  Piutang Usaha           Rp 0
1-5010  Peralatan               Rp 50.000.000
1-6010  Akum. Penyusutan                       (Rp 5.500.000)
2-1010  Hutang Usaha                           Rp 0
2-2010  PPN Payable                            Rp 1.100.000
3-1010  Modal Pemilik                          Rp 40.000.000
3-2020  Laba Tahun Berjalan                    Rp 6.000.000

TOTAL                           Rp 57.000.000   Rp 57.000.000

STATUS: ✓ BALANCED (Semua akun revenue & expense sudah ditutup)
```

### TAHAP 4: PERSIAPAN PERIODE BERIKUTNYA

```
Setelah Closing:

1. Status Periode Fiscal = CLOSED
   ├─ Tidak bisa entry transaksi lagi
   ├─ Semua laporan terkunci
   └─ Hanya untuk read-only

2. Saldo Awal Periode Berikutnya:
   ├─ Kas              = Rp 5.000.000
   ├─ Bank             = Rp 2.000.000
   ├─ Piutang          = Rp 0
   ├─ Equipment (net)  = Rp 45.000.000 (setelah depresiasi)
   ├─ Modal            = Rp 40.000.000
   └─ Retained Earning = Rp 6.000.000 (laba periode ini)

3. Periode November 2025 siap dibuka
   └─ Entry transaksi November dimulai
```

---

## FITUR KHUSUS COMPLIANCE INDONESIA

### PENYUSUTAN ASET (PSAK 16 - DEPRECIATION)

```
Skenario: Equipment senilai Rp 50.000.000 dibeli 1 Oktober 2025
          Useful Life: 10 tahun
          Method: Straight Line

Perhitungan:
  Depreciable Amount = Rp 50.000.000 (asumsi residual = 0)
  Useful Life = 10 tahun = 120 bulan
  Monthly Depreciation = Rp 50.000.000 / 120 = Rp 416.667

Setiap akhir bulan, jurnal otomatis dibuat:

Entry: JE-2025-10-9999
Deskripsi: Monthly Depreciation - Equipment

┌─────────────────────────────────────────────┐
│ LINE 1:                                      │
│   Akun: 6-3010 (Penyusutan - Peralatan)     │
│   Debit: Rp 416.667                          │
│                                              │
│ LINE 2:                                      │
│   Akun: 1-6010 (Akum. Penyusutan)           │
│   Credit: Rp 416.667                         │
└─────────────────────────────────────────────┘

Buku Besar:
  1-5010 Equipment:       Rp 50.000.000 (tidak berubah)
  1-6010 Akum. Penyusutan: (Rp 416.667) setiap bulan

  Book Value Equipment = Rp 50.000.000 - Rp 416.667 = Rp 49.583.333

Setelah 10 tahun, Equipment fully depreciated:
  Book Value = Rp 0
  Kemudian tidak bisa didepreciate lagi
```

### PROVISI PIUTANG TIDAK TERTAGIH (PSAK 71 - ECL)

```
Skenario: 31 Oktober 2025
          Piutang outstanding = Rp 10.000.000 (age 20 hari)
          Estimated Bad Debt Rate = 1% (untuk current)

Perhitungan ECL:
  ECL Amount = Rp 10.000.000 × 1% = Rp 100.000

Jurnal Entry:

Entry: JE-2025-10-9003
Deskripsi: Provision for Doubtful Accounts

┌─────────────────────────────────────────────┐
│ LINE 1:                                      │
│   Akun: 8-2040 (Beban Piutang Tidak Tertagih)│
│   Debit: Rp 100.000                          │
│                                              │
│ LINE 2:                                      │
│   Akun: 1-2030 (Cadangan Piutang)           │
│   Credit: Rp 100.000                        │
└─────────────────────────────────────────────┘

Buku Besar:
  1-2010 Piutang Usaha:       Rp 10.000.000
  1-2030 Cadangan Piutang:    (Rp 100.000) offset

  Net Piutang = Rp 10.000.000 - Rp 100.000 = Rp 9.900.000

Neraca:
  Piutang Usaha      Rp 10.000.000
  Less: Cadangan     (Rp 100.000)
  ─────────────────
  Net AR             Rp 9.900.000

Jika kemudian piutang tidak tertagih:
  Write-off Entry:
  ├─ Debit: 1-2030 (Cadangan) Rp 100.000
  └─ Credit: 1-2010 (Piutang) Rp 100.000
```

### MATERAI STAMP DUTY

```
Skenario: Invoice bernilai Rp 10.000.000

Threshold Materai = Rp 5.000.000
Dokumen > Rp 5.000.000 memerlukan Materai

Status Invoice: REQUIRES_MATERAI

Biaya Materai: Rp 3.000 (untuk dokumen >Rp 5.000.000)

Jurnal Entry (optional, jika dibiayakan ke klien):

Entry: JE-2025-10-XXXX
Deskripsi: Materai Expense

┌─────────────────────────────────────────────┐
│ LINE 1:                                      │
│   Akun: 6-5070 (Biaya Umum Lainnya)         │
│   Debit: Rp 3.000                            │
│                                              │
│ LINE 2:                                      │
│   Akun: 1-1010 (Kas)                        │
│   Credit: Rp 3.000                          │
└─────────────────────────────────────────────┘
```

### PPN (VALUE ADDED TAX)

```
Skenario: Invoice Rp 10.000.000 (termasuk PPN 11%)

Perhitungan:
  Total (inc. PPN) = Rp 10.000.000
  PPN Rate = 11%
  Net Amount = Rp 10.000.000 / 1.11 = Rp 9.009.009
  PPN Amount = Rp 10.000.000 - Rp 9.009.009 = Rp 990.991

Jurnal Entry:

Entry: JE-2025-10-XXXX
Deskripsi: Invoice with PPN

┌─────────────────────────────────────────────┐
│ LINE 1:                                      │
│   Akun: 1-2010 (Piutang Usaha)              │
│   Debit: Rp 10.000.000                       │
│                                              │
│ LINE 2:                                      │
│   Akun: 4-1030 (Pendapatan)                 │
│   Credit: Rp 9.009.009                       │
│                                              │
│ LINE 3:                                      │
│   Akun: 2-2010 (PPN Keluaran)               │
│   Credit: Rp 990.991                        │
└─────────────────────────────────────────────┘

Buku Besar:
  1-2010 Piutang:     Rp 10.000.000
  4-1030 Revenue:     (Rp 9.009.009)
  2-2010 PPN Output:  (Rp 990.991)

Neraca:
  Hutang Pajak (PPN): Rp 990.991
  (ini yang harus disetor ke DJP setiap bulan)
```

---

## RINGKASAN ALUR LENGKAP

```
RINGKASAN ALUR AKUNTANSI - DARI AWAL HINGGA AKHIR
════════════════════════════════════════════════════════════

     TRANSAKSI TERJADI
     │
     ├─ Klien pesan jasa → Quotation (DRAFT)
     ├─ Invoice dikirim → Jurnal (AR & Revenue)
     ├─ Pembayaran terima → Jurnal (Cash & AR)
     ├─ Beli supplies → Jurnal (Expense & AP)
     ├─ Bayar hutang → Jurnal (AP & Cash)
     └─ Gaji dibayar → Jurnal (Expense & Cash)
          ↓
     POSTING KE BUKU BESAR (General Ledger)
     │
     ├─ Account 1-2010 updated
     ├─ Account 4-1030 updated
     ├─ Account 1-1020 updated
     └─ Semua akun terhubung (double-entry)
          ↓
     PEMBUATAN NERACA SALDO (Trial Balance)
     │
     ├─ Debit = Credit? → VALIDASI
     └─ Jika tidak seimbang → Cek error
          ↓
     JURNAL PENYESUAIAN (Adjusting Entries)
     │
     ├─ Depreciation calculated & posted
     ├─ Bad debt provision calculated & posted
     ├─ Accrued expenses recorded
     └─ Deferred revenues updated
          ↓
     PEMBUATAN LAPORAN KEUANGAN (Financial Reports)
     │
     ├─ Income Statement (P&L)
     │  └─ Revenue - Expenses = Net Income
     │
     ├─ Balance Sheet (Neraca)
     │  └─ Assets = Liabilities + Equity
     │
     ├─ Cash Flow Statement
     │  └─ Operating, Investing, Financing
     │
     └─ Trial Balance (Neraca Saldo)
          ↓
     PENUTUPAN JURNAL (Closing Entries)
     │
     ├─ Close Revenue Accounts
     ├─ Close Expense Accounts
     ├─ Close to Retained Earnings
     └─ All P&L accounts → Rp 0
          ↓
     NERACA SALDO AKHIR (Post-Closing TB)
     │
     ├─ Hanya Balance Sheet accounts
     ├─ All P&L accounts closed
     └─ Ready for next period
          ↓
     PENUTUPAN PERIODE (Lock Period)
     │
     ├─ Fiscal Period = CLOSED
     ├─ Prevent new entries
     ├─ Lockdown all reports
     └─ Archive untuk audit trail
          ↓
     PERIODE BERIKUTNYA DIMULAI
     │
     └─ All balances become opening balance
        New transactions recorded
        Cycle repeats
```

---

## QUICK REFERENCE - AKUN YANG SERING DIGUNAKAN

| Kode | Nama Akun | Jenis | Penggunaan |
|------|-----------|-------|-----------|
| 1-1010 | Kas | ASET | Uang tunai di kasir |
| 1-1020 | Bank | ASET | Uang di rekening bank |
| 1-2010 | Piutang Usaha | ASET | Tagihan ke klien |
| 2-1010 | Hutang Usaha | LIABILITY | Hutang ke supplier |
| 2-2010 | PPN Payable | LIABILITY | PPN atas penjualan |
| 3-1010 | Modal | EQUITY | Investasi pemilik |
| 4-1010 | Pendapatan Jasa | REVENUE | Revenue dari jasa |
| 4-1030 | Pendapatan Konsultasi | REVENUE | Revenue dari konsultasi |
| 6-1010 | Gaji Pokok | EXPENSE | Gaji karyawan |
| 6-5010 | Supplies Kantor | EXPENSE | Alat tulis & supplies |
| 6-3010 | Penyusutan | EXPENSE | Depreciation expense |
| 8-2010 | Beban Bunga | EXPENSE | Bunga hutang |

---

## KESIMPULAN

**Bagan Akuntansi (Chart of Accounts)** adalah tulang punggung sistem akuntansi yang mengorganisir setiap transaksi bisnis ke dalam kategori yang tepat. Dengan memahami alur dari transaksi awal hingga pelaporan keuangan, Anda dapat:

1. ✅ Mencatat transaksi dengan akurat menggunakan double-entry bookkeeping
2. ✅ Memposting ke buku besar dan memantau saldo akun
3. ✅ Membuat laporan keuangan yang akurat (P&L, Balance Sheet, Cash Flow)
4. ✅ Melakukan penutupan periode dengan benar
5. ✅ Memastikan compliance dengan PSAK dan regulasi Indonesia

**Sistem ini fully automated**, jadi tim Anda cukup fokus pada transaksi - perhitungan jurnal dan pelaporan ditangani oleh sistem!

---

**Document Prepared By:** System Analysis Team
**Date:** October 26, 2025
**Version:** 1.0 - FINAL
**Status:** ✅ READY FOR PRODUCTION
