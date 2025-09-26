import { PrismaClient } from '@prisma/client';
import { DatabaseIntegrator } from '@/app/(features)//integrations';

const prisma = new PrismaClient();

export async function sendWeeklyReports() {
  const dbIntegrator = new DatabaseIntegrator(prisma);
  
  // Get all active consultants
  const consultants = await prisma.user.findMany({
    where: { role: 'CONSULTANT', status: 'APPROVED' }
  });
  
  for (const consultant of consultants) {
    try {
      await dbIntegrator.sendWeeklyReport(consultant.id);
    } catch (error) {
      console.error(`Failed to send report to ${consultant.email}:`, error);
    }
  }
}

export async function schedulePhaseKickoffs() {
  const dbIntegrator = new DatabaseIntegrator(prisma);
  
  // Get phases starting in the next 24 hours
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const upcomingPhases = await prisma.phase.findMany({
    where: {
      startDate: {
        gte: new Date(),
        lte: tomorrow
      },
      meetings: { none: {} } // Don't have meetings scheduled yet
    }
  });
  
  for (const phase of upcomingPhases) {
    try {
      await dbIntegrator.schedulePhaseKickoff(phase.id);
    } catch (error) {
      console.error(`Failed to schedule kickoff for phase ${phase.id}:`, error);
    }
  }
}