import { NextRequest, NextResponse } from 'next/server'
import { momoPayment, type MomoWebhookData } from '@/lib/momo'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const webhookData: MomoWebhookData = await request.json()

    // Verify signature
    if (!momoPayment.verifyWebhookSignature(webhookData)) {
      console.error('Invalid Momo webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    const {
      orderId,
      transId,
      resultCode,
      amount,
      extraData
    } = webhookData

    // Parse extra data to get contribution info
    let contributionId: string
    let userId: string
    
    try {
      const extraDataObj = JSON.parse(extraData)
      contributionId = extraDataObj.contributionId
      userId = extraDataObj.userId
    } catch (error) {
      console.error('Error parsing extra data:', error)
      return NextResponse.json(
        { error: 'Invalid extra data' },
        { status: 400 }
      )
    }

    // Kiểm tra trạng thái thanh toán
    if (resultCode === 0) {
      // Thanh toán thành công
      try {
        // Cập nhật trạng thái contribution
        const { error: updateError } = await supabase
          .from('contributions')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', contributionId)

        if (updateError) {
          console.error('Error updating contribution:', updateError)
        }

        // Cập nhật payment transaction
        const { error: paymentError } = await supabase
          .from('payment_transactions')
          .update({
            status: 'success',
            momo_trans_id: transId,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('order_id', orderId)

        if (paymentError) {
          console.error('Error updating payment transaction:', paymentError)
        }

        // Gửi thông báo thành công qua Zalo (nếu có)
        try {
          const { data: contribution } = await supabase
            .from('contributions')
            .select('*, user:users(*)')
            .eq('id', contributionId)
            .single()

          if (contribution?.user?.phone) {
            // Gọi API gửi thông báo Zalo
            await fetch('/api/zalo/send-message', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                phone: contribution.user.phone,
                message: `✅ Thanh toán thành công!\n\nĐóng góp tuần ${contribution.week}: ${amount.toLocaleString()} VNĐ\nThời gian: ${new Date().toLocaleString('vi-VN')}\n\nCảm ơn bạn đã đóng góp!`
              })
            })
          }
        } catch (notificationError) {
          console.error('Error sending notification:', notificationError)
        }

        console.log(`Payment successful for contribution ${contributionId}`)
        
      } catch (error) {
        console.error('Error processing successful payment:', error)
      }
    } else {
      // Thanh toán thất bại
      try {
        const { error: paymentError } = await supabase
          .from('payment_transactions')
          .update({
            status: 'failed',
            momo_trans_id: transId,
            updated_at: new Date().toISOString()
          })
          .eq('order_id', orderId)

        if (paymentError) {
          console.error('Error updating failed payment:', paymentError)
        }

        console.log(`Payment failed for contribution ${contributionId}: ${webhookData.message}`)
        
      } catch (error) {
        console.error('Error processing failed payment:', error)
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error processing Momo webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


