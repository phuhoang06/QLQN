import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendMessage, messageTemplates } from '@/lib/meta';

export async function GET(request: NextRequest) {
  try {
    // Verify CRON secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all pending contributions for this week
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

    const { data: pendingContributions, error } = await supabase
      .from('contributions')
      .select(`
        *,
        users!inner(*)
      `)
      .eq('status', 'pending')
      .gte('due_date', startOfWeek.toISOString())
      .lte('due_date', endOfWeek.toISOString());

    if (error) {
      throw error;
    }

    if (pendingContributions.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No pending contributions for this week' 
      });
    }

    // Group by user to avoid duplicate messages
    const userContributions: { [userId: string]: { user: any; contributions: any[] } } = {};
    
    pendingContributions.forEach(contribution => {
      const userId = contribution.users.id;
      if (!userContributions[userId]) {
        userContributions[userId] = {
          user: contribution.users,
          contributions: []
        };
      }
      userContributions[userId].contributions.push(contribution);
    });

    const results = [];

    // Iterate through userContributions object
    for (const userId in userContributions) {
      const data = userContributions[userId];
      const { user, contributions } = data;
      const totalAmount = contributions.reduce((sum, c) => sum + c.amount, 0);
      const dueDate = new Date(contributions[0].due_date).toLocaleDateString('vi-VN');

      try {
        const message = messageTemplates.weeklyReminder(
          user.name,
          totalAmount,
          dueDate
        );
        
        await sendMessage(user.phone, message);
        results.push({ 
          userId, 
          userName: user.name,
          totalAmount,
          messageSent: true 
        });
      } catch (messageError) {
        console.error('Error sending Meta message:', messageError);
        results.push({ 
          userId, 
          userName: user.name,
          totalAmount,
          messageSent: false 
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: results.length,
      results 
    });

  } catch (error) {
    console.error('Error sending weekly reminders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}