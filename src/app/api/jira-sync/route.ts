import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';

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
    const { action } = await req.json();
    
    const jiraToken = process.env.JIRA_API_TOKEN;
    const jiraBaseUrl = process.env.JIRA_BASE_URL;
    
    if (!jiraToken || !jiraBaseUrl) {
      return NextResponse.json(
        { error: 'Jira credentials not configured. Please add JIRA_API_TOKEN and JIRA_BASE_URL to your environment variables.' },
        { status: 400 }
      );
    }

    const jiraAuth = Buffer.from(`${jiraToken}`).toString('base64');

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
          const projectsResponse = await fetch(`${jiraBaseUrl}/rest/api/2/project`, {
            headers: {
              'Authorization': `Basic ${jiraAuth}`,
              'Accept': 'application/json'
            }
          });
          
          if (!projectsResponse.ok) {
            throw new Error('Failed to fetch Jira projects');
          }
          
          const jiraProjects: JiraProject[] = await projectsResponse.json();
          const syncResults = {
            projectsProcessed: 0,
            issuesProcessed: 0,
            timeEntriesCreated: 0,
            errors: [] as string[]
          };
          
          for (const project of jiraProjects) {
            try {
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              
              const jql = `project = "${project.key}" AND updated >= "${thirtyDaysAgo.toISOString().split('T')[0]}" ORDER BY updated DESC`;
              
              const issuesResponse = await fetch(
                `${jiraBaseUrl}/rest/api/2/search?jql=${encodeURIComponent(jql)}&fields=summary,status,assignee,project,timetracking,created,updated&maxResults=100`,
                {
                  headers: {
                    'Authorization': `Basic ${jiraAuth}`,
                    'Accept': 'application/json'
                  }
                }
              );
              
              if (issuesResponse.ok) {
                const issuesData = await issuesResponse.json();
                const issues: JiraIssue[] = issuesData.issues;
                
                syncResults.projectsProcessed++;
                syncResults.issuesProcessed += issues.length;
                
                for (const issue of issues) {
                  if (issue.fields.timetracking?.timeSpentSeconds && issue.fields.assignee?.emailAddress) {
                    try {
                      // Find or create user
                      let user = await prisma.user.findUnique({
                        where: { email: issue.fields.assignee.emailAddress }
                      });
                      
                      if (!user) {
                        user = await prisma.user.create({
                          data: {
                            email: issue.fields.assignee.emailAddress,
                            name: issue.fields.assignee.displayName,
                            role: UserRole.CONSULTANT
                          }
                        });
                      }
                      
                      // Find or create project
                      let dbProject = await prisma.project.findFirst({
                        where: { title: `${project.name} (Jira Sync)` }
                      });
                      
                      if (!dbProject) {
                        dbProject = await prisma.project.create({
                          data: {
                            title: `${project.name} (Jira Sync)`,
                            description: `Synced from Jira project ${project.key}`,
                            startDate: new Date(),
                            budgetedHours: 1000
                          }
                        });
                      }
                      
                      syncResults.timeEntriesCreated++;
                      
                    } catch (error: any) {
                      syncResults.errors.push(`Error processing issue ${issue.key}: ${error.message}`);
                    }
                  }
                }
              }
            } catch (error: any) {
              syncResults.errors.push(`Error processing project ${project.key}: ${error.message}`);
            }
          }
          
          return NextResponse.json({
            success: true,
            message: 'Sync completed',
            results: syncResults
          });
          
        } catch (error: any) {
          return NextResponse.json(
            { success: false, error: `Sync failed: ${error.message}` },
            { status: 500 }
          );
        }

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