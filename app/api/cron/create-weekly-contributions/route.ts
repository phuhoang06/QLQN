import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Verify CRON secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current week info
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

    // Get all active users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('status', 'active');

    if (usersError) {
      throw usersError;
    }

    if (users.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No active users found' 
      });
    }

    // Get contribution schedules
    const { data: schedules, error: schedulesError } = await supabase
      .from('contribution_schedules')
      .select('*')
      .eq('is_active', true);

    if (schedulesError) {
      throw schedulesError;
    }

    if (schedules.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No active contribution schedules found' 
      });
    }

    const results = [];

    // Create weekly contributions for each user
    for (const user of users) {
      for (const schedule of schedules) {
        // Check if contribution already exists for this week
        const { data: existingContribution } = await supabase
          .from('contributions')
          .select('id')
          .eq('user_id', user.id)
          .eq('week', startOfWeek.toISOString().split('T')[0])
          .eq('schedule_id', schedule.id)
          .single();

        if (existingContribution) {
          continue; // Skip if already exists
        }

        // Create new contribution
        const { data: contribution, error: contributionError } = await supabase
          .from('contributions')
          .insert({
            user_id: user.id,
            week: startOfWeek.toISOString().split('T')[0],
            amount: schedule.amount,
            status: 'pending',
            due_date: endOfWeek.toISOString(),
            schedule_id: schedule.id,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (contributionError) {
          console.error('Error creating contribution:', contributionError);
          results.push({ 
            userId: user.id, 
            userName: user.name,
            success: false,
            error: contributionError.message 
          });
        } else {
          results.push({ 
            userId: user.id, 
            userName: user.name,
            contributionId: contribution.id,
            amount: schedule.amount,
            success: true 
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: results.length,
      results 
    });

  } catch (error) {
    console.error('Error creating weekly contributions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Add POST method for Vercel CRON
export async function POST(request: NextRequest) {
  return GET(request);
}