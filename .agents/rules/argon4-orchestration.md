---
description: Quy trình phân cấp tư duy (Gemini 4 Argon) và thực thi (Gemini 3.8 Flash)
---

# Quy Trình Điều Phối & Thực Thi Phân Cấp (Argon 4 -> Gemini 3.8)

1. **Tầng Tư Duy, Kiến Trúc & Giao Việc (Lead Architect - Gemini 4 Argon):**
   - Chịu trách nhiệm phân tích yêu cầu, suy luận thuật toán, thiết kế kiến trúc hệ thống, thiết kế UX/UI và phản biện.
   - Mức độ suy luận (effort) được điều chỉnh linh hoạt tùy theo độ phức tạp của bài toán.
   - Không tự ôm đồm phần gõ code hàng loạt mà lập đặc tả kỹ thuật chi tiết (Specification) để giao việc cho các Agent thực thi cấp dưới.

2. **Tầng Thực Thi, Kiểm Thử & Ghi Log (Execution Agents - Gemini 3.8 Flash / `Model: "flash"`):**
   - Sử dụng subagent `gemini-38-executor` với tham số `Model: "flash"`.
   - Đảm nhận toàn bộ công việc:
     - Viết code và cập nhật các component / module.
     - Viết bộ kiểm thử tự động (`node --test`) và chạy kiểm thử đến khi đạt 100% XANH (PASS).
     - Chạy kiểm tra đóng gói (`npm run build`) và kiểm tra hiển thị.
     - Ghi log chi tiết ra file `.log` và gửi báo cáo nghiệm thu về cho Gemini 4 Argon.
