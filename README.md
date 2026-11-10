# 🎴 Mimikara Oboeru JLPT (N3 • N2 • N1) - Bộ Thẻ Học & Ôn Luyện Từ Vựng Toàn Diện

Ứng dụng Flashcard & Luyện tập tương tác chất lượng cao dành cho máy tính cá nhân, được xây dựng dựa trên bộ giáo trình kinh điển **耳から覚える日本語能力試験 語彙 (Mimi Kara Oboeru Goi)** trọn vẹn cả 3 cấp độ: **JLPT N3, N2 và N1**.

- **Tổng cộng 3,201 từ vựng chuẩn thi**:
  - 🟢 **JLPT N3:** 871 từ vựng
  - 🔵 **JLPT N2:** 1,160 từ vựng
  - 🟣 **JLPT N1:** 1,170 từ vựng
- **Hơn 8,500 câu ví dụ thực tế** kèm phiên âm Furigana chuẩn mực, dịch nghĩa tiếng Việt và âm thanh giọng đọc bản ngữ.
- **Hơn 3,600 cụm từ liên ngữ (Collocations 連), từ ghép (Compounds 合), từ đồng nghĩa (Synonyms 類) và trái nghĩa (Antonyms 対)**.
- **Thuật toán Spaced Repetition (SRS)** kết hợp SuperMemo SM-2 và FSRS, tự động tính toán chu kỳ quên và độ bền ký ức.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Trên Máy Tính Cá Nhân

Mỗi người có thể tải về và chạy ứng dụng độc lập trên máy tính của riêng mình. Toàn bộ dữ liệu học tập, tiến độ ghi nhớ SRS, lịch sử làm bài và từ vựng yêu thích đều được lưu trữ an toàn ngay trên trình duyệt của máy bạn (LocalStorage), hoàn toàn riêng tư và không lo bị lẫn lộn.

### Yêu cầu tiên quyết
Máy tính của bạn cần cài đặt **Node.js** (phiên bản khuyến nghị LTS 18 hoặc 20 trở lên).  
👉 Tải Node.js chính thức miễn phí tại: [https://nodejs.org/](https://nodejs.org/)

---

### Cách 1: Chạy 1-Click bằng file Batch (Dành cho Windows - Cực kỳ đơn giản)
1. Tải toàn bộ mã nguồn dự án về máy tính hoặc chạy lệnh:
   ```bash
   git clone https://github.com/bkhntrung/Mimikara-JLPT.git
   cd Mimikara-JLPT
   ```
2. **Nhấp đúp chuột vào file `Chay_Mimikara.bat`**.
3. Ứng dụng sẽ tự động:
   - Cài đặt các gói thư viện cần thiết (`npm install`) trong lần chạy đầu tiên.
   - Biên dịch ứng dụng (`npm run build`).
   - Tự động mở trình duyệt web tại địa chỉ: **`http://localhost:4173/`**.
4. Bắt đầu học ngay! Khi học xong, bạn chỉ cần đóng cửa sổ lệnh màu đen lại. Lần sau mở lại chỉ mất 1 giây!

---

### Cách 2: Chạy bằng dòng lệnh Terminal / PowerShell (Windows, macOS, Linux)
```bash
# 1. Đi tới thư mục dự án
cd Mimikara-JLPT

# 2. Cài đặt các thư viện phụ thuộc
npm install

# 3. Biên dịch bản phát hành
npm run build

# 4. Khởi chạy máy chủ chạy thử (Preview Server)
npm run preview -- --port 4173
```
Mở trình duyệt của bạn và truy cập: **`http://localhost:4173/`**

Nếu muốn chạy ở chế độ phát triển (Development):
```bash
npm run dev
```

---

## 🌟 Các Tính Năng Nổi Bật

### 1. 🎴 Thẻ Flashcard 3D Kép (Dual Perspective Flashcards)
- **Chế độ Thẻ Ngữ Cảnh (Cloze Context - Khuyên dùng):** Áp dụng nguyên lý Active Recall và Minimum Information. Mặt trước đưa ra bối cảnh và câu khuyết chữ Hán `【 ？ 】`, buộc não bộ phải truy hồi từ vựng từ ngữ cảnh đời thực.
- **Chế độ Thẻ Chữ Hán (Kanji Focus):** Tập trung nhận diện mặt chữ Kanji cỡ lớn, Hán Việt và các nét nghĩa mở rộng.
- **Lật thẻ 3D mượt mà:** Nhấn `Space` hoặc nhấp chuột để lật đáp án.
- **Furigana thông minh:** Hỗ trợ 3 chế độ: **Hiện luôn**, **Chỉ hiện khi rê chuột (Hover)** để thử thách trí nhớ, hoặc **Ẩn hoàn toàn**.
- **Chống lệch dòng 100%:** Sử dụng CSS chuyên biệt cho thẻ `<ruby><rt>` đảm bảo không bao giờ bị nhảy dòng, xô lệch chữ kể cả trên màn hình nhỏ.

### 2. 🧠 Thuật Toán Giãn Cách Lặp Lại SRS (Spaced Repetition System)
- Đánh giá trí nhớ theo 4 cấp độ: `[1] Cần ôn lại (Again)`, `[2] Khó (Hard)`, `[3] Đã nhớ (Good)`, `[4] Rất vững (Easy)`.
- Tự động đo lường:
  - **Độ bền ký ức (Stability - S)**: Số ngày ước lượng thông tin còn tồn tại trong trí nhớ.
  - **Độ khó của từ (Difficulty - D)**: Tự động điều chỉnh theo từng phản hồi của người học.
  - **Khả năng hồi tưởng (Retrievability - R)**: % xác suất bạn còn nhớ từ vựng tại thời điểm hiện tại.
  - **Nhận diện thẻ hay quên (Leech Detection)**: Cảnh báo những từ bị quên từ 4 lần trở lên.

### 3. ✏️ Bài Tập Điền Câu & Cụm Từ (Cloze Quiz)
- **Điền vào Câu ví dụ thực tế:** Cung cấp câu tiếng Nhật trích xuất từ sách có đầy đủ Furigana xung quanh, kèm gợi ý nghĩa tiếng Việt khi cần.
- **Điền vào Cụm từ hay đi kèm (連語) & Từ ghép (合):** Giúp phản xạ nhanh với các dạng câu hỏi từ vựng thường gặp trong đề thi JLPT.

### 4. 📝 Trắc Nghiệm Đa Chiều 4 Chế Độ JLPT (Quiz Mode)
- **Kanji ➔ Cách đọc Hiragana (JLPT Mondai 1)**
- **Từ vựng ➔ Nghĩa tiếng Việt (JLPT Mondai 2/3)**
- **Nghĩa tiếng Việt ➔ Từ vựng tiếng Nhật**
- **Từ đồng nghĩa & Trái nghĩa (JLPT Mondai 4 - 類義語・対義語)**
- Thuật toán **Smart Distractors** tự động tạo phương án gây nhiễu cùng Unit và độ dài tương đồng để tăng tính thử thách.

### 5. 📖 Sổ Tra Cứu Từ Vựng & Lọc Nâng Cao (Dictionary)
- Tìm kiếm tức thì theo Kanji, Hiragana, Romaji, Hán Việt hoặc nghĩa tiếng Việt.
- Lọc theo cấp độ JLPT (N3, N2, N1), theo Unit bài học, theo từ yêu thích (⭐) hoặc theo tình trạng SRS.

---

## ⌨️ Bảng Phím Tắt Tiện Lợi (Shortcuts)

| Phím | Chức năng |
| :---: | :--- |
| `Space` | Lật thẻ Flashcard (Xem nghĩa / Xem câu hỏi) - Không bị cuộn trang |
| `←` / `→` | Chuyển sang từ vựng Trước / Kế tiếp |
| `1` / `2` / `3` / `4` | Đánh giá SRS (Chưa nhớ / Khó / Đã nhớ / Rất vững) hoặc Chọn đáp án A, B, C, D |
| `C` | Đổi qua lại giữa Thẻ Ngữ Cảnh (Cloze) và Thẻ Chữ Hán (Kanji) |
| `H` | Xem / Ẩn gợi ý (Hán Việt, chữ cái đầu hoặc nghĩa câu) |
| `A` | Nghe phát âm tiếng Nhật |
| `F` | Chuyển đổi chế độ Furigana (Hiện / Rê chuột / Ẩn) |
| `S` | Đánh dấu sao / Bỏ lưu từ vựng yêu thích |
| `Q` | Chuyển đổi nhanh giữa các chế độ học |

---

## 🛡️ Công Nghệ & Bản Quyền
- Xây dựng bằng: **React 18, Vite, TailwindCSS, Lucide Icons, Canvas Confetti**.
- Kiểm thử tự động: Bộ test suite chuẩn Node.js (`node --test`) đảm bảo tính toàn vẹn 100% dữ liệu và thuật toán.
- Mã nguồn mở phục vụ mục đích học tập phi thương mại cho cộng đồng học tiếng Nhật.
