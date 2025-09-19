import { NextRequest, NextResponse } from 'next/server'
import { momoPayment } from '@/lib/momo'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { contributionId, userId, amount, orderInfo } = await request.json()

    if (!contributionId || !userId || !amount) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      )
    }

    // Kiểm tra contribution có tồn tại không
    const { data: contribution, error: contribError } = await supabase
      .from('contributions')
      .select('*, user:users(*)')
      .eq('id', contributionId)
      .eq('user_id', userId)
      .single()

    if (contribError || !contribution) {
      return NextResponse.json(
        { error: 'Không tìm thấy đóng góp' },
        { status: 404 }
      )
    }

    if (contribution.status === 'paid') {
      return NextResponse.json(
        { error: 'Đóng góp đã được thanh toán' },
        { status: 400 }
      )
    }

    // Tạo order ID unique
    const orderId = `CONTRIB_${contributionId}_${Date.now()}`
    
    // Tạo return URL và notify URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const returnUrl = `${baseUrl}/payment/success?orderId=${orderId}`
    const notifyUrl = `${baseUrl}/api/momo/webhook`

    // Tạo thanh toán Momo
    const momoResponse = await momoPayment.createPayment(
      amount,
      orderId,
      orderInfo || `Đóng góp tuần ${contribution.week} - ${contribution.user?.name}`,
      returnUrl,
      notifyUrl,
      JSON.stringify({ contributionId, userId })
    )

    if (momoResponse.resultCode !== 0) {
      return NextResponse.json(
        { error: momoResponse.message || 'Không thể tạo thanh toán' },
        { status: 400 }
      )
    }

    // Lưu thông tin thanh toán vào database (tạo bảng payment_transactions nếu cần)
    const { error: paymentError } = await supabase
      .from('payment_transactions')
      .insert({
        contribution_id: contributionId,
        user_id: userId,
        order_id: orderId,
        amount: amount,
        status: 'pending',
        momo_trans_id: null,
        payment_url: momoResponse.payUrl,
        qr_code_url: momoResponse.qrCodeUrl,
        created_at: new Date().toISOString()
      })

    if (paymentError) {
      console.error('Error saving payment transaction:', paymentError)
      // Không throw error vì thanh toán đã được tạo thành công
    }

    return NextResponse.json({
      success: true,
      paymentUrl: momoResponse.payUrl,
      qrCodeUrl: momoResponse.qrCodeUrl,
      deeplink: momoResponse.deeplink,
      orderId: orderId
    })

  } catch (error) {
    console.error('Error creating Momo payment:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra khi tạo thanh toán' },
      { status: 500 }
    )
  }
}


