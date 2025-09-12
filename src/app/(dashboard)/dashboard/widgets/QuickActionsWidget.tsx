// components/dashboard/widgets/QuickActionsWidget.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";

export default function QuickActionsWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button variant="outline">Request Hours</Button>
        <Button variant="outline">Log Allocation</Button>
        <Button variant="outline">View Portfolio</Button>
      </CardContent>
    </Card>
  );
}
