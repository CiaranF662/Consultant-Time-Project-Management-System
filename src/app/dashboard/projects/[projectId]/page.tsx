'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, notFound } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { FaArrowLeft, FaUsers, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { UserRole, Sprint, Task, User, ConsultantSprintHours, Phase } from '@prisma/client';

import AddPhaseForm from '@/app/components/AddPhaseForm';
import AssignSprintsButton from '@/app/components/AssignSprintsButton';
import AddTaskForm from '@/app/components/AddTaskForm';
import TaskItem from '@/app/components/TaskItem';
import LogHoursModal from '@/app/components/LogHoursModal';
import EditPhaseModal from '@/app/components/EditPhaseModal';

// Type Definitions
type SprintHourWithConsultant = ConsultantSprintHours & { consultant: { name: string | null } };
type TaskWithAssignee = Task & { assignee: User | null };
type SprintWithDetails = Sprint & {
  tasks: TaskWithAssignee[];
  sprintHours: SprintHourWithConsultant[];
};
type PhaseWithSprints = Phase & { sprints: SprintWithDetails[] };
type ConsultantsOnProject = { user: { name: string | null } };
type ProjectWithDetails = {
    id: string; title: string; description: string | null; startDate: Date; endDate: Date | null;
    consultants: ConsultantsOnProject[];
    phases: PhaseWithSprints[];
    sprints: SprintWithDetails[];
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(date));
}

export default function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [project, setProject] = useState<ProjectWithDetails | null>(null);
  const [logHoursModal, setLogHoursModal] = useState<{ isOpen: boolean; sprint: SprintWithDetails | null }>({ isOpen: false, sprint: null });
  const [addPhaseModalOpen, setAddPhaseModalOpen] = useState(false);
  const [editPhaseModal, setEditPhaseModal] = useState<{ isOpen: boolean; phase: Phase | null }>({ isOpen: false, phase: null });

  const fetchProjectDetails = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/projects/${params.projectId}`);
      setProject(data);
    } catch (error) {
      notFound();
    }
  }, [params.projectId, notFound]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProjectDetails();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router, fetchProjectDetails]);
  
  const handleDeletePhase = async (phaseId: string) => {
    if(confirm('Are you sure you want to delete this phase? This will unassign its sprints.')) {
        try {
            await axios.delete(`/api/phases/${phaseId}`);
            fetchProjectDetails();
        } catch (error) {
            alert('Failed to delete phase.');
        }
    }
  };

  if (!project || status !== 'authenticated') {
    return <div className="text-center p-12">Loading...</div>;
  }
  
  const sprintsInPhases = new Set(project.phases.flatMap(p => p.sprints.map(s => s.id)));
  const unassignedSprints = project.sprints.filter(s => !sprintsInPhases.has(s.id));

  const renderSprintList = (sprints: SprintWithDetails[]) => (
    <ul className="divide-y divide-gray-100">
      {sprints.map((sprint) => {
        let hoursByConsultant: Record<string, { name: string | null; week1: number; week2: number }> = {};
        if (session.user.role === UserRole.GROWTH_TEAM) {
            hoursByConsultant = sprint.sprintHours.reduce((acc, curr) => {
                acc[curr.consultantId] = acc[curr.consultantId] || { name: curr.consultant.name, week1: 0, week2: 0 };
                if (curr.weekNumber === 1) acc[curr.consultantId].week1 = curr.hours;
                if (curr.weekNumber === 2) acc[curr.consultantId].week2 = curr.hours;
                return acc;
            }, {} as Record<string, { name: string | null; week1: number; week2: number }>);
        }
        const myHours = sprint.sprintHours.filter(h => h.consultantId === session.user.id);
        const myWeek1 = myHours.find((h) => h.weekNumber === 1)?.hours || 0;
        const myWeek2 = myHours.find((h) => h.weekNumber === 2)?.hours || 0;
        const myTotal = myWeek1 + myWeek2;
        return (
          <li key={sprint.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">Sprint {sprint.sprintNumber}</p>
                <p className="text-sm text-gray-500">{formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}</p>
              </div>
              {session.user.role === UserRole.CONSULTANT && (
                <button onClick={() => setLogHoursModal({ isOpen: true, sprint: sprint })} className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                  {myHours.length > 0 ? 'Edit Hours' : 'Log Hours'}
                </button>
              )}
            </div>
            {session.user.role === UserRole.GROWTH_TEAM && Object.keys(hoursByConsultant).length > 0 && (
                <div className="mt-3 border-t pt-3"><h5 className="text-xs font-bold text-gray-500 mb-2 uppercase">Logged Hours</h5>{Object.values(hoursByConsultant).map((data, index) => (<div key={index} className="text-xs text-gray-600 flex justify-between py-1"><span>{data.name}</span><span>W1: {data.week1}h, W2: {data.week2}h, <strong>Total: {data.week1 + data.week2}h</strong></span></div>))}</div>
            )}
            {myTotal > 0 && session.user.role === UserRole.CONSULTANT && (
                <div className="mt-3 text-xs text-gray-600 border-t pt-3"><strong>Your Logged Hours:</strong> Week 1: {myWeek1}h, Week 2: {myWeek2}h, <strong>Total: {myTotal}h</strong></div>
            )}
            <div className="mt-3 space-y-2">{sprint.tasks.map(task => (<TaskItem key={task.id} task={task} currentUserRole={session.user.role as UserRole} />))}</div>
            {session.user.role === UserRole.CONSULTANT && (<AddTaskForm sprintId={sprint.id} projectId={project.id} />)}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-6"><Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600"><FaArrowLeft /> Back to Dashboard</Link></div>
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{project.title}</h1>
                    <p className="text-gray-600 mt-2 max-w-prose">{project.description || 'No description provided.'}</p>
                </div>
                {session.user.role === UserRole.GROWTH_TEAM && (<button onClick={() => setAddPhaseModalOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><FaPlus />Add Phase</button>)}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div className="text-gray-600"><strong>Start Date:</strong> {formatDate(project.startDate)}</div>
                {project.endDate && <div className="text-gray-600"><strong>End Date:</strong> {formatDate(project.endDate)}</div>}
                <div className="flex items-center text-gray-600"><FaUsers className="mr-2 text-gray-400" /><strong>Assigned:</strong><span className="ml-1">{project.consultants.map(c => c.user.name).join(', ')}</span></div>
            </div>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Project Roadmap</h2>
          <div className="space-y-6">
            {project.phases.map(phase => (
              <div key={phase.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{phase.name}</h3>
                    <p className="text-sm text-gray-500">{formatDate(phase.startDate)} - {formatDate(phase.endDate)}</p>
                  </div>
                  {session.user.role === UserRole.GROWTH_TEAM && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => setEditPhaseModal({ isOpen: true, phase: phase })} className="p-2 text-gray-500 hover:text-blue-600"><FaEdit/></button>
                        <button onClick={() => handleDeletePhase(phase.id)} className="p-2 text-gray-500 hover:text-red-600"><FaTrash/></button>
                        {/* THIS IS THE FIX: Add the missing onAssignment prop */}
                        <AssignSprintsButton 
                            phaseId={phase.id} 
                            unassignedSprints={unassignedSprints}
                            onAssignment={fetchProjectDetails}
                        />
                    </div>
                  )}
                </div>
                {renderSprintList(project.sprints.filter(s => phase.sprints.some(ps => ps.id === s.id)))}
                {phase.sprints.length === 0 && <p className="p-4 text-sm text-gray-400">No sprints assigned to this phase.</p>}
              </div>
            ))}
            {unassignedSprints.length > 0 && (
               <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b"><h3 className="font-bold text-lg text-gray-800">Unassigned Sprints</h3></div>
                {renderSprintList(unassignedSprints)}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddPhaseForm projectId={project.id} isOpen={addPhaseModalOpen} onClose={() => { setAddPhaseModalOpen(false); fetchProjectDetails(); }} />
      {editPhaseModal.isOpen && (<EditPhaseModal phase={editPhaseModal.phase!} onClose={() => { setEditPhaseModal({ isOpen: false, phase: null }); fetchProjectDetails(); }}/>)}
      {logHoursModal.isOpen && (<LogHoursModal sprint={logHoursModal.sprint!} projectId={project.id} onClose={() => { setLogHoursModal({ isOpen: false, sprint: null }); fetchProjectDetails(); }}/>)}
    </div>
  );
}