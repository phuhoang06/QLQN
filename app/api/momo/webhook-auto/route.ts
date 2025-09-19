import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Verify webhook signature từ Momo (nếu có)
    const signature = request.headers.get('x-momo-signature')
    const expectedSignature = crypto
      .createHmac('sha256', process.env.MOMO_WEBHOOK_SECRET || 'your-webhook-secret')
      .update(JSON.stringify(body))
      .digest('hex')
    
    if (signature !== expectedSignature) {
      console.error('Invalid Momo webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const {
      transactionId,
      amount,
      description,
      timestamp,
      phoneNumber,
      partnerCode
    } = body

    // Kiểm tra xem có phải giao dịch vào quỹ nhóm không
    if (!description || !description.includes('QUY_NHOM') || !description.includes('TUAN')) {
      return NextResponse.json({ success: true, message: 'Not a group fund transaction' })
    }

    // Parse thông tin từ description
    // Format: "QUY_NHOM_TUAN_5_100000" hoặc "DONG_GOP_TUAN_3_50000"
    const weekMatch = description.match(/TUAN[_\s]*(\d+)/i)
    const amountMatch = description.match(/(\d+)$/)
    
    if (!weekMatch || !amountMatch) {
      console.error('Cannot parse transaction info from description:', description)
      return NextResponse.json({ error: 'Invalid transaction format' }, { status: 400 })
    }

    const week = parseInt(weekMatch[1])
    const transactionAmount = parseInt(amountMatch[1])

    // Tìm user theo số điện thoại
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phoneNumber)
      .single()

    if (userError || !user) {
      console.error('User not found for phone:', phoneNumber)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Tìm contribution chưa thanh toán cho tuần này
    const { data: contribution, error: contribError } = await supabase
      .from('contributions')
      .select('*')
      .eq('user_id', user.id)
      .eq('week', week)
      .eq('status', 'unpaid')
      .single()

    if (contribError || !contribution) {
      console.error('No unpaid contribution found for week:', week, 'user:', user.id)
      return NextResponse.json({ error: 'No unpaid contribution found' }, { status: 404 })
    }

    // Kiểm tra số tiền có khớp không (cho phép sai lệch nhỏ)
    const amountDifference = Math.abs(contribution.amount - transactionAmount)
    if (amountDifference > 1000) { // Cho phép sai lệch 1000 VNĐ
      console.error('Amount mismatch:', contribution.amount, 'vs', transactionAmount)
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }

    // Kiểm tra xem đã xử lý giao dịch này chưa
    const { data: existingTransaction } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('momo_trans_id', transactionId)
      .single()

    if (existingTransaction) {
      return NextResponse.json({ success: true, message: 'Transaction already processed' })
    }

    // Tạo order ID
    const orderId = `AUTO_${contribution.id}_${Date.now()}`

    // Lưu giao dịch
    const { error: transError } = await supabase
      .from('payment_transactions')
      .insert({
        contribution_id: contribution.id,
        user_id: user.id,
        order_id: orderId,
        amount: transactionAmount,
        status: 'success',
        momo_trans_id: transactionId,
        paid_at: new Date(timestamp).toISOString(),
        created_at: new Date().toISOString()
      })

    if (transError) {
      console.error('Error saving transaction:', transError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Cập nhật trạng thái contribution
    const { error: updateError } = await supabase
      .from('contributions')
      .update({
        status: 'paid',
        paid_at: new Date(timestamp).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', contribution.id)

    if (updateError) {
      console.error('Error updating contribution:', updateError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Gửi thông báo thành công
    try {
      await fetch('/api/zalo/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: user.phone,
          message: `✅ Thanh toán tự động thành công!\n\nĐóng góp tuần ${week}: ${transactionAmount.toLocaleString()} VNĐ\nThời gian: ${new Date(timestamp).toLocaleString('vi-VN')}\nMã giao dịch: ${transactionId}\n\nCảm ơn bạn đã đóng góp!`
        })
      })
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError)
    }

    console.log(`Auto-processed payment: ${user.name} - Week ${week} - ${transactionAmount} VNĐ`)

    return NextResponse.json({
      success: true,
      message: 'Payment processed automatically',
      contribution: {
        id: contribution.id,
        week: contribution.week,
        amount: contribution.amount,
        user: user.name
      }
    })

  } catch (error) {
    console.error('Error processing Momo webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


