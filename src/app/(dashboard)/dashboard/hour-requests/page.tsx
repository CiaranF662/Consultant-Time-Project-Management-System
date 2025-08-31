import DashboardLayout from '@/app/components/DashboardLayout';

export default function HourRequestsPage() {
  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Hour Change Requests</h1>
        <p className="text-gray-600">Manage your hour change requests here...</p>
      </div>
    </DashboardLayout>
  );
}