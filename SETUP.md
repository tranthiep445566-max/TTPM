# Hướng dẫn cài đặt

## 1. Tạo bảng trong Supabase

1. Vào project Supabase của bạn > **SQL Editor** > **New query**.
2. Mở file [`sql/schema.sql`](sql/schema.sql), copy toàn bộ nội dung, dán vào SQL Editor.
3. Bấm **Run**. File này tạo toàn bộ bảng, quan hệ, Row Level Security (RLS), và dữ liệu phân quyền mặc định.

Nếu chạy lại từ đầu (project mới hoàn toàn) mới cần bước này. Nếu đã chạy 1 lần rồi thì không chạy lại (script không phải dạng "chạy nhiều lần an toàn").

## 2. Tắt xác nhận email (khuyến nghị cho nội bộ công ty)

Vào **Authentication > Providers > Email**, tắt **Confirm email** để khi bạn thêm nhân viên mới, họ đăng nhập được ngay mà không cần bấm link xác nhận trong email. Nếu để bật, nhân viên mới cần vào email xác nhận trước khi đăng nhập lần đầu.

## 3. Tạo tài khoản Admin đầu tiên

1. Vào **Authentication > Users > Add user**, tạo 1 user với email/mật khẩu của bạn (người quản trị).
2. Vào **SQL Editor**, chạy lệnh sau (thay email đúng của bạn):

```sql
update profiles set role = 'admin', full_name = 'Tên của bạn' where email = 'email-cua-ban@gmail.com';
```

Tài khoản này sẽ có toàn quyền trên hệ thống.

## 3.5. Cập nhật thêm trường mới (chạy 1 lần)

Vì bạn đã chạy `schema.sql` trước khi có các tính năng mới (giá công nghệ, % hoa hồng mặc định, báo giá gắn với dự án), cần chạy thêm trong SQL Editor:

1. Mở [`sql/migration_002_add_fields.sql`](sql/migration_002_add_fields.sql), copy toàn bộ, dán vào SQL Editor, bấm **Run**.

Nếu muốn có sẵn vài khách hàng/dự án/module/công nghệ mẫu để bấm thử ngay (không phải tự nhập tay), chạy tiếp:

2. Mở [`sql/seed.sql`](sql/seed.sql), copy toàn bộ, dán vào SQL Editor, bấm **Run**. File này chỉ nên chạy 1 lần (chạy lại sẽ tạo trùng dữ liệu).

## 4. Kết nối Supabase (đã cấu hình sẵn)

Project URL và publishable key của bạn (`https://xiezaynnzxhgpxduoxnp.supabase.co`) đã được đặt sẵn làm mặc định trong [`js/supabaseClient.js`](js/supabaseClient.js), nên không cần nhập tay nữa — mở app lên là kết nối luôn.

Nếu sau này đổi sang project Supabase khác, vào **Cài đặt > Kết nối Supabase** để nhập URL/key mới (lưu vào trình duyệt, ghi đè giá trị mặc định).

Lưu ý: chỉ publishable key (`sb_publishable_...`) được đặt trong code — đây là key an toàn để public theo thiết kế của Supabase. Secret key (`sb_secret_...`) không được và không cần dùng ở đâu trong app này.

## 5. Mở phần mềm lần đầu

1. Mở file `index.html` (hoặc link GitHub Pages sau khi deploy).
2. App tự kết nối Supabase, chuyển thẳng tới màn **Đăng nhập**.
3. Đăng nhập bằng tài khoản Admin đã tạo ở bước 3.

## 6. Cấu hình sau khi đăng nhập

- **Cài đặt > Công ty**: tên công ty, logo, địa chỉ...
- **Cài đặt > Ngân hàng / QR**: số tài khoản ngân hàng để tạo mã QR thanh toán dự án và hoa hồng.
- **Nhân viên**: thêm nhân viên (tự động tạo tài khoản đăng nhập cho họ).
- **Phân quyền**: điều chỉnh quyền chi tiết theo từng vai trò nếu cần (mặc định đã có sẵn phân quyền hợp lý cho Manager/Sale/Developer/Kế toán).

## 7. Đưa lên GitHub Pages

Thư mục này đã được chuẩn bị sẵn dưới dạng Git repo cục bộ (đã `git init` + commit). Chọn 1 trong 2 cách sau.

### Bước chung: Tạo repo trên GitHub

1. Vào [github.com](https://github.com), đăng nhập (hoặc **Sign up** miễn phí nếu chưa có tài khoản).
2. Bấm dấu **+** ở góc trên phải > **New repository**.
3. Đặt tên repo, ví dụ `phan-mem-quan-ly-du-an`. Để **Public** hoặc **Private** đều được (GitHub Pages hoạt động với cả 2 loại).
4. **Không** tick "Add a README file" — để repo trống hoàn toàn.
5. Bấm **Create repository**.

### Cách A — Kéo thả file qua trình duyệt (không cần cài gì)

1. Ở trang repo vừa tạo, bấm dòng chữ **"uploading an existing file"**.
2. Mở thư mục `Phần mềm CV` trên máy, chọn hết toàn bộ file và thư mục con bên trong (Ctrl+A), kéo thả vào khung upload của GitHub.
3. Cuộn xuống, bấm **Commit changes**.
4. Nhược điểm: mỗi lần sau này tôi sửa code, bạn phải lặp lại thao tác kéo thả này để cập nhật.

### Cách B — Dùng Git (tôi đã chuẩn bị sẵn, chỉ cần bạn nối vào repo GitHub)

1. Sau khi tạo repo xong, GitHub hiện ra 1 địa chỉ dạng `https://github.com/ten-ban/phan-mem-quan-ly-du-an.git` — copy địa chỉ đó.
2. Mở terminal tại thư mục `Phần mềm CV` (hoặc nhờ tôi chạy giúp), chạy:
```
git remote add origin <dán địa chỉ vừa copy vào đây>
git push -u origin main
```
3. Lần đầu chạy `git push`, máy sẽ tự mở trình duyệt để bạn đăng nhập GitHub — đăng nhập xong là push xong.
4. Từ lần sau, mỗi khi tôi sửa code xong, chỉ cần chạy lại `git push` (hoặc nhờ tôi chạy) để cập nhật lên GitHub, không cần kéo thả thủ công nữa.

### Bật GitHub Pages

1. Vào tab **Settings** của repo > mục **Pages** (menu bên trái).
2. Ở **Build and deployment > Source**, chọn **Deploy from a branch**.
3. **Branch**: chọn `main`, thư mục `/ (root)` > **Save**.
4. Chờ 1-2 phút, tải lại trang, GitHub sẽ hiện link dạng `https://<tên-tài-khoản>.github.io/<tên-repo>/`.

Publishable key có trong code là an toàn để public (thiết kế của Supabase), nên bạn có thể để repo public bình thường.

## Lưu ý bảo mật

- Publishable key không phải là bí mật tuyệt đối, nhưng toàn bộ phân quyền truy cập dữ liệu được kiểm soát bởi Row Level Security (RLS) đã tạo ở bước 1 — không tắt RLS trên các bảng.
- Tuyệt đối không đưa secret key (`sb_secret_...`) / service_role key vào bất kỳ file nào trong repo này.
- Chỉ Admin nên có quyền chỉnh sửa trong **Phân quyền**.
