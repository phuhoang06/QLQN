import { NextRequest, NextResponse } from 'next/server'
import { zaloAPI, messageTemplates } from '@/lib/zalo'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, messageType, week, amount, dueDate, penalty } = await request.json()

    if (!zaloAPI.canSendMessage()) {
      return NextResponse.json(
        { error: 'Zalo OA chưa được cấu hình' },
        { status: 400 }
      )
    }

    // Lấy thông tin user từ database
    const { data: user, error } = await supabase
      .from('users')
      .select('name, phone')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin user' },
        { status: 404 }
      )
    }

    let message = ''
    
    switch (messageType) {
      case 'reminder':
        message = messageTemplates.reminder(user.name, week, amount, dueDate)
        break
      case 'overdue':
        message = messageTemplates.overdue(user.name, week, amount, penalty || 0, dueDate)
        break
      case 'paid_success':
        message = messageTemplates.paidSuccess(user.name, week, amount)
        break
      default:
        return NextResponse.json(
          { error: 'Loại tin nhắn không hợp lệ' },
          { status: 400 }
        )
    }

    // Gửi tin nhắn qua Zalo
    // Lưu ý: Trong thực tế, bạn cần map phone number với Zalo user_id
    // Ở đây tôi giả sử phone number chính là Zalo user_id
    const success = await zaloAPI.sendMessage(user.phone, message)

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Tin nhắn đã được gửi thành công' 
      })
    } else {
      return NextResponse.json(
        { error: 'Không thể gửi tin nhắn' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error sending Zalo message:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra khi gửi tin nhắn' },
      { status: 500 }
    )
  }
}


