import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    const { week, amount, dueDate } = await request.json()

    if (!week || !amount || !dueDate) {
      return NextResponse.json(
        { error: 'Week, amount và dueDate là bắt buộc' },
        { status: 400 }
      )
    }

    // Lấy tất cả user active
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('status', 'active')

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Có lỗi khi lấy danh sách user' },
        { status: 500 }
      )
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không có user nào để tạo đóng góp',
        created: 0
      })
    }

    // Kiểm tra xem đã tạo đóng góp cho tuần này chưa
    const { data: existingContributions, error: checkError } = await supabase
      .from('contributions')
      .select('id')
      .eq('week', week)

    if (checkError) {
      console.error('Error checking existing contributions:', checkError)
      return NextResponse.json(
        { error: 'Có lỗi khi kiểm tra đóng góp hiện tại' },
        { status: 500 }
      )
    }

    if (existingContributions && existingContributions.length > 0) {
      return NextResponse.json({
        success: true,
        message: `Đã tồn tại đóng góp cho tuần ${week}`,
        created: 0
      })
    }

    // Tạo đóng góp cho tất cả user
    const contributions = users.map(user => ({
      user_id: user.id,
      week: week,
      amount: amount,
      due_date: dueDate,
      status: 'unpaid'
    }))

    const { error: insertError } = await supabase
      .from('contributions')
      .insert(contributions)

    if (insertError) {
      console.error('Error creating contributions:', insertError)
      return NextResponse.json(
        { error: 'Có lỗi khi tạo đóng góp' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Đã tạo đóng góp tuần ${week} cho ${users.length} thành viên`,
      created: users.length
    })

  } catch (error) {
    console.error('Error in create-weekly-contributions cron:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra trong cron job' },
      { status: 500 }
    )
  }
}


