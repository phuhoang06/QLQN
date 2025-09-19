'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, type User, type Contribution } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Calendar, Users, DollarSign, AlertCircle, CheckCircle, TrendingUp, Clock, CreditCard, BookOpen } from 'lucide-react'

export default function MemberDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  const [user, setUser] = useState<User | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalUnpaid: 0,
    totalPenalty: 0,
    totalContributions: 0,
    paidCount: 0,
    unpaidCount: 0,
    overdueCount: 0
  })

  useEffect(() => {
    if (userId) {
      loadUserData()
    }
  }, [userId])

  const handleMomoPayment = async (contribution: Contribution) => {
    if (processingPayment === contribution.id) return
    
    setProcessingPayment(contribution.id)
    
    try {
      const response = await fetch('/api/momo/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contributionId: contribution.id,
          userId: userId,
          amount: contribution.amount,
          orderInfo: `Đóng góp tuần ${contribution.week} - ${user?.name}`
        })
      })

      const result = await response.json()

      if (response.ok && result.paymentUrl) {
        // Mở link thanh toán Momo
        window.open(result.paymentUrl, '_blank')
      } else {
        console.error('Payment creation failed:', result.error)
        alert(result.error || 'Không thể tạo thanh toán')
      }
    } catch (error) {
      console.error('Error creating payment:', error)
      alert('Có lỗi xảy ra khi tạo thanh toán')
    } finally {
      setProcessingPayment(null)
    }
  }

  const loadUserData = async () => {
    try {
      // Lấy thông tin user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError || !userData) {
        router.push('/')
        return
      }

      setUser(userData)

      // Lấy contributions của user
      const { data: contributionsData, error: contributionsError } = await supabase
        .from('contributions')
        .select('*')
        .eq('user_id', userId)
        .order('week', { ascending: false })

      if (contributionsError) {
        console.error('Error loading contributions:', contributionsError)
        return
      }

      setContributions(contributionsData || [])
      calculateStats(contributionsData || [])

    } catch (error) {
      console.error('Error loading user data:', error)
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = (contribs: Contribution[]) => {
    const totalPaid = contribs
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.amount, 0)

    const totalUnpaid = contribs
      .filter(c => c.status === 'unpaid' || c.status === 'overdue')
      .reduce((sum, c) => sum + c.amount, 0)

    const totalPenalty = contribs
      .reduce((sum, c) => sum + c.penalty, 0)

    const paidCount = contribs.filter(c => c.status === 'paid').length
    const unpaidCount = contribs.filter(c => c.status === 'unpaid').length
    const overdueCount = contribs.filter(c => c.status === 'overdue').length

    setStats({
      totalPaid,
      totalUnpaid,
      totalPenalty,
      totalContributions: contribs.length,
      paidCount,
      unpaidCount,
      overdueCount
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-50'
      case 'unpaid':
        return 'text-yellow-600 bg-yellow-50'
      case 'overdue':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Đã đóng'
      case 'unpaid':
        return 'Chưa đóng'
      case 'overdue':
        return 'Quá hạn'
      default:
        return 'Không xác định'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />
      case 'unpaid':
        return <Clock className="h-4 w-4" />
      case 'overdue':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Không tìm thấy thành viên</h1>
          <button
            onClick={() => router.push('/')}
            className="btn btn-primary"
          >
            Về trang chủ
          </button>
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
                Dashboard Cá Nhân
              </h1>
              <p className="text-gray-600">
                Xin chào, {user.name}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push(`/payment-guide/${userId}`)}
                className="btn btn-primary flex items-center"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Hướng dẫn thanh toán
              </button>
              <button
                onClick={() => router.push('/')}
                className="btn btn-secondary"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Đã đóng</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalPaid)}
                </p>
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
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(stats.totalUnpaid)}
                </p>
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
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats.totalPenalty)}
                </p>
                <p className="text-xs text-gray-500">{stats.overdueCount} tuần</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tổng đóng góp</p>
                <p className="text-2xl font-bold text-primary-600">
                  {formatCurrency(stats.totalPaid + stats.totalUnpaid)}
                </p>
                <p className="text-xs text-gray-500">{stats.totalContributions} tuần</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tiến độ đóng góp
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Tỷ lệ hoàn thành</span>
                <span>{stats.totalContributions > 0 ? Math.round((stats.paidCount / stats.totalContributions) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
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

        {/* Contributions Table */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Lịch sử đóng góp chi tiết
          </h2>
          
          {contributions.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Chưa có dữ liệu đóng góp</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tuần
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số tiền
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phạt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hạn nộp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày nộp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contributions.map((contribution) => (
                    <tr key={contribution.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Tuần {contribution.week}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(contribution.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(contribution.status)}
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contribution.status)}`}>
                            {getStatusText(contribution.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {contribution.penalty > 0 ? formatCurrency(contribution.penalty) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(contribution.due_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {contribution.paid_at ? formatDate(contribution.paid_at) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {contribution.status !== 'paid' && (
                          <span className="text-sm text-gray-500">
                            Chuyển tiền vào quỹ nhóm
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Số tiền</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Đã đóng:</span>
                  <span className="font-medium text-green-600">{formatCurrency(stats.totalPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Còn nợ:</span>
                  <span className="font-medium text-yellow-600">{formatCurrency(stats.totalUnpaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tiền phạt:</span>
                  <span className="font-medium text-red-600">{formatCurrency(stats.totalPenalty)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium text-gray-900">Tổng cộng:</span>
                  <span className="font-bold text-primary-600">{formatCurrency(stats.totalPaid + stats.totalUnpaid + stats.totalPenalty)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
