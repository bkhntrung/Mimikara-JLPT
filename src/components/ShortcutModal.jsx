import React from 'react';
import { X, Keyboard } from 'lucide-react';

export default function ShortcutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Lật thẻ Flashcard (Xem nghĩa / Xem từ vựng)' },
    { key: 'C', desc: 'Chuyển chế độ: Thẻ Ngữ Cảnh (Cloze) ⇄ Thẻ Chữ Hán' },
    { key: 'H', desc: 'Bật / Tắt gợi ý (Âm Hán Việt, âm đầu, bối cảnh)' },
    { key: '← / →', desc: 'Chuyển sang từ vựng Trước / Kế tiếp' },
    { key: '1', desc: 'Đánh giá: Chưa nhớ (Học lại ngay)' },
    { key: '2', desc: 'Đánh giá: Hơi khó (+1 ngày)' },
    { key: '3', desc: 'Đánh giá: Nhớ tốt (+3 ngày)' },
    { key: '4', desc: 'Đánh giá: Rất vững (+6 ngày)' },
    { key: 'A', desc: 'Phát âm tiếng Nhật (Nghe giọng đọc chuẩn)' },
    { key: 'F', desc: 'Bật / Tắt hiển thị Furigana trên Kanji' },
    { key: 'S', desc: 'Lưu / Bỏ lưu từ vào danh sách Yêu thích (Star)' },
    { key: 'Q', desc: 'Chuyển nhanh chế độ: Flashcard / Trắc nghiệm / Điền câu' },
    { key: '?', desc: 'Mở / Đóng bảng phím tắt này' },
    { key: 'Esc', desc: 'Đóng cửa sổ thông tin' },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Phím tắt trên máy tính (Desktop Shortcuts)
              </h2>
              <p className="text-xs text-slate-500">
                Tối ưu tốc độ học cực nhanh không cần dùng chuột
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {shortcuts.map((sc, i) => (
            <div 
              key={i}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
            >
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {sc.desc}
              </span>
              <kbd className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono font-bold text-indigo-600 dark:text-indigo-400 shadow-sm shrink-0">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition-all"
        >
          Đã hiểu, bắt đầu học!
        </button>
      </div>
    </div>
  );
}
