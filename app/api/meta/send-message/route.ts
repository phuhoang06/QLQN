import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/meta';

export async function POST(request: NextRequest) {
  try {
    const { recipientId, message } = await request.json();
    
    if (!recipientId || !message) {
      return NextResponse.json({ error: 'Missing recipientId or message' }, { status: 400 });
    }

    const result = await sendMessage(recipientId, message);
    
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error sending Meta message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}