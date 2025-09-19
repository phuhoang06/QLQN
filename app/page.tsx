import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quản lý Quỹ Nhóm
          </h1>
          <p className="text-gray-600">
            Ứng dụng quản lý quỹ nhóm đơn giản và hiệu quả
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/login"
            className="w-full btn btn-primary block text-center"
          >
            Đăng nhập
          </Link>
          
          <Link
            href="/admin"
            className="w-full btn btn-secondary block text-center"
          >
            Quản trị viên
          </Link>
          
          <Link
            href="/guide"
            className="w-full btn btn-secondary block text-center"
          >
            Hướng dẫn sử dụng
          </Link>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          <p>Hỗ trợ tối đa 20 thành viên</p>
          <p>Miễn phí sử dụng</p>
        </div>
      </div>
    </div>
  )
}
