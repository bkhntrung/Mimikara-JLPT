import React, { useMemo } from 'react';
import { 
  X, 
  BarChart2, 
  Star, 
  BrainCircuit, 
  Clock, 
  Flame, 
  AlertTriangle, 
  Calendar 
} from 'lucide-react';
import { getSRSAnalytics } from '../utils/srs';

export default function StatsModal({
  isOpen,
  onClose,
  currentLevel = 'N1',
  allWords = [],
  unitSummaries = [],
  srsRecords = {},
  starredSet = new Set()
}) {
  if (!isOpen) return null;

  const analytics = useMemo(() => {
    return getSRSAnalytics(allWords, srsRecords);
  }, [allWords, srsRecords]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
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

      </div>
    </div>
  );
}
