import { AppNav } from '@/components/AppNav';

/** Layout for the authenticated app section (dashboard, amil, mustahiq, lembaga, tracker). */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppNav />
      {children}
    </>
  );
}
