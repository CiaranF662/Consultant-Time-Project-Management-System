// # Background job to sync Jira -> AgileRS

import { PrismaClient } from '@prisma/client';
import { searchIssues } from '@/lib/jira/issues';

const prisma = new PrismaClient();

export async function syncJiraIssues() {
  const issues = await searchIssues('project = AGILERS ORDER BY created DESC');

  for (const issue of issues) {
    await prisma.jiraIssue.upsert({
      where: { jiraKey: issue.key },
      update: {
        status: issue.fields.status.name,
        updatedAt: new Date(),
      },
      create: {
        jiraKey: issue.key,
        status: issue.fields.status.name,
      },
    });
  }
}
