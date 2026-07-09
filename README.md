# VŨ HOÀNG LIGHTING • POS Pro (Supabase Version)

Phiên bản tối ưu, tách module rõ ràng + kết nối Supabase Auth + Database.

## Cấu trúc thư mục

```
vuhoang-pos-supabase/
├── index.html          # File chính (chứa login + layout tabs)
├── css/
│   └── style.css       # Toàn bộ CSS custom + Tailwind overrides
├── js/
│   ├── supabase-client.js   # Khởi tạo Supabase + Auth functions
│   ├── data-service.js      # Load/Save dữ liệu (products, customers, orders)
│   ├── pos.js               # Logic bán hàng nhanh (cart, thêm SP, thanh toán)
│   ├── ui.js                # Helpers chung (toast, format, switch tab, render grid...)
│   └── main.js              # Khởi động app + gắn event
└── README.md
```

## Hướng dẫn chạy

1. Mở folder này bằng **Live Server** (VS Code extension) hoặc chạy:
   ```bash
   npx serve .
   ```

2. **Cấu hình Supabase** (bắt buộc để dùng đầy đủ):
   - Mở file `js/supabase-client.js`
   - Thay `SUPABASE_URL` và `SUPABASE_ANON_KEY` bằng thông tin từ project Supabase của bạn.

3. **Tạo bảng trong Supabase** (chạy trong SQL Editor):

```sql
-- products
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category text,
  unit text DEFAULT 'Cái',
  price numeric DEFAULT 0,
  stock integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- customers
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  address text,
  note text,
  created_at timestamptz DEFAULT now()
);

-- orders
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text UNIQUE,
  created_at timestamptz DEFAULT now(),
  customer_name text,
  customer_phone text,
  customer_address text,
  note text,
  subtotal numeric,
  discount numeric DEFAULT 0,
  shipping_fee numeric DEFAULT 0,
  paid numeric DEFAULT 0,
  grand numeric,
  debt numeric DEFAULT 0,
  items jsonb,
  user_id uuid REFERENCES auth.users(id)
);
```

4. Vào **Authentication → Providers → Email** → tắt **Confirm email** (để test dễ).

5. Tạo user test trong **Authentication → Users**.

## Chế độ Demo nhanh

Nếu chưa cấu hình Supabase, bấm nút **"Chế độ Demo (Local)"** trên màn hình đăng nhập để dùng ngay với dữ liệu mẫu (lưu localStorage).

## Tính năng chính

- Đăng nhập Supabase (email + password)
- Quản lý sản phẩm, khách hàng, đơn hàng
- Bán hàng nhanh (POS) với giỏ hàng
- In hóa đơn đẹp (A5)
- Dashboard thống kê
- Tự động trừ kho khi bán
- Dữ liệu đồng bộ Supabase

## Lợi ích khi tách file

- Dễ bảo trì và debug
- Có thể mở rộng sau này (thêm nhân viên, phân quyền, realtime...)
- Code sạch, chuyên nghiệp hơn

---

**Liên hệ hỗ trợ**: Hotline 0877 933 362

Phiên bản này được tối ưu và tách module theo yêu cầu của bạn.