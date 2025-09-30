import { NextRequest, NextResponse } from 'next/server';
import syncFromJira from '@/lib/jiraSync';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('x-scheduler-token') || process.env.ADMIN_SCHEDULER_TOKEN;
    if (!token || token !== process.env.ADMIN_SCHEDULER_TOKEN) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

  const jiraBaseUrl = process.env.JIRA_BASE_URL;
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraApiToken = process.env.JIRA_API_TOKEN;
  if (!jiraBaseUrl || (!jiraApiToken && !jiraEmail)) return NextResponse.json({ success: false, error: 'Jira not configured: set JIRA_BASE_URL and either JIRA_API_TOKEN (legacy email:token) or JIRA_EMAIL+JIRA_API_TOKEN' }, { status: 400 });

  const jiraAuthRaw = jiraEmail && jiraApiToken ? `${jiraEmail}:${jiraApiToken}` : jiraApiToken || '';
  const jiraAuth = Buffer.from(jiraAuthRaw).toString('base64');

    const res = await syncFromJira({ jiraBaseUrl, jiraAuth, days: 30 });

    // optional slack notification handled by caller code; return results
    return NextResponse.json({ success: true, results: res });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
