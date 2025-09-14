// components/dashboard/widgets/WorkloadBalanceWidget.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/ui/card";

export default function WorkloadBalanceWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workload Balance</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Placeholder chart */}
        <div className="h-32 bg-gray-100 rounded-md animate-pulse" />
      </CardContent>
    </Card>
  );
}
