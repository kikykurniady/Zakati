'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFreighter } from '@/hooks/useFreighter';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const MENU_UTAMA: NavItem[] = [
  { href: '/dashboard', label: 'Bayar Zakat', icon: 'M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z' },
  { href: '/kalkulator', label: 'Kalkulator Zakat', icon: 'M9 7h6m-6 4h6m-6 4h3M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z' },
  { href: '/lembaga', label: 'Lembaga Amil', icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6' },
];

const MENU_PERAN: NavItem[] = [
  { href: '/amil', label: 'Distribusi (Amil)', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { href: '/mustahiq', label: 'Dana Diterima', icon: 'M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4z' },
];

const MENU_TRANSPARANSI: NavItem[] = [
  { href: '/tracker', label: 'Tracker Publik', icon: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
];

function NavIcon({ path }: { path: string }) {
  return (
    <svg
      width="18"
      height="18"
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

function NavSection({ title, items, pathname, onNavigate }: {
  title: string;
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="sidebar-section">
      <div className="sidebar-section-title">{title}</div>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link${active ? ' active' : ''}`}
            onClick={onNavigate}
          >
            <NavIcon path={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

/** Sidebar navigation for the app section, with wallet controls at the bottom. */
export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { isConnected, publicKey, isLoading, connectWallet, disconnectWallet } =
    useFreighter();
  const close = () => setOpen(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button
          className="hamburger"
          aria-label="Buka menu"
          onClick={() => setOpen(!open)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <Link href="/" className="brand" aria-label="Zakati beranda">
          <span className="brand-mark">Zakati</span>
        </Link>
        <span className="badge-testnet">● Testnet</span>
      </div>

      {open && <div className="sidebar-backdrop" onClick={close} />}

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <Link href="/" className="brand sidebar-brand" aria-label="Zakati beranda" onClick={close}>
          <span className="brand-mark">Zakati</span>
          <span className="brand-ar">زكاتي</span>
        </Link>

        <nav className="sidebar-nav">
          <NavSection title="MENU" items={MENU_UTAMA} pathname={pathname} onNavigate={close} />
          <NavSection title="PERAN" items={MENU_PERAN} pathname={pathname} onNavigate={close} />
          <NavSection title="TRANSPARANSI" items={MENU_TRANSPARANSI} pathname={pathname} onNavigate={close} />
        </nav>

        <div className="sidebar-footer">
          <span className="badge-testnet">● Stellar Testnet</span>
          {isConnected && publicKey ? (
            <button
              className="addr-pill sidebar-wallet"
              onClick={disconnectWallet}
              title={`${publicKey} — klik untuk memutus`}
            >
              {publicKey.slice(0, 6)}…{publicKey.slice(-6)}
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm sidebar-wallet"
              onClick={() => void connectWallet()}
              disabled={isLoading}
            >
              {isLoading ? 'Menghubungkan…' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
