# ViVer NIC Full System

Bản này gồm:
- Trang chủ phong cách NIC / innovation hub
- Đăng ký / đăng nhập thật
- Quên mật khẩu demo OTP 123456
- Hồ sơ cá nhân
- Admin quản lý sinh viên
- Admin quản lý khóa học
- Admin quản lý workshop
- Database lưu dữ liệu thật bằng file `data/db.json`
- Responsive điện thoại
- Có thể nâng cấp lên MySQL khi deploy thật

## Cách chạy

Mở terminal trong thư mục project:

```bash
npm.cmd install
npm.cmd start
```

Nếu dùng CMD thường:

```bash
npm install
npm start
```

Mở trình duyệt:

```text
http://localhost:3000
```

## Tài khoản có sẵn

Admin:

```text
admin@viver.vn
123456
```

Student:

```text
student@viver.vn
123456
```

## Lưu ý

Dữ liệu được lưu ở:

```text
data/db.json
```

Muốn reset database thì xóa file `data/db.json`, sau đó chạy lại `npm start`.

## Deploy lên Internet

Sau khi test ổn:
1. Push code lên GitHub
2. Deploy lên Render/Railway
3. Đổi database JSON sang MySQL/PostgreSQL nếu chạy lâu dài
4. Mua domain
5. Thêm Google Search Console, sitemap.xml, robots.txt
