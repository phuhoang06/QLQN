import { NextRequest, NextResponse } from 'next/server'
import { zaloAPI, messageTemplates } from '@/lib/zalo'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { messageType, week, customMessage } = await request.json()

    if (!zaloAPI.canSendMessage()) {
      return NextResponse.json(
        { error: 'Zalo OA chưa được cấu hình' },
        { status: 400 }
      )
    }

    // Lấy danh sách tất cả user active
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, phone')
      .eq('status', 'active')

    if (error || !users || users.length === 0) {
      return NextResponse.json(
        { error: 'Không có user nào để gửi tin nhắn' },
        { status: 404 }
      )
    }

    let message = customMessage || ''

    // Nếu không có custom message, tạo message theo template
    if (!customMessage) {
      switch (messageType) {
        case 'weekly_reminder':
          message = `🔔 Nhắc nhở đóng quỹ tuần ${week}\n\nXin chào tất cả thành viên!\n\nTuần ${week} đã đến hạn đóng quỹ.\nVui lòng đóng tiền đúng hạn để tránh bị phạt.\n\nCảm ơn các bạn!`
          break
        case 'monthly_report':
          // Lấy thống kê tháng
          const currentMonth = new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
          message = `📊 Báo cáo tháng ${currentMonth}\n\nXin chào tất cả thành viên!\n\nBáo cáo tình hình đóng quỹ tháng ${currentMonth} đã được cập nhật.\nVui lòng kiểm tra dashboard để xem chi tiết.\n\nCảm ơn các bạn!`
          break
        default:
          return NextResponse.json(
            { error: 'Loại tin nhắn không hợp lệ' },
            { status: 400 }
          )
      }
    }

    // Lấy danh sách phone numbers (giả sử phone = Zalo user_id)
    const phoneNumbers = users.map(user => user.phone)

    // Gửi broadcast
    const result = await zaloAPI.sendBroadcast(phoneNumbers, message)

    return NextResponse.json({
      success: true,
      message: `Đã gửi tin nhắn cho ${result.success}/${phoneNumbers.length} thành viên`,
      details: result
    })

  } catch (error) {
    console.error('Error sending broadcast:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra khi gửi broadcast' },
      { status: 500 }
    )
  }
}


