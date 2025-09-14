// components/dashboard/widgets/ROISnapshotWidget.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/ui/card";

export default function ROISnapshotWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ROI Snapshot</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">ROI data coming soon...</p>
      </CardContent>
    </Card>
  );
}
