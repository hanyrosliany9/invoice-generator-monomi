/**
 * Public (no login) pages required by Meta for the Instagram integration:
 *   /privacy        Kebijakan Privasi / Privacy Policy
 *   /data-deletion  Instructions + status lookup by confirmation code
 *
 * Generic text in Bahasa Indonesia and English. OWNER REVIEW REQUIRED before
 * submitting for Meta App Review (company legal name, address, contact email
 * via VITE_PRIVACY_CONTACT_EMAIL, retention periods).
 */
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API_CONFIG } from '@/config/api';

const CONTACT = (import.meta.env.VITE_PRIVACY_CONTACT_EMAIL as string | undefined)?.trim() || '';
const UPDATED = '3 Oktober 2026 / October 3, 2026';

function Contact() {
  return CONTACT ? (
    <a href={`mailto:${CONTACT}`} className="underline underline-offset-2">{CONTACT}</a>
  ) : (
    <span>tim Monomi (kontak resmi di monomiagency.com) / the Monomi team (official contact at monomiagency.com)</span>
  );
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    const prev = document.title;
    document.title = `Monomi — ${title}`;
    return () => { document.title = prev; };
  }, [title]);
  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">Monomi</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-xs text-text-tertiary">Terakhir diperbarui / Last updated: {UPDATED}</p>
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-text-secondary [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-text-primary [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-2">
          {children}
        </div>
      </main>
    </div>
  );
}

function Bi({ id, en }: { id: ReactNode; en: ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div lang="id">{id}</div>
      <div lang="en" className="text-text-tertiary">{en}</div>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <Shell title="Kebijakan Privasi / Privacy Policy">
      <Bi
        id={<><h2>Tentang kebijakan ini</h2><p>Kebijakan ini menjelaskan data apa yang dibaca dan disimpan oleh Monomi (sistem manajemen agensi Monomi) saat sebuah akun Instagram Bisnis atau Kreator dihubungkan melalui &quot;Instagram API dengan Login Instagram&quot;, untuk apa data itu dipakai, berapa lama disimpan, dan bagaimana menghapusnya.</p></>}
        en={<><h2>About this policy</h2><p>This policy explains what data Monomi (the Monomi agency management system) reads and stores when an Instagram Business or Creator account is connected through the &quot;Instagram API with Instagram Login&quot;, why, for how long, and how to delete it.</p></>}
      />
      <Bi
        id={<><h2>Data Instagram yang kami baca</h2><ul><li>Profil dasar: ID akun, nama pengguna, jenis akun, foto profil, bio, jumlah pengikut dan jumlah konten (izin <code>instagram_business_basic</code>).</li><li>Statistik akun (insights) harian: jangkauan, tayangan, akun yang berinteraksi, total interaksi, suka, komentar, dibagikan, disimpan, pengikut baru (izin <code>instagram_business_manage_insights</code>).</li><li>Daftar konten (postingan, Reels, story) beserta caption, tautan, waktu posting dan statistiknya.</li></ul><p>Kami <strong>tidak</strong> membaca pesan langsung, tidak memposting, tidak berkomentar, dan tidak mengubah apa pun di akun Anda. Kata sandi Instagram tidak pernah kami terima.</p></>}
        en={<><h2>Instagram data we read</h2><ul><li>Basic profile: account ID, username, account type, profile picture, bio, follower and media counts (<code>instagram_business_basic</code>).</li><li>Daily account insights: reach, views, accounts engaged, total interactions, likes, comments, shares, saves, new followers (<code>instagram_business_manage_insights</code>).</li><li>Your media (posts, Reels, stories) with caption, link, publish time and their insights.</li></ul><p>We do <strong>not</strong> read direct messages, post, comment or change anything on your account. We never receive your Instagram password.</p></>}
      />
      <Bi
        id={<><h2>Untuk apa data dipakai</h2><p>Semata-mata untuk menyusun laporan kinerja media sosial bulanan bagi klien Monomi (tabel harian, konten teratas, angka ringkasan) yang ditampilkan di portal klien dan PDF laporan. Data tidak dijual, tidak dipakai untuk iklan, dan tidak dibagikan kepada pihak ketiga selain penyedia infrastruktur kami (server dan penyimpanan) yang terikat kerahasiaan.</p></>}
        en={<><h2>How the data is used</h2><p>Only to produce monthly social media performance reports for Monomi&apos;s clients (daily tables, top content, headline numbers), shown in the client portal and report PDFs. The data is not sold, not used for advertising, and not shared with third parties other than our infrastructure providers (servers and storage) bound by confidentiality.</p></>}
      />
      <Bi
        id={<><h2>Penyimpanan dan keamanan</h2><p>Token akses dari Instagram disimpan terenkripsi (AES-256-GCM) dan tidak pernah ditampilkan kepada siapa pun. Statistik yang sudah disinkronkan disimpan selama akun klien aktif di Monomi agar laporan bulan-bulan sebelumnya tetap bisa dibuka, kecuali Anda meminta penghapusan. Token dihapus segera saat akun diputuskan atau akses dicabut.</p></>}
        en={<><h2>Storage and security</h2><p>Instagram access tokens are stored encrypted (AES-256-GCM) and never shown to anyone. Synced insights are kept while the client account is active at Monomi so past monthly reports remain available, unless you request deletion. Tokens are deleted as soon as the account is disconnected or access is revoked.</p></>}
      />
      <Bi
        id={<><h2>Pilihan dan penghapusan</h2><ul><li>Putuskan kapan saja dari Portal Klien (tab Laporan) — dengan opsi &quot;hapus data&quot;.</li><li>Cabut akses dari aplikasi Instagram: Pengaturan &gt; Aplikasi dan situs web &gt; Monomi &gt; Hapus. Kami akan menerima pemberitahuan dari Meta, menghapus token Anda, serta handle/foto/bio yang disalin dari Instagram ke profil klien.</li><li>Minta penghapusan semua data: lihat <a href="/data-deletion" className="underline underline-offset-2">Penghapusan Data</a>.</li></ul></>}
        en={<><h2>Your choices and deletion</h2><ul><li>Disconnect at any time from the Client Portal (Reports tab), optionally deleting the data.</li><li>Revoke access in the Instagram app: Settings &gt; Apps and websites &gt; Monomi &gt; Remove. Meta notifies us and we delete your token and the handle/photo/bio copied from Instagram onto the client profile.</li><li>Request deletion of all data: see <a href="/data-deletion" className="underline underline-offset-2">Data Deletion</a>.</li></ul></>}
      />
      <Bi
        id={<><h2>Kontak</h2><p>Pertanyaan tentang privasi: <Contact />.</p></>}
        en={<><h2>Contact</h2><p>Privacy questions: <Contact />.</p></>}
      />
    </Shell>
  );
}

interface DeletionStatus {
  confirmationCode: string;
  status: string;
  requestedAt: string;
  completedAt?: string | null;
}

