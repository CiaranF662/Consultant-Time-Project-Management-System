// components/dashboard/widgets/MyAllocationsWidget.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/ui/card";

export default function MyAllocationsWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Allocations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Replace with allocation list */}
        <p className="text-sm text-muted-foreground">Loading your allocations...</p>
      </CardContent>
    </Card>
  );
}
