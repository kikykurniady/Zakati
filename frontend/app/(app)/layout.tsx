import { Sidebar } from '@/components/Sidebar';

/** Layout for the app section: fixed sidebar navigation + content area. */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">{children}</div>
    </div>
  );
}
