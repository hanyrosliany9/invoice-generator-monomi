import * as XLSX from "xlsx";

/**
 * Downloadable starter files for the report builder: the right column headers
 * plus two example rows, so staff know what to type or paste.
 */
export interface ReportTemplate {
  key: string;
  title: string;
  description: string;
  headers: string[];
  rows: (string | number)[][];
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    key: "instagram-harian",
    title: "Instagram harian",
    description: "Satu baris per hari: jangkauan, tayangan, kunjungan profil, pengikut.",
    headers: [
      "Tanggal",
      "Jangkauan",
      "Tayangan",
      "Kunjungan Profil",
      "Klik Tautan",
      "Pengikut",
      "Pengikut Baru",
      "Engagement Rate",
    ],
    rows: [
      ["2026-09-01", 12370, 34910, 420, 35, 51005, 12, "3,4%"],
      ["2026-09-02", 12740, 35820, 455, 41, 51010, 5, "3,8%"],
    ],
  },
  {
    key: "tiktok-harian",
    title: "TikTok harian",
    description: "Satu baris per hari: tayangan video, interaksi, pengikut.",
    headers: [
      "Tanggal",
      "Tayangan Video",
      "Kunjungan Profil",
      "Suka",
      "Komentar",
      "Dibagikan",
      "Pengikut",
      "Pengikut Baru",
    ],
    rows: [
      ["2026-09-01", 21500, 640, 1830, 96, 54, 8420, 31],
      ["2026-09-02", 19800, 590, 1710, 88, 49, 8447, 27],
    ],
  },
  {
    key: "konten-teratas",
    title: "Konten teratas",
    description: "Satu baris per konten (postingan, Reels, video) beserta performanya.",
    headers: [
      "Konten",
      "Platform",
      "Jenis",
      "Tanggal Posting",
      "Jangkauan",
      "Tayangan",
      "Suka",
      "Komentar",
      "Dibagikan",
      "Disimpan",
      "Engagement Rate",
    ],
    rows: [
      ["Reels peluncuran menu baru", "Instagram", "Reels", "2026-09-04", 45200, 61800, 3100, 210, 150, 480, "7,9%"],
      ["Carousel tips hemat", "Instagram", "Carousel", "2026-09-11", 21800, 26400, 1540, 98, 75, 310, "7,5%"],
    ],
  },
  {
    key: "ringkasan-bulanan",
    title: "Ringkasan angka bulanan",
    description: "Satu baris berisi angka utama bulan ini (pengikut, jangkauan, tayangan, engagement).",
    headers: ["Pengikut", "Jangkauan", "Tayangan", "Engagement Rate"],
    rows: [[51005, 182400, 524300, "3,9%"]],
  },
  {
    key: "audiens",
    title: "Audiens (persentase)",
    description: "Komposisi audiens: usia, jenis kelamin, kota. Cocok untuk diagram lingkaran.",
    headers: ["Kelompok", "Persentase"],
    rows: [
      ["18-24 tahun", "38%"],
      ["25-34 tahun", "41%"],
      ["35-44 tahun", "14%"],
      ["45+ tahun", "7%"],
    ],
  },
];

export const findTemplate = (key: string): ReportTemplate | undefined =>
  REPORT_TEMPLATES.find((t) => t.key === key);

const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * CSV for Indonesian Excel: UTF-8 with BOM, ";" separator (Excel with the
 * Indonesian regional settings splits columns on ";" and treats "," as the
 * decimal mark). Numbers carry no thousand separators.
 */
export function templateToCsv(t: ReportTemplate): Buffer {
  const lines = [t.headers, ...t.rows].map((r) => r.map(csvCell).join(";"));
  return Buffer.from("﻿" + lines.join("\r\n") + "\r\n", "utf8");
}

export function templateToXlsx(t: ReportTemplate): Buffer {
  const aoa: (string | number)[][] = [t.headers, ...t.rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = t.headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  const notes = XLSX.utils.aoa_to_sheet([
    ["Petunjuk"],
    ["1. Ganti dua baris contoh pada lembar \"Data\" dengan data Anda; jangan ubah judul kolom (boleh ditambah)."],
    ["2. Tanggal: 2026-09-01, 01/09/2026, atau 1 Sep 2026 (hari/bulan/tahun)."],
    ["3. Angka: 1234, 1.234, 12,5, atau 3,4% (titik/koma Indonesia dikenali)."],
    ["4. Satu baris = satu hari (atau satu konten). Baris kosong dilewati."],
    ["5. Simpan, lalu unggah file ini di langkah \"Unggah file\" pada pembuat laporan."],
  ]);
  notes["!cols"] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(wb, notes, "Petunjuk");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
