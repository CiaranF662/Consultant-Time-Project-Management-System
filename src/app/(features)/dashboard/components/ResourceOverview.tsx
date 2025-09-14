// components/dashboard/ResourceOverview.tsx
export  function ResourceOverview() {
  return (
    <div className="p-4 bg-white rounded-xl shadow">
      <h3 className="font-semibold">Resource Overview</h3>
      <p>Summary of available vs allocated resources.</p>
    </div>
  );
}

// components/dashboard/AllocationChart.tsx
export function AllocationChart() {
  return (
    <div className="p-4 bg-white rounded-xl shadow">
      <h3 className="font-semibold">Allocation Chart</h3>
      <p>[Chart Placeholder]</p>
    </div>
  );
}

// components/dashboard/NotificationsPanel.tsx
export function NotificationsPanel() {
  return (
    <div className="p-4 bg-white rounded-xl shadow">
      <h3 className="font-semibold">Notifications</h3>
      <ul>
        <li>No new updates</li>
      </ul>
    </div>
  );
}
