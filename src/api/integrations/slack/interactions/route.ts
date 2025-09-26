import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { WebhookHandler } from '@/lib/integrations';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const payload = JSON.parse(new URLSearchParams(body).get('payload') || '{}');
    
    const webhookHandler = new WebhookHandler(prisma);
    const result = await webhookHandler.handleSlackInteraction(payload);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Slack interaction error:', error);
    return NextResponse.json({ error: 'Interaction processing failed' }, { status: 500 });
  }
}