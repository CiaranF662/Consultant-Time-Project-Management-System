// # Trigger Jira <-> AgileRS sync

import type { NextApiRequest, NextApiResponse } from 'next';
import { syncJiraIssues } from '@/services/jiraSyncService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await syncJiraIssues();
    res.status(200).json({ message: 'Jira sync completed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
