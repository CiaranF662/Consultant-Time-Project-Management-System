import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

type JiraIssue = any;

async function retry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 1000): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs));
      delayMs *= 2;
    }
  }
  throw lastErr;
}

export async function syncFromJira({ jiraBaseUrl, jiraAuth, days = 30 }: { jiraBaseUrl: string; jiraAuth: string; days?: number }) {
  const results = {
    projectsProcessed: 0,
    issuesProcessed: 0,
    timeEntriesCreated: 0,
    skippedDuplicates: 0,
    errors: [] as string[],
  };

  // fetch projects with retry
  const projects = await retry(async () => {
    const r = await fetch(`${jiraBaseUrl}/rest/api/2/project`, {
      headers: { Authorization: `Basic ${jiraAuth}`, Accept: 'application/json' }
    });
    if (!r.ok) throw new Error(`Failed to fetch projects: ${r.status}`);
    return r.json();
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);

  for (const project of projects) {
    results.projectsProcessed++;
    try {
      let startAt = 0;
      const maxResults = 100;
      let total = 0;
      do {
        const jql = `project = "${project.key}" AND updated >= "${thirtyDaysAgo.toISOString().split('T')[0]}" ORDER BY updated DESC`;
        const url = `${jiraBaseUrl}/rest/api/2/search?jql=${encodeURIComponent(jql)}&fields=summary,status,assignee,project,timetracking,created,updated&startAt=${startAt}&maxResults=${maxResults}`;

        const issuesData = await retry(async () => {
          const r = await fetch(url, { headers: { Authorization: `Basic ${jiraAuth}`, Accept: 'application/json' } });
          if (!r.ok) throw new Error(`Failed to fetch issues: ${r.status}`);
          return r.json();
        });

        const issues: JiraIssue[] = issuesData.issues || [];
        total = issuesData.total || issues.length;
        results.issuesProcessed += issues.length;

        for (const issue of issues) {
          try {
            const seconds = issue.fields?.timetracking?.timeSpentSeconds || 0;
            const assigneeEmail = issue.fields?.assignee?.emailAddress;
            if (!seconds || !assigneeEmail) continue;

            // dedupe: prefer unique constraint by issueKey + userId + timeSpentSeconds + startedAt date
            // find user
            let user = await prisma.user.findUnique({ where: { email: assigneeEmail } });
            if (!user) {
              user = await prisma.user.create({ data: { email: assigneeEmail, name: issue.fields.assignee.displayName, role: UserRole.CONSULTANT } });
            }

            // find or create project
            let dbProject = await prisma.project.findFirst({ where: { title: `${project.name} (Jira Sync)` } });
            if (!dbProject) {
              dbProject = await prisma.project.create({ data: { title: `${project.name} (Jira Sync)`, description: `Synced from Jira project ${project.key}`, startDate: new Date(), budgetedHours: 1000 } });
            }

            const issueKey = issue.key;
            const startedAt = issue.fields.created ? new Date(issue.fields.created) : undefined;

            // check for existing entry
            const existing = await prisma.timeEntry.findFirst({
              where: {
                issueKey: issueKey,
                userId: user.id,
                timeSpentSeconds: seconds,
                startedAt: startedAt ? startedAt : undefined,
              }
            });

            if (existing) {
              results.skippedDuplicates++;
              continue;
            }

            await prisma.timeEntry.create({ data: {
              userId: user.id,
              projectId: dbProject.id,
              issueKey,
              issueSummary: issue.fields.summary,
              timeSpentSeconds: seconds,
              startedAt,
            }});

            results.timeEntriesCreated++;
          } catch (err: any) {
            results.errors.push(`Issue ${issue.key} processing error: ${err.message}`);
          }
        }

        startAt += maxResults;
      } while (startAt < total);
    } catch (err: any) {
      results.errors.push(`Project ${project.key} error: ${err.message}`);
    }
  }

  return results;
}

export default syncFromJira;
