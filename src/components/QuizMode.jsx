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
  HelpCircle,
  BookOpen,
  ArrowRightLeft,
  Sparkle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { speakJapanese } from '../utils/audio';
import { buildQuizQuestions } from '../utils/quizHelper';
import { formatExampleMeaning } from '../utils/text';

export default function QuizMode({
  allWords,
  currentUnit,
  currentLevel = 'N1',
  furiganaMode,
  soundSpeed,
  onQuizSRSSync
}) {
  // 4 Chế độ trắc nghiệm chuẩn JLPT:
  // 1. 'kanji_to_reading': Kanji -> Cách đọc Hiragana (JLPT Mondai 1)
  // 2. 'kanji_to_meaning': Từ vựng -> Nghĩa tiếng Việt (JLPT Mondai 2/3)
  // 3. 'meaning_to_kanji': Nghĩa tiếng Việt -> Từ vựng tiếng Nhật
  // 4. 'synonym_antonym': Từ đồng nghĩa / Trái nghĩa (JLPT Mondai 4 類義語・対義語)
  const [direction, setDirection] = useState('kanji_to_meaning');

  const [quizPool, setQuizPool] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Khởi tạo bộ câu hỏi khi allWords, currentUnit hoặc direction thay đổi
  useEffect(() => {
    const filtered = currentUnit === 0 
      ? [...allWords] 
      : allWords.filter(w => w.unit === currentUnit);
    
    const builtQuestions = buildQuizQuestions(filtered, allWords, direction);
    
    setQuizPool(builtQuestions);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setIsCompleted(false);
    setSelectedAnswer(null);
    setIsAnswered(false);
  }, [allWords, currentUnit, direction]);

  const currentQ = quizPool[currentIndex];

  const handleSelectOption = (option) => {
    if (isAnswered || !currentQ) return;

    let isCorrect = false;
    if (direction === 'synonym_antonym') {
      isCorrect = option.id === currentQ.correctOptionId || option.isCorrect === true;
    } else {
      isCorrect = option.id === currentQ.target.id;
    }

    setSelectedAnswer(option);
    setIsAnswered(true);

    // Đồng bộ SRS (không ảnh hưởng currentIndex ở FlashcardDeck)
    if (onQuizSRSSync) {
      onQuizSRSSync(currentQ.target.id, isCorrect);
    }

    speakJapanese(currentQ.target.word, soundSpeed);

    if (isCorrect) {
      setScore(prev => prev + 1);
      setStreak(prev => {
        const next = prev + 1;
        if (next > bestStreak) setBestStreak(next);
        if (next % 5 === 0) {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        }
        return next;
      });
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= quizPool.length) {
      setIsCompleted(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    }
  };

  // Keyboard navigation inside Quiz Mode (1-4, A-D, Enter, Space)
  useEffect(() => {
    const handleQuizKeys = (e) => {
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
        }
      } else if (isAnswered) {
        if (['Enter', ' ', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleQuizKeys);
    return () => window.removeEventListener('keydown', handleQuizKeys);
  }, [isAnswered, currentQ]);

  const handleRestart = () => {
    const shuffled = [...quizPool].sort(() => Math.random() - 0.5);
    setQuizPool(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setIsCompleted(false);
    setSelectedAnswer(null);
    setIsAnswered(false);
  };

  if (!currentQ && !isCompleted) {
    return (
      <div className="w-full max-w-xl mx-auto p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <Sparkles className="w-10 h-10 text-indigo-500 mx-auto animate-pulse" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Đang chuẩn bị câu hỏi trắc nghiệm...
        </h3>
      </div>
    );
  }

  if (isCompleted) {
    const accuracy = Math.round((score / quizPool.length) * 100) || 0;
    const unitText = currentUnit === 0 
      ? `tất cả các Unit (${currentLevel})` 
      : `Unit ${currentUnit} (${currentLevel})`;

    return (
      <div className="w-full max-w-xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
          <Trophy className="w-10 h-10" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Hoàn thành bài trắc nghiệm!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Bạn đã hoàn thành toàn bộ {quizPool.length} câu hỏi của {unitText}.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{score}/{quizPool.length}</div>
            <div className="text-xs text-slate-500">Điểm số</div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{accuracy}%</div>
            <div className="text-xs text-slate-500">Độ chính xác</div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-500 flex items-center justify-center gap-1">
              <Flame className="w-5 h-5 fill-current" />
              <span>{bestStreak}</span>
            </div>
            <div className="text-xs text-slate-500">Chuỗi cao nhất</div>
          </div>
        </div>

        <button
          onClick={handleRestart}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Luyện tập lại</span>
        </button>
      </div>
    );
  }

  const { target, options } = currentQ;
  const furiganaClass = furiganaMode === 'hide' ? 'furigana-hide' : furiganaMode === 'hover' ? 'furigana-hover' : '';

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      
      {/* Quiz Top Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
            Câu {currentIndex + 1} / {quizPool.length}
          </span>

          {streak > 1 && (
            <span className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/60 animate-bounce">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>Chuỗi {streak}</span>
            </span>
          )}
        </div>

        {/* 4 Mode Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1 text-xs bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-300/60 dark:border-slate-700/60">
          <button
            onClick={() => setDirection('kanji_to_reading')}
            title="JLPT Mondai 1: Kanji -> Cách đọc Hiragana"
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              direction === 'kanji_to_reading'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Mondai 1: Cách đọc
          </button>
          <button
            onClick={() => setDirection('kanji_to_meaning')}
            title="JLPT Mondai 2/3: Từ vựng -> Nghĩa tiếng Việt"
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              direction === 'kanji_to_meaning'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Từ → Nghĩa
          </button>
          <button
            onClick={() => setDirection('meaning_to_kanji')}
            title="Nghĩa tiếng Việt -> Từ vựng tiếng Nhật"
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              direction === 'meaning_to_kanji'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Nghĩa → Từ
          </button>
          <button
            onClick={() => setDirection('synonym_antonym')}
            title="JLPT Mondai 4: Từ đồng nghĩa / Trái nghĩa (類義語・対義語)"
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
              direction === 'synonym_antonym'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>Mondai 4: Đồng/Trái</span>
          </button>
        </div>
      </div>

      {/* Question Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-lg text-center space-y-4">
        
        {/* Header prompt */}
        <div className="text-xs font-semibold text-slate-400 tracking-wider uppercase flex items-center justify-center gap-1.5">
          {direction === 'kanji_to_reading' && (
            <span>Mondai 1: Chọn cách đọc Hiragana đúng của chữ Kanji dưới đây:</span>
          )}
          {direction === 'kanji_to_meaning' && (
            <span>Chọn nét nghĩa tiếng Việt chính xác của từ vựng sau:</span>
          )}
          {direction === 'meaning_to_kanji' && (
            <span>Chọn từ vựng tiếng Nhật tương ứng với nét nghĩa sau:</span>
          )}
          {direction === 'synonym_antonym' && (
            <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold">
              <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                {currentQ.badge}
              </span>
              <span>Tìm {currentQ.relationLabel} của từ sau:</span>
            </span>
          )}
        </div>

        {/* Question Content Display */}
        {direction === 'kanji_to_reading' && (
          <div>
            {/* Mondai 1: Luôn ẩn Furigana để người học phải tự đọc Kanji */}
            <div className="font-japanese text-5xl sm:text-6xl font-bold text-slate-800 dark:text-slate-100 furigana-hide">
              {target.word}
            </div>
            {target.hanviet && (
              <div className="mt-3 inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs tracking-wider">
                HÁN VIỆT: {target.hanviet}
              </div>
            )}
          </div>
        )}

        {direction === 'kanji_to_meaning' && (
          <div>
            <div 
              className={`font-japanese text-5xl sm:text-6xl font-bold text-slate-800 dark:text-slate-100 ${furiganaClass}`}
              dangerouslySetInnerHTML={{ __html: target.wordHtml || target.word }}
            />
            {target.hanviet && (
              <div className="mt-3 inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs tracking-wider">
                HÁN VIỆT: {target.hanviet}
              </div>
            )}
          </div>
        )}

        {direction === 'meaning_to_kanji' && (
          <div className="py-3">
            <div className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {target.meanings?.join('; ')}
            </div>
            {target.hanviet && (
              <div className="mt-2 text-xs text-slate-400 font-mono">
                Âm Hán Việt gợi ý: {target.hanviet}
              </div>
            )}
          </div>
        )}

        {direction === 'synonym_antonym' && (
          <div>
            <div 
              className={`font-japanese text-4xl sm:text-5xl font-bold text-slate-800 dark:text-slate-100 ${furiganaClass}`}
              dangerouslySetInnerHTML={{ __html: target.wordHtml || target.word }}
            />
            <div className="mt-2 text-sm text-slate-500 italic">
              "{target.meanings?.[0]}"
            </div>
          </div>
        )}

      </div>

      {/* 4 Choices Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt, idx) => {
          let isCorrect = false;
          if (direction === 'synonym_antonym') {
            isCorrect = opt.id === currentQ.correctOptionId || opt.isCorrect === true;
          } else {
            isCorrect = opt.id === target.id;
          }

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

                {/* Nội dung đáp án tùy theo chế độ */}
                {direction === 'kanji_to_reading' && (
                  <div>
                    <div className="font-japanese text-xl font-bold font-mono">
                      {opt.reading || opt.word}
                    </div>
                    {/* Khi đã trả lời: hiện nghĩa và Kanji của đáp án */}
                    {isAnswered && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50 text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-japanese font-semibold">{opt.word}:</span> {opt.meanings?.[0]}
                      </div>
                    )}
                  </div>
                )}

                {direction === 'kanji_to_meaning' && (
                  <div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {opt.meanings?.[0] || 'Nét nghĩa'}
                    </div>
                    {isAnswered && (
                      <div className="mt-1 text-xs text-slate-400 font-japanese">
                        {opt.word} ({opt.reading})
                      </div>
                    )}
                  </div>
                )}

                {direction === 'meaning_to_kanji' && (
                  <div>
                    <div 
                      className={`font-japanese text-xl font-bold ${furiganaClass}`}
                      dangerouslySetInnerHTML={{ __html: opt.wordHtml || opt.word }}
                    />
                    {/* QUAN TRỌNG: Ẩn nghĩa trước khi chọn, chỉ hiện sau khi chọn */}
                    {isAnswered ? (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50 text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                        <div className="font-mono text-slate-400">{opt.reading} {opt.hanviet ? `[${opt.hanviet}]` : ''}</div>
                        <div>{opt.meanings?.[0]}</div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {opt.reading}
                      </div>
                    )}
                  </div>
                )}

                {direction === 'synonym_antonym' && (
                  <div>
                    <div 
                      className={`font-japanese text-xl font-bold ${furiganaClass}`}
                      dangerouslySetInnerHTML={{ __html: opt.wordHtml || opt.word }}
                    />
                    {isAnswered && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50 text-xs text-slate-600 dark:text-slate-300">
                        {opt.meanings?.[0]}
                      </div>
                    )}
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

      {/* Answer Feedback & Explanation Card */}
      {isAnswered && (
        <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3.5 animate-fadeIn">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span 
                className={`jp-sentence font-japanese font-bold text-xl sm:text-2xl text-slate-800 dark:text-slate-100 ${furiganaClass}`}
                dangerouslySetInnerHTML={{ __html: target.wordHtml || target.word }}
              />
              <span className="text-sm font-mono text-slate-500 dark:text-slate-400">
                ({target.reading}) {target.hanviet ? `[${target.hanviet}]` : ''}
              </span>
              <button
                onClick={() => speakJapanese(target.word, soundSpeed)}
                className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                title="Nghe phát âm từ vựng"
              >
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              <span>Câu kế tiếp (Enter / Space)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-sm text-slate-700 dark:text-slate-200">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Ý nghĩa: </span>
            {target.meanings?.join('; ')}
          </div>

          {direction === 'synonym_antonym' && (
            <div className="p-3 sm:p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-1.5">
              <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                {currentQ.relationLabel}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span 
                  className={`jp-sentence font-japanese text-base sm:text-lg font-bold text-purple-900 dark:text-purple-100 ${furiganaClass}`}
                  dangerouslySetInnerHTML={{ __html: currentQ.correctRubyHtml || currentQ.correctAnswer }}
                />
                <button
                  type="button"
                  onClick={() => speakJapanese(currentQ.correctAnswer, soundSpeed)}
                  title="Nghe phát âm đáp án"
                  className="p-1 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                {currentQ.relationMeaning && (
                  <span className="text-sm text-purple-700 dark:text-purple-300">
                    - {currentQ.relationMeaning}
                  </span>
                )}
              </div>
            </div>
          )}

          {target.examples?.length > 0 && (
            <div className="space-y-1.5 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div 
                  className={`jp-sentence font-japanese text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed ${furiganaClass}`}
                  dangerouslySetInnerHTML={{ __html: target.examples[0].rubyHtml || target.examples[0].japanese }}
                />
                <button
                  type="button"
                  onClick={() => speakJapanese(target.examples[0].japanese, soundSpeed)}
                  title="Nghe phát âm câu ví dụ"
                  className="p-1.5 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors flex-shrink-0"
                >
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300 italic mt-1.5">
                {formatExampleMeaning(target.examples[0].meaning)}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
