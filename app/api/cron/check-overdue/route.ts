import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { zaloAPI, messageTemplates } from '@/lib/zalo'

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra API key để bảo mật (tùy chọn)
    const authHeader = request.headers.get('authorization')
    const expectedAuth = process.env.CRON_SECRET || 'your-cron-secret'
    
    if (authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const today = new Date().toISOString().split('T')[0]
    const penaltyAmount = parseInt(process.env.PENALTY_AMOUNT || '5000')
    const gracePeriodDays = parseInt(process.env.PENALTY_GRACE_PERIOD_DAYS || '7')

    // Tính ngày bắt đầu tính phạt
    const penaltyStartDate = new Date()
    penaltyStartDate.setDate(penaltyStartDate.getDate() - gracePeriodDays)
    const penaltyStartDateStr = penaltyStartDate.toISOString().split('T')[0]

    // Tìm các contribution quá hạn chưa được đánh dấu overdue
    const { data: overdueContributions, error } = await supabase
      .from('contributions')
      .select(`
        *,
        user:users(*)
      `)
      .eq('status', 'unpaid')
      .lt('due_date', penaltyStartDateStr)

    if (error) {
      console.error('Error fetching overdue contributions:', error)
      return NextResponse.json(
        { error: 'Có lỗi khi lấy dữ liệu' },
        { status: 500 }
      )
    }

    if (!overdueContributions || overdueContributions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không có contribution nào quá hạn',
        processed: 0
      })
    }

    let processed = 0
    let notificationsSent = 0

    for (const contribution of overdueContributions) {
      try {
        // Tính phạt theo số tuần quá hạn
        const dueDate = new Date(contribution.due_date)
        const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        const weeksOverdue = Math.max(1, Math.ceil(daysOverdue / 7))
        const calculatedPenalty = penaltyAmount * weeksOverdue

        // Cập nhật status thành overdue và tính phạt
        const { error: updateError } = await supabase
          .from('contributions')
          .update({
            status: 'overdue',
            penalty: calculatedPenalty,
            updated_at: new Date().toISOString()
          })
          .eq('id', contribution.id)

        if (updateError) {
          console.error('Error updating contribution:', updateError)
          continue
        }

        processed++

        // Gửi thông báo Zalo nếu có cấu hình
        if (zaloAPI.canSendMessage() && contribution.user) {
          const message = messageTemplates.overdue(
            contribution.user.name,
            contribution.week,
            contribution.amount,
            calculatedPenalty,
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
        console.error('Error processing contribution:', error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã xử lý ${processed} contribution quá hạn`,
      processed,
      notificationsSent
    })

  } catch (error) {
    console.error('Error in check-overdue cron:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra trong cron job' },
      { status: 500 }
    )
  }
}
