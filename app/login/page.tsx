'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) {
      toast.error('Vui lòng nhập số điện thoại')
      return
    }

    setIsLoading(true)
    try {
      // Tìm user theo số điện thoại
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .eq('status', 'active')
        .single()

      if (error || !user) {
        toast.error('Số điện thoại không tồn tại hoặc chưa được kích hoạt')
        return
      }

      // Lưu thông tin user vào session storage
      sessionStorage.setItem('user', JSON.stringify(user))
      toast.success('Đăng nhập thành công!')
      router.push('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Có lỗi xảy ra khi đăng nhập')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Đăng nhập
          </h1>
          <p className="text-gray-600">
            Nhập số điện thoại để truy cập
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="phone" className="label">
              Số điện thoại
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại của bạn"
              className="input"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary"
          >
            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Chưa có tài khoản? Liên hệ quản trị viên để được thêm vào nhóm
          </p>
        </div>
      </div>
    </div>
  )
}
