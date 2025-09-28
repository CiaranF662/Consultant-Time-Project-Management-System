import GrowthTeamGanttChart from '@/app/components/gantt/GrowthTeamGanttChart';

export default function GanttPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Project Gantt Chart</h1>
        <p className="text-muted-foreground">Visual timeline of all projects and their phases</p>
      </div>
      <GrowthTeamGanttChart />
    </div>
  );
}