import Sidebar from '@/app/components/layout/add-sidebar';

export default function UILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Sidebar>{children}</Sidebar>;
}