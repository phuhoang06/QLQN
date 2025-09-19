import { NextRequest, NextResponse } from 'next/server';
import { sendBroadcast } from '@/lib/meta';

export async function POST(request: NextRequest) {
  try {
    const { message, recipientIds } = await request.json();
    
    if (!message || !recipientIds || !Array.isArray(recipientIds)) {
      return NextResponse.json({ error: 'Missing message or recipientIds' }, { status: 400 });
    }

    const results = await sendBroadcast(message, recipientIds);
    
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error broadcasting Meta messages:', error);
    return NextResponse.json({ error: 'Failed to broadcast messages' }, { status: 500 });
  }
}