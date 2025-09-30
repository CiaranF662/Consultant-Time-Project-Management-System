import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import syncFromJira from '@/lib/jiraSync';

const prisma = new PrismaClient();

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    project: {
      key: string;
      name: string;
    };
    timetracking?: {
      timeSpent: string;
      timeSpentSeconds: number;
    };
    created: string;
    updated: string;
  };
}

interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectCategory?: {
    name: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== UserRole.GROWTH_TEAM) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { action } = await req.json();
    
    const jiraBaseUrl = process.env.JIRA_BASE_URL;
    const jiraEmail = process.env.JIRA_EMAIL;
    const jiraApiToken = process.env.JIRA_API_TOKEN;

    if (!jiraBaseUrl || (!jiraApiToken && !jiraEmail)) {
      return NextResponse.json(
        { error: 'Jira credentials not configured. Please add JIRA_BASE_URL and either JIRA_API_TOKEN (legacy: email:token) or JIRA_EMAIL+JIRA_API_TOKEN to your environment variables.' },
        { status: 400 }
      );
    }

    // Build Basic auth value. Prefer separate email+token envs for clarity, fall back to legacy combined JIRA_API_TOKEN
    const jiraAuthRaw = jiraEmail && jiraApiToken ? `${jiraEmail}:${jiraApiToken}` : jiraApiToken || '';
    const jiraAuth = Buffer.from(jiraAuthRaw).toString('base64');

    switch (action) {
      case 'test-connection':
        try {
          const response = await fetch(`${jiraBaseUrl}/rest/api/2/myself`, {
            headers: {
              'Authorization': `Basic ${jiraAuth}`,
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const user = await response.json();
            return NextResponse.json({
              success: true,
              message: 'Connected successfully',
              user: {
                displayName: user.displayName,
                emailAddress: user.emailAddress
              }
            });
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (error: any) {
          return NextResponse.json(
            { success: false, error: `Connection failed: ${error.message}` },
            { status: 400 }
          );
        }

      case 'get-projects':
        try {
          const response = await fetch(`${jiraBaseUrl}/rest/api/2/project`, {
            headers: {
              'Authorization': `Basic ${jiraAuth}`,
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const projects: JiraProject[] = await response.json();
            return NextResponse.json({
              success: true,
              projects: projects.map(p => ({
                id: p.id,
                key: p.key,
                name: p.name,
                category: p.projectCategory?.name
              }))
            });
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (error: any) {
          return NextResponse.json(
            { success: false, error: `Failed to fetch projects: ${error.message}` },
            { status: 400 }
          );
        }

      case 'sync-data':
        try {
          const res = await syncFromJira({ jiraBaseUrl, jiraAuth, days: 30 });

          // send slack blocks with details and errors if configured
          try {
            const slackSetting = await prisma.integrationSetting.findUnique({ where: { key: 'slack' } });
            const slackConfig = slackSetting?.value as any;
            if (slackConfig?.enabled) {
              const blocks: any[] = [
                { type: 'section', text: { type: 'mrkdwn', text: '*Jira Sync completed*' } },
                { type: 'section', fields: [
                  { type: 'mrkdwn', text: `*Projects processed:*
${res.projectsProcessed}` },
                  { type: 'mrkdwn', text: `*Issues processed:*
${res.issuesProcessed}` },
                  { type: 'mrkdwn', text: `*Time entries created:*
${res.timeEntriesCreated}` },
                  { type: 'mrkdwn', text: `*Duplicates skipped:*
${res.skippedDuplicates}` },
                ] },
              ];

              if (res.errors && res.errors.length) {
                const errorText = res.errors.slice(0, 10).map((e: string, i: number) => `${i+1}. ${e}`).join('\n');
                blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*Errors (first ${Math.min(10, res.errors.length)}):*\n${errorText}` } });
              }

              await fetch(`${process.env.BASE_URL || ''}/api/slack`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blocks })
              });
            }
          } catch (err) {
            console.error('Slack notification failed:', err);
          }

          return NextResponse.json({ success: true, message: 'Sync completed', results: res });
        } catch (error: any) {
          return NextResponse.json({ success: false, error: `Sync failed: ${error.message}` }, { status: 500 });
        }

      // After the sync block, attempt to send a Slack notification if integration enabled
      // (This will run after the switch-case; but place here defensively in case of fall-through)

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Invalid request', details: error.message },
      { status: 400 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}