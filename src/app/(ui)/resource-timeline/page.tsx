import ResourceTimeline from '@/app/components/timeline/ResourceTimeline';

export default function ResourceTimelinePage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Resource Timeline</h1>
        <p className="text-muted-foreground">Visual overview of consultant allocations and availability</p>
      </div>
      <ResourceTimeline />
    </div>
  );
}