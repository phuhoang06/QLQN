import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { momoPayment } from '@/lib/momo'

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

    // Lấy tất cả đóng góp chưa thanh toán
    const { data: unpaidContributions, error: contribError } = await supabase
      .from('contributions')
      .select(`
        *,
        user:users(*)
      `)
      .in('status', ['unpaid', 'overdue'])

    if (contribError) {
      console.error('Error fetching unpaid contributions:', contribError)
      return NextResponse.json(
        { error: 'Có lỗi khi lấy danh sách đóng góp' },
        { status: 500 }
      )
    }

    if (!unpaidContributions || unpaidContributions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không có đóng góp nào cần kiểm tra',
        checked: 0,
        updated: 0
      })
    }

    let updatedCount = 0
    const checkedTransactions = new Set<string>()

    // Kiểm tra từng đóng góp
    for (const contribution of unpaidContributions) {
      try {
        // Tạo order ID để tìm kiếm giao dịch
        const orderId = `CONTRIB_${contribution.id}_${contribution.user_id}`
        
        // Kiểm tra xem đã kiểm tra giao dịch này chưa
        if (checkedTransactions.has(orderId)) {
          continue
        }
        checkedTransactions.add(orderId)

        // Gọi API Momo để kiểm tra lịch sử giao dịch
        // Note: Momo không có API public để query lịch sử, 
        // nên chúng ta sẽ dùng webhook hoặc kiểm tra thủ công
        
        // Thay vào đó, kiểm tra trong database xem có giao dịch nào khớp không
        const { data: existingTransaction, error: transError } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('contribution_id', contribution.id)
          .eq('status', 'success')
          .single()

        if (transError && transError.code !== 'PGRST116') {
          console.error('Error checking transaction:', transError)
          continue
        }

        // Nếu tìm thấy giao dịch thành công, cập nhật trạng thái
        if (existingTransaction) {
          const { error: updateError } = await supabase
            .from('contributions')
            .update({
              status: 'paid',
              paid_at: existingTransaction.paid_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', contribution.id)

          if (updateError) {
            console.error('Error updating contribution:', updateError)
          } else {
            updatedCount++
            console.log(`Updated contribution ${contribution.id} to paid status`)
            
            // Gửi thông báo thành công qua Zalo
            try {
              await fetch('/api/zalo/send-message', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  phone: contribution.user?.phone,
                  message: `✅ Đã xác nhận thanh toán!\n\nĐóng góp tuần ${contribution.week}: ${contribution.amount.toLocaleString()} VNĐ\nThời gian: ${new Date().toLocaleString('vi-VN')}\n\nCảm ơn bạn đã đóng góp!`
                })
              })
            } catch (notificationError) {
              console.error('Error sending notification:', notificationError)
            }
          }
        }

      } catch (error) {
        console.error('Error processing contribution:', error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã kiểm tra ${checkedTransactions.size} giao dịch, cập nhật ${updatedCount} đóng góp`,
      checked: checkedTransactions.size,
      updated: updatedCount
    })

  } catch (error) {
    console.error('Error in check-transactions cron:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra trong cron job' },
      { status: 500 }
    )
  }
}


