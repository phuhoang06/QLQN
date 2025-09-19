import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { zaloAPI, messageTemplates } from '@/lib/zalo'

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra API key để bảo mật
    const authHeader = request.headers.get('authorization')
    const expectedAuth = process.env.CRON_SECRET || 'your-cron-secret'
    
    if (authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { week } = await request.json()

    if (!week) {
      return NextResponse.json(
        { error: 'Week parameter is required' },
        { status: 400 }
      )
    }

    // Lấy tất cả contribution chưa đóng của tuần này
    const { data: contributions, error } = await supabase
      .from('contributions')
      .select(`
        *,
        user:users(*)
      `)
      .eq('week', week)
      .eq('status', 'unpaid')

    if (error) {
      console.error('Error fetching contributions:', error)
      return NextResponse.json(
        { error: 'Có lỗi khi lấy dữ liệu' },
        { status: 500 }
      )
    }

    if (!contributions || contributions.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Không có contribution nào chưa đóng cho tuần ${week}`,
        processed: 0
      })
    }

    let notificationsSent = 0

    for (const contribution of contributions) {
      try {
        // Gửi thông báo Zalo nếu có cấu hình
        if (zaloAPI.canSendMessage() && contribution.user) {
          const message = messageTemplates.reminder(
            contribution.user.name,
            contribution.week,
            contribution.amount,
            contribution.due_date
          )

          const success = await zaloAPI.sendMessage(contribution.user.phone, message)
          if (success) {
            notificationsSent++
          }

          // Delay để tránh rate limit
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

      } catch (error) {
        console.error('Error sending reminder:', error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã gửi nhắc nhở cho ${notificationsSent}/${contributions.length} thành viên tuần ${week}`,
      processed: contributions.length,
      notificationsSent
    })

  } catch (error) {
    console.error('Error in weekly-reminder cron:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra trong cron job' },
      { status: 500 }
    )
  }
}


