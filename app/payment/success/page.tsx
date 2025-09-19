'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [paymentInfo, setPaymentInfo] = useState<any>(null)
  
  const orderId = searchParams.get('orderId')

  useEffect(() => {
    if (orderId) {
      checkPaymentStatus()
    } else {
      setIsLoading(false)
    }
  }, [orderId])

  const checkPaymentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          contribution:contributions(
            *,
            user:users(*)
          )
        `)
        .eq('order_id', orderId)
        .single()

      if (error) {
        console.error('Error fetching payment info:', error)
        toast.error('Không thể tải thông tin thanh toán')
        return
      }

      setPaymentInfo(data)
    } catch (error) {
      console.error('Error checking payment status:', error)
      toast.error('Có lỗi xảy ra')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang kiểm tra thanh toán...</p>
        </div>
      </div>
    )
  }

  if (!paymentInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Không tìm thấy thông tin thanh toán
          </h1>
          <p className="text-gray-600 mb-6">
            Vui lòng kiểm tra lại thông tin hoặc liên hệ admin
          </p>
          <button
            onClick={() => router.push('/')}
            className="btn btn-primary flex items-center mx-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Về trang chủ
          </button>
        </div>
      </div>
    )
  }

  const isSuccess = paymentInfo.status === 'success'
  const contribution = paymentInfo.contribution

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          {isSuccess ? (
            <>
              <div className="text-green-500 text-6xl mb-4">
                <CheckCircle className="mx-auto" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Thanh toán thành công!
              </h1>
              <p className="text-gray-600 mb-6">
                Cảm ơn bạn đã đóng góp
              </p>
            </>
          ) : (
            <>
              <div className="text-red-500 text-6xl mb-4">❌</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Thanh toán thất bại
              </h1>
              <p className="text-gray-600 mb-6">
                Vui lòng thử lại hoặc liên hệ admin
              </p>
            </>
          )}

          {contribution && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-3">Thông tin giao dịch</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Thành viên:</span>
                  <span className="font-medium">{contribution.user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tuần:</span>
                  <span className="font-medium">Tuần {contribution.week}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Số tiền:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(paymentInfo.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Trạng thái:</span>
                  <span className={`font-medium ${
                    isSuccess ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isSuccess ? 'Thành công' : 'Thất bại'}
                  </span>
                </div>
                {paymentInfo.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Thời gian:</span>
                    <span className="font-medium">
                      {formatDate(paymentInfo.paid_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => router.push(`/member/${contribution?.user_id}`)}
              className="btn btn-primary w-full"
            >
              Xem dashboard cá nhân
            </button>
            <button
              onClick={() => router.push('/')}
              className="btn btn-secondary w-full flex items-center justify-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


