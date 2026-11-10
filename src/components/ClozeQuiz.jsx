import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Volume2, 
  Sparkles, 
  Trophy, 
  ArrowRight,
  Flame,
  FileQuestion,
  Lightbulb,
  BookOpen,
  Layers,
  Link2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { speakJapanese } from '../utils/audio';
import { 
  buildClozeSentenceQuestions, 
  buildClozeCollocationQuestions 
} from '../utils/quizHelper';
import { formatExampleMeaning } from '../utils/text';

export default function ClozeQuiz({
  allWords,
  currentUnit,
  currentLevel = 'N1',
  furiganaMode,
  soundSpeed,
  onQuizSRSSync
}) {
  // Chế độ bài tập: 'sentence' (Câu ví dụ thực tế) hoặc 'collocation' (Cụm đi kèm 連語 / Từ ghép 合)
  const [clozeType, setClozeType] = useState('sentence');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Sinh danh sách câu hỏi dựa theo clozeType và currentUnit
  useEffect(() => {
    const unitPool = currentUnit === 0 
      ? allWords 
      : allWords.filter(w => w.unit === currentUnit);

    let builtQuestions = [];
    if (clozeType === 'sentence') {
      builtQuestions = buildClozeSentenceQuestions(unitPool, allWords);
    } else {
      builtQuestions = buildClozeCollocationQuestions(unitPool, allWords);
    }

    setQuestions(builtQuestions);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setIsCompleted(false);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setShowHint(false);
  }, [allWords, currentUnit, clozeType]);

  const currentQ = questions[currentIndex];

  const handleSelectOption = (option) => {
    if (isAnswered || !currentQ) return;

    const isCorrect = option.id === currentQ.target.id;
    setSelectedAnswer(option);
    setIsAnswered(true);

    // Đồng bộ SRS (nếu được truyền prop từ App, không làm thay đổi currentIndex ở Flashcard)
    if (onQuizSRSSync) {
      onQuizSRSSync(currentQ.target.id, isCorrect);
    }

    // Phát âm câu hoặc từ
    const audioText = currentQ.type === 'sentence' 
      ? (currentQ.example?.japanese || currentQ.target.word)
      : (currentQ.originalText || currentQ.target.word);
    speakJapanese(audioText, soundSpeed);

    if (isCorrect) {
      setScore(prev => prev + 1);
      setStreak(prev => {
        const next = prev + 1;
        if (next % 5 === 0) confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        return next;
      });
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setIsCompleted(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setShowHint(false);
    }
  };

  // Keyboard navigation for Cloze Quiz (1-4, A-D, Enter, Space, H for hint)
  useEffect(() => {
    const handleClozeKeys = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (!isAnswered && currentQ?.options) {
        let optIdx = -1;
        if (['1', 'a', 'A'].includes(e.key)) optIdx = 0;
        else if (['2', 'b', 'B'].includes(e.key)) optIdx = 1;
        else if (['3', 'c', 'C'].includes(e.key)) optIdx = 2;
        else if (['4', 'd', 'D'].includes(e.key)) optIdx = 3;

        if (optIdx !== -1 && currentQ.options[optIdx]) {
          e.preventDefault();
          handleSelectOption(currentQ.options[optIdx]);
        } else if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          setShowHint(prev => !prev);
        }
      } else if (isAnswered) {
        if (['Enter', ' ', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleClozeKeys);
    return () => window.removeEventListener('keydown', handleClozeKeys);
  }, [isAnswered, currentQ]);

  const handleRestart = () => {
    const reshuffled = [...questions].sort(() => Math.random() - 0.5);
    setQuestions(reshuffled);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setIsCompleted(false);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setShowHint(false);
  };

  if (questions.length === 0) {
    return (
      <div className="w-full max-w-xl mx-auto p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <Sparkles className="w-10 h-10 text-indigo-500 mx-auto animate-pulse" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Chưa có câu hỏi cho chế độ này trong Unit hiện tại
        </h3>
        <p className="text-sm text-slate-500">
          Unit này không chứa cụm từ ghép đặc thù. Bạn có thể chuyển sang chế độ "Điền vào Câu ví dụ" hoặc chọn "Tất cả Unit".
        </p>
        <button
          onClick={() => setClozeType('sentence')}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-md"
        >
          Chuyển sang Điền vào Câu ví dụ
        </button>
      </div>
    );
  }

  if (isCompleted) {
    const accuracy = Math.round((score / questions.length) * 100) || 0;
    return (
      <div className="w-full max-w-xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <Trophy className="w-10 h-10" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Hoàn thành bài tập điền khuyết!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Bạn đã luyện tập toàn bộ {questions.length} câu {clozeType === 'sentence' ? 'ví dụ' : 'cụm từ liên ngữ'} của Mimikara {currentLevel}.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div>
            <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{score}/{questions.length}</div>
            <div className="text-xs text-slate-500">Câu trả lời đúng</div>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{accuracy}%</div>
            <div className="text-xs text-slate-500">Độ chính xác</div>
          </div>
        </div>

        <button
          onClick={handleRestart}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Làm lại bộ câu hỏi này</span>
        </button>
      </div>
    );
  }

  const { target, clozeText, options, type } = currentQ;
  const sentenceMeaning = type === 'sentence' ? currentQ.example?.meaning : currentQ.meaning;
  const furiganaClass = furiganaMode === 'hide' ? 'furigana-hide' : furiganaMode === 'hover' ? 'furigana-hover' : '';

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      
      {/* Top Mode Bar & Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
            Câu {currentIndex + 1} / {questions.length}
          </span>
          {streak > 1 && (
            <span className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/60 animate-bounce">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>Chuỗi {streak}</span>
            </span>
          )}
        </div>

        {/* Cloze Mode Switcher: Câu ví dụ vs Cụm đi kèm / Từ ghép */}
        <div className="flex items-center bg-slate-200/80 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-300/60 dark:border-slate-700/60 text-xs font-bold">
          <button
            onClick={() => setClozeType('sentence')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
              clozeType === 'sentence'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Câu ví dụ thực tế</span>
          </button>
          <button
            onClick={() => setClozeType('collocation')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
              clozeType === 'collocation'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Cụm liên ngữ & Từ ghép</span>
          </button>
        </div>
      </div>

      {/* Cloze Question Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-lg text-center space-y-4">
        
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 tracking-wider">
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
            <FileQuestion className="w-4 h-4" />
            <span>
              {clozeType === 'sentence' ? 'Điền từ vựng đúng vào câu ví dụ:' : 'Điền từ vựng phù hợp vào cụm liên ngữ / từ ghép:'}
            </span>
          </div>

          {/* Hint Toggle Button (H) */}
          {!isAnswered && (
            <button
              onClick={() => setShowHint(prev => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 border border-amber-200/80 dark:border-amber-900/60 transition-colors"
              title="Phím tắt [H]"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>{showHint ? 'Ẩn gợi ý nghĩa (H)' : '💡 Xem gợi ý nghĩa câu (H)'}</span>
            </button>
          )}
        </div>

        {/* Cloze Sentence Display - Chống lệch dòng với .jp-sentence */}
        <div className="py-4">
          <p className={`jp-sentence font-japanese text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100 ${furiganaClass}`}>
            {isAnswered ? (
              // Khi đã trả lời: hiển thị câu hoàn chỉnh có từ đích nổi bật và đầy đủ Furigana
              <span 
                dangerouslySetInnerHTML={{ 
                  __html: currentQ.solvedRubyHtml || (
                    type === 'sentence'
                      ? (currentQ.example?.rubyHtml || currentQ.example?.japanese)
                      : (currentQ.rubyHtml ? currentQ.rubyHtml.replace(/[―—＿]/g, `<span class="cloze-solved">${target.wordHtml || target.word}</span>`) : currentQ.originalText)
                  )
                }} 
              />
            ) : (
              // Khi chưa trả lời: hiển thị câu khuyết có Furigana đầy đủ cho các chữ Hán xung quanh
              <span 
                dangerouslySetInnerHTML={{ 
                  __html: currentQ.clozeRubyHtml || clozeText.split('【  ？  】').join('<span class="cloze animate-pulse">【 ？ 】</span>')
                }} 
              />
            )}
          </p>

          {/* Gợi ý nghĩa (Chỉ hiện khi chưa trả lời nếu bấm bật H) */}
          {!isAnswered && showHint && sentenceMeaning && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 italic animate-fadeIn">
              💡 Gợi ý nghĩa: {formatExampleMeaning(sentenceMeaning)}
            </div>
          )}

          {/* Sau khi đã chọn: LUÔN hiển thị bản dịch tiếng Việt đầy đủ */}
          {isAnswered && sentenceMeaning && (
            <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-sm text-slate-600 dark:text-slate-300 italic animate-fadeIn">
              {formatExampleMeaning(sentenceMeaning)}
            </div>
          )}
        </div>

      </div>

      {/* 4 Choices Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt, idx) => {
          const isCorrect = opt.id === target.id;
          const isSelected = selectedAnswer?.id === opt.id;

          let btnStyle = "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-600";
          if (isAnswered) {
            if (isCorrect) {
              btnStyle = "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold shadow-md shadow-emerald-500/10";
            } else if (isSelected) {
              btnStyle = "bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-200 font-bold shadow-md shadow-rose-500/10";
            } else {
              btnStyle = "bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60";
            }
          }

          const optKey = String.fromCharCode(65 + idx);

          return (
            <button
              key={opt.id}
              onClick={() => handleSelectOption(opt)}
              disabled={isAnswered}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between gap-3 shadow-sm hover:scale-[1.01] active:scale-[0.99] ${btnStyle}`}
            >
              <div className="w-full">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono font-bold mb-1">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    {optKey} / {idx + 1}
                  </span>
                </div>
                
                {/* Từ tiếng Nhật (và Furigana) */}
                <div 
                  className={`font-japanese text-xl font-bold ${furiganaClass}`}
                  dangerouslySetInnerHTML={{ __html: opt.wordHtml || opt.word }}
                />

                {/* QUAN TRỌNG: Chỉ hiện nghĩa và Hán Việt SAU KHI ĐÃ CHỌN ĐÁP ÁN (isAnswered) */}
                {isAnswered && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50 text-xs text-slate-600 dark:text-slate-300 animate-fadeIn space-y-0.5">
                    {opt.hanviet && (
                      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                        Hán Việt: {opt.hanviet}
                      </div>
                    )}
                    <div className="font-medium text-slate-700 dark:text-slate-300">
                      {opt.meanings?.[0] || 'Nét nghĩa tiếng Việt'}
                    </div>
                  </div>
                )}
              </div>

              {isAnswered && isCorrect && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
              )}
              {isAnswered && isSelected && !isCorrect && (
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 ml-2" />
              )}
            </button>
          );
        })}
      </div>

      {/* Answer Feedback & Next Action Bar */}
      {isAnswered && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 animate-fadeIn">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const audioText = type === 'sentence' 
                  ? (currentQ.example?.japanese || target.word)
                  : (currentQ.originalText || target.word);
                speakJapanese(audioText, soundSpeed);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-semibold shrink-0"
            >
              <Volume2 className="w-4 h-4" />
              <span>Nghe đọc</span>
            </button>
            <div className="flex items-center gap-2 flex-wrap text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Đáp án:</span>
              <span 
                className={`jp-sentence font-japanese text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 ${furiganaClass}`}
                dangerouslySetInnerHTML={{ __html: target.wordHtml || target.word }}
              />
              <span className="font-mono text-xs text-slate-400">
                ({target.reading}) {target.hanviet ? `[${target.hanviet}]` : ''}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                - {target.meanings?.[0]}
              </span>
            </div>
          </div>

          <button
            onClick={handleNext}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <span>Câu tiếp theo (Enter / Space)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
