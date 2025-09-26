// components/dashboard/widgets/PendingApprovalsWidget.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/ui/card";

export default function PendingApprovalsWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Approvals</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">No pending approvals</p>
      </CardContent>
    </Card>
  );
}
