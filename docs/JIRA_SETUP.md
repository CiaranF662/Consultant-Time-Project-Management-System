# Jira Integration - Environment Setup

This project supports two ways to provide Jira credentials. The new recommended way is to provide `JIRA_EMAIL` and `JIRA_API_TOKEN` separately. For backward compatibility you may also provide a single `JIRA_API_TOKEN` environment variable in the legacy format `email:api_token`.

Required variables

- `JIRA_BASE_URL` - e.g. `https://your-domain.atlassian.net`
- Either:
  - `JIRA_EMAIL` - the Atlassian account email
  - `JIRA_API_TOKEN` - the API token for that Atlassian account

Or (legacy)

- `JIRA_BASE_URL`
- `JIRA_API_TOKEN` containing the literal `email:api_token` pair (e.g. `alice@example.com:ABCDEF...`).

How the server builds auth

- If both `JIRA_EMAIL` and `JIRA_API_TOKEN` are set, the server uses `Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')` as the HTTP Basic auth credential.
- If `JIRA_EMAIL` is not set but `JIRA_API_TOKEN` contains the `email:token` pair (legacy), the server will base64-encode that string and use it.

Local development

1. Create a token in Atlassian: https://id.atlassian.com/manage-profile/security/api-tokens
2. Add the variables to your `.env` (project root) or set them in your shell before starting the dev server:

```env
JIRA_BASE_URL="https://your-domain.atlassian.net"
JIRA_EMAIL="your-email@example.com"
JIRA_API_TOKEN="<your-api-token>"
```

3. Restart the dev server:

```bash
npm run dev
```

Production

- Store credentials in your host's secret manager (Vercel/Heroku/Netlify/Cloud provider). Do not commit tokens to source control.
- If you use the scheduler script, also set `ADMIN_SCHEDULER_TOKEN` and `BASE_URL` in the environment or in the scheduler runner's environment.

Security note

- Prefer separate `JIRA_EMAIL` and `JIRA_API_TOKEN` for clarity.
- Rotate API tokens regularly and keep them secret.

If you'd like, I can update the UI text that references `JIRA_API_TOKEN` to mention the new env variables as well.
