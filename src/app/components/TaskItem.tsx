'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Task, User, UserRole, TaskStatus } from '@prisma/client';
import axios from 'axios';
import { generateColorFromString } from '@/lib/colors';
import { FaEdit, FaTrash } from 'react-icons/fa';
import EditTaskModal from './EditTaskModal';

interface TaskItemProps {
  task: Task & { assignee: User | null };
  currentUserRole: UserRole;
  currentUserId: string; // ID of the logged-in user
}

export default function TaskItem({ task, currentUserRole, currentUserId }: TaskItemProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState<TaskStatus>(task.status);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setIsLoading(true);
    try {
      await axios.patch(`/api/tasks/${task.id}`, { status: newStatus });
      setCurrentStatus(newStatus);
      router.refresh();
    } catch (error) {
      console.error("Failed to update task status", error);
      // Revert on error
      setCurrentStatus(task.status);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      setIsLoading(true);
      try {
        await axios.delete(`/api/tasks/${task.id}`);
        router.refresh();
      } catch (error) {
        alert('Failed to delete task.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'DONE': return 'bg-green-100 text-green-800';
      case 'TODO': default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!task.assignee) return null;

  const isAssignee = task.assignee.id === currentUserId;
  const assigneeColorClass = generateColorFromString(task.assignee.id);

  return (
    <>
      <div className="flex items-center justify-between rounded-md border bg-white p-3 shadow-sm">
        <div className="flex flex-col items-start">
          <p className="text-sm font-medium text-gray-800">{task.title}</p>
          {task.description && <p className="text-xs text-gray-500 mt-1">{task.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {isAssignee && (
            <>
              <button onClick={() => setIsEditModalOpen(true)} className="p-1 text-gray-400 hover:text-blue-600">
                <FaEdit />
              </button>
              <button onClick={handleDelete} disabled={isLoading} className="p-1 text-gray-400 hover:text-red-600">
                <FaTrash />
              </button>
            </>
          )}
          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${assigneeColorClass}`}>
            {task.assignee.name}
          </span>

          {/* --- THIS IS THE NEW SEPARATOR LINE --- */}
          <div className="h-5 border-l border-gray-300"></div>

          {isAssignee ? (
            <select
              value={currentStatus}
              onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
              disabled={isLoading}
              className={`rounded-md border-0 py-1 pl-3 pr-8 text-sm font-semibold ring-1 ring-inset ring-gray-300 ${getStatusColor(currentStatus)}`}
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          ) : (
            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${getStatusColor(currentStatus)}`}>
              {currentStatus.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>
      {isEditModalOpen && (
        <EditTaskModal task={task} onClose={() => setIsEditModalOpen(false)} />
      )}
    </>
  );
}