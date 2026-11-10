import React from 'react';
import { 
  Layers, 
  HelpCircle, 
  Moon, 
  Sun, 
  Volume2, 
  Eye, 
  BarChart3, 
  BookOpen, 
  Edit3, 
  CheckCircle2, 
  Keyboard,
  Sparkles
} from 'lucide-react';

export default function Header({
  currentLevel = 'N1',
  onSelectLevel,
  currentUnit,
  onSelectUnit,
  unitSummaries = [],
  studyMode,
  onSelectMode,
  furiganaMode,
  onToggleFurigana,
  soundSpeed,
  onChangeSoundSpeed,
  darkMode,
  onToggleDarkMode,
  onOpenShortcuts,
  onOpenStats,
  learnedCount,
  totalWordsCount
}) {
  const percentLearned = totalWordsCount > 0 ? Math.round((learnedCount / totalWordsCount) * 100) : 0;

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Logo & Level Switcher & Unit Selector */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 font-japanese font-black text-xl text-indigo-600 dark:text-indigo-400">
              <span className="text-2xl">🎴</span>
              <span className="hidden sm:inline tracking-tight">耳から覚える</span>
            </div>

            {/* Level Selector Pills: N3, N2, N1 */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              {['N3', 'N2', 'N1'].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => onSelectLevel(lvl)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                    currentLevel === lvl
                      ? lvl === 'N1'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : lvl === 'N2'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Unit Dropdown */}
            <div className="relative">
              <select
                value={currentUnit}
                onChange={(e) => onSelectUnit(Number(e.target.value))}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold rounded-lg px-2.5 py-1.5 pr-7 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all"
              >
                <option value={0}>🌟 Tất cả {unitSummaries.length} Unit ({totalWordsCount} từ)</option>
                {unitSummaries.map((u) => (
                  <option key={u.unit} value={u.unit}>
                    Unit {u.unit < 10 ? `0${u.unit}` : u.unit} ({u.words} từ)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Switcher Pills */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => onSelectMode('flashcard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                studyMode === 'flashcard'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Flashcard</span>
            </button>

            <button
              onClick={() => onSelectMode('quiz')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                studyMode === 'quiz'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Trắc nghiệm</span>
            </button>

            <button
              onClick={() => onSelectMode('cloze')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                studyMode === 'cloze'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Điền câu</span>
            </button>

            <button
              onClick={() => onSelectMode('dictionary')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                studyMode === 'dictionary'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Sổ từ vựng</span>
            </button>
          </nav>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-2">
            
            {/* Furigana Mode Toggle Button */}
            <button
              onClick={onToggleFurigana}
              title={`Furigana: ${furiganaMode === 'show' ? 'Hiện' : furiganaMode === 'hover' ? 'Rê chuột hiện' : 'Ẩn'}`}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline font-mono">
                {furiganaMode === 'show' ? 'Furi: Bật' : furiganaMode === 'hover' ? 'Furi: Hover' : 'Furi: Tắt'}
              </span>
            </button>

            {/* Sound Speed Dropdown */}
            <div className="relative hidden sm:block">
              <select
                value={soundSpeed}
                onChange={(e) => onChangeSoundSpeed(Number(e.target.value))}
                title="Tốc độ giọng đọc phát âm"
                className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg px-2 py-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer focus:outline-none"
              >
                <option value={0.8}>0.8x (Chậm)</option>
                <option value={1.0}>1.0x (Chuẩn)</option>
                <option value={1.2}>1.2x (Nhanh)</option>
              </select>
            </div>

            {/* Stats Button */}
            <button
              onClick={onOpenStats}
              title={`Đã thuộc ${learnedCount}/${totalWordsCount} từ (${percentLearned}%) - Bấm xem chi tiết SRS`}
              className="relative px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline font-semibold">
                {learnedCount > 0 ? `${learnedCount} từ (${percentLearned}%)` : `${percentLearned}%`}
              </span>
              <span className="sm:hidden font-semibold">
                {learnedCount > 0 ? `${learnedCount} từ` : '0%'}
              </span>
            </button>

            {/* Shortcuts Help Modal Button */}
            <button
              onClick={onOpenShortcuts}
              title="Phím tắt nhanh (?)"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Keyboard className="w-4 h-4 text-slate-500" />
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              title={darkMode ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

          </div>

        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 dark:border-slate-800/60">
          <button
            onClick={() => onSelectMode('flashcard')}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
              studyMode === 'flashcard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Thẻ</span>
          </button>
          <button
            onClick={() => onSelectMode('quiz')}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
              studyMode === 'quiz' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Trắc nghiệm</span>
          </button>
          <button
            onClick={() => onSelectMode('cloze')}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
              studyMode === 'cloze' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Điền câu</span>
          </button>
          <button
            onClick={() => onSelectMode('dictionary')}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
              studyMode === 'dictionary' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Từ điển</span>
          </button>
        </div>

      </div>
    </header>
  );
}
