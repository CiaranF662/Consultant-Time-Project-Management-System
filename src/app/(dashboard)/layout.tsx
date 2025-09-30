import DashboardLayout from '@/app/components/DashboardLayout';

export default function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}