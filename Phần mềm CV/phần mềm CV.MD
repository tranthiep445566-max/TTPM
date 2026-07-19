# PHẦN MỀM QUẢN LÝ DỰ ÁN PHÁT TRIỂN PHẦN MỀM

## 1. Mục tiêu

Xây dựng phần mềm quản lý toàn bộ quy trình kinh doanh và triển khai dự án phần mềm, từ báo giá, quản lý khách hàng, theo dõi tiến độ, doanh thu, công nợ đến hoa hồng nhân viên.

Phần mềm hoạt động tốt trên:

* Laptop
* Điện thoại
* Tablet

Giao diện Responsive/PWA, không cần cài đặt ứng dụng.

---

# 2. Các Module Chính

1. Dashboard
2. Khách hàng
3. Dự án
4. Báo giá
5. Danh mục Module
6. Danh mục Công nghệ
7. Nhân viên
8. Hoa hồng
9. Thống kê
10. Thông báo
11. Nhật ký thao tác
12. Phân quyền
13. Cài đặt

---

# 3. Dashboard

Dashboard hiển thị tổng quan toàn bộ hệ thống.

## Thẻ thống kê

* Tổng dự án

* Dự án đang triển khai

* Dự án chờ cọc

* Dự án chờ thanh toán

* Dự án quá hạn

* Dự án bảo hành

* Dự án hoàn thành

* Tổng doanh thu

* Đã thanh toán

* Công nợ còn lại

* Tổng tiền cọc

* Khách hàng

* Nhân viên

## Biểu đồ

* Doanh thu theo tháng
* Doanh thu theo năm
* Dự án theo trạng thái
* Top Module được bán nhiều
* Top nhân viên doanh số
* Top khách hàng

## Danh sách

* Thông báo mới
* Hoạt động gần đây
* Dự án sắp đến hạn
* Dự án sắp hết bảo hành

---

# 4. Quản lý Khách hàng

Thông tin

* Mã khách hàng
* Tên công ty
* Người liên hệ
* Điện thoại
* Email
* Ngành nghề
* Ghi chú

Lịch sử

* Danh sách dự án
* Tổng giá trị
* Đã thanh toán
* Công nợ
* Báo giá đã gửi
* File đính kèm

Một khách hàng có thể có nhiều dự án.

---

# 5. Quản lý Dự án

## Thông tin

* Mã dự án (tự sinh)
* Tên dự án
* Khách hàng
* Người phụ trách
* Loại phần mềm
* Ngành nghề

## Module sử dụng

Cho phép chọn từ danh mục Module.

Hiển thị:

* Tên Module
* Giá
* Ghi chú

Tự động cộng thành tổng báo giá.

## Công nghệ

Cho phép chọn nhiều công nghệ.

Ví dụ

* SQL Server
* PostgreSQL
* MySQL
* Docker
* Tailscale
* Cloudflare
* Nginx
* ASP.NET
* React
* Vue
* NextJS

## Nội dung dự án

Mô tả yêu cầu.

Có thể nhập dạng văn bản dài, và xuống dọng đc để dễ nhìn. khi tôi click vào khách hàng nào nó sẽ hiện mô tả yêu cầu.

## Tài chính

* Tổng tiền
* Tiền cọc
* Đã thanh toán
* Công nợ

Cho phép chia nhiều đợt thanh toán, lấy từ tổng tiền, và điền % vào sẽ hiện số tiền tương ứng, và khi thanh toán, sẽ chọn đợt 1 và tạo mã QR đúng số tiền, sao đó tôi sẽ xác nhận đợt 1 đã thanh toán, vậy thì khi chọn thanh toán cho dự án này sẽ ko hiện đợt 1 nữa.

Ví dụ

* Cọc
* Thanh toán lần 2
* Thanh toán cuối

Lưu lịch sử thanh toán.

## Thời gian

* Ngày tạo
* Ngày bắt đầu
* Hạn bàn giao
* Ngày bàn giao
* Thời gian bảo hành
* Ngày hết bảo hành

Hệ thống tự tính số ngày còn lại.

---

# 6. Trạng thái Dự án

Cho phép lọc nhanh theo trạng thái.

Danh sách trạng thái:

* Chờ báo giá
* Đã gửi báo giá
* Chờ cọc
* Đã cọc
* Đang phân tích
* Đang thiết kế
* Đang lập trình
* Đang kiểm thử
* Chờ bàn giao
* Đã bàn giao
* Đang bảo hành
* Hoàn thành
* Tạm dừng
* Hủy

Dashboard thống kê theo từng trạng thái.

---

# 7. Báo giá

Tạo báo giá trực tiếp từ Module đã chọn.

Cho phép:

* Thêm Module
* Xóa Module
* Sửa giá
* Giảm giá
* Chiết khấu

Tự tính

* Tổng tiền
* Giảm giá
* Thành tiền

Xuất

* PDF
* In

Lưu nhiều phiên bản báo giá.

---

# 8. Danh mục Module

Mỗi Module gồm:

* Tên Module
* Nhóm Module
* Danh sách chức năng
* Giá
* Ghi chú

Ví dụ

Kho

Chức năng

* Xuất kho
* Nhập kho
* Kiểm kho
* Barcode
* QR Code

Giá

15.000.000

Có thể sao chép Module để tạo Module mới.

---

# 9. Danh mục Công nghệ

Quản lý các công nghệ sử dụng.

Ví dụ

Backend

* ASP.NET
* Laravel
* NodeJS

Frontend

* React
* Vue
* NextJS

Database

* SQL Server
* PostgreSQL
* MySQL

Khác

* Docker
* Tailscale
* Cloudflare
* Redis
* Nginx

---

# 10. Nhân viên

Thông tin

* Mã nhân viên
* Họ tên
* Điện thoại
* Email
* Chức vụ
* Ngày vào làm

Hiển thị

* Dự án đang phụ trách
* Dự án hoàn thành
* Doanh số
* Hoa hồng

---

# 11. Hoa hồng

Hoa hồng tính theo từng dự án.

Ví dụ

Dự án A

100.000.000

Chiết khấu nhân viên

10%

Hoa hồng

10.000.000

## Thống kê

### Hoa hồng dự kiến

Là hoa hồng của các dự án đã ký nhưng khách hàng chưa thanh toán hết.

Hiển thị:

* Tổng dự kiến nhận
* Theo từng dự án
* Theo từng tháng

### Hoa hồng có thể nhận

Là phần hoa hồng tương ứng với số tiền khách hàng đã thanh toán.

Ví dụ

Hợp đồng

100 triệu

Khách thanh toán

40 triệu

Hoa hồng

10%

=> Nhân viên hiện được nhận

4 triệu

Còn dự kiến

6 triệu

### Hoa hồng đã thanh toán

Hiển thị

* Đã thanh toán
* Chưa thanh toán
* Ngày thanh toán
* Người duyệt

Có thể thống kê theo:

* Ngày
* Tuần
* Tháng
* Quý
* Năm

Có QR chuyển khoản ngân hàng để thanh toán hoa hồng nhanh.

---

# 12. Thống kê

Theo khoảng thời gian.

Hiển thị

* Doanh thu
* Công nợ
* Tiền cọc
* Lợi nhuận
* Hoa hồng
* Dự án
* Module bán nhiều
* Khách hàng mới
* Nhân viên doanh số cao

---

# 13. Thông báo

Chuông thông báo.

Ví dụ

* Có dự án mới
* Có khách hàng mới
* Đến hạn bàn giao
* Quá hạn bàn giao
* Sắp hết bảo hành
* Khách chưa thanh toán
* Có thanh toán mới

---

# 14. Nhật ký thao tác

Lưu toàn bộ thao tác.

Ví dụ

* Tạo dự án
* Sửa dự án
* Xóa dự án
* Thêm khách hàng
* Sửa báo giá
* Thanh toán

Hiển thị

* Thời gian
* Người thao tác
* Nội dung

---

# 15. Phân quyền

Admin

Toàn quyền.

Manager

Quản lý dự án.

Sale

Quản lý khách hàng và báo giá.

Developer

Chỉ xem dự án được giao.

Kế toán

Thanh toán và hoa hồng.

Cho phép phân quyền chi tiết:

* Xem
* Thêm
* Sửa
* Xóa
* Xuất PDF
* Xuất Excel
* Duyệt thanh toán
* Duyệt hoa hồng

---

# 16. Cài đặt

Thông tin công ty

* Logo
* Tên công ty
* Địa chỉ
* Điện thoại
* Email
* Website

Cấu hình

* Tài khoản ngân hàng
* QR chuyển khoản
* Mẫu báo giá
* Điều khoản hợp đồng
* Thời gian bảo hành mặc định
* Màu giao diện
* Đơn vị tiền tệ

---

# 17. Yêu cầu kỹ thuật

* Responsive trên điện thoại và máy tính.
* Giao diện hiện đại, thao tác nhanh.
* Tìm kiếm tức thời.
* Lọc dữ liệu theo nhiều điều kiện.
* Sắp xếp và phân trang.
* Xuất PDF và Excel.
* Upload file đính kèm.
* Thông báo theo thời gian thực.
* Lưu lịch sử chỉnh sửa.
* Hỗ trợ nhiều người dùng đồng thời.
* Thiết kế mở để dễ bổ sung chức năng trong tương lai.
Sử dụng supabase để lưu dữ liệu github làm link, xây dựng tinh gọn vào 1 file HTML để tôi đưa lên github
