// components/dashboard/widgets/UpcomingDeadlinesWidget.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/ui/card";

export default function UpcomingDeadlinesWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Deadlines</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Placeholder list */}
        <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
      </CardContent>
    </Card>
  );
}
