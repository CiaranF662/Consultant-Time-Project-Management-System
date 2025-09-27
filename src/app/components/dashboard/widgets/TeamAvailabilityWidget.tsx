// components/dashboard/widgets/TeamAvailabilityWidget.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/ui/card";

export default function TeamAvailabilityWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Availability</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-32 bg-gray-100 rounded-md animate-pulse" />
      </CardContent>
    </Card>
  );
}
