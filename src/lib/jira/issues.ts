import jiraApi from './client';

export async function getIssue(issueId: string) {
  const response = await jiraApi.get(`/rest/api/3/issue/${issueId}`);
  return response.data;
}

export async function searchIssues(jql: string) {
  const response = await jiraApi.get('/rest/api/3/search', {
    params: { jql },
  });
  return response.data.issues;
}

export async function createIssue(projectKey: string, summary: string, description: string) {
  const response = await jiraApi.post('/rest/api/3/issue', {
    fields: {
      project: { key: projectKey },
      summary,
      description,
      issuetype: { name: 'Task' }
    }
  });
  return response.data;
}
