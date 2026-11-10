import React from 'react';
import { ShieldAlert, Zap, RefreshCw, Layers } from 'lucide-react';

export default function TabConflictModal({
  isOpen,
  onClaimSession,
  onReloadData
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-amber-300 dark:border-amber-800 shadow-2xl p-6 sm:p-8 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon & Badge */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 mb-1">
              Bảo vệ tiến độ học tập • Multi-Tab Lock
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Phát hiện cửa sổ học trùng lặp!
            </h2>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-amber-50/60 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200/60 dark:border-amber-900/40">
          <p>
            Ứng dụng Mimikara đang được mở và hoạt động ở một <b>cửa sổ hoặc tab trình duyệt khác</b>.
          </p>
          <p>
            Để bảo vệ bộ nhớ Spaced Repetition (SRS) không bị ghi đè lẫn nhau (Lost Update / Split-Brain), hệ thống tạm khóa an toàn cửa sổ này.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={onClaimSession}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>Học tiếp tại cửa sổ này (Tạm dừng tab kia)</span>
          </button>

          <button
            type="button"
            onClick={onReloadData}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Tải lại dữ liệu mới nhất từ máy</span>
          </button>
        </div>

        {/* Footer Note */}
        <div className="text-center text-[11px] text-slate-400">
          Mẹo: Giữ duy nhất 1 tab học bài để đường cong trí nhớ Ebbinghaus được tính toán chính xác nhất.
        </div>
      </div>
    </div>
  );
}
