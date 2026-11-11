import React, { useMemo, useState, useRef } from 'react';
import { 
  X, 
  BarChart2, 
  Star, 
  BrainCircuit, 
  Clock, 
  Flame, 
  AlertTriangle, 
  Calendar,
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  getSRSAnalytics, 
  exportAllUserData, 
  importAllUserData, 
  getAllUserDataSummary 
} from '../utils/srs';
import { downloadAnkiTSV } from '../utils/ankiExport';

export default function StatsModal({
  isOpen,
  onClose,
  currentLevel = 'N1',
  allWords = [],
  unitSummaries = [],
  srsRecords = {},
  starredSet = new Set(),
  onRestoreData
}) {
  const [backupStatus, setBackupStatus] = useState(null);
  const [mergeMode, setMergeMode] = useState(true); // true: Gộp thông minh, false: Ghi đè
  const fileInputRef = useRef(null);

  const analytics = useMemo(() => {
    return getSRSAnalytics(allWords, srsRecords);
  }, [allWords, srsRecords]);

  // Thống kê tổng hợp toàn bộ 3 cấp độ N3 + N2 + N1
  const allLevelsSummary = useMemo(() => {
    return getAllUserDataSummary();
  }, [srsRecords, starredSet, isOpen]);

  const {
    total,
    newCount,
    againCount,
    hardCount,
    goodCount,
    easyCount,
    masteredTotal,
    dueReviewCount,
    leechCount,
    avgRetention,
    avgStability,
    forecast7Days
  } = analytics;

  const percentMastered = total > 0 ? Math.round((masteredTotal / total) * 100) : 0;

  // Find max count in 7-day forecast for bar heights normalization
  const maxForecastCount = Math.max(1, ...forecast7Days.map(f => f.count));

  // Export JSON Backup toàn bộ 3 cấp độ (N3 + N2 + N1) Version 2
  const handleExportBackupAll = () => {
    try {
      const backupData = exportAllUserData();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `mimikara_backup_all_${dateStr}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupStatus({
        type: 'success',
        message: `Đã xuất thành công file sao lưu toàn diện ${fileName} (${backupData.summary.totalSRS} từ SRS, ${backupData.summary.totalStarred} từ ⭐)!`
      });
      setTimeout(() => setBackupStatus(null), 5000);
    } catch (err) {
      console.error('Export error:', err);
      setBackupStatus({
        type: 'error',
        message: 'Có lỗi xảy ra khi tạo file sao lưu: ' + err.message
      });
      setTimeout(() => setBackupStatus(null), 5000);
    }
  };

  // Export JSON Backup riêng cấp độ hiện tại (Tương thích Version 1)
  const handleExportBackupCurrentLevel = () => {
    try {
      const backupData = {
        version: 1,
        app: 'Mimikara Oboeru JLPT',
        level: currentLevel,
        backupDate: new Date().toISOString(),
        totalSRS: Object.keys(srsRecords).length,
        totalStarred: starredSet.size,
        srsRecords: srsRecords,
        starredList: Array.from(starredSet)
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `mimikara_backup_${currentLevel.toLowerCase()}_${dateStr}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupStatus({
        type: 'success',
        message: `Đã xuất file sao lưu ${fileName} thành công!`
      });
      setTimeout(() => setBackupStatus(null), 4000);
    } catch (err) {
      console.error('Export error:', err);
      setBackupStatus({
        type: 'error',
        message: 'Có lỗi xảy ra khi tạo file sao lưu!'
      });
      setTimeout(() => setBackupStatus(null), 4000);
    }
  };

  // Export thẻ từ vựng sang Anki (.tsv)
  const handleExportAnkiCurrentLevel = () => {
    try {
      downloadAnkiTSV(allWords, currentLevel);
      setBackupStatus({
        type: 'success',
        message: `Đã xuất thành công file thẻ Anki mimikara_${currentLevel.toLowerCase()}_anki.tsv (${allWords.length} từ vựng)!`
      });
      setTimeout(() => setBackupStatus(null), 5000);
    } catch (err) {
      console.error('Anki export error:', err);
      setBackupStatus({
        type: 'error',
        message: 'Có lỗi xảy ra khi xuất thẻ Anki: ' + err.message
      });
      setTimeout(() => setBackupStatus(null), 5000);
    }
  };

  // Trigger file dialog
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Xử lý nạp file JSON (Hỗ trợ v2 đa cấp độ & v1, tôn trọng mergeMode)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const result = importAllUserData(text, { merge: mergeMode });

        if (onRestoreData) {
          onRestoreData(result);
        }

        const modeText = mergeMode ? 'Gộp thông minh' : 'Ghi đè toàn bộ';
        setBackupStatus({
          type: 'success',
          message: `Khôi phục thành công (${modeText})! N3: ${result.summary.N3.srsCount} từ | N2: ${result.summary.N2.srsCount} từ | N1: ${result.summary.N1.srsCount} từ.`
        });
        setTimeout(() => setBackupStatus(null), 6000);
      } catch (err) {
        console.error('Import error:', err);
        setBackupStatus({
          type: 'error',
          message: 'Không thể đọc file sao lưu. Vui lòng kiểm tra định dạng file .json! (' + err.message + ')'
        });
        setTimeout(() => setBackupStatus(null), 5000);
      }
      if (e.target) e.target.value = '';
    };
    reader.onerror = () => {
      setBackupStatus({
        type: 'error',
        message: 'Lỗi khi đọc file từ máy tính!'
      });
      setTimeout(() => setBackupStatus(null), 5000);
      if (e.target) e.target.value = '';
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Tiến độ học Mimikara {currentLevel}
              </h2>
              <p className="text-xs text-slate-500">
                Thuật toán Hybrid FSRS-SM2 & Đường cong trí nhớ Ebbinghaus
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

        {/* Big Overall Progress Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
              Đã thành thạo
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {masteredTotal} <span className="text-base font-normal text-slate-500">/ {total} từ</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {percentMastered}% bộ từ vựng {currentLevel}
            </div>
          </div>

          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200 dark:text-slate-700"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-indigo-600 dark:text-indigo-400 transition-all duration-1000 stroke-current"
                strokeDasharray={`${percentMastered}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-sm font-bold">{percentMastered}%</span>
          </div>
        </div>

        {/* Scientific Memory Indicators Grid (Avg Retention, Avg Stability, Due Now, Leeches) */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <BrainCircuit className="w-3.5 h-3.5 text-indigo-500" />
            <span>Chỉ số khoa học bộ nhớ (FSRS Metrics)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Avg Retention */}
            <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200/60 dark:border-violet-900/40">
              <div className="text-[11px] text-violet-600 dark:text-violet-400 mb-0.5 flex items-center gap-1">
                <BrainCircuit className="w-3 h-3" />
                <span>Khả năng nhớ (R)</span>
              </div>
              <div className="text-xl font-black text-violet-700 dark:text-violet-300">
                {avgRetention}%
              </div>
              <div className="text-[10px] text-slate-500">Xác suất nhớ TB</div>
            </div>

            {/* Avg Stability */}
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-900/40">
              <div className="text-[11px] text-sky-600 dark:text-sky-400 mb-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Độ bền ký ức (S)</span>
              </div>
              <div className="text-xl font-black text-sky-700 dark:text-sky-300">
                {avgStability} <span className="text-xs font-normal text-slate-500">ngày</span>
              </div>
              <div className="text-[10px] text-slate-500">Chu kỳ ổn định</div>
            </div>

            {/* Due Now */}
            <div className={`p-3 rounded-xl border ${
              dueReviewCount > 0 
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40' 
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
            }`}>
              <div className={`text-[11px] mb-0.5 flex items-center gap-1 ${
                dueReviewCount > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-500'
              }`}>
                <Flame className="w-3 h-3 text-orange-500" />
                <span>Cần ôn ngay</span>
              </div>
              <div className={`text-xl font-black ${
                dueReviewCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
              }`}>
                {dueReviewCount} <span className="text-xs font-normal text-slate-500">từ</span>
              </div>
              <div className="text-[10px] text-slate-500">Hạn ôn tập hôm nay</div>
            </div>

            {/* Leech Count */}
            <div className={`p-3 rounded-xl border ${
              leechCount > 0 
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40' 
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
            }`}>
              <div className={`text-[11px] mb-0.5 flex items-center gap-1 ${
                leechCount > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-500'
              }`}>
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>Từ hay quên</span>
              </div>
              <div className={`text-xl font-black ${
                leechCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
              }`}>
                {leechCount} <span className="text-xs font-normal text-slate-500">từ</span>
              </div>
              <div className="text-[10px] text-slate-500">Lapses &ge; 4 lần</div>
            </div>
          </div>
        </div>

        {/* 7-Day Review Forecast Bar Chart */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Dự báo số từ đến hạn 7 ngày tới (Review Forecast)
            </span>
            <span className="text-slate-400 text-[11px]">
              Tổng: {forecast7Days.reduce((a, b) => a + b.count, 0)} lượt
            </span>
          </div>

          <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-28 pt-4 pb-1 px-1">
            {forecast7Days.map((item, idx) => {
              const heightPercent = Math.max(8, Math.round((item.count / maxForecastCount) * 100));
              const isToday = idx === 0;

              return (
                <div key={item.day} className="flex-1 flex flex-col items-center h-full justify-end group">
                  {/* Card count text */}
                  <span className={`text-[10px] font-mono mb-1 transition-all ${
                    item.count > 0 
                      ? 'font-bold text-slate-700 dark:text-slate-200' 
                      : 'text-slate-400 opacity-60'
                  }`}>
                    {item.count}
                  </span>

                  {/* Vertical bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700/60 rounded-t-md overflow-hidden flex items-end h-16">
                    <div 
                      className={`w-full rounded-t-md transition-all duration-700 ${
                        isToday 
                          ? 'bg-gradient-to-t from-rose-500 to-orange-400' 
                          : item.count > 0 
                            ? 'bg-gradient-to-t from-indigo-600 to-sky-400 group-hover:from-indigo-500 group-hover:to-sky-300' 
                            : 'bg-transparent'
                      }`}
                      style={{ height: `${item.count > 0 ? heightPercent : 4}%` }}
                    />
                  </div>

                  {/* Label */}
                  <span className={`text-[10px] mt-1.5 truncate max-w-full font-medium ${
                    isToday ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-500'
                  }`} title={item.date}>
                    {isToday ? 'Hôm nay' : `+${item.day}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4 Stage Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Chưa học
            </div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{newCount}</div>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
            <div className="text-xs text-rose-600 dark:text-rose-400 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Chưa thuộc
            </div>
            <div className="text-lg font-bold text-rose-600 dark:text-rose-400">{againCount}</div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
            <div className="text-xs text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Khó nhớ
            </div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{hardCount}</div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Đã thuộc
            </div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{masteredTotal}</div>
          </div>
        </div>

        {/* Starred Count */}
        <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
              Từ vựng đánh dấu yêu thích (Starred)
            </span>
          </div>
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
            {starredSet.size} từ
          </span>
        </div>

        {/* Unit Breakdown */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Chi tiết từng Unit {currentLevel}
          </h3>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {unitSummaries.map((u) => {
              const uWords = allWords.filter(w => w.unit === u.unit);
              const uMastered = uWords.filter(w => ['good', 'easy'].includes(srsRecords[w.id]?.stage)).length;
              const uPercent = uWords.length > 0 ? Math.round((uMastered / uWords.length) * 100) : 0;

              return (
                <div key={u.unit} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Unit {u.unit < 10 ? `0${u.unit}` : u.unit} ({u.words} từ)
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${uPercent}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono text-slate-500">{uPercent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Backup & Restore Section (N3 • N2 • N1 All Levels) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Sao lưu & Đồng bộ Toàn diện (N3 • N2 • N1)
              </h3>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Lưu vĩnh viễn
            </span>
          </div>

          {/* All Levels Summary Card */}
          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/60 text-center">
            <div className="p-1.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30">
              <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Khóa N3</div>
              <div className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
                {allLevelsSummary.N3.srsCount} <span className="text-[10px] font-normal text-slate-400">từ</span>
              </div>
              <div className="text-[10px] text-slate-400">{allLevelsSummary.N3.starredCount} ⭐</div>
            </div>

            <div className="p-1.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30">
              <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Khóa N2</div>
              <div className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
                {allLevelsSummary.N2.srsCount} <span className="text-[10px] font-normal text-slate-400">từ</span>
              </div>
              <div className="text-[10px] text-slate-400">{allLevelsSummary.N2.starredCount} ⭐</div>
            </div>

            <div className="p-1.5 rounded-lg bg-rose-50/60 dark:bg-rose-950/30">
              <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Khóa N1</div>
              <div className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
                {allLevelsSummary.N1.srsCount} <span className="text-[10px] font-normal text-slate-400">từ</span>
              </div>
              <div className="text-[10px] text-slate-400">{allLevelsSummary.N1.starredCount} ⭐</div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Hệ thống tự động gói trọn toàn bộ tiến độ Spaced Repetition (SRS) và danh sách yêu thích của <b>cả 3 khóa N3, N2, N1</b> vào 1 file sao lưu duy nhất. Bạn có thể lưu trữ vĩnh viễn trên máy tính hoặc chuyển sang thiết bị khác học tiếp.
          </p>

          {/* Import Merge Mode Options */}
          <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 text-xs">
            <div className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide">
              Chế độ khi nạp file sao lưu:
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="mergeMode"
                  checked={mergeMode === true}
                  onChange={() => setMergeMode(true)}
                  className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="font-medium">Gộp thông minh (Khuyên dùng)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-500 dark:text-slate-400">
                <input
                  type="radio"
                  name="mergeMode"
                  checked={mergeMode === false}
                  onChange={() => setMergeMode(false)}
                  className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Ghi đè toàn bộ</span>
              </label>
            </div>
          </div>

          {backupStatus && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 transition-all animate-fadeIn ${
              backupStatus.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}>
              {backupStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              )}
              <span>{backupStatus.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleExportBackupAll}
              className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>📥 Xuất Sao Lưu Toàn Bộ (N3•N2•N1 .json)</span>
            </button>

            <button
              type="button"
              onClick={handleImportClick}
              className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Upload className="w-4 h-4 text-indigo-500" />
              <span>📤 Nhập Dữ Liệu Từ File (.json)</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
          </div>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={handleExportBackupCurrentLevel}
              className="text-[11px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 underline underline-offset-2 transition-colors"
            >
              Hoặc chỉ xuất riêng file sao lưu cho cấp độ {currentLevel} (.json)
            </button>
          </div>

          {/* Anki Deck Export */}
          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <button
              type="button"
              onClick={handleExportAnkiCurrentLevel}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-semibold shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <FileSpreadsheet className="w-4 h-4 text-sky-400" />
              <span>🃏 Xuất Thẻ Sang Anki Cấp Độ {currentLevel} ({allWords.length} từ .tsv)</span>
            </button>
            <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
              Định dạng chuẩn Anki với đầy đủ chữ Hán, Furigana Ruby, Hán Việt, Nghĩa, Ví dụ và Tag phân cấp Unit.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
