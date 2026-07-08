# Data Uji Zakati (Stellar Testnet)

> Alamat di bawah berasal dari `npm run demo:setup`. Skrip itu **membuat akun
> baru setiap kali dijalankan** — alamat terbaru selalu ada di
> `backend/demo-accounts.json`. Semua akun testnet-only, tanpa nilai nyata.

## 1. Alamat tujuan pembayaran (Amil)

| Akun | Alamat | Kondisi |
|------|--------|---------|
| Amil (registry `/lembaga`) | `GBTG77ZB4UKOJAQ6IUTRWK2GNQDBUGWOMN4DIGTD2QQHYYCOZJC3Q4IC` | Aktif, trustline USDC, 2.200 USDC masuk + riwayat XLM |
| Amil (demo run terakhir) | `GDYHQB3IM5DOHBKKH5TL2QBNEH6HTKIYGQJD2CXMPJ4HF4QKT2Y4JAKT` | Aktif, trustline USDC, 2.200 USDC masuk |

Keduanya valid sebagai "Alamat Amil (tujuan)" di `/dashboard`.

## 2. Alamat penerima distribusi (Mustahiq) — untuk form `/amil`

Semua sudah didanai dan punya trustline USDC:

```
GDURGAAIINNREZKHXIXWK3AISNBSHPZGJPUJDI2UXCFTLBKHVGKD2LWB
GD757LGB36TG7R6FUOEMIE3ZEXUBRIVQG27OOASKDMM3NG3IDUMYO2IH
GB5X2R56DA6O7WIVXD4MMVHFSOGV2IWJNBIYZXTR3I42ZIB5OP3IJ4MW
GA456PMUF3CA7AUNREWM5JGRXQWWEUNMYN5BFVI5VS4WUXQB7AFATINY
GBHFBL7ZOUA5M3MMMDQPPSN57SIZL4BPA7YTZHXKW2ULUDRF23W4QS36
GCSFBNBVPAFWH4CVZ3SI4EMC3XB7DKMN3MAN6RQGXCZDYBFDTRU6EHCO
GCKUXQ3RK5PUHD2Y7QHKWECBAW745FXESKRIIB3YGRIB5LJRDJSM3G5C
GA4ZQWRINCR4XRFT4NQPPSWOEDN7QBGUE4BPN6QB2JGCJUD4CUVB4L67
```

> Catatan: distribusi USDC membutuhkan saldo USDC di wallet pengirim.
> Secret key muzakki demo tidak disimpan, jadi wallet pribadi umumnya hanya
> bisa menguji distribusi memakai XLM / menguji jalur gagal (`op_underfunded`).

## 3. Matriks uji Kalkulator (`/kalkulator`)

Parameter default: emas Rp1.900.000/gr · beras Rp18.000/kg · kurs Rp16.500/USDC.
Nisab tahunan = 85 × 1.900.000 = **Rp161.500.000**; nisab penghasilan/bulan =
**Rp13.458.333**.

| Jenis | Input | Hasil yang diharapkan |
|-------|-------|----------------------|
| Penghasilan | gaji 15.000.000 | Wajib — zakat **Rp375.000** ≈ 22,73 USDC |
| Penghasilan | gaji 10.000.000 | **Belum wajib** (di bawah Rp13.458.333) |
| Penghasilan | gaji 13.458.333 | Wajib (tepat di nisab) — Rp336.458 |
| Fitrah | 4 jiwa | **Rp180.000** (4 × 2,5 kg × 18.000) ≈ 10,91 USDC |
| Emas | 100 gram | Wajib — 2,5% × 190jt = **Rp4.750.000** |
| Emas | 84 gram | **Belum wajib** (di bawah 85 gr) |
| Tabungan | saldo 200jt, hutang 10jt | Wajib — 2,5% × 190jt = **Rp4.750.000** |
| Tabungan | saldo 150jt, hutang 0 | **Belum wajib** (150jt < 161,5jt) |
| Perdagangan | aset 300jt, hutang 50jt | Wajib — 2,5% × 250jt = **Rp6.250.000** |
| Saham | portofolio 161.500.000 | Wajib (tepat nisab) — **Rp4.037.500** |
| Saham | portofolio 161.499.999 | **Belum wajib** |

Uji tambahan: ubah harga emas jadi 2.000.000 → nisab bulanan berubah jadi
Rp14.166.667 dan hasil ikut bergeser (membuktikan parameter hidup).

## 4. Uji pembayaran (`/dashboard`)

| Skenario | Input | Hasil yang diharapkan |
|----------|-------|----------------------|
| Bayar XLM sukses | tujuan = amil, jumlah 1, aset XLM, jenis apa pun | Sukses + link Stellar Expert; memo sesuai jenis (mis. `ZAKAT-FITRAH-2026`) |
| Prefill dari kalkulator | klik "Tunaikan Sekarang" | Jenis & jumlah terisi otomatis di form |
| Prefill dari lembaga | klik "Salurkan Zakat" di `/lembaga` | Alamat tujuan terisi otomatis |
| Alamat belum aktif | tujuan `GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF` | Gagal: "Alamat tujuan belum aktif di jaringan" (`op_no_destination`) |
| Format alamat salah | tujuan `ABC123` | Gagal dengan pesan alamat tidak valid |
| USDC tanpa saldo | aset USDC, saldo USDC 0 | Gagal: saldo tidak mencukupi (`op_underfunded`) |
| Memo bebas | jenis "Lainnya", memo kosong | Tombol kirim tertahan (field required) |

## 5. Uji Tracker & verifikasi (`/tracker`, Stellar Expert)

Alamat untuk dilacak:

| Alamat | Ekspektasi |
|--------|-----------|
| Amil `GBTG77…Q4IC` | ±7 transaksi, agregasi per aset (USDC 2.200 masuk) |
| Amil `GDYHQB…JAKT` | 5 transaksi simulasi USDC |
| Mustahiq mana pun (bag. 2) | Kosong / hanya funding — belum menerima zakat |
| Alamat acak tidak valid | Pesan error rapi, bukan crash |

Hash transaksi nyata untuk verifikasi manual:

```
afdf7d28ac7759d71a333fe4d9aa3370ef607d4e6925023bd6a5c11b696b4348  (1 XLM, ZAKAT-MAL-DAGANG-2026)
fc1a0e34a90ec25691d920c5895ae312fff490d9c20c88c7643dcf4c5bdce9ce  (300 USDC, ZAKAT-MAL-2024)
b438cd5155136cf2e3f5d5456e776bf570e75c000a47b3a9377dfcb76ed84741  (1000 USDC, INFAQ-MASJID)
```

Cek di `https://stellar.expert/explorer/testnet/tx/<hash>`.

## 6. Uji multi-wallet & mobile

1. Disconnect → Connect: modal menampilkan Freighter, xBull, Albedo, Rabet,
   Lobstr, Hana.
2. Albedo/xBull bisa dipakai tanpa ekstensi (jalur mobile).
3. Tutup modal tanpa memilih → tombol kembali normal (loading berhenti).
4. Reload setelah connect → sesi tersambung kembali otomatis.

## 7. Perintah uji otomatis

```bash
cd backend  && npx tsc --noEmit && npm test     # 29 unit test
cd frontend && npx tsc --noEmit && npm run lint  # typecheck + lint
cd contracts/zakat-escrow && cargo test          # 6 test kontrak escrow
```