export function DataDeletionPage() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('code') ?? '');
  const [result, setResult] = useState<DeletionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lookup = async (value: string) => {
    const c = value.trim().toUpperCase();
    setResult(null);
    setError(null);
    if (!/^IGDEL-[A-F0-9]{18}$/.test(c)) {
      setError('Format kode tidak valid / Invalid code format (IGDEL-…).');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/instagram/data-deletion/status/${encodeURIComponent(c)}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { data?: DeletionStatus } & DeletionStatus;
      setResult(body.data ?? body);
    } catch {
      setError('Kode tidak ditemukan / Code not found.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const initial = params.get('code');
    if (initial) void lookup(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void lookup(code);
  };

  return (
    <Shell title="Penghapusan Data / Data Deletion">
      <Bi
        id={<><h2>Cara menghapus data Instagram Anda</h2><ul><li><strong>Dari Instagram:</strong> buka Pengaturan &gt; Aplikasi dan situs web &gt; pilih Monomi &gt; Hapus, lalu kirim permintaan penghapusan data. Meta meneruskan permintaan ke kami; semua data Instagram Anda dihapus otomatis dalam satu proses — token, statistik, daftar konten, bagian laporan yang dibuat otomatis dari akun Instagram tersebut, serta handle/foto/bio yang disalin dari Instagram ke profil klien — dan Anda menerima kode konfirmasi. Status &quot;Selesai&quot; hanya ditampilkan setelah semua langkah berhasil.</li><li><strong>Dari Portal Klien:</strong> tab Laporan &gt; Instagram &gt; Putuskan, centang &quot;hapus juga semua data&quot; (token, statistik, daftar konten, dan handle/foto/bio yang disalin dari Instagram dihapus).</li><li><strong>Lewat email:</strong> hubungi <Contact /> dengan nama pengguna Instagram Anda; kami memprosesnya dalam 30 hari.</li></ul><p>Nilai profil yang diisi manual oleh tim Monomi dan bagian laporan yang ditulis manual tidak ikut terhapus. Saat memutuskan dari Portal Klien, bagian laporan yang sudah dibuat tetap tersimpan sebagai dokumen kerja klien; bagian tersebut ikut dihapus bila Anda mengirim permintaan penghapusan dari Instagram, atau dapat diminta dihapus melalui kontak di atas.</p></>}
        en={<><h2>How to delete your Instagram data</h2><ul><li><strong>From Instagram:</strong> go to Settings &gt; Apps and websites &gt; select Monomi &gt; Remove, then send the data deletion request. Meta forwards it to us; all your Instagram data is deleted automatically in a single operation — token, insights, media list, report sections generated automatically from that Instagram account, and the handle/photo/bio copied from Instagram onto the client profile — and you receive a confirmation code. The status shows &quot;Completed&quot; only after every step succeeded.</li><li><strong>From the Client Portal:</strong> Reports tab &gt; Instagram &gt; Disconnect, ticking &quot;also delete all data&quot; (token, insights, media list and the handle/photo/bio copied from Instagram are deleted).</li><li><strong>By email:</strong> contact <Contact /> with your Instagram username; we process it within 30 days.</li></ul><p>Profile values entered manually by the Monomi team and report sections written by hand are not deleted. When disconnecting from the Client Portal, report sections already created stay as the client&apos;s work documents; they are deleted when you send a deletion request from Instagram, or can be removed on request via the contact above.</p></>}
      />
      <section>
        <h2>Cek status permintaan / Check request status</h2>
        <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="del-code" className="sr-only">Kode konfirmasi / Confirmation code</label>
          <input
            id="del-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="IGDEL-XXXXXXXXXXXXXXXXXX"
            maxLength={40}
            autoComplete="off"
            className="min-h-10 flex-1 rounded-md border border-border-default bg-bg-sunken px-3 font-mono text-sm text-text-primary"
          />
          <button
            type="submit"
            disabled={busy}
            className="min-h-10 rounded-md bg-brand-cream px-4 text-sm font-medium text-bg-base disabled:opacity-60"
          >
            {busy ? '…' : 'Cek / Check'}
          </button>
        </form>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        {result && (
          <div role="status" className="mt-3 rounded-md border border-border-subtle bg-bg-raised p-4 text-sm">
            <p className="font-mono text-xs text-text-tertiary">{result.confirmationCode}</p>
            <p className="mt-1 text-text-primary">
              {result.status === 'COMPLETED'
                ? 'Selesai — data Instagram terkait telah dihapus. / Completed — the related Instagram data has been deleted.'
                : `Status: ${result.status}`}
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              {new Date(result.completedAt ?? result.requestedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
            </p>
          </div>
        )}
      </section>
    </Shell>
  );
}
