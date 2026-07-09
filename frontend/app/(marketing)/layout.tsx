import { MarketingNav } from '@/components/MarketingNav';

/** Layout for public marketing pages (landing). */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MarketingNav />
      {children}
    </>
  );
}
