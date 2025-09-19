'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type Contribution, type User } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Calendar, Users, DollarSign, AlertCircle } from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'
import EmptyState from '@/components/EmptyState'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [currentWeek, setCurrentWeek] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Kiểm tra user đã đăng nhập chưa
    const userData = sessionStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    setUser(JSON.parse(userData))
    loadContributions()
  }, [router])

  const loadContributions = async () => {
    try {
      const userData = sessionStorage.getItem('user')
      if (!userData) return

      const { id: userId } = JSON.parse(userData)
      
      const { data, error } = await supabase
        .from('contributions')
        .select('*')
        .eq('user_id', userId)
        .order('week', { ascending: false })

      if (error) {
        console.error('Error loading contributions:', error)
        return
      }

      setContributions(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
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

  const totalPaid = contributions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount, 0)

  const totalUnpaid = contributions
    .filter(c => c.status === 'unpaid' || c.status === 'overdue')
    .reduce((sum, c) => sum + c.amount, 0)

  const totalPenalty = contributions
    .reduce((sum, c) => sum + c.penalty, 0)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Đang tải dữ liệu..." />
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
                Dashboard
              </h1>
              <p className="text-gray-600">
                Xin chào, {user?.name}
              </p>
            </div>
            <button
              onClick={() => {
                sessionStorage.removeItem('user')
                router.push('/login')
              }}
              className="btn btn-secondary"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Đã đóng</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalPaid)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Chưa đóng</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(totalUnpaid)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Calendar className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tiền phạt</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalPenalty)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contributions Table */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Lịch sử đóng góp
          </h2>
          
          {contributions.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Chưa có dữ liệu đóng góp"
              description="Bạn chưa có lịch sử đóng góp nào. Liên hệ admin để được thêm vào hệ thống."
            />
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contributions.map((contribution) => (
                    <tr key={contribution.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Tuần {contribution.week}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(contribution.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contribution.status)}`}>
                          {getStatusText(contribution.status)}
                        </span>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
