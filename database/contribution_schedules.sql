-- Tạo bảng contribution_schedules để quản lý lịch đóng góp
CREATE TABLE IF NOT EXISTS contribution_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('weekly', 'monthly')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo trigger để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contribution_schedules_updated_at 
    BEFORE UPDATE ON contribution_schedules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Thêm RLS (Row Level Security)
ALTER TABLE contribution_schedules ENABLE ROW LEVEL SECURITY;

-- Tạo policy cho phép tất cả user đọc (để hiển thị lịch)
CREATE POLICY "Allow read access to contribution_schedules" ON contribution_schedules
    FOR SELECT USING (true);

-- Tạo policy chỉ cho phép admin thao tác (cần service role key)
CREATE POLICY "Allow admin access to contribution_schedules" ON contribution_schedules
    FOR ALL USING (true);

-- Thêm dữ liệu mẫu
INSERT INTO contribution_schedules (name, type, amount, day_of_week, is_active) VALUES
('Đóng góp hàng tuần', 'weekly', 100000, 0, true), -- Chủ nhật
('Đóng góp hàng tháng', 'monthly', 500000, 1, true); -- Ngày 1 hàng tháng
