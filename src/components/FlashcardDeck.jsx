import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Volume2, 
  RotateCw, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Shuffle, 
  Sparkles, 
  Lightbulb, 
  BookOpen, 
  Type, 
  Volume1,
  VolumeX, 
  Check, 
  HelpCircle,
  BrainCircuit,
  MessageSquareQuote,
  Flame,
  ArrowRight
} from 'lucide-react';
import { speakJapanese } from '../utils/audio';
import { 
  previewNextIntervals, 
  getRetrievability, 
  formatIntervalLabel 
} from '../utils/srs';
import { formatRelatedRuby, makeRubyCloze, formatExampleMeaning } from '../utils/text';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Trích xuất câu khuyết ngữ cảnh (Cloze Deletion) từ ví dụ của từ vựng
 * Theo nguyên tắc Active Recall & Minimum Information của chuyên gia nhận thức học
 * Sử dụng makeRubyCloze để bảo toàn 100% Furigana của các chữ Hán xung quanh
 */
function getClozeData(word) {
  if (!word) return null;

  const examples = word.examples || [];
  const cleanWord = (word.word || '').replace(/\(.*?\)/g, '').trim();

  if (examples.length === 0) {
    return {
      example: null,
      clozeRubyHtml: '<span class="cloze animate-pulse">【 ？ 】</span>',
      solvedRubyHtml: `<span class="cloze-solved">${word.wordHtml || word.word}</span>`,
      targetHtml: word.wordHtml || word.word,
      target: cleanWord || word.word,
      situation: word.meanings?.[0] || 'Từ vựng tiếng Nhật',
      hasSentence: false
    };
  }

  // Tìm ví dụ khớp từ vựng qua makeRubyCloze
  for (const ex of examples) {
    const res = makeRubyCloze(ex.rubyHtml, ex.japanese, word.word, word.reading);
    if (res.hasMatch) {
      return {
        example: ex,
        clozeRubyHtml: res.clozeRubyHtml,
        solvedRubyHtml: res.solvedRubyHtml,
        targetHtml: res.targetHtml,
        target: cleanWord || word.word,
        situation: ex.meaning,
        hasSentence: true
      };
    }
  }

  // Dự phòng: Lấy câu ví dụ đầu tiên
  const first = examples[0];
  const fallbackRes = makeRubyCloze(first.rubyHtml, first.japanese, word.word, word.reading);
  return {
    example: first,
    clozeRubyHtml: fallbackRes.clozeRubyHtml,
    solvedRubyHtml: fallbackRes.solvedRubyHtml,
    targetHtml: fallbackRes.targetHtml,
    target: cleanWord || word.word,
    situation: first.meaning,
    hasSentence: true
  };
}

export default function FlashcardDeck({
  words,
  currentIndex,
  onNavigate,
  onRateSRS,
  srsRecords,
  starredSet,
  onToggleStar,
  furiganaMode,
  soundSpeed,
  isFlipped,
  onToggleFlip,
  onShuffle,
  isSmartSRSSort = false,
  onToggleSmartSRS
}) {
  // Chế độ thẻ: 'context' (Thẻ Ngữ Cảnh / Cloze - Khuyên dùng) hoặc 'vocab' (Thẻ Chữ Hán / Kanji Focus)
  const [cardMode, setCardMode] = useState(() => {
    return localStorage.getItem('mimikara_card_mode') || 'context';
  });

  // Tự động phát âm thanh khi lật thẻ (Dual Coding Principle)
  const [autoPlayAudio, setAutoPlayAudio] = useState(() => {
    return localStorage.getItem('mimikara_auto_audio') !== 'false';
  });

  const [showHint, setShowHint] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const currentWord = words[currentIndex];

  // Lưu lựa chọn cardMode & autoPlayAudio
  useEffect(() => {
    localStorage.setItem('mimikara_card_mode', cardMode);
  }, [cardMode]);

  useEffect(() => {
    localStorage.setItem('mimikara_auto_audio', autoPlayAudio);
  }, [autoPlayAudio]);

  // Reset hint khi đổi từ
  useEffect(() => {
    setShowHint(false);
  }, [currentIndex, currentWord?.id]);

  // Tự động phát âm thanh khi lật sang mặt sau (nếu bật autoPlayAudio)
  useEffect(() => {
    if (isFlipped && autoPlayAudio && currentWord) {
      speakJapanese(currentWord.word, soundSpeed);
    }
  }, [isFlipped, autoPlayAudio, currentWord?.id]);

  // Phím tắt C để đổi chế độ thẻ, H để bật gợi ý
  useEffect(() => {
    const handleDeckKeys = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setCardMode(prev => prev === 'context' ? 'vocab' : 'context');
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setShowHint(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleDeckKeys);
    return () => window.removeEventListener('keydown', handleDeckKeys);
  }, []);

  if (!currentWord) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
        <Sparkles className="w-12 h-12 text-indigo-400 mb-3 animate-pulse" />
        <p className="text-lg font-medium">Không tìm thấy từ vựng nào trong danh sách này.</p>
      </div>
    );
  }

  const isStarred = starredSet.has(currentWord.id);
  const srsInfo = srsRecords[currentWord.id];
  const srsStage = srsInfo?.stage || 'new';

  const intervalsPreview = useMemo(() => {
    return previewNextIntervals(srsInfo);
  }, [srsInfo]);

  const isLearnedCard = srsInfo && srsInfo.state !== 'new' && !!srsInfo.lastReviewed;
  const currentRetention = useMemo(() => {
    if (!isLearnedCard) return 0;
    return Math.round(getRetrievability(srsInfo) * 100);
  }, [srsInfo, isLearnedCard]);

  const clozeData = useMemo(() => getClozeData(currentWord), [currentWord]);

  const handleSpeak = (text, e) => {
    if (e) e.stopPropagation();
    setIsPlayingAudio(true);
    speakJapanese(text, soundSpeed);
    setTimeout(() => setIsPlayingAudio(false), 1200);
  };

  const getSRSBadge = () => {
    switch (srsStage) {
      case 'again':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">Cần ôn lại</span>;
      case 'hard':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">Khó</span>;
      case 'good':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">Đã nhớ</span>;
      case 'easy':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">Rất vững</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Từ mới</span>;
    }
  };

  const furiganaClass = furiganaMode === 'hide' 
    ? 'furigana-hide' 
    : furiganaMode === 'hover' 
      ? 'furigana-hover' 
      : '';

  const related = currentWord.related || {};
  const hasRelated = 
    (related.compounds?.length || 0) +
    (related.collocations?.length || 0) +
    (related.synonyms?.length || 0) +
    (related.antonyms?.length || 0) +
    (related.relatedWords?.length || 0) +
    (related.idioms?.length || 0) +
    (related.notes?.length || 0) > 0;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      
      {/* Top Deck Controls: Unit Badge + Perspective Switcher + Shuffle + Star */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-3 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
        
        {/* Left: Unit & SRS */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-md border border-indigo-200/60 dark:border-indigo-800/60">
            Unit {currentWord.unit} • #{currentWord.id}
          </span>
          {getSRSBadge()}
          {isLearnedCard && (
            <span 
              className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1"
              title={`Độ bền ký ức (Stability): ${srsInfo.stability || srsInfo.interval} ngày`}
            >
              🧠 Nhớ: {currentRetention}% • Chu kỳ: {formatIntervalLabel(srsInfo.interval)}
            </span>
          )}
          {srsInfo?.isLeech && (
            <span 
              className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300 dark:border-rose-800 animate-pulse flex items-center gap-1"
              title={`Thẻ hay quên (Lapses >= 4 lần: ${srsInfo.lapses}) - Cần chú ý đặc biệt!`}
            >
              ⚠️ Hay quên ({srsInfo.lapses} lần)
            </span>
          )}
        </div>

        {/* Center: Card Mode Switcher (Active Recall / Context vs Kanji Focus) */}
        <div className="flex items-center bg-slate-200/80 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-300/60 dark:border-slate-700/60 shadow-inner">
          <button
            onClick={() => setCardMode('context')}
            title="Thẻ Ngữ Cảnh (Cloze Deletion) - Ép truy hồi chủ động từ tình huống thực tế (Phím C)"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              cardMode === 'context'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Thẻ Ngữ Cảnh</span>
            <span className="text-[10px] px-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-500 font-mono">C</span>
          </button>

          <button
            onClick={() => setCardMode('vocab')}
            title="Thẻ Chữ Hán & Từ Vựng - Tập trung nhận diện mặt chữ Kanji lớn (Phím C)"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              cardMode === 'vocab'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Thẻ Chữ Hán</span>
            <span className="text-[10px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">C</span>
          </button>
        </div>

        {/* Right: Auto Sound + Shuffle + Counter + Star */}
        <div className="flex items-center gap-2">
          
          {/* Toggle Auto Audio on Flip */}
          <button
            onClick={() => setAutoPlayAudio(prev => !prev)}
            title={autoPlayAudio ? "Tự động phát âm khi lật thẻ: ĐANG BẬT" : "Tự động phát âm khi lật thẻ: ĐANG TẮT"}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition-all ${
              autoPlayAudio 
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' 
                : 'text-slate-400 hover:text-slate-600 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {autoPlayAudio ? <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">Tự phát âm</span>
          </button>

          {onToggleSmartSRS && (
            <button
              onClick={onToggleSmartSRS}
              title={isSmartSRSSort ? "Đang bật chế độ Ưu tiên SRS (từ cần ôn và sắp quên trước) - Bấm để tắt" : "Bật sắp xếp thông minh theo thuật toán SRS (ưu tiên từ cần ôn và sắp quên)"}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                isSmartSRSSort
                  ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm hover:from-orange-600 hover:to-rose-600'
                  : 'text-slate-500 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${isSmartSRSSort ? 'text-yellow-200 fill-yellow-200 animate-bounce' : 'text-orange-500'}`} />
              <span className="hidden sm:inline">Ưu tiên SRS</span>
            </button>
          )}

          <button
            onClick={onShuffle}
            title="Trộn ngẫu nhiên thứ tự từ vựng (Interleaving Practice)"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trộn thẻ</span>
          </button>

          <span className="font-mono">{currentIndex + 1} / {words.length}</span>

          <button
            onClick={() => onToggleStar(currentWord.id)}
            title={isStarred ? "Bỏ lưu yêu thích (S)" : "Lưu vào từ yêu thích (S)"}
            className={`p-1.5 rounded-lg transition-colors ${
              isStarred 
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' 
                : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Star className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`} />
          </button>
        </div>

      </div>

      {/* 3D Flashcard Container */}
      <div 
        className="w-full min-h-[520px] sm:min-h-[540px] perspective-1000 cursor-pointer select-none"
        onClick={onToggleFlip}
      >
        <div 
          className={`relative w-full h-full min-h-[520px] sm:min-h-[540px] duration-500 transform-style-3d transition-transform ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* ================= CARD FRONT ================= */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-8 flex flex-col justify-between overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
            
            {/* Front Top Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                  Thẻ số #{currentWord.id}
                </span>
                {cardMode === 'context' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                    <BrainCircuit className="w-3 h-3" />
                    <span>TRUY HỒI NGỮ CẢNH (CLOZE)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    <Type className="w-3 h-3" />
                    <span>NHẬN DIỆN MẶT CHỮ (KANJI)</span>
                  </span>
                )}
              </div>

              <button
                onClick={(e) => handleSpeak(cardMode === 'context' && clozeData?.example ? clozeData.example.japanese : currentWord.word, e)}
                title="Nghe phát âm (A)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
              >
                <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'animate-bounce text-indigo-600' : ''}`} />
                <span>Nghe đọc (A)</span>
              </button>
            </div>

            {/* Front Main Body: Context Cloze Mode vs Kanji Focus Mode */}
            {cardMode === 'context' ? (
              /* --- CHẾ ĐỘ THẺ NGỮ CẢNH (CLOZE CONTEXT) --- */
              <div className="flex flex-col items-center justify-center my-auto text-center px-2 sm:px-6 max-w-2xl mx-auto space-y-6">
                
                {/* 1. Situation / Context Prompt in Vietnamese */}
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Tình huống thực tế (Bối cảnh)</span>
                  </div>
                  <p className="text-base sm:text-xl text-slate-700 dark:text-slate-200 font-medium italic leading-relaxed pt-1">
                    {formatExampleMeaning(clozeData?.situation || currentWord.meanings?.[0])}
                  </p>
                </div>

                {/* 2. Cloze Sentence in Japanese with .cloze Blank */}
                <div className="w-full p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Điền từ thích hợp vào chỗ trống
                  </div>
                  <p 
                    className={`jp-sentence font-japanese text-xl sm:text-2xl md:text-3xl font-semibold leading-relaxed text-slate-800 dark:text-slate-100 ${furiganaClass}`}
                    dangerouslySetInnerHTML={{ __html: clozeData?.clozeRubyHtml || '<span class="cloze animate-pulse">【 ？ 】</span>' }}
                  />
                </div>

                {/* 3. Hint Toggle (Spoiler: Han Viet / First character) */}
                {showHint && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="animate-fadeIn p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2 max-w-md"
                  >
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      {currentWord.hanviet ? (
                        <><b>Hán Việt:</b> <span className="font-bold uppercase tracking-wider">{currentWord.hanviet}</span></>
                      ) : null}
                      {currentWord.reading ? (
                        <> • <b>Bắt đầu bằng:</b> "{currentWord.reading[0]}..."</>
                      ) : null}
                      {currentWord.meanings?.length > 1 ? (
                        <> • <b>Nghĩa mở rộng:</b> {currentWord.meanings[1]}</>
                      ) : null}
                    </span>
                  </div>
                )}

              </div>
            ) : (
              /* --- CHẾ ĐỘ THẺ CHỮ HÁN (KANJI FOCUS) --- */
              <div className="flex flex-col items-center justify-center my-auto text-center px-4">
                
                {/* Large Kanji Display */}
                <div 
                  className={`font-japanese text-5xl sm:text-6xl md:text-7xl font-bold tracking-wide text-slate-800 dark:text-slate-100 transition-all ${furiganaClass}`}
                  dangerouslySetInnerHTML={{ __html: currentWord.wordHtml || currentWord.word }}
                />

                {/* Han Viet Badge */}
                {currentWord.hanviet && (
                  <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-semibold text-sm tracking-widest border border-slate-200 dark:border-slate-700">
                    <span className="text-indigo-500 font-bold">HÁN VIỆT:</span>
                    <span>{currentWord.hanviet}</span>
                  </div>
                )}

                {/* Optional Cloze Sentence Hint */}
                {showHint && clozeData?.hasSentence && (
                  <div 
                    onClick={(e) => e.stopPropagation()} 
                    className="mt-6 p-3.5 max-w-lg rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs text-left animate-fadeIn space-y-1.5"
                  >
                    <div className="font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <BrainCircuit className="w-3.5 h-3.5" />
                      <span>Gợi ý câu khuyết từ (Cloze Context):</span>
                    </div>
                    <p 
                      className={`jp-sentence font-japanese font-medium text-slate-800 dark:text-slate-200 ${furiganaClass}`}
                      dangerouslySetInnerHTML={{ __html: clozeData.clozeRubyHtml }}
                    />
                    <p className="text-slate-500 dark:text-slate-400 italic">
                      "{clozeData.situation}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Front Bottom Controls */}
            <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHint(prev => !prev);
                }}
                className="flex items-center gap-1.5 hover:text-amber-500 dark:hover:text-amber-400 transition-colors font-medium"
              >
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>{showHint ? "Ẩn gợi ý (H)" : "Xem gợi ý (H)"}</span>
              </button>

              <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform">
                <RotateCw className="w-4 h-4 animate-spin-slow" />
                <span>Nhấn Space hoặc Click để lật đáp án</span>
              </div>
            </div>

          </div>

          {/* ================= CARD BACK ================= */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-7 flex flex-col justify-between overflow-y-auto">
            
            <div className="space-y-4">
              
              {/* Back Header: Target Word + Furigana + Han Viet + Speak & Re-flip */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <span 
                    className={`font-japanese text-3xl font-bold text-indigo-600 dark:text-indigo-400 ${furiganaClass}`}
                    dangerouslySetInnerHTML={{ __html: currentWord.wordHtml || currentWord.word }}
                  />
                  {currentWord.hanviet && (
                    <span className="text-xs font-bold uppercase bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
                      {currentWord.hanviet}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleSpeak(currentWord.word, e)}
                    className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 transition-colors"
                    title="Phát âm từ vựng (A)"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFlip();
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Lật lại mặt trước (Space)"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 1. Solved Context Sentence (Khắc sâu trí nhớ từ câu hỏi mặt trước) */}
              {clozeData?.hasSentence && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 text-xs sm:text-sm space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Câu ví dụ hoàn chỉnh (Đã giải mã)</span>
                    </div>

                    <button
                      onClick={(e) => handleSpeak(clozeData.example.japanese, e)}
                      title="Nghe đọc toàn bộ câu này"
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-semibold text-xs transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Nghe câu</span>
                    </button>
                  </div>

                  <p 
                    className={`jp-sentence font-japanese text-base sm:text-lg font-medium text-slate-800 dark:text-slate-100 leading-relaxed ${furiganaClass}`}
                    dangerouslySetInnerHTML={{ __html: clozeData.solvedRubyHtml }}
                  />

                  <p className="text-slate-600 dark:text-slate-400 italic text-xs">
                    "{clozeData.situation}"
                  </p>
                </div>
              )}

              {/* 2. Structured Meanings Section */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Ý nghĩa tiếng Việt
                </div>
                <div className="space-y-1">
                  {currentWord.meanings?.map((m, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      {currentWord.meanings.length > 1 && (
                        <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                      )}
                      <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        {m}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Collocations / Cụm từ đi kèm (連語 - Cốt lõi của Mimi Kara) */}
              {related.collocations?.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <span>Cụm từ hay đi kèm (連語 Collocations - Mimi Kara)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {related.collocations.map((item, i) => (
                      <div key={`col-${i}`} className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-2.5">
                        <span className="px-2 py-0.5 rounded-lg font-bold text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 shrink-0 mt-1">
                          連 Đi kèm
                        </span>
                        <div className="space-y-1">
                          <div 
                            className={`jp-sentence font-japanese text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed ${furiganaClass}`} 
                            dangerouslySetInnerHTML={{ __html: formatRelatedRuby(item.rubyHtml || item.text, currentWord.word, currentWord.wordHtml, currentWord.reading) }} 
                          />
                          <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{item.meaning}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Related Words (Synonyms, Antonyms, Compounds, Idioms) */}
              {hasRelated && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Từ liên quan & Mở rộng ngữ nghĩa
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    
                    {/* Synonyms 類 */}
                    {related.synonyms?.map((item, i) => (
                      <div key={`syn-${i}`} className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-start gap-2.5">
                        <span className="px-2 py-0.5 rounded-lg font-bold text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 shrink-0 mt-1">
                          類 Đồng nghĩa
                        </span>
                        <div className="space-y-1">
                          <div 
                            className={`jp-sentence font-japanese text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed ${furiganaClass}`} 
                            dangerouslySetInnerHTML={{ __html: formatRelatedRuby(item.rubyHtml || item.text, currentWord.word, currentWord.wordHtml, currentWord.reading) }} 
                          />
                          <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{item.meaning}</div>
                        </div>
                      </div>
                    ))}

                    {/* Antonyms 対 */}
                    {related.antonyms?.map((item, i) => (
                      <div key={`ant-${i}`} className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5">
                        <span className="px-2 py-0.5 rounded-lg font-bold text-xs bg-rose-200 dark:bg-rose-800 text-rose-800 dark:text-rose-200 shrink-0 mt-1">
                          対 Trái nghĩa
                        </span>
                        <div className="space-y-1">
                          <div 
                            className={`jp-sentence font-japanese text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed ${furiganaClass}`} 
                            dangerouslySetInnerHTML={{ __html: formatRelatedRuby(item.rubyHtml || item.text, currentWord.word, currentWord.wordHtml, currentWord.reading) }} 
                          />
                          <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{item.meaning}</div>
                        </div>
                      </div>
                    ))}

                    {/* Compounds 合 */}
                    {related.compounds?.map((item, i) => (
                      <div key={`cmp-${i}`} className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5">
                        <span className="px-2 py-0.5 rounded-lg font-bold text-xs bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 shrink-0 mt-1">
                          合 Từ ghép
                        </span>
                        <div className="space-y-1">
                          <div 
                            className={`jp-sentence font-japanese text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed ${furiganaClass}`} 
                            dangerouslySetInnerHTML={{ __html: formatRelatedRuby(item.rubyHtml || item.text, currentWord.word, currentWord.wordHtml, currentWord.reading) }} 
                          />
                          <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{item.meaning}</div>
                        </div>
                      </div>
                    ))}

                    {/* Related Words 関 */}
                    {related.relatedWords?.map((item, i) => (
                      <div key={`rel-${i}`} className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5">
                        <span className="px-2 py-0.5 rounded-lg font-bold text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 shrink-0 mt-1">
                          関 Liên quan
                        </span>
                        <div className="space-y-1">
                          <div 
                            className={`jp-sentence font-japanese text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed ${furiganaClass}`} 
                            dangerouslySetInnerHTML={{ __html: formatRelatedRuby(item.rubyHtml || item.text, currentWord.word, currentWord.wordHtml, currentWord.reading) }} 
                          />
                          <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{item.meaning}</div>
                        </div>
                      </div>
                    ))}

                    {/* Idioms 慣 */}
                    {related.idioms?.map((item, i) => (
                      <div key={`idm-${i}`} className="p-3 rounded-2xl bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 flex items-start gap-2.5">
                        <span className="px-2 py-0.5 rounded-lg font-bold text-xs bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 shrink-0 mt-1">
                          慣 Quán ngữ
                        </span>
                        <div className="space-y-1">
                          <div 
                            className={`jp-sentence font-japanese text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed ${furiganaClass}`} 
                            dangerouslySetInnerHTML={{ __html: formatRelatedRuby(item.rubyHtml || item.text, currentWord.word, currentWord.wordHtml, currentWord.reading) }} 
                          />
                          <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{item.meaning}</div>
                        </div>
                      </div>
                    ))}

                    {/* Notes ※ */}
                    {related.notes?.map((item, i) => (
                      <div key={`nte-${i}`} className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
                        <span className="px-2 py-0.5 rounded-lg font-bold text-xs bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0 mt-1">
                          ※ Lưu ý
                        </span>
                        <div className="space-y-1">
                          <div 
                            className={`jp-sentence font-japanese text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed ${furiganaClass}`} 
                            dangerouslySetInnerHTML={{ __html: formatRelatedRuby(item.rubyHtml || item.text, currentWord.word, currentWord.wordHtml, currentWord.reading) }} 
                          />
                          <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{item.meaning}</div>
                        </div>
                      </div>
                    ))}

                  </div>
                </div>
              )}

              {/* 5. Additional Example Sentences */}
              {currentWord.examples?.length > 1 && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Các câu ví dụ khác ({currentWord.examples.length - 1})
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {currentWord.examples.slice(1).map((ex, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5 group hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div 
                            className={`jp-sentence font-japanese text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed ${furiganaClass}`}
                            dangerouslySetInnerHTML={{ __html: ex.rubyHtml || ex.japanese }}
                          />
                          <button
                            onClick={(e) => handleSpeak(ex.japanese, e)}
                            title="Nghe câu này"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 shrink-0 transition-colors"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm italic">
                          {formatExampleMeaning(ex.meaning)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Back Footer Hint */}
            <div className="text-center text-[11px] text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span>Đánh giá mức độ nhớ bằng phím số <b>[1 - 4]</b></span>
              <span className="text-indigo-500 font-medium">Bấm Space để lật lại</span>
            </div>

          </div>

        </div>
      </div>

      {/* SRS Rating Actions (Phím 1, 2, 3, 4) */}
      <div className="w-full mt-4 flex items-center justify-center gap-2 sm:gap-3">
        <button
          onClick={() => onRateSRS(currentWord.id, 1)}
          className="flex-1 max-w-[130px] flex flex-col items-center py-2 px-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-semibold text-xs transition-all hover:scale-105 active:scale-95 shadow-sm"
        >
          <span className="text-[10px] opacity-75 font-mono">[1]</span>
          <span>Chưa nhớ</span>
          <span className="text-[10px] font-medium opacity-80">{intervalsPreview[1]}</span>
        </button>

        <button
          onClick={() => onRateSRS(currentWord.id, 2)}
          className="flex-1 max-w-[130px] flex flex-col items-center py-2 px-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-semibold text-xs transition-all hover:scale-105 active:scale-95 shadow-sm"
        >
          <span className="text-[10px] opacity-75 font-mono">[2]</span>
          <span>Hơi khó</span>
          <span className="text-[10px] font-medium opacity-80">{intervalsPreview[2]}</span>
        </button>

        <button
          onClick={() => onRateSRS(currentWord.id, 3)}
          className="flex-1 max-w-[130px] flex flex-col items-center py-2 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-semibold text-xs transition-all hover:scale-105 active:scale-95 shadow-sm"
        >
          <span className="text-[10px] opacity-75 font-mono">[3]</span>
          <span>Nhớ tốt</span>
          <span className="text-[10px] font-medium opacity-80">{intervalsPreview[3]}</span>
        </button>

        <button
          onClick={() => onRateSRS(currentWord.id, 4)}
          className="flex-1 max-w-[130px] flex flex-col items-center py-2 px-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-900/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 font-semibold text-xs transition-all hover:scale-105 active:scale-95 shadow-sm"
        >
          <span className="text-[10px] opacity-75 font-mono">[4]</span>
          <span>Rất vững</span>
          <span className="text-[10px] font-medium opacity-80">{intervalsPreview[4]}</span>
        </button>
      </div>

      {/* Navigation Controls */}
      <div className="w-full mt-4 flex items-center justify-between px-4 max-w-lg text-slate-600 dark:text-slate-300">
        <button
          onClick={() => onNavigate(-1)}
          disabled={currentIndex === 0}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold shadow-sm transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Trước (←)</span>
        </button>

        <button
          onClick={onToggleFlip}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 active:scale-95 transition-all"
        >
          <RotateCw className="w-4 h-4" />
          <span>Lật thẻ (Space)</span>
        </button>

        <button
          onClick={() => onNavigate(1)}
          disabled={currentIndex === words.length - 1}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold shadow-sm transition-all"
        >
          <span>Tiếp (→)</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
