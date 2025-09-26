import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { WebhookHandler } from '@/lib/integrations';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    const webhookHandler = new WebhookHandler(prisma);
    const result = await webhookHandler.handleJiraWebhook(payload);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Jira webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}