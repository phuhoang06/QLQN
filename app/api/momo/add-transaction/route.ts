import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { 
      userId, 
      week, 
      amount, 
      transactionId, 
      transactionTime,
      note 
    } = await request.json()

    if (!userId || !week || !amount || !transactionId) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      )
    }

    // Tìm contribution tương ứng
    const { data: contribution, error: contribError } = await supabase
      .from('contributions')
      .select('*')
      .eq('user_id', userId)
      .eq('week', week)
      .eq('status', 'unpaid')
      .single()

    if (contribError || !contribution) {
      return NextResponse.json(
        { error: 'Không tìm thấy đóng góp chưa thanh toán cho tuần này' },
        { status: 404 }
      )
    }

    // Kiểm tra số tiền có khớp không
    if (contribution.amount !== amount) {
      return NextResponse.json(
        { 
          error: `Số tiền không khớp. Đóng góp: ${contribution.amount.toLocaleString()} VNĐ, Giao dịch: ${amount.toLocaleString()} VNĐ` 
        },
        { status: 400 }
      )
    }

    // Tạo order ID
    const orderId = `MANUAL_${contribution.id}_${Date.now()}`

    // Lưu giao dịch vào database
    const { data: transaction, error: transError } = await supabase
      .from('payment_transactions')
      .insert({
        contribution_id: contribution.id,
        user_id: userId,
        order_id: orderId,
        amount: amount,
        status: 'success',
        momo_trans_id: transactionId,
        paid_at: transactionTime || new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (transError) {
      console.error('Error saving transaction:', transError)
      return NextResponse.json(
        { error: 'Có lỗi khi lưu giao dịch' },
        { status: 500 }
      )
    }

    // Cập nhật trạng thái contribution
    const { error: updateError } = await supabase
      .from('contributions')
      .update({
        status: 'paid',
        paid_at: transactionTime || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', contribution.id)

    if (updateError) {
      console.error('Error updating contribution:', updateError)
      return NextResponse.json(
        { error: 'Có lỗi khi cập nhật trạng thái đóng góp' },
        { status: 500 }
      )
    }

    // Lấy thông tin user để gửi thông báo
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    // Gửi thông báo thành công qua Zalo
    if (user?.phone) {
      try {
        await fetch('/api/zalo/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: user.phone,
            message: `✅ Đã xác nhận thanh toán!\n\nĐóng góp tuần ${week}: ${amount.toLocaleString()} VNĐ\nThời gian: ${new Date().toLocaleString('vi-VN')}\n${note ? `Ghi chú: ${note}` : ''}\n\nCảm ơn bạn đã đóng góp!`
          })
        })
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xác nhận thanh toán thành công',
      transaction: transaction,
      contribution: {
        id: contribution.id,
        week: contribution.week,
        amount: contribution.amount,
        status: 'paid'
      }
    })

  } catch (error) {
    console.error('Error adding transaction:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra khi thêm giao dịch' },
      { status: 500 }
    )
  }
}


