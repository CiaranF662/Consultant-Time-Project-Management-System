import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
}

export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'google'
    }
  });

  if (!account?.access_token) {
    return null;
  }

  // Check if token is expired and refresh if needed
  if (account.expires_at && account.expires_at * 1000 < Date.now()) {
    if (account.refresh_token) {
      return await refreshGoogleToken(account.id, account.refresh_token);
    }
    return null;
  }

  return account.access_token;
}

async function refreshGoogleToken(accountId: string, refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    const tokens = await response.json();
    
    if (tokens.access_token) {
      await prisma.account.update({
        where: { id: accountId },
        data: {
          access_token: tokens.access_token,
          expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in
        }
      });
      return tokens.access_token;
    }
  } catch (error) {
    console.error('Error refreshing Google token:', error);
  }
  return null;
}

export async function createCalendarEvent(userId: string, event: CalendarEvent): Promise<boolean> {
  const accessToken = await getGoogleAccessToken(userId);
  if (!accessToken) return false;

  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    return response.ok;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return false;
  }
}

export async function syncPhaseToCalendar(userId: string, phase: {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  projectTitle: string;
}): Promise<boolean> {
  const event: CalendarEvent = {
    summary: `${phase.projectTitle} - ${phase.name}`,
    description: phase.description || `Project phase: ${phase.name}`,
    start: {
      dateTime: phase.startDate.toISOString(),
      timeZone: 'UTC'
    },
    end: {
      dateTime: phase.endDate.toISOString(),
      timeZone: 'UTC'
    }
  };

  return await createCalendarEvent(userId, event);
}