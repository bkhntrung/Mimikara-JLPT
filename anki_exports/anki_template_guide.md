# Hướng dẫn Nhập (Import) Bộ Thẻ Mimikara vào Anki

Tất cả 3,201 từ vựng (N3, N2, N1) đã được chuyển đổi sẵn sang file định dạng chuẩn Anki TSV tại thư mục `anki_exports/`:
- `mimikara_n1_anki.tsv` (1,170 từ N1)
- `mimikara_n2_anki.tsv` (1,160 từ N2)
- `mimikara_n3_anki.tsv` (871 từ N3)
- `mimikara_all_3201_anki.tsv` (Toàn bộ 3,201 từ cả 3 cấp độ)

---

## Bước 1: Tạo Kiểu Thẻ (Note Type) trong Anki

1. Mở **Anki** trên máy tính -> Vào menu **Tools** -> **Manage Note Types**.
2. Bấm **Add** -> Chọn **Add: Basic** -> Đặt tên là `Mimikara JLPT`.
3. Bấm nút **Fields...** và tạo 9 trường (Fields) theo đúng thứ tự sau:
   1. `Word`
   2. `Reading`
   3. `Furigana`
   4. `HanViet`
   5. `Meaning`
   6. `Examples`
   7. `Related`
   8. `Level_Unit`
   9. `Tags`
4. Bấm **Cards...** để chỉnh sửa giao diện thẻ:

### Mặt trước (Front Template):
```html
<div class="card-container">
  <div class="level-badge">{{Level_Unit}}</div>
  
  <div class="word-kanji">{{Word}}</div>
  
  {{#HanViet}}
  <div class="hanviet-badge">HÁN VIỆT: {{HanViet}}</div>
  {{/HanViet}}
  
  <div class="hint-text">Gợi ý: Nhớ cách đọc Hiragana & Nghĩa tiếng Việt</div>
</div>
```

### Mặt sau (Back Template):
```html
<div class="card-container">
  <div class="level-badge">{{Level_Unit}}</div>

  <div class="word-furigana">{{Furigana}}</div>

  {{#HanViet}}
  <div class="hanviet-badge">HÁN VIỆT: {{HanViet}}</div>
  {{/HanViet}}

  <hr class="divider">

  <div class="section-title">Ý NGHĨA</div>
  <div class="meaning-box">{{Meaning}}</div>

  {{#Examples}}
  <div class="section-title">CÂU VÍ DỤ</div>
  <div class="examples-box">{{Examples}}</div>
  {{/Examples}}

  {{#Related}}
  <div class="section-title">TỪ LIÊN QUAN & ĐỒNG / TRÁI NGHĨA</div>
  <div class="related-box">{{Related}}</div>
  {{/Related}}
</div>
```

### Định dạng CSS (Styling):
```css
.card {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans JP", sans-serif;
  text-align: center;
  background-color: #f8fafc;
  color: #1e293b;
  padding: 16px;
}

.nightMode .card {
  background-color: #0f172a;
  color: #f1f5f9;
}

.card-container {
  max-width: 600px;
  margin: 0 auto;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 24px 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  text-align: left;
}

.nightMode .card-container {
  background: #1e293b;
  border-color: #334155;
}

.level-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 9999px;
  background: #e0e7ff;
  color: #4338ca;
  margin-bottom: 12px;
}

.nightMode .level-badge {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
}

.word-kanji, .word-furigana {
  font-size: 42px;
  font-weight: 800;
  text-align: center;
  color: #0f172a;
  margin: 10px 0;
  line-height: 1.4;
}

.nightMode .word-kanji, .nightMode .word-furigana {
  color: #f8fafc;
}

ruby {
  ruby-align: center;
}
rt {
  font-size: 0.5em;
  color: #4f46e5;
  font-weight: normal;
}
.nightMode rt {
  color: #818cf8;
}

.hanviet-badge {
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-bottom: 8px;
}
.nightMode .hanviet-badge {
  color: #94a3b8;
}

.hint-text {
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
  margin-top: 16px;
  font-style: italic;
}

.divider {
  border: none;
  border-top: 1px dashed #cbd5e1;
  margin: 18px 0;
}
.nightMode .divider {
  border-top-color: #475569;
}

.section-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #6366f1;
  margin-top: 14px;
  margin-bottom: 6px;
}

.meaning-box {
  font-size: 15px;
  line-height: 1.6;
  font-weight: 600;
  color: #1e293b;
  background: #f8fafc;
  padding: 10px 14px;
  border-radius: 12px;
  border-left: 4px solid #6366f1;
}
.nightMode .meaning-box {
  background: #0f172a;
  color: #f1f5f9;
}

.example-item {
  margin-top: 8px;
  padding: 10px;
  border-radius: 10px;
  background: #f1f5f9;
}
.nightMode .example-item {
  background: #0f172a;
}
.example-jp {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.6;
}
.nightMode .example-jp {
  color: #f1f5f9;
}
.example-vn {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
  font-style: italic;
}
.nightMode .example-vn {
  color: #94a3b8;
}

.rel-row {
  font-size: 13px;
  margin-top: 6px;
  line-height: 1.5;
}
.rel-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  margin-right: 6px;
}
.badge-compound { background: #dbeafe; color: #1e40af; }
.badge-colloc { background: #dcfce7; color: #166534; }
.badge-syn { background: #f3e8ff; color: #6b21a8; }
.badge-ant { background: #ffe4e6; color: #9f1239; }
```

---

## Bước 2: Nhập File vào Anki

1. Trong Anki, bấm **File** -> **Import** (hoặc phím tắt `Ctrl + I`).
2. Chọn file cần nhập (ví dụ: `mimikara_n1_anki.tsv`).
3. Trong bảng Import hiện lên:
   - **Type**: Chọn `Mimikara JLPT` (kiểu thẻ bạn vừa tạo).
   - **Deck**: Chọn bộ thẻ muốn đưa vào (ví dụ: `Mimikara N1`).
   - Các trường sẽ tự động khớp 100% nhờ dòng tiêu đề có sẵn trong file.
4. Bấm **Import**. Toàn bộ thẻ sẽ xuất hiện trong Anki kèm Furigana `<ruby>`, màu sắc, phân loại Tag theo từng Unit chuẩn xác!
