import type { Project, Phase, ConsultantsOnProjects } from '@prisma/client';
import type { ProjectFilters } from '@/components/projects/ProjectSearchFilter';

type ProjectWithDetails = Project & {
  phases?: Phase[];
  consultants?: (ConsultantsOnProjects & {
    user: {
      id: string;
      name: string | null;
      email: string | null;
    };
  })[];
};

export function categorizeProjects<T extends ProjectWithDetails>(projects: T[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const current: T[] = [];
  const upcoming: T[] = [];
  const past: T[] = [];

  projects.forEach(project => {
    const startDate = new Date(project.startDate);
    const endDate = project.endDate ? new Date(project.endDate) : null;

    startDate.setHours(0, 0, 0, 0);
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    if (startDate > today) {
      upcoming.push(project);
    } else if (endDate && endDate < today) {
      past.push(project);
    } else {
      current.push(project);
    }
  });

  return { current, upcoming, past };
}

export function filterAndSortProjects<T extends ProjectWithDetails>(
  projects: T[],
  filters: ProjectFilters
): T[] {
  let filtered = [...projects];

  // Apply search filter
  if (filters.search.trim()) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(project => {
      // Search in project name
      const nameMatch = project.title?.toLowerCase().includes(searchLower);

      // Search in description
      const descMatch = project.description?.toLowerCase().includes(searchLower);

      // Search in consultant names/emails
      const consultantMatch = project.consultants?.some(c =>
        c.user.name?.toLowerCase().includes(searchLower) ||
        c.user.email?.toLowerCase().includes(searchLower)
      );

      return nameMatch || descMatch || consultantMatch;
    });
  }

  // Apply status filter
  if (filters.status !== 'all') {
    const { current, upcoming, past } = categorizeProjects(filtered);

    switch (filters.status) {
      case 'current':
        filtered = current;
        break;
      case 'upcoming':
        filtered = upcoming;
        break;
      case 'past':
        filtered = past;
        break;
    }
  }

  // Apply sorting
  filtered.sort((a, b) => {
    let comparison = 0;

    switch (filters.sortBy) {
      case 'name':
        comparison = (a.title || '').localeCompare(b.title || '');
        break;
      case 'startDate':
        comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        break;
      case 'endDate':
        const aEnd = a.endDate ? new Date(a.endDate).getTime() : Infinity;
        const bEnd = b.endDate ? new Date(b.endDate).getTime() : Infinity;
        comparison = aEnd - bEnd;
        break;
      case 'budget':
        comparison = (a.budgetedHours || 0) - (b.budgetedHours || 0);
        break;
    }

    return filters.sortOrder === 'asc' ? comparison : -comparison;
  });

  return filtered;
}
