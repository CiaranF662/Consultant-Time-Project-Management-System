// Lightweight scheduler that posts to /api/scheduler/jira-sync every hour.
// Requires ADMIN_SCHEDULER_TOKEN and BASE_URL in environment.
const cron = require('node-cron');
const fetch = require('node-fetch');

const token = process.env.ADMIN_SCHEDULER_TOKEN;
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

if (!token) {
  console.error('ADMIN_SCHEDULER_TOKEN is required');
  process.exit(1);
}

async function runOnce() {
  try {
    const r = await fetch(`${baseUrl}/api/scheduler/jira-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-scheduler-token': token }
    });
    const body = await r.json();
    console.log('Scheduler run result:', body);
  } catch (err) {
    console.error('Scheduler run error:', err);
  }
}

// Run immediately then every hour
runOnce();
cron.schedule('0 * * * *', () => {
  console.log('Running scheduled Jira sync');
  runOnce();
});
