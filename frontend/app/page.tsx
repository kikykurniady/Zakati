import Link from 'next/link';
import { Nav } from '@/components/Nav';

/** Minimal inline icon set (avoids an extra dependency). */
function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  zap: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  wallet: 'M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4z',
  send: 'M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z',
};

const FEATURES = [
  { icon: ICONS.link, title: 'Transaksi On-Chain', gold: false, body: 'Setiap pembayaran zakat dan distribusi ke mustahiq tercatat permanen di Stellar. Tidak bisa dimanipulasi atau dihapus.' },
  { icon: ICONS.zap, title: 'Biaya Hampir Nol', gold: true, body: 'Fee transaksi Stellar ~$0.00001. Lebih dari 99.9% dana sampai ke mustahiq tanpa potongan signifikan.' },
  { icon: ICONS.users, title: 'Distribusi Batch', gold: false, body: 'Lembaga amil mendistribusikan ke hingga 100 mustahiq dalam satu transaksi. Efisien, cepat, tercatat semua.' },
  { icon: ICONS.clock, title: 'Konfirmasi 5 Detik', gold: false, body: 'Stellar menyelesaikan transaksi dalam 3–5 detik. Mustahiq menerima dana hampir instan.' },
  { icon: ICONS.eye, title: 'Verifikasi Publik', gold: true, body: 'Siapa pun bisa memverifikasi setiap transaksi di Stellar Expert. Transparansi penuh tanpa perlu login.' },
  { icon: ICONS.shield, title: 'Freighter Wallet', gold: false, body: 'Terintegrasi dengan Freighter. Tidak ada private key yang meninggalkan device Anda.' },
];

const STEPS: Array<{
  n: string;
  icon: string;
  title: string;
  body: string;
  href?: string;
}> = [
  { n: '01', icon: ICONS.wallet, title: 'Hubungkan Freighter Wallet', body: 'Install ekstensi Freighter dan hubungkan ke Zakati. Tidak perlu daftar — wallet address Anda adalah identitas Anda.' },
  { n: '02', icon: ICONS.eye, title: 'Pilih Lembaga Amil Terpercaya', body: 'Browse lembaga amil terverifikasi. Lihat riwayat distribusi on-chain mereka sebelum memilih.', href: '/lembaga' },
  { n: '03', icon: ICONS.send, title: 'Kirim Zakat dengan USDC', body: 'Transfer USDC via Stellar dengan fee hampir nol. Transaksi dikonfirmasi dalam 3–5 detik.' },
  { n: '04', icon: ICONS.link, title: 'Lacak Distribusi Real-Time', body: 'Lihat langsung ke siapa zakat Anda disalurkan. Setiap distribusi tercatat permanen on-chain.' },
];

/** Landing page. */
export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        {/* ── HERO ───────────────────────────── */}
        <section className="hero">
          <div className="bg-grid" />
          <div className="glow-blob glow-orange" style={{ top: '10%', left: '12%' }} />
          <div className="glow-blob glow-gold" style={{ bottom: '8%', right: '10%' }} />

          <span className="badge-live">
            <span className="dot" /> Live on Stellar Testnet
          </span>

          <h1>
            Salurkan Zakat dengan
            <br />
            <span className="gradient-text">Transparansi Penuh</span>
          </h1>
          <p>
            Setiap rupiah zakat Anda tercatat permanen di Stellar blockchain.
            Lihat langsung ke mana dana Anda mengalir — real-time, tanpa
            perantara yang perlu dipercaya.
          </p>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            <Link href="/dashboard" className="btn btn-primary">
              Mulai Berzakat
            </Link>
            <Link href="/tracker" className="btn">
              Lihat Distribusi Live
            </Link>
          </div>

          <div
            className="grid grid-3"
            style={{ marginTop: 56, maxWidth: 760, width: '100%', position: 'relative', zIndex: 1 }}
          >
            {[
              ['Rp 327T', 'Potensi Zakat / Tahun'],
              ['~3%', 'Realisasi Saat Ini'],
              ['0 biaya', 'Transfer di Stellar'],
            ].map(([num, lbl]) => (
              <div key={lbl} style={{ textAlign: 'center' }}>
                <div className="stat">{num}</div>
                <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>{lbl}</div>
              </div>
            ))}
          </div>

          <div
            className="card card-glass animate-float proof-card"
            style={{ position: 'absolute', right: 'max(24px, 6vw)', bottom: 48, maxWidth: 280, padding: 18, zIndex: 1 }}
          >
            <div className="label">Baru saja</div>
            <p style={{ margin: '6px 0 4px', fontSize: 14 }}>
              Pak Ahmad berzakat <b>500 USDC</b>
            </p>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              tx: a3f9…c21d ✓
            </span>
          </div>
        </section>

        {/* ── PROBLEM ────────────────────────── */}
        <section className="section-pad" style={{ background: 'var(--panel)' }}>
          <div className="container">
            <div className="eyebrow">MENGAPA ZAKATI?</div>
            <h2 className="section" style={{ marginTop: 12 }}>
              Kepercayaan adalah masalah nyata
            </h2>
            <p className="muted" style={{ maxWidth: 640, marginBottom: 40 }}>
              Potensi zakat Indonesia sangat besar, namun realisasinya rendah.
              Salah satu penyebab utamanya: gap kepercayaan antara muzakki dan
              lembaga pengelola.
            </p>

            <div className="grid grid-3">
              <div className="card card-hover">
                <div className="stat gradient-text" style={{ fontSize: 40 }}>Rp 327T</div>
                <div style={{ marginTop: 10, fontWeight: 600 }}>Potensi zakat per tahun</div>
                <div className="muted" style={{ fontSize: 14 }}>Namun hanya 3% yang terealisasi.</div>
              </div>
              <div className="card card-hover">
                <div className="stat gradient-text" style={{ fontSize: 40 }}>73%</div>
                <div style={{ marginTop: 10, fontWeight: 600 }}>Muzakki ragu transparansi</div>
                <div className="muted" style={{ fontSize: 14 }}>Berdasarkan survei Baznas 2023.</div>
              </div>
              <div className="card card-gold">
                <div className="icon-box gold"><Icon path={ICONS.shield} /></div>
                <div style={{ marginTop: 14, fontWeight: 600 }}>Zakati membuktikan setiap transaksi on-chain</div>
                <div className="muted" style={{ fontSize: 14 }}>Verifikasi langsung di Stellar blockchain.</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ───────────────────── */}
        <section className="section-pad">
          <div className="container">
            <div className="eyebrow">CARA KERJA</div>
            <h2 className="section" style={{ marginTop: 12, marginBottom: 48 }}>
              Empat langkah, sepenuhnya transparan
            </h2>
            <div className="timeline">
              {STEPS.map((s) => (
                <div className="timeline-item" key={s.n}>
                  <div className="timeline-node">{s.n}</div>
                  <div className="card card-hover">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div className="icon-box"><Icon path={s.icon} /></div>
                      <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>{s.title}</h3>
                    </div>
                    <p className="muted" style={{ marginBottom: 0, marginTop: 12 }}>{s.body}</p>
                    {s.href && (
                      <Link
                        href={s.href}
                        style={{ display: 'inline-block', marginTop: 12, color: 'var(--accent)' }}
                      >
                        Lihat lembaga →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ───────────────────────── */}
        <section className="section-pad" style={{ background: 'var(--panel)' }}>
          <div className="container">
            <div className="eyebrow">FITUR</div>
            <h2 className="section" style={{ marginTop: 12, marginBottom: 48 }}>
              Dibangun untuk dipercaya
            </h2>
            <div className="grid grid-3">
              {FEATURES.map((f) => (
                <div className="card card-hover" key={f.title}>
                  <div className={`icon-box${f.gold ? ' gold' : ''}`}>
                    <Icon path={f.icon} />
                  </div>
                  <h3 style={{ margin: '16px 0 8px', fontFamily: 'var(--font-heading)' }}>{f.title}</h3>
                  <p className="muted" style={{ margin: 0, fontSize: 15 }}>{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────── */}
        <section
          className="section-pad"
          style={{ position: 'relative', textAlign: 'center', overflow: 'hidden', background: 'linear-gradient(to bottom, var(--bg), var(--panel))' }}
        >
          <div className="glow-blob glow-orange" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.18 }} />
          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <h2 className="section">Mulai Berzakat dengan Transparansi</h2>
            <p className="muted" style={{ maxWidth: 560, margin: '0 auto 32px' }}>
              Bergabung dan buktikan sendiri bahwa setiap transaksi zakat bisa
              diverifikasi on-chain.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/dashboard" className="btn btn-primary">Connect Wallet &amp; Mulai</Link>
              <Link href="/amil" className="btn">Untuk Lembaga Amil</Link>
            </div>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────── */}
        <footer style={{ background: 'var(--panel)', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '48px 0' }}>
          <div className="container row" style={{ flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="brand"><span className="brand-mark">Zakati</span></div>
              <div className="muted mono" style={{ fontSize: 13, marginTop: 6 }}>
                Your zakat, verified. · زكاتي — شفافية كاملة
              </div>
            </div>
            <span className="badge-testnet">✓ Verified on Stellar Testnet</span>
          </div>
        </footer>
      </main>
    </>
  );
}
