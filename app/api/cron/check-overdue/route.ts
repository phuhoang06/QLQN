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

    const { data: overdueContributions, error } = await supabase
      .from('contributions')
      .select(`
        *,
        users!inner(*)
      `)
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString());

    if (error) {
      throw error;
    }

    const results = [];

    for (const contribution of overdueContributions) {
      const dueDate = new Date(contribution.due_date);
      const today = new Date();
      const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const weeksOverdue = Math.ceil(daysOverdue / 7);
      
      const penaltyAmount = process.env.PENALTY_AMOUNT ? parseInt(process.env.PENALTY_AMOUNT) : 5000;
      const penalty = penaltyAmount * weeksOverdue;

      // Update contribution with penalty
      const { error: updateError } = await supabase
        .from('contributions')
        .update({ 
          penalty: penalty,
          updated_at: new Date().toISOString()
        })
        .eq('id', contribution.id);

      if (updateError) {
        console.error('Error updating penalty:', updateError);
        continue;
      }

      // Send Meta notification
      try {
        const message = messageTemplates.overdueNotice(
          contribution.users.name,
          contribution.amount,
          penalty
        );
        
        await sendMessage(contribution.users.phone, message);
        results.push({ 
          contributionId: contribution.id, 
          userName: contribution.users.name,
          penalty,
          messageSent: true 
        });
      } catch (messageError) {
        console.error('Error sending Meta message:', messageError);
        results.push({ 
          contributionId: contribution.id, 
          userName: contribution.users.name,
          penalty,
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
    console.error('Error checking overdue contributions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}