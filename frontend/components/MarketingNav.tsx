import Link from 'next/link';

/** Navigation for the public marketing pages — no wallet, just a path into the app. */
export function MarketingNav() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand" aria-label="Zakati beranda">
          <span className="brand-mark">Zakati</span>
          <span className="brand-ar">زكاتي</span>
        </Link>

        <div className="nav-links">
          <Link href="/lembaga">Lembaga</Link>
          <Link href="/tracker">Transparansi</Link>
          <Link href="/dashboard" className="btn btn-primary btn-sm">
            Mulai Berzakat
          </Link>
        </div>
      </div>
    </nav>
  );
}
