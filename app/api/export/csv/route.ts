import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Kiểm tra quyền admin (tùy chọn)
    const authHeader = request.headers.get('authorization')
    const expectedAuth = process.env.ADMIN_SECRET_CODE || 'admin123'
    
    if (authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Lấy tất cả dữ liệu
    const { data: contributions, error: contributionsError } = await supabase
      .from('contributions')
      .select(`
        *,
        user:users(*)
      `)
      .order('week', { ascending: false })

    if (contributionsError) {
      return NextResponse.json(
        { error: 'Có lỗi khi lấy dữ liệu contributions' },
        { status: 500 }
      )
    }

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (usersError) {
      return NextResponse.json(
        { error: 'Có lỗi khi lấy dữ liệu users' },
        { status: 500 }
      )
    }

    // Tạo CSV content
    const csvContent = generateCSV(users || [], contributions || [])

    // Trả về file CSV
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="bao-cao-quy-nhom-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })

  } catch (error) {
    console.error('Error exporting CSV:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra khi xuất báo cáo' },
      { status: 500 }
    )
  }
}

function generateCSV(users: any[], contributions: any[]): string {
  const headers = [
    'Tên thành viên',
    'Số điện thoại',
    'Trạng thái',
    'Tuần',
    'Số tiền',
    'Trạng thái đóng góp',
    'Tiền phạt',
    'Hạn nộp',
    'Ngày nộp',
    'Ngày tạo'
  ]

  const rows = contributions.map(contrib => [
    contrib.user?.name || 'N/A',
    contrib.user?.phone || 'N/A',
    contrib.user?.status || 'N/A',
    contrib.week,
    contrib.amount,
    contrib.status === 'paid' ? 'Đã đóng' : 
    contrib.status === 'unpaid' ? 'Chưa đóng' : 'Quá hạn',
    contrib.penalty,
    contrib.due_date,
    contrib.paid_at || '',
    contrib.created_at
  ])

  // Tạo summary rows
  const summaryRows = [
    [],
    ['=== TỔNG KẾT ==='],
    ['Tổng thành viên', users.length],
    ['Thành viên hoạt động', users.filter(u => u.status === 'active').length],
    ['Tổng đóng góp', contributions.length],
    ['Đã đóng', contributions.filter(c => c.status === 'paid').length],
    ['Chưa đóng', contributions.filter(c => c.status === 'unpaid').length],
    ['Quá hạn', contributions.filter(c => c.status === 'overdue').length],
    ['Tổng tiền', contributions.reduce((sum, c) => sum + c.amount, 0)],
    ['Tổng phạt', contributions.reduce((sum, c) => sum + c.penalty, 0)],
    [],
    ['=== CHI TIẾT THEO THÀNH VIÊN ===']
  ]

  // Thêm thống kê theo từng thành viên
  users.forEach(user => {
    const userContribs = contributions.filter(c => c.user_id === user.id)
    const totalPaid = userContribs.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0)
    const totalUnpaid = userContribs.filter(c => c.status === 'unpaid' || c.status === 'overdue').reduce((sum, c) => sum + c.amount, 0)
    const totalPenalty = userContribs.reduce((sum, c) => sum + c.penalty, 0)
    const paidCount = userContribs.filter(c => c.status === 'paid').length
    const totalCount = userContribs.length
    const completionRate = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0

    summaryRows.push([
      user.name,
      user.phone,
      user.status === 'active' ? 'Hoạt động' : 'Không hoạt động',
      `${paidCount}/${totalCount}`,
      `${completionRate}%`,
      totalPaid,
      totalUnpaid,
      totalPenalty
    ])
  })

  // Kết hợp tất cả
  const allRows = [headers, ...rows, ...summaryRows]

  // Convert to CSV format
  return allRows.map(row => 
    row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const cellStr = String(cell || '')
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`
      }
      return cellStr
    }).join(',')
  ).join('\n')
}


