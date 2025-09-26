/* Option A: Direct API Integration (Recommended)
Use the Jira REST API or Atlassian Cloud API to fetch and update issues, projects, and sprints.
Authenticate using OAuth 2.0 (preferred) or API tokens.
Store Jira → AgileRS mappings (e.g., JiraIssueID ↔ AgileRSTaskID) in your DB.
Pros: Full control, no dependency on third-party services.
Cons: You need to handle syncing, rate limits, and errors.

Jira REST API Essentials
Endpoints you’ll likely need:
Issues: /rest/api/3/issue/{issueIdOrKey}
Projects: /rest/api/3/project
Sprints (Agile): /rest/agile/1.0/sprint/{sprintId}
Boards: /rest/agile/1.0/board
Search (JQL): /rest/api/3/search*/