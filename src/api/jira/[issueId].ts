// # Fetch issue details

import type { NextApiRequest, NextApiResponse } from 'next';
import { getIssue } from '@/lib/jira/issues';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { issueId } = req.query;
  try {
    const issue = await getIssue(issueId as string);
    res.status(200).json(issue);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
