# Narasi / Narration: Koneksi WhatsApp (admin)

Video: `crm-whatsapp-setup.a1f881bc.mp4` (1280x800, 01:18.8, silent). Guide slug: `crm-whatsapp-setup`.

Timestamps are mm:ss.s in the video. Each step has a window (from when the step starts until the next one starts) and a word budget at a calm speaking pace
(Indonesian about 2.4 words/second, English about 2.6). The drafts are written to fit; shorten them or leave pauses rather than speed up.
The orange highlight and numbered badge appear a few seconds into each step, so name the thing the badge points at when it shows.

Pembukaan (opsional, sebelum 00:00) / Opening (optional, before 00:00):

- ID: Untuk admin: arti kartu pengaturan WhatsApp, ke mana token dan ID dimasukkan, webhook, dan Conversions API. Baca langkah pertama sebelum yang lain: jangan pernah mendaftarkan, memigrasikan, atau memverifikasi lewat kode SMS atau PIN nomor WhatsApp yang dipakai di kampanye iklan.
- EN: For admins: what the WhatsApp settings card means, where the token and IDs go, the webhook and the Conversions API. Read the first step before anything else: never register, migrate or verify by SMS code or PIN the WhatsApp number used in the ad campaign.

## Langkah 1 / Step 1: Aturan keselamatan: jangan daftarkan nomornya

- Window: 00:00.0 - 00:10.5 (10.5 s)
- ID (23 of max 24 words): Aturan keselamatan: jangan daftarkan nomornya. Jangan pernah mendaftarkan, memigrasikan, atau memverifikasi lewat kode SMS atau PIN nomor WhatsApp yang dipakai untuk iklan Anda.
- EN (24 of max 26 words): Safety rule: never register the number. Never register, migrate or verify by SMS code or PIN the WhatsApp number that runs your ad campaign.
- Tip (opsional / optional, only if there is time): Jangan pernah menempelkan token, app secret, atau verify token ke chat, e-mail, atau tangkapan layar. Serahkan langsung ke developer/admin. / Never paste tokens, app secrets or the verify token into chat, e-mail or a screenshot. Hand them to the developer/admin directly.

## Langkah 2 / Step 2: Ke mana token dan ID dimasukkan

- Window: 00:10.6 - 00:19.9 (9.3 s)
- ID (30 of max 21 words) (OVER BUDGET: trim a few words): Ke mana token dan ID dimasukkan. Staf tidak mengetiknya di Monomi. Token akses WhatsApp serta ID WhatsApp Business Account dan nomor telepon diatur di server, pada pengaturan backend di VPS.
- EN (13 of max 23 words): Where the token and IDs go. Staff do not type them in Monomi.
- Tip (opsional / optional, only if there is time): Pemeriksaan hanya membaca: Monomi tidak pernah mengubah nomor. / The check only reads: Monomi never changes the number.

## Langkah 3 / Step 3: Membaca status: Siap

- Window: 00:19.9 - 00:28.7 (8.8 s)
- ID (19 of max 20 words): Membaca status: Siap. Konfigurasi server menampilkan satu dari empat status: Belum dikonfigurasi (Off), Belum lengkap, Tidak valid, dan Siap.
- EN (18 of max 21 words): Reading the status: Ready. Server configuration shows one of four states: Not configured (Off), Incomplete, Invalid and Ready.
- Tip (opsional / optional, only if there is time): Status selain Siap hanya mematikan WhatsApp, tidak yang lain: bagian lain aplikasi tetap berjalan. / Anything but Ready switches WhatsApp off, nothing else: the rest of the app keeps working.

## Langkah 4 / Step 4: URL webhook dan verify token

- Window: 00:28.8 - 00:40.8 (12.1 s)
- ID (25 of max 28 words): URL webhook dan verify token. Di aplikasi Meta (WhatsApp > Configuration) developer mengisi Callback URL dan Verify token, lalu berlangganan field yang tercantum di sana.
- EN (29 of max 30 words): Webhook URL and verify token. In the Meta app (WhatsApp > Configuration) the developer enters the Callback URL and the Verify token, and subscribes to the fields listed there.
- Tip (opsional / optional, only if there is time): Event terakhir diterima menunjukkan apakah Meta benar-benar mengirim chat ke Monomi. / Last event received tells you whether Meta is really sending chats to Monomi.

## Langkah 5 / Step 5: Conversions API (event ke Meta)

- Window: 00:40.8 - 00:49.0 (8.2 s)
- ID (14 of max 18 words): Conversions API (event ke Meta). Pengiriman tetap Nonaktif sampai developer menyalakannya dan dataset diatur.
- EN (19 of max 20 words): Conversions API (events to Meta). Sending stays Off until the developer switches it on and the dataset is set.
- Tip (opsional / optional, only if there is time): Buat / ambil ID dataset menampilkan ID yang diberikan ke developer. / Create / get dataset ID shows the ID to hand to the developer.

## Langkah 6 / Step 6: Hubungkan nomor (Embedded Signup)

- Window: 00:49.0 - 00:59.0 (10.0 s)
- ID (26 of max 22 words) (OVER BUDGET: trim a few words): Hubungkan nomor (Embedded Signup). Nomor hanya dihubungkan dengan Hubungkan WhatsApp: di jendela Meta pilih Hubungkan aplikasi WhatsApp Business yang sudah ada (coexistence) lalu konfirmasi di HP.
- EN (29 of max 24 words) (OVER BUDGET: trim a few words): Connect the number (Embedded Signup). The number is connected only with Connect WhatsApp: in Meta's window choose Connect your existing WhatsApp Business app (coexistence) and confirm on the phone.
- Tip (opsional / optional, only if there is time): Detail teknis (admin) berisi pengaturan server di baliknya. / Technical details (admin) lists the server settings behind it.

## Langkah 7 / Step 7: Pelacakan landing page: token dan script

- Window: 00:59.0 - 01:08.9 (9.9 s)
- ID (26 of max 22 words) (OVER BUDGET: trim a few words): Pelacakan landing page: token dan script. Landing page tidak memuat Meta Pixel: satu script tag adalah seluruh integrasinya, dan Monomi mengirim event ke Meta dari server.
- EN (33 of max 24 words) (OVER BUDGET: trim a few words): Landing page tracking: token and script. The landing page does not load the Meta Pixel: the one script tag is the whole integration, and Monomi sends the events to Meta from the server.
- Tip (opsional / optional, only if there is time): Coba dulu lewat Test events di Events Manager: developer bisa mengatur kode uji supaya belum ada yang dihitung sampai Anda puas. / Try it with Test events in Events Manager first: the developer can set a test code so nothing counts until you are happy.

## Langkah 8 / Step 8: Sinkronisasi Meta Ads: biaya iklan ke CRM

- Window: 01:08.9 - 01:18.8 (9.9 s)
- ID (26 of max 22 words) (OVER BUDGET: trim a few words): Sinkronisasi Meta Ads: biaya iklan ke CRM. Kartu Sinkronisasi Meta Ads di pengaturan CRM menampilkan akun iklan (nama dan id), sinkron terakhir, dan tombol Sinkronkan sekarang.
- EN (31 of max 24 words) (OVER BUDGET: trim a few words): Meta Ads sync: ad spend into the CRM. The Meta Ads sync card in CRM settings shows the ad account (name and id), the last sync, and a Sync now button.
- Tip (opsional / optional, only if there is time): Meta merevisi hari-hari terbaru, jadi tiap jalan membaca ulang 7 hari terakhir. Biaya yang diketik manual tidak pernah disentuh. / Meta restates recent days, so each run re-reads the last 7 days. Spend entered by hand is never touched.
