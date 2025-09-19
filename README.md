# 💰 Quản lý Quỹ Nhóm

Ứng dụng quản lý quỹ nhóm đơn giản và hiệu quả, được xây dựng với Next.js, Supabase và Zalo OA.

## 🚀 Tính năng

### Sprint 1 - Cơ bản ✅
- [x] Đăng nhập đơn giản (theo số điện thoại)
- [x] Dashboard xem tình hình đóng góp
- [x] Trang admin quản lý thành viên và đóng góp
- [x] Tính toán phạt tự động
- [x] Database schema hoàn chỉnh

### Sprint 2 - Thông báo Zalo OA (Sắp tới)
- [ ] Tích hợp Zalo OA API
- [ ] Thông báo tự động nhắc nộp tiền
- [ ] Báo nợ và phạt qua Zalo
- [ ] Cron job tự động

### Sprint 3 - Hoàn thiện ✅
- [x] Dashboard cá nhân cho từng thành viên
- [x] Thống kê nhóm chi tiết
- [x] Xuất báo cáo CSV
- [x] Giao diện tối ưu với components

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Hosting**: Vercel (Free tier)
- **Thông báo**: Zalo OA (Free tier)
- **Styling**: Tailwind CSS, Lucide React Icons

## 📦 Cài đặt

### 1. Clone repository
```bash
git clone <repository-url>
cd fund-management-app
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình môi trường
```bash
cp env.example .env.local
```

Chỉnh sửa file `.env.local` với thông tin Supabase của bạn:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_SECRET_CODE=your_admin_secret_code
```

### 4. Chạy ứng dụng
```bash
npm run dev
```

Truy cập [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Setup

### Tạo bảng trên Supabase

1. **Bảng `users`**:
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

2. **Bảng `contributions`**:
```sql
CREATE TABLE contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'overdue')),
  penalty DECIMAL(10,2) DEFAULT 0,
  paid_at TIMESTAMP WITH TIME ZONE,
  due_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

3. **Tạo indexes**:
```sql
CREATE INDEX idx_contributions_user_id ON contributions(user_id);
CREATE INDEX idx_contributions_week ON contributions(week);
CREATE INDEX idx_contributions_status ON contributions(status);
CREATE INDEX idx_contributions_due_date ON contributions(due_date);
```

4. **Tạo RLS policies** (Row Level Security):
```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (true);

-- Users can read their own contributions
CREATE POLICY "Users can read own contributions" ON contributions
  FOR SELECT USING (true);

-- Admin can do everything (you'll need to implement admin check)
CREATE POLICY "Admin full access" ON users
  FOR ALL USING (true);

CREATE POLICY "Admin full access contributions" ON contributions
  FOR ALL USING (true);
```

## 🚀 Deploy lên Vercel

1. **Push code lên GitHub**
2. **Kết nối với Vercel**:
   - Truy cập [vercel.com](https://vercel.com)
   - Import project từ GitHub
   - Cấu hình environment variables
   - Deploy

3. **Cấu hình domain** (tùy chọn):
   - Sử dụng subdomain miễn phí của Vercel
   - Hoặc kết nối domain riêng

## 📱 Cấu hình Zalo OA (Sprint 2)

1. **Đăng ký Zalo OA**:
   - Truy cập [developers.zalo.me](https://developers.zalo.me)
   - Tạo ứng dụng mới
   - Lấy App ID và App Secret

2. **Cấu hình webhook**:
   - Thêm webhook URL vào Zalo OA
   - Xử lý sự kiện từ Zalo

3. **Thêm vào .env.local**:
```env
ZALO_OA_ACCESS_TOKEN=your_access_token
ZALO_OA_APP_ID=your_app_id
ZALO_OA_APP_SECRET=your_app_secret
```

## 💰 Chi phí

- **Vercel**: Miễn phí (100GB bandwidth/tháng)
- **Supabase**: Miễn phí (500MB storage, 50k requests/tháng)
- **Zalo OA**: Miễn phí (40 tin nhắn/người/tháng)
- **Domain**: Miễn phí (Vercel subdomain)

## 🗄️ Database Setup

Chạy script SQL trong Supabase để tạo bảng:

```sql
-- 1. Tạo bảng contribution_schedules
-- Xem file database/contribution_schedules.sql

-- 2. Tạo bảng payment_transactions cho Momo
-- Xem file database/payment_transactions.sql
```

## 💳 Momo Payment Integration

### Tính năng:
- **🔄 Hoàn toàn tự động**: Thành viên chỉ cần chuyển tiền, hệ thống tự động nhận diện
- **📱 Webhook Momo**: Nhận thông báo real-time khi có giao dịch
- **🔔 Thông báo Zalo**: Tự động gửi thông báo khi thanh toán thành công
- **📋 Hướng dẫn chi tiết**: Trang hướng dẫn thanh toán cho thành viên

### Cách hoạt động:
1. **Thành viên chuyển tiền** vào quỹ nhóm Momo với nội dung: `QUY_NHOM_TUAN_X_YYYYYY`
2. **Momo gửi webhook** đến hệ thống khi có giao dịch
3. **Hệ thống tự động**:
   - Parse thông tin từ nội dung chuyển tiền
   - Tìm user theo số điện thoại
   - Tìm đóng góp chưa thanh toán
   - Kiểm tra số tiền khớp
   - Cập nhật trạng thái "đã đóng"
   - Gửi thông báo Zalo

### Setup Webhook Momo:
1. **Cấu hình webhook URL** trong Momo Partner: `https://yourdomain.com/api/momo/webhook-auto`
2. **Thêm vào .env.local**:
```env
MOMO_WEBHOOK_SECRET=your_webhook_secret
```

### CRON Jobs:
- **Tạo đóng góp tuần**: Thứ 2 hàng tuần (`0 8 * * 1`)
- **Nhắc nhở**: Thứ 7 hàng tuần (`0 8 * * 6`)

## 📋 Hướng dẫn sử dụng

### Cho Admin
1. Truy cập `/admin`
2. Nhập mã quản trị viên (mặc định: `admin123`)
3. Thêm thành viên mới
4. **Quản lý lịch đóng góp**: Tạo, sửa, xóa lịch hàng tuần/tháng
5. Tạo đóng góp cho từng tuần (tự động hoặc thủ công)
6. **Xác nhận thanh toán Momo**: Khi có tiền chuyển vào quỹ nhóm
7. Đánh dấu đã đóng khi nhận tiền (thủ công)
8. Xóa thành viên hoặc đóng góp nếu cần

### Cho Thành viên
1. Truy cập `/login`
2. Nhập số điện thoại đã được admin thêm
3. Xem tình hình đóng góp cá nhân
4. **Hướng dẫn thanh toán**: Click "Hướng dẫn thanh toán" để xem chi tiết
5. **Chuyển tiền Momo**: Chuyển tiền vào quỹ nhóm với nội dung đúng format
6. **Tự động cập nhật**: Hệ thống tự động nhận diện và cập nhật trạng thái
7. **Nhận thông báo**: Tự động nhận thông báo Zalo khi thanh toán thành công

## 🔧 Development

### Cấu trúc thư mục
```
├── app/                    # Next.js App Router
│   ├── admin/             # Trang admin
│   ├── dashboard/         # Dashboard thành viên
│   ├── login/             # Trang đăng nhập
│   └── globals.css        # Global styles
├── lib/                   # Utilities
│   ├── supabase.ts        # Supabase client & types
│   └── utils.ts           # Helper functions
├── components/            # React components (sẽ thêm)
└── public/               # Static files
```

### Scripts
```bash
npm run dev          # Chạy development server
npm run build        # Build production
npm run start        # Chạy production server
npm run lint         # Lint code
```

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📄 License

MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub hoặc liên hệ trực tiếp.

---

**Lưu ý**: Đây là phiên bản miễn phí, phù hợp cho nhóm tối đa 20 người. Để mở rộng, có thể cần upgrade lên paid tier của các dịch vụ.
