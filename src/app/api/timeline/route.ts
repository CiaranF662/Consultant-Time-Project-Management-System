import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import { startOfWeek, endOfWeek, addWeeks, format } from 'date-fns';

const prisma = new PrismaClient();

// Add type definition for week structure
type WeekInfo = {
  weekStart: Date;
  weekEnd: Date;
  weekNumber: string;
  year: string;
  label: string;
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  // Only Growth Team can see full timeline
  if (session.user.role !== UserRole.GROWTH_TEAM) {
    return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const weeksToShow = parseInt(searchParams.get('weeks') || '12');
  const startDate = searchParams.get('startDate') 
    ? new Date(searchParams.get('startDate')!)
    : startOfWeek(new Date(), { weekStartsOn: 1 });

  try {
    // Get all consultants
    const consultants = await prisma.user.findMany({
      where: { role: UserRole.CONSULTANT },
      orderBy: { name: 'asc' }
    });

    // Generate week ranges with explicit typing
    const weeks: WeekInfo[] = [];
    for (let i = 0; i < weeksToShow; i++) {
      const weekStart = addWeeks(startDate, i);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      weeks.push({
        weekStart,
        weekEnd,
        weekNumber: format(weekStart, 'w'),
        year: format(weekStart, 'yyyy'),
        label: format(weekStart, 'MMM d')
      });
    }

    // Get allocations for all consultants in the date range
    const allocations = await prisma.weeklyAllocation.findMany({
      where: {
        weekStartDate: {
          gte: startDate,
          lte: addWeeks(startDate, weeksToShow)
        }
      },
      include: {
        phaseAllocation: {
          include: {
            phase: {
              include: {
                project: {
                  select: { id: true, title: true }
                }
              }
            }
          }
        }
      }
    });

    // Build timeline data structure
    const timeline = consultants.map(consultant => {
      const consultantAllocations = allocations.filter(a => a.consultantId === consultant.id);
      
      const weeklyData = weeks.map(week => {
        const weekAllocations = consultantAllocations.filter(a => {
          const allocWeekStart = new Date(a.weekStartDate);
          return allocWeekStart >= week.weekStart && allocWeekStart <= week.weekEnd;
        });

        const totalHours = weekAllocations.reduce((sum, a) => sum + a.plannedHours, 0);
        
        return {
          week: week.label,
          weekStart: week.weekStart,
          weekEnd: week.weekEnd,
          totalHours,
          allocations: weekAllocations.map(a => ({
            id: a.id,
            hours: a.plannedHours,
            project: a.phaseAllocation.phase.project.title,
            projectId: a.phaseAllocation.phase.project.id,
            phase: a.phaseAllocation.phase.name,
            phaseId: a.phaseAllocation.phase.id
          }))
        };
      });

      return {
        consultantId: consultant.id,
        consultantName: consultant.name || consultant.email,
        weeklyData
      };
    });

    return NextResponse.json({ timeline, weeks });
  } catch (error) {
    console.error('Error fetching timeline data:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch timeline' }), { status: 500 });
  }
}