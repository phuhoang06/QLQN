import { NextRequest, NextResponse } from 'next/server'
import { supabase, type ContributionSchedule } from '@/lib/supabase'

// GET - Lấy danh sách lịch đóng góp
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('contribution_schedules')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching schedules:', error)
      return NextResponse.json(
        { error: 'Có lỗi khi lấy danh sách lịch đóng góp' },
        { status: 500 }
      )
    }

    return NextResponse.json({ schedules: data })
  } catch (error) {
    console.error('Error in GET /api/schedules:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}

// POST - Tạo lịch đóng góp mới
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, amount, day_of_week, day_of_month } = body

    // Validation
    if (!name || !type || !amount) {
      return NextResponse.json(
        { error: 'Tên, loại và số tiền là bắt buộc' },
        { status: 400 }
      )
    }

    if (type === 'weekly' && (day_of_week === undefined || day_of_week < 0 || day_of_week > 6)) {
      return NextResponse.json(
        { error: 'Ngày trong tuần phải từ 0-6 (Chủ nhật-Thứ 7)' },
        { status: 400 }
      )
    }

    if (type === 'monthly' && (day_of_month === undefined || day_of_month < 1 || day_of_month > 31)) {
      return NextResponse.json(
        { error: 'Ngày trong tháng phải từ 1-31' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('contribution_schedules')
      .insert({
        name,
        type,
        amount,
        day_of_week: type === 'weekly' ? day_of_week : null,
        day_of_month: type === 'monthly' ? day_of_month : null,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating schedule:', error)
      return NextResponse.json(
        { error: 'Có lỗi khi tạo lịch đóng góp' },
        { status: 500 }
      )
    }

    return NextResponse.json({ schedule: data })
  } catch (error) {
    console.error('Error in POST /api/schedules:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}


