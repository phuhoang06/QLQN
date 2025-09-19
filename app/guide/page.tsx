import { Users, DollarSign, MessageSquare, BarChart3, Download, Share2, CheckCircle } from 'lucide-react'

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Hướng dẫn sử dụng
            </h1>
            <p className="mt-2 text-gray-600">
              Hướng dẫn chi tiết cách sử dụng ứng dụng quản lý quỹ nhóm
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview */}
        <div className="card mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Tổng quan ứng dụng
          </h2>
          <p className="text-gray-600 mb-4">
            Ứng dụng quản lý quỹ nhóm giúp bạn theo dõi và quản lý việc đóng góp của các thành viên trong nhóm một cách dễ dàng và hiệu quả.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-primary-50 rounded-lg">
              <Users className="h-8 w-8 text-primary-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Quản lý thành viên</h3>
              <p className="text-sm text-gray-600">Tối đa 20 thành viên</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Theo dõi đóng góp</h3>
              <p className="text-sm text-gray-600">Theo dõi theo tuần</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <MessageSquare className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Thông báo tự động</h3>
              <p className="text-sm text-gray-600">Qua Zalo OA</p>
            </div>
          </div>
        </div>

        {/* For Members */}
        <div className="card mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Hướng dẫn cho thành viên
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                1. Đăng nhập
              </h3>
              <p className="text-gray-600 mb-2">
                Truy cập trang chủ và click "Đăng nhập", sau đó nhập số điện thoại của bạn.
              </p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Lưu ý:</strong> Số điện thoại phải được admin thêm vào hệ thống trước.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                2. Xem dashboard cá nhân
              </h3>
              <p className="text-gray-600 mb-2">
                Sau khi đăng nhập, bạn sẽ thấy:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Tổng số tiền đã đóng</li>
                <li>Số tiền chưa đóng</li>
                <li>Tiền phạt (nếu có)</li>
                <li>Lịch sử đóng góp chi tiết</li>
                <li>Tiến độ hoàn thành</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                3. Dashboard cá nhân riêng
              </h3>
              <p className="text-gray-600 mb-2">
                Admin có thể cung cấp cho bạn link dashboard cá nhân riêng để xem thông tin chi tiết hơn.
              </p>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Tip:</strong> Bookmark link dashboard cá nhân để truy cập nhanh hơn.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* For Admin */}
        <div className="card mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Hướng dẫn cho quản trị viên
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                1. Truy cập admin panel
              </h3>
              <p className="text-gray-600 mb-2">
                Click "Quản trị viên" trên trang chủ và nhập mã quản trị viên.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                2. Quản lý thành viên
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Thêm thành viên mới</p>
                    <p className="text-sm text-gray-600">Click "Thêm thành viên" và điền thông tin</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Share2 className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Chia sẻ link dashboard</p>
                    <p className="text-sm text-gray-600">Click "Copy link" để chia sẻ dashboard cá nhân cho thành viên</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                3. Quản lý đóng góp
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Tạo đóng góp mới</p>
                    <p className="text-sm text-gray-600">Click "Thêm đóng góp" để tạo đóng góp cho tuần mới</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Đánh dấu đã đóng</p>
                    <p className="text-sm text-gray-600">Click "Đánh dấu đã đóng" khi nhận tiền từ thành viên</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                4. Thống kê và báo cáo
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <BarChart3 className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Xem thống kê chi tiết</p>
                    <p className="text-sm text-gray-600">Click "Thống kê" để xem báo cáo hiệu suất thành viên</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Download className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Xuất báo cáo CSV</p>
                    <p className="text-sm text-gray-600">Click "Xuất CSV" để tải báo cáo chi tiết</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                5. Thông báo (Sprint 2)
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Gửi thông báo thủ công</p>
                    <p className="text-sm text-gray-600">Click "Gửi thông báo" để gửi tin nhắn cho thành viên</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Kiểm tra quá hạn</p>
                    <p className="text-sm text-gray-600">Click "Kiểm tra quá hạn" để cập nhật phạt tự động</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="card mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Mẹo sử dụng hiệu quả
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Cho thành viên
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Kiểm tra dashboard thường xuyên</li>
                <li>• Đóng tiền đúng hạn để tránh phạt</li>
                <li>• Liên hệ admin nếu có thắc mắc</li>
                <li>• Bookmark link dashboard cá nhân</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Cho admin
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Cập nhật trạng thái đóng góp ngay khi nhận tiền</li>
                <li>• Kiểm tra quá hạn định kỳ</li>
                <li>• Xuất báo cáo hàng tháng</li>
                <li>• Chia sẻ link dashboard cho thành viên</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Hỗ trợ
          </h2>
          <p className="text-gray-600 mb-4">
            Nếu bạn gặp vấn đề hoặc có câu hỏi, vui lòng liên hệ:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Quản trị viên:</strong> Liên hệ trực tiếp với người quản lý nhóm<br/>
              <strong>Kỹ thuật:</strong> Tạo issue trên GitHub repository
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


