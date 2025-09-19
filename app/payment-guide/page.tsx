'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase, type User, type Contribution } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, Copy, CheckCircle, AlertCircle, Smartphone, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PaymentGuidePage() {
  const params = useParams()
  const userId = params.userId as string
  const [user, setUser] = useState<User | null>(null)
  const [unpaidContributions, setUnpaidContributions] = useState<Contribution[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadUserData()
    }
  }, [userId])

  const loadUserData = async () => {
    try {
      // Lấy thông tin user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError || !userData) {
        toast.error('Không tìm thấy thông tin thành viên')
        return
      }

      setUser(userData)

      // Lấy đóng góp chưa thanh toán
      const { data: contributions, error: contribError } = await supabase
        .from('contributions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['unpaid', 'overdue'])
        .order('week', { ascending: true })

      if (contribError) {
        console.error('Error loading contributions:', contribError)
        return
      }

      setUnpaidContributions(contributions || [])
    } catch (error) {
      console.error('Error loading user data:', error)
      toast.error('Có lỗi xảy ra khi tải dữ liệu')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Đã copy vào clipboard!')
    }).catch(() => {
      toast.error('Không thể copy')
    })
  }

  const generatePaymentMessage = (contribution: Contribution) => {
    return `QUY_NHOM_TUAN_${contribution.week}_${contribution.amount}`
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
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Không tìm thấy thông tin thành viên
          </h1>
          <button
            onClick={() => window.history.back()}
            className="btn btn-primary flex items-center mx-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Hướng dẫn thanh toán Momo
              </h1>
              <p className="text-gray-600">
                Chào {user.name}, hướng dẫn chuyển tiền vào quỹ nhóm
              </p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="btn btn-secondary flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Thông báo quan trọng */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <CheckCircle className="h-6 w-6 text-blue-600 mt-1 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                🎉 Thanh toán tự động!
              </h3>
              <p className="text-blue-800 mb-3">
                Bạn chỉ cần chuyển tiền vào quỹ nhóm Momo với nội dung đúng format. 
                Hệ thống sẽ <strong>tự động nhận diện và cập nhật</strong> trạng thái đóng góp.
              </p>
              <div className="bg-blue-100 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Không cần:</strong> Vào website, đăng nhập, hay làm gì thêm!<br/>
                  <strong>Chỉ cần:</strong> Chuyển tiền với nội dung đúng format bên dưới.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Hướng dẫn chi tiết */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Bước 1 */}
          <div className="card">
            <div className="flex items-center mb-4">
              <div className="bg-primary-100 text-primary-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Mở ứng dụng Momo
              </h3>
            </div>
            <div className="flex items-center text-gray-600 mb-4">
              <Smartphone className="h-5 w-5 mr-2" />
              <span>Mở app Momo trên điện thoại</span>
            </div>
            <p className="text-gray-600 text-sm">
              Đăng nhập vào tài khoản Momo của bạn
            </p>
          </div>

          {/* Bước 2 */}
          <div className="card">
            <div className="flex items-center mb-4">
              <div className="bg-primary-100 text-primary-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Chuyển tiền
              </h3>
            </div>
            <div className="flex items-center text-gray-600 mb-4">
              <CreditCard className="h-5 w-5 mr-2" />
              <span>Chọn "Chuyển tiền" → "Đến số điện thoại"</span>
            </div>
            <p className="text-gray-600 text-sm">
              Nhập số điện thoại quỹ nhóm và số tiền
            </p>
          </div>
        </div>

        {/* Danh sách đóng góp cần thanh toán */}
        {unpaidContributions.length > 0 ? (
          <div className="card mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Đóng góp cần thanh toán
            </h3>
            <div className="space-y-4">
              {unpaidContributions.map((contribution) => (
                <div key={contribution.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Tuần {contribution.week}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Hạn nộp: {formatDate(contribution.due_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary-600">
                        {formatCurrency(contribution.amount)}
                      </p>
                      {contribution.penalty > 0 && (
                        <p className="text-sm text-red-600">
                          Phạt: {formatCurrency(contribution.penalty)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Nội dung chuyển tiền */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Nội dung chuyển tiền (copy và paste):
                      </label>
                      <button
                        onClick={() => copyToClipboard(generatePaymentMessage(contribution))}
                        className="btn btn-secondary btn-sm flex items-center"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </button>
                    </div>
                    <div className="bg-white border border-gray-300 rounded p-3 font-mono text-sm">
                      {generatePaymentMessage(contribution)}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      ⚠️ <strong>Quan trọng:</strong> Phải nhập chính xác nội dung này để hệ thống tự động nhận diện
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Tất cả đóng góp đã được thanh toán!
            </h3>
            <p className="text-gray-600">
              Bạn không có đóng góp nào cần thanh toán tại thời điểm này.
            </p>
          </div>
        )}

        {/* Lưu ý quan trọng */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 text-yellow-600 mt-1 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                Lưu ý quan trọng
              </h3>
              <ul className="text-yellow-800 space-y-2 text-sm">
                <li>• <strong>Nội dung chuyển tiền phải chính xác</strong> để hệ thống tự động nhận diện</li>
                <li>• <strong>Số tiền phải khớp</strong> với số tiền đóng góp (cho phép sai lệch 1,000 VNĐ)</li>
                <li>• <strong>Thời gian xử lý:</strong> Tự động trong vòng 5-10 phút sau khi chuyển tiền</li>
                <li>• <strong>Thông báo:</strong> Bạn sẽ nhận thông báo Zalo khi thanh toán thành công</li>
                <li>• <strong>Nếu gặp lỗi:</strong> Liên hệ admin để được hỗ trợ</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Thông tin liên hệ */}
        <div className="card mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Cần hỗ trợ?
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Nếu chuyển tiền nhưng không được cập nhật:</strong>
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Kiểm tra nội dung chuyển tiền có đúng không</li>
                <li>• Đợi 10-15 phút để hệ thống xử lý</li>
                <li>• Liên hệ admin với mã giao dịch Momo</li>
              </ul>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Thông tin quỹ nhóm:</strong>
              </p>
              <p className="text-sm text-gray-600">
                Số điện thoại quỹ nhóm: <span className="font-mono bg-gray-100 px-2 py-1 rounded">[Số quỹ nhóm]</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}