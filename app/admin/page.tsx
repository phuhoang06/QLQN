'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type User, type Contribution, type WeeklyFund, type ContributionSchedule } from '@/lib/supabase'
import { formatCurrency, formatDate, getWeekNumber, getWeekStartDate, getWeekEndDate } from '@/lib/utils'
import { createAdminSession, getAdminSession, setAdminSession, clearAdminSession, verifyAdminCode } from '@/lib/auth'
import { Plus, Users, DollarSign, AlertCircle, CheckCircle, MessageSquare, Send, Share2, Copy, BarChart3, Trash2, Calendar, Edit } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [weeklyFunds, setWeeklyFunds] = useState<WeeklyFund[]>([])
  const [schedules, setSchedules] = useState<ContributionSchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [showAddContribution, setShowAddContribution] = useState(false)
  const [showSendMessage, setShowSendMessage] = useState(false)
  const [showCreateWeekly, setShowCreateWeekly] = useState(false)
  const [showManageSchedules, setShowManageSchedules] = useState(false)
  const [showAddSchedule, setShowAddSchedule] = useState(false)
  const [showEditSchedule, setShowEditSchedule] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ContributionSchedule | null>(null)
  const [showConfirmPayment, setShowConfirmPayment] = useState(false)
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null)
  const [currentWeek, setCurrentWeek] = useState(getWeekNumber(new Date()))
  const router = useRouter()

  // Form states
  const [newUser, setNewUser] = useState({ name: '', phone: '' })
  const [newContribution, setNewContribution] = useState({
    user_id: '',
    week: currentWeek,
    amount: 0,
    due_date: ''
  })
  const [messageForm, setMessageForm] = useState({
    type: 'weekly_reminder',
    week: currentWeek,
    customMessage: ''
  })
  const [weeklyForm, setWeeklyForm] = useState({
    week: currentWeek,
    amount: 100000,
    dueDate: ''
  })
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    type: 'weekly' as 'weekly' | 'monthly',
    amount: 100000,
    day_of_week: 0,
    day_of_month: 1,
    is_active: true
  })
  const [paymentForm, setPaymentForm] = useState({
    transactionId: '',
    transactionTime: '',
    note: ''
  })

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

      // Load schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('contribution_schedules')
        .select('*')
        .order('created_at', { ascending: false })

      if (schedulesError) throw schedulesError
      setSchedules(schedulesData || [])

      // Calculate weekly funds
      calculateWeeklyFunds(contributionsData || [])

    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Có lỗi xảy ra khi tải dữ liệu')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateWeeklyFunds = (contribs: any[]) => {
    const weeklyMap = new Map<number, WeeklyFund>()
    
    contribs.forEach(contrib => {
      const week = contrib.week
      if (!weeklyMap.has(week)) {
        weeklyMap.set(week, {
          week,
          total_amount: 0,
          paid_amount: 0,
          unpaid_amount: 0,
          penalty_amount: 0,
          due_date: contrib.due_date,
          contributions: []
        })
      }
      
      const weekly = weeklyMap.get(week)!
      weekly.total_amount += contrib.amount
      weekly.penalty_amount += contrib.penalty
      weekly.contributions.push(contrib)
      
      if (contrib.status === 'paid') {
        weekly.paid_amount += contrib.amount
      } else {
        weekly.unpaid_amount += contrib.amount
      }
    })
    
    setWeeklyFunds(Array.from(weeklyMap.values()).sort((a, b) => b.week - a.week))
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUser.name.trim() || !newUser.phone.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin')
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .insert([{
          name: newUser.name,
          phone: newUser.phone,
          status: 'active'
        }])

      if (error) throw error

      toast.success('Thêm thành viên thành công!')
      setNewUser({ name: '', phone: '' })
      setShowAddUser(false)
      loadData()
    } catch (error: any) {
      console.error('Error adding user:', error)
      toast.error(error.message || 'Có lỗi xảy ra')
    }
  }

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContribution.user_id || !newContribution.amount || !newContribution.due_date) {
      toast.error('Vui lòng điền đầy đủ thông tin')
      return
    }

    try {
      const { error } = await supabase
        .from('contributions')
        .insert([{
          user_id: newContribution.user_id,
          week: newContribution.week,
          amount: newContribution.amount,
          due_date: newContribution.due_date,
          status: 'unpaid'
        }])

      if (error) throw error

      toast.success('Thêm đóng góp thành công!')
      setNewContribution({
        user_id: '',
        week: currentWeek,
        amount: 0,
        due_date: ''
      })
      setShowAddContribution(false)
      loadData()
    } catch (error: any) {
      console.error('Error adding contribution:', error)
      toast.error(error.message || 'Có lỗi xảy ra')
    }
  }

  const handleMarkAsPaid = async (contributionId: string) => {
    try {
      const { error } = await supabase
        .from('contributions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', contributionId)

      if (error) throw error

      toast.success('Cập nhật trạng thái thành công!')
      loadData()
    } catch (error: any) {
      console.error('Error updating contribution:', error)
      toast.error(error.message || 'Có lỗi xảy ra')
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/zalo/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageForm),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(result.message)
        setShowSendMessage(false)
        setMessageForm({
          type: 'weekly_reminder',
          week: currentWeek,
          customMessage: ''
        })
      } else {
        toast.error(result.error || 'Có lỗi xảy ra')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Có lỗi xảy ra khi gửi tin nhắn')
    }
  }

  const handleSendReminder = async (week: number) => {
    try {
      const response = await fetch('/api/cron/weekly-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'your-cron-secret'}`,
        },
        body: JSON.stringify({ week }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(result.message)
      } else {
        toast.error(result.error || 'Có lỗi xảy ra')
      }
    } catch (error) {
      console.error('Error sending reminder:', error)
      toast.error('Có lỗi xảy ra khi gửi nhắc nhở')
    }
  }

  const handleCheckOverdue = async () => {
    try {
      const response = await fetch('/api/cron/check-overdue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'your-cron-secret'}`,
        },
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(result.message)
        loadData() // Reload data to show updated status
      } else {
        toast.error(result.error || 'Có lỗi xảy ra')
      }
    } catch (error) {
      console.error('Error checking overdue:', error)
      toast.error('Có lỗi xảy ra khi kiểm tra quá hạn')
    }
  }

  const copyMemberLink = (userId: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const memberUrl = `${baseUrl}/member/${userId}`
    
    navigator.clipboard.writeText(memberUrl).then(() => {
      toast.success('Đã copy link dashboard cá nhân!')
    }).catch(() => {
      toast.error('Không thể copy link')
    })
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa thành viên "${userName}"? Tất cả dữ liệu đóng góp sẽ bị xóa vĩnh viễn.`)) {
      return
    }

    try {
      // Xóa user (contributions sẽ tự động xóa do CASCADE)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) throw error

      toast.success('Đã xóa thành viên thành công!')
      loadData()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      toast.error(error.message || 'Có lỗi xảy ra khi xóa thành viên')
    }
  }

  const handleDeleteContribution = async (contributionId: string, week: number) => {
    if (!confirm(`Bạn có chắc muốn xóa đóng góp tuần ${week}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('contributions')
        .delete()
        .eq('id', contributionId)

      if (error) throw error

      toast.success('Đã xóa đóng góp thành công!')
      loadData()
    } catch (error: any) {
      console.error('Error deleting contribution:', error)
      toast.error(error.message || 'Có lỗi xảy ra khi xóa đóng góp')
    }
  }

  const handleCreateWeeklyContributions = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/cron/create-weekly-contributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'your-cron-secret'}`,
        },
        body: JSON.stringify(weeklyForm),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(result.message)
        setShowCreateWeekly(false)
        setWeeklyForm({
          week: currentWeek + 1,
          amount: 100000,
          dueDate: ''
        })
        loadData()
      } else {
        toast.error(result.error || 'Có lỗi xảy ra')
      }
    } catch (error) {
      console.error('Error creating weekly contributions:', error)
      toast.error('Có lỗi xảy ra khi tạo đóng góp tuần')
    }
  }

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleForm),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Đã tạo lịch đóng góp thành công!')
        setShowAddSchedule(false)
        setScheduleForm({
          name: '',
          type: 'weekly',
          amount: 100000,
          day_of_week: 0,
          day_of_month: 1,
          is_active: true
        })
        loadData()
      } else {
        toast.error(result.error || 'Có lỗi xảy ra')
      }
    } catch (error) {
      console.error('Error adding schedule:', error)
      toast.error('Có lỗi xảy ra khi tạo lịch đóng góp')
    }
  }

  const handleEditSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingSchedule) return
    
    try {
      const response = await fetch(`/api/schedules/${editingSchedule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleForm),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Đã cập nhật lịch đóng góp thành công!')
        setShowEditSchedule(false)
        setEditingSchedule(null)
        setScheduleForm({
          name: '',
          type: 'weekly',
          amount: 100000,
          day_of_week: 0,
          day_of_month: 1,
          is_active: true
        })
        loadData()
      } else {
        toast.error(result.error || 'Có lỗi xảy ra')
      }
    } catch (error) {
      console.error('Error updating schedule:', error)
      toast.error('Có lỗi xảy ra khi cập nhật lịch đóng góp')
    }
  }

  const handleDeleteSchedule = async (scheduleId: string, scheduleName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa lịch đóng góp "${scheduleName}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Đã xóa lịch đóng góp thành công!')
        loadData()
      } else {
        toast.error(result.error || 'Có lỗi xảy ra')
      }
    } catch (error) {
      console.error('Error deleting schedule:', error)
      toast.error('Có lỗi xảy ra khi xóa lịch đóng góp')
    }
  }

  const openEditSchedule = (schedule: ContributionSchedule) => {
    setEditingSchedule(schedule)
    setScheduleForm({
      name: schedule.name,
      type: schedule.type,
      amount: schedule.amount,
      day_of_week: schedule.day_of_week || 0,
      day_of_month: schedule.day_of_month || 1,
      is_active: schedule.is_active
    })
    setShowEditSchedule(true)
  }

  const openConfirmPayment = (contribution: Contribution) => {
    setSelectedContribution(contribution)
    setPaymentForm({
      transactionId: '',
      transactionTime: new Date().toISOString().slice(0, 16),
      note: ''
    })
    setShowConfirmPayment(true)
  }

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedContribution) return
    
    try {
      const response = await fetch('/api/momo/add-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedContribution.user_id,
          week: selectedContribution.week,
          amount: selectedContribution.amount,
          transactionId: paymentForm.transactionId,
          transactionTime: paymentForm.transactionTime,
          note: paymentForm.note
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Đã xác nhận thanh toán thành công!')
        setShowConfirmPayment(false)
        setSelectedContribution(null)
        setPaymentForm({
          transactionId: '',
          transactionTime: '',
          note: ''
        })
        loadData()
      } else {
        toast.error(result.error || 'Có lỗi xảy ra')
      }
    } catch (error) {
      console.error('Error confirming payment:', error)
      toast.error('Có lỗi xảy ra khi xác nhận thanh toán')
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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Quản trị viên
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Quản lý thành viên và đóng góp
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:space-x-3 sm:gap-0">
              <button
                onClick={() => setShowAddUser(true)}
                className="btn btn-primary flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Thêm thành viên
              </button>
              <button
                onClick={() => setShowAddContribution(true)}
                className="btn btn-success flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Thêm đóng góp
              </button>
              <button
                onClick={() => setShowCreateWeekly(true)}
                className="btn btn-primary flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tạo tuần mới
              </button>
              <button
                onClick={() => setShowSendMessage(true)}
                className="btn btn-secondary flex items-center"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Gửi thông báo
              </button>
              <button
                onClick={() => handleCheckOverdue()}
                className="btn btn-danger flex items-center"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Kiểm tra quá hạn
              </button>
              <button
                onClick={() => router.push('/admin/stats')}
                className="btn btn-primary flex items-center"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Thống kê
              </button>
              <button
                onClick={() => setShowManageSchedules(true)}
                className="btn btn-secondary flex items-center"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Lịch đóng góp
              </button>
              <button
                onClick={() => {
                  clearAdminSession()
                  router.push('/')
                }}
                className="btn btn-secondary"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tổng thành viên</p>
                <p className="text-2xl font-bold text-primary-600">{users.length}</p>
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
                <p className="text-2xl font-bold text-green-600">
                  {contributions.filter(c => c.status === 'paid').length}
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
                  {contributions.filter(c => c.status === 'unpaid').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tổng quỹ</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(contributions.reduce((sum, c) => sum + c.amount, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Funds */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Tình hình đóng góp theo tuần
          </h2>
          
          {weeklyFunds.length === 0 ? (
            <div className="text-center py-8">
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
                      Tổng tiền
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
                      Hạn nộp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {weeklyFunds.map((fund) => (
                    <tr key={fund.week}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Tuần {fund.week}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(fund.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {formatCurrency(fund.paid_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                        {formatCurrency(fund.unpaid_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {formatCurrency(fund.penalty_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(fund.due_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => handleSendReminder(fund.week)}
                          className="btn btn-primary btn-sm flex items-center"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Nhắc nhở
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Members Management */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quản lý thành viên
          </h2>
          
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider mobile-hidden">
                    Số điện thoại
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider mobile-hidden">
                      Dashboard
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành động
                    </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-gray-500 sm:hidden">{user.phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 mobile-hidden">
                      {user.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === 'active' 
                          ? 'text-green-600 bg-green-50'
                          : 'text-gray-600 bg-gray-50'
                      }`}>
                        {user.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 mobile-hidden">
                      <button
                        onClick={() => copyMemberLink(user.id)}
                        className="btn btn-secondary btn-sm flex items-center"
                      >
                        <Share2 className="h-3 w-3 mr-1" />
                        Copy link
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                        <button
                          onClick={() => copyMemberLink(user.id)}
                          className="btn btn-secondary btn-sm flex items-center sm:hidden"
                        >
                          <Share2 className="h-3 w-3 mr-1" />
                          Link
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="btn btn-danger btn-sm flex items-center"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Contributions Table */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Chi tiết đóng góp
          </h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thành viên
                  </th>
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
                    Hành động
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Xóa
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contributions.map((contribution) => (
                  <tr key={contribution.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {contribution.user?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Tuần {contribution.week}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(contribution.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        contribution.status === 'paid' 
                          ? 'text-green-600 bg-green-50'
                          : contribution.status === 'unpaid'
                          ? 'text-yellow-600 bg-yellow-50'
                          : 'text-red-600 bg-red-50'
                      }`}>
                        {contribution.status === 'paid' ? 'Đã đóng' : 
                         contribution.status === 'unpaid' ? 'Chưa đóng' : 'Quá hạn'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {contribution.status !== 'paid' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleMarkAsPaid(contribution.id)}
                            className="btn btn-success btn-sm"
                          >
                            Đánh dấu đã đóng
                          </button>
                          <button
                            onClick={() => openConfirmPayment(contribution)}
                            className="btn btn-primary btn-sm"
                          >
                            Xác nhận Momo
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => handleDeleteContribution(contribution.id, contribution.week)}
                        className="btn btn-danger btn-sm flex items-center"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Thêm thành viên mới
            </h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="label">Tên thành viên</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Số điện thoại</label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="btn btn-primary">
                  Thêm
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="btn btn-secondary"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Contribution Modal */}
      {showAddContribution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Thêm đóng góp mới
            </h3>
            <form onSubmit={handleAddContribution} className="space-y-4">
              <div>
                <label className="label">Thành viên</label>
                <select
                  value={newContribution.user_id}
                  onChange={(e) => setNewContribution({ ...newContribution, user_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Chọn thành viên</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.phone}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Tuần</label>
                <input
                  type="number"
                  value={newContribution.week}
                  onChange={(e) => setNewContribution({ ...newContribution, week: parseInt(e.target.value) })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Số tiền</label>
                <input
                  type="number"
                  value={newContribution.amount}
                  onChange={(e) => setNewContribution({ ...newContribution, amount: parseFloat(e.target.value) })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Hạn nộp</label>
                <input
                  type="date"
                  value={newContribution.due_date}
                  onChange={(e) => setNewContribution({ ...newContribution, due_date: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="btn btn-primary">
                  Thêm
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddContribution(false)}
                  className="btn btn-secondary"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {showSendMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Gửi thông báo
            </h3>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="label">Loại thông báo</label>
                <select
                  value={messageForm.type}
                  onChange={(e) => setMessageForm({ ...messageForm, type: e.target.value })}
                  className="input"
                >
                  <option value="weekly_reminder">Nhắc nhở tuần</option>
                  <option value="monthly_report">Báo cáo tháng</option>
                  <option value="custom">Tin nhắn tùy chỉnh</option>
                </select>
              </div>
              
              {messageForm.type === 'weekly_reminder' && (
                <div>
                  <label className="label">Tuần</label>
                  <input
                    type="number"
                    value={messageForm.week}
                    onChange={(e) => setMessageForm({ ...messageForm, week: parseInt(e.target.value) })}
                    className="input"
                    required
                  />
                </div>
              )}
              
              {messageForm.type === 'custom' && (
                <div>
                  <label className="label">Nội dung tin nhắn</label>
                  <textarea
                    value={messageForm.customMessage}
                    onChange={(e) => setMessageForm({ ...messageForm, customMessage: e.target.value })}
                    className="input h-24"
                    placeholder="Nhập nội dung tin nhắn..."
                    required
                  />
                </div>
              )}
              
              <div className="flex space-x-3">
                <button type="submit" className="btn btn-primary">
                  Gửi
                </button>
                <button
                  type="button"
                  onClick={() => setShowSendMessage(false)}
                  className="btn btn-secondary"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Weekly Contributions Modal */}
      {showCreateWeekly && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Tạo đóng góp tuần mới
            </h3>
            <form onSubmit={handleCreateWeeklyContributions} className="space-y-4">
              <div>
                <label className="label">Tuần</label>
                <input
                  type="number"
                  value={weeklyForm.week}
                  onChange={(e) => setWeeklyForm({ ...weeklyForm, week: parseInt(e.target.value) })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Số tiền (VNĐ)</label>
                <input
                  type="number"
                  value={weeklyForm.amount}
                  onChange={(e) => setWeeklyForm({ ...weeklyForm, amount: parseInt(e.target.value) })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Hạn nộp (cuối tuần)</label>
                <input
                  type="date"
                  value={weeklyForm.dueDate}
                  onChange={(e) => setWeeklyForm({ ...weeklyForm, dueDate: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Lưu ý:</strong> Sẽ tạo đóng góp cho tất cả thành viên đang hoạt động
                </p>
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="btn btn-primary">
                  Tạo đóng góp
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateWeekly(false)}
                  className="btn btn-secondary"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Schedules Modal */}
      {showManageSchedules && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Quản lý lịch đóng góp
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowAddSchedule(true)}
                  className="btn btn-primary btn-sm flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm lịch
                </button>
                <button
                  onClick={() => setShowManageSchedules(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Đóng
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên lịch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loại
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số tiền
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {schedules.map((schedule) => (
                    <tr key={schedule.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {schedule.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          schedule.type === 'weekly' 
                            ? 'text-blue-800 bg-blue-100' 
                            : 'text-purple-800 bg-purple-100'
                        }`}>
                          {schedule.type === 'weekly' ? 'Hàng tuần' : 'Hàng tháng'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(schedule.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {schedule.type === 'weekly' 
                          ? ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][schedule.day_of_week || 0]
                          : `Ngày ${schedule.day_of_month}`
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          schedule.is_active 
                            ? 'text-green-800 bg-green-100' 
                            : 'text-gray-600 bg-gray-50'
                        }`}>
                          {schedule.is_active ? 'Hoạt động' : 'Tạm dừng'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditSchedule(schedule)}
                            className="btn btn-secondary btn-sm flex items-center"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id, schedule.name)}
                            className="btn btn-danger btn-sm flex items-center"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showAddSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Thêm lịch đóng góp mới
            </h3>
            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div>
                <label className="label">Tên lịch</label>
                <input
                  type="text"
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                  className="input"
                  placeholder="Ví dụ: Đóng góp hàng tuần"
                  required
                />
              </div>
              <div>
                <label className="label">Loại</label>
                <select
                  value={scheduleForm.type}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value as 'weekly' | 'monthly' })}
                  className="input"
                >
                  <option value="weekly">Hàng tuần</option>
                  <option value="monthly">Hàng tháng</option>
                </select>
              </div>
              <div>
                <label className="label">Số tiền (VNĐ)</label>
                <input
                  type="number"
                  value={scheduleForm.amount}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, amount: parseInt(e.target.value) })}
                  className="input"
                  required
                />
              </div>
              {scheduleForm.type === 'weekly' ? (
                <div>
                  <label className="label">Ngày trong tuần</label>
                  <select
                    value={scheduleForm.day_of_week}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: parseInt(e.target.value) })}
                    className="input"
                  >
                    <option value={0}>Chủ nhật</option>
                    <option value={1}>Thứ 2</option>
                    <option value={2}>Thứ 3</option>
                    <option value={3}>Thứ 4</option>
                    <option value={4}>Thứ 5</option>
                    <option value={5}>Thứ 6</option>
                    <option value={6}>Thứ 7</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="label">Ngày trong tháng</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={scheduleForm.day_of_month}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_month: parseInt(e.target.value) })}
                    className="input"
                    required
                  />
                </div>
              )}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={scheduleForm.is_active}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Kích hoạt lịch này
                </label>
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="btn btn-primary">
                  Tạo lịch
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSchedule(false)}
                  className="btn btn-secondary"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Schedule Modal */}
      {showEditSchedule && editingSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Chỉnh sửa lịch đóng góp
            </h3>
            <form onSubmit={handleEditSchedule} className="space-y-4">
              <div>
                <label className="label">Tên lịch</label>
                <input
                  type="text"
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Loại</label>
                <select
                  value={scheduleForm.type}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value as 'weekly' | 'monthly' })}
                  className="input"
                >
                  <option value="weekly">Hàng tuần</option>
                  <option value="monthly">Hàng tháng</option>
                </select>
              </div>
              <div>
                <label className="label">Số tiền (VNĐ)</label>
                <input
                  type="number"
                  value={scheduleForm.amount}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, amount: parseInt(e.target.value) })}
                  className="input"
                  required
                />
              </div>
              {scheduleForm.type === 'weekly' ? (
                <div>
                  <label className="label">Ngày trong tuần</label>
                  <select
                    value={scheduleForm.day_of_week}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: parseInt(e.target.value) })}
                    className="input"
                  >
                    <option value={0}>Chủ nhật</option>
                    <option value={1}>Thứ 2</option>
                    <option value={2}>Thứ 3</option>
                    <option value={3}>Thứ 4</option>
                    <option value={4}>Thứ 5</option>
                    <option value={5}>Thứ 6</option>
                    <option value={6}>Thứ 7</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="label">Ngày trong tháng</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={scheduleForm.day_of_month}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_month: parseInt(e.target.value) })}
                    className="input"
                    required
                  />
                </div>
              )}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={scheduleForm.is_active}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="edit_is_active" className="text-sm text-gray-700">
                  Kích hoạt lịch này
                </label>
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="btn btn-primary">
                  Cập nhật
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSchedule(false)
                    setEditingSchedule(null)
                  }}
                  className="btn btn-secondary"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Payment Modal */}
      {showConfirmPayment && selectedContribution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Xác nhận thanh toán Momo
            </h3>
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-blue-700">
                <strong>Thông tin đóng góp:</strong><br/>
                Thành viên: {selectedContribution.user?.name}<br/>
                Tuần: {selectedContribution.week}<br/>
                Số tiền: {formatCurrency(selectedContribution.amount)}
              </p>
            </div>
            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div>
                <label className="label">Mã giao dịch Momo *</label>
                <input
                  type="text"
                  value={paymentForm.transactionId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                  className="input"
                  placeholder="Nhập mã giao dịch từ Momo"
                  required
                />
              </div>
              <div>
                <label className="label">Thời gian giao dịch</label>
                <input
                  type="datetime-local"
                  value={paymentForm.transactionTime}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionTime: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Ghi chú (tùy chọn)</label>
                <textarea
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Ghi chú thêm về giao dịch..."
                />
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm text-yellow-700">
                  <strong>Lưu ý:</strong> Chỉ xác nhận khi đã kiểm tra có tiền chuyển vào quỹ nhóm Momo
                </p>
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="btn btn-primary">
                  Xác nhận thanh toán
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmPayment(false)
                    setSelectedContribution(null)
                  }}
                  className="btn btn-secondary"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
