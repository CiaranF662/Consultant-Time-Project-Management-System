'use client';

import { useSession } from 'next-auth/react';
import { UserRole, Sprint, Task, User, ConsultantSprintHours } from '@prisma/client';
import { generateColorFromString } from '@/lib/colors';
import TaskItem from './TaskItem';
import AddTaskForm from './AddTaskForm';

type SprintWithDetails = Sprint & {
  tasks: (Task & { assignee: User | null })[];
  sprintHours: (ConsultantSprintHours & { consultant: { name: string | null } })[];
};

interface SprintCardProps {
  sprint: SprintWithDetails;
  projectId: string;
  onUpdate: () => void;
  onLogHours: (sprint: SprintWithDetails) => void;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(date));
}

export default function SprintCard({ sprint, projectId, onUpdate, onLogHours }: SprintCardProps) {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const { user } = session;

  let hoursByConsultant: Record<string, { name: string | null; week1: number; week2: number }> = {};
  if (user.role === UserRole.GROWTH_TEAM) {
    hoursByConsultant = sprint.sprintHours.reduce((acc, curr) => {
      acc[curr.consultantId] = acc[curr.consultantId] || { name: curr.consultant.name, week1: 0, week2: 0 };
      if (curr.weekNumber === 1) acc[curr.consultantId].week1 = curr.hours;
      if (curr.weekNumber === 2) acc[curr.consultantId].week2 = curr.hours;
      return acc;
    }, {} as Record<string, { name: string | null; week1: number; week2: number }>);
  }

  const myHours = sprint.sprintHours.filter(h => h.consultantId === user.id);
  const myWeek1 = myHours.find((h) => h.weekNumber === 1)?.hours || 0;
  const myWeek2 = myHours.find((h) => h.weekNumber === 2)?.hours || 0;
  const myTotal = myWeek1 + myWeek2;

  return (
    <div className="rounded-lg border bg-gray-50/80 p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-gray-800">Sprint {sprint.sprintNumber}</p>
          <p className="text-sm text-gray-500">{formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}</p>
        </div>
        {user.role === UserRole.CONSULTANT && (
          <button onClick={() => onLogHours(sprint)} className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            {myHours.length > 0 ? 'Edit Hours' : 'Log Hours'}
          </button>
        )}
      </div>

      {user.role === UserRole.GROWTH_TEAM && Object.keys(hoursByConsultant).length > 0 && (
        <div className="mb-3 border-t pt-3">
          <h5 className="text-xs font-bold text-gray-500 mb-2 uppercase">Logged Hours</h5>
          {Object.entries(hoursByConsultant).map(([consultantId, data]) => (
            <div key={consultantId} className="text-xs text-gray-600 flex justify-between py-1">
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${generateColorFromString(consultantId)}`}>{data.name}</span>
              <span>W1: {data.week1}h, W2: {data.week2}h, <strong>Total: {data.week1 + data.week2}h</strong></span>
            </div>
          ))}
        </div>
      )}
      
      {myTotal > 0 && user.role === UserRole.CONSULTANT && (
        <div className="mb-3 text-xs text-gray-600 border-t pt-3">
          <strong>Your Logged Hours:</strong> Week 1: {myWeek1}h, Week 2: {myWeek2}h, <strong>Total: {myTotal}h</strong>
        </div>
      )}
      
      <div className="space-y-2">
        {sprint.tasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            currentUserRole={user.role as UserRole}
            currentUserId={user.id}
          />
        ))}
      </div>
      
      {user.role === UserRole.CONSULTANT && (
        <AddTaskForm
          sprintId={sprint.id}
          projectId={projectId}
          onTaskCreated={onUpdate}
        />
      )}
    </div>
  );
}