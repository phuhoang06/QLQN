'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type User, type Contribution } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createAdminSession, getAdminSession, setAdminSession, clearAdminSession, verifyAdminCode } from '@/lib/auth'
import { Users, DollarSign, TrendingUp, AlertCircle, CheckCircle, Clock, BarChart3, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminStatsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalContributions: 0,
    totalAmount: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    penaltyAmount: 0,
    paidCount: 0,
    unpaidCount: 0,
    overdueCount: 0
  })
  const [userStats, setUserStats] = useState<Array<{
    user: User
    totalPaid: number
    totalUnpaid: number
    totalPenalty: number
    paidCount: number
    unpaidCount: number
    overdueCount: number
    completionRate: number
  }>>([])
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = () => {
    // Kiểm tra session hiện tại
    const existingSession = getAdminSession()
    if (existingSession) {
      setIsAuthenticated(true)
      loadData()
      return
    }

    // Nếu chưa có session, yêu cầu nhập mã
    const adminCode = prompt('Nhập mã quản trị viên:')
    if (adminCode && verifyAdminCode(adminCode)) {
      const session = createAdminSession()
      setAdminSession(session)
      setIsAuthenticated(true)
      loadData()
    } else {
      alert('Mã không đúng!')
      router.push('/')
    }
  }

  const loadData = async () => {
    try {
      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError
      setUsers(usersData || [])

      // Load contributions
      const { data: contributionsData, error: contributionsError } = await supabase
        .from('contributions')
        .select(`
          *,
          user:users(*)
        `)
        .order('week', { ascending: false })

      if (contributionsError) throw contributionsError
      setContributions(contributionsData || [])

      // Calculate stats
      calculateStats(usersData || [], contributionsData || [])

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = (usersData: User[], contribsData: Contribution[]) => {
    const totalUsers = usersData.length
    const activeUsers = usersData.filter(u => u.status === 'active').length
    const totalContributions = contribsData.length
    const totalAmount = contribsData.reduce((sum, c) => sum + c.amount, 0)
    const paidAmount = contribsData.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0)
    const unpaidAmount = contribsData.filter(c => c.status === 'unpaid' || c.status === 'overdue').reduce((sum, c) => sum + c.amount, 0)
    const penaltyAmount = contribsData.reduce((sum, c) => sum + c.penalty, 0)
    const paidCount = contribsData.filter(c => c.status === 'paid').length
    const unpaidCount = contribsData.filter(c => c.status === 'unpaid').length
    const overdueCount = contribsData.filter(c => c.status === 'overdue').length

    setStats({
      totalUsers,
      activeUsers,
      totalContributions,
      totalAmount,
      paidAmount,
      unpaidAmount,
      penaltyAmount,
      paidCount,
      unpaidCount,
      overdueCount
    })

    // Calculate user stats
    const userStatsData = usersData.map(user => {
      const userContribs = contribsData.filter(c => c.user_id === user.id)
      const totalPaid = userContribs.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0)
      const totalUnpaid = userContribs.filter(c => c.status === 'unpaid' || c.status === 'overdue').reduce((sum, c) => sum + c.amount, 0)
      const totalPenalty = userContribs.reduce((sum, c) => sum + c.penalty, 0)
      const paidCount = userContribs.filter(c => c.status === 'paid').length
      const unpaidCount = userContribs.filter(c => c.status === 'unpaid').length
      const overdueCount = userContribs.filter(c => c.status === 'overdue').length
      const completionRate = userContribs.length > 0 ? (paidCount / userContribs.length) * 100 : 0

      return {
        user,
        totalPaid,
        totalUnpaid,
        totalPenalty,
        paidCount,
        unpaidCount,
        overdueCount,
        completionRate
      }
    }).sort((a, b) => b.completionRate - a.completionRate)

    setUserStats(userStatsData)
  }

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/export/csv', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SECRET_CODE || 'admin123'}`,
        },
      })

      if (!response.ok) {
        throw new Error('Không thể xuất báo cáo')
      }

      // Tạo blob và download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bao-cao-quy-nhom-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Đã xuất báo cáo CSV thành công!')
    } catch (error) {
      console.error('Error exporting CSV:', error)
      toast.error('Có lỗi xảy ra khi xuất báo cáo')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang xác thực...</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Thống kê nhóm
              </h1>
              <p className="text-gray-600">
                Báo cáo chi tiết tình hình đóng góp
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleExportCSV}
                className="btn btn-success flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Xuất CSV
              </button>
              <button
                onClick={() => router.push('/admin')}
                className="btn btn-secondary"
              >
                Về admin
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tổng thành viên</p>
                <p className="text-2xl font-bold text-primary-600">{stats.totalUsers}</p>
                <p className="text-xs text-gray-500">{stats.activeUsers} hoạt động</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Đã đóng</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidAmount)}</p>
                <p className="text-xs text-gray-500">{stats.paidCount} tuần</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Chưa đóng</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.unpaidAmount)}</p>
                <p className="text-xs text-gray-500">{stats.unpaidCount} tuần</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tiền phạt</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.penaltyAmount)}</p>
                <p className="text-xs text-gray-500">{stats.overdueCount} tuần</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tổng quan tiến độ
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Tỷ lệ hoàn thành chung</span>
                <span>{stats.totalContributions > 0 ? Math.round((stats.paidCount / stats.totalContributions) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${stats.totalContributions > 0 ? (stats.paidCount / stats.totalContributions) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.paidCount}</p>
                <p className="text-sm text-gray-600">Đã đóng</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.unpaidCount}</p>
                <p className="text-sm text-gray-600">Chưa đóng</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.overdueCount}</p>
                <p className="text-sm text-gray-600">Quá hạn</p>
              </div>
            </div>
          </div>
        </div>

        {/* Member Performance */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Hiệu suất thành viên
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thành viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hoàn thành
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Đã đóng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chưa đóng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phạt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tỷ lệ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userStats.map((userStat) => (
                  <tr key={userStat.user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {userStat.user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {userStat.user.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {userStat.paidCount}/{userStat.paidCount + userStat.unpaidCount + userStat.overdueCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {formatCurrency(userStat.totalPaid)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                      {formatCurrency(userStat.totalUnpaid)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {formatCurrency(userStat.totalPenalty)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              userStat.completionRate >= 80 ? 'bg-green-600' :
                              userStat.completionRate >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${userStat.completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {Math.round(userStat.completionRate)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-8 card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tóm tắt tài chính
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Tổng quan</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng số tuần:</span>
                  <span className="font-medium">{stats.totalContributions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Đã hoàn thành:</span>
                  <span className="font-medium text-green-600">{stats.paidCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Chưa hoàn thành:</span>
                  <span className="font-medium text-yellow-600">{stats.unpaidCount + stats.overdueCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tỷ lệ hoàn thành:</span>
                  <span className="font-medium text-primary-600">
                    {stats.totalContributions > 0 ? Math.round((stats.paidCount / stats.totalContributions) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Số tiền</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng quỹ:</span>
                  <span className="font-medium">{formatCurrency(stats.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Đã thu:</span>
                  <span className="font-medium text-green-600">{formatCurrency(stats.paidAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Chưa thu:</span>
                  <span className="font-medium text-yellow-600">{formatCurrency(stats.unpaidAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tiền phạt:</span>
                  <span className="font-medium text-red-600">{formatCurrency(stats.penaltyAmount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium text-gray-900">Tổng cộng:</span>
                  <span className="font-bold text-primary-600">{formatCurrency(stats.totalAmount + stats.penaltyAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
