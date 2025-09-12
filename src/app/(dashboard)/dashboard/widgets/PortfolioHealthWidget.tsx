
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/ui/card";

export default function PortfolioHealthWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Health</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Placeholder pie/bar chart */}
        <div className="h-32 bg-gray-100 rounded-md animate-pulse" />
      </CardContent>
    </Card>
  );
}
