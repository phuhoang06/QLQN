import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PUT - Cập nhật lịch đóng góp
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { name, type, amount, day_of_week, day_of_month, is_active } = body

    // Validation
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
      .update({
        name,
        type,
        amount,
        day_of_week: type === 'weekly' ? day_of_week : null,
        day_of_month: type === 'monthly' ? day_of_month : null,
        is_active
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating schedule:', error)
      return NextResponse.json(
        { error: 'Có lỗi khi cập nhật lịch đóng góp' },
        { status: 500 }
      )
    }

    return NextResponse.json({ schedule: data })
  } catch (error) {
    console.error('Error in PUT /api/schedules/[id]:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}

// DELETE - Xóa lịch đóng góp
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { error } = await supabase
      .from('contribution_schedules')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting schedule:', error)
      return NextResponse.json(
        { error: 'Có lỗi khi xóa lịch đóng góp' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/schedules/[id]:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}


