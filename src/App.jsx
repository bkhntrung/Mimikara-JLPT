import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import mimikaraN1 from './data/mimikara_n1.json';
import mimikaraN2 from './data/mimikara_n2.json';
import mimikaraN3 from './data/mimikara_n3.json';
import Header from './components/Header';
import FlashcardDeck from './components/FlashcardDeck';
import QuizMode from './components/QuizMode';
import ClozeQuiz from './components/ClozeQuiz';
import DictionaryView from './components/DictionaryView';
import StatsModal from './components/StatsModal';
import ShortcutModal from './components/ShortcutModal';
import TabConflictModal from './components/TabConflictModal';
import { 
  loadSRSRecords, 
  saveSRSRecords, 
  loadStarredWords, 
  saveStarredWords,
  calculateNextReview,
  getSmartStudyQueue
} from './utils/srs';
import { speakJapanese } from './utils/audio';
import { TabSyncManager } from './utils/tabSync';

const DATASETS = {
  N1: mimikaraN1,
  N2: mimikaraN2,
  N3: mimikaraN3
};

export default function App() {
  // Level State: 'N1' | 'N2' | 'N3'
  const [currentLevel, setCurrentLevel] = useState(() => {
    return localStorage.getItem('mimikara_level') || 'N1';
  });

  const activeData = DATASETS[currentLevel] || DATASETS.N1;
  const allWords = activeData.vocabulary || [];
  const unitSummaries = activeData.unitSummaries || [];

  // App States
  const [currentUnit, setCurrentUnit] = useState(1); // Default to Unit 1
  const [studyMode, setStudyMode] = useState('flashcard'); // 'flashcard', 'quiz', 'cloze', 'dictionary'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [furiganaMode, setFuriganaMode] = useState('show'); // 'show', 'hover', 'hide'
  const [soundSpeed, setSoundSpeed] = useState(1.0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [isSmartSRSSort, setIsSmartSRSSort] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('mimikara_dark_mode') === 'true' || 
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // SRS and Starred storage isolated per level
  const [srsRecords, setSrsRecords] = useState(() => loadSRSRecords(currentLevel));
  const [starredSet, setStarredSet] = useState(() => loadStarredWords(currentLevel));

  // Modals
  const [isShortcutOpen, setIsShortcutOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Multi-tab Conflict Prevention State
  const [isTabLocked, setIsTabLocked] = useState(false);
  const tabSyncRef = useRef(null);
  const currentLevelRef = useRef(currentLevel);

  useEffect(() => {
    currentLevelRef.current = currentLevel;
  }, [currentLevel]);

  // Initialize TabSyncManager for Multi-tab Conflict Prevention & Real-time Sync
  // Khởi tạo một lần duy nhất cho vòng đời của tab trình duyệt này (không hủy tạo lại khi chuyển N1, N2, N3)
  useEffect(() => {
    const manager = new TabSyncManager({
      onLockChange: (locked) => {
        setIsTabLocked(locked);
      },
      onRemoteDataUpdate: ({ level }) => {
        // Tự động đồng bộ state nếu tab khác vừa thay đổi dữ liệu cấp độ này
        const curLvl = currentLevelRef.current;
        if (!level || level === curLvl) {
          setSrsRecords(loadSRSRecords(curLvl));
          setStarredSet(loadStarredWords(curLvl));
        }
      }
    });

    tabSyncRef.current = manager;

    return () => {
      manager.destroy();
    };
  }, []);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('mimikara_dark_mode', darkMode);
  }, [darkMode]);

  // Level change handler
  const handleSelectLevel = useCallback((lvl) => {
    if (lvl === currentLevel) return;
    setCurrentLevel(lvl);
    localStorage.setItem('mimikara_level', lvl);
    setCurrentUnit(1);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsShuffled(false);
    setIsSmartSRSSort(false);
    setSrsRecords(loadSRSRecords(lvl));
    setStarredSet(loadStarredWords(lvl));
  }, [currentLevel]);

  // Filter words for current unit
  const activeWords = useMemo(() => {
    let list = currentUnit === 0 
      ? [...allWords] 
      : allWords.filter(w => w.unit === currentUnit);
    
    if (isSmartSRSSort) {
      list = getSmartStudyQueue(list, srsRecords);
    } else if (isShuffled) {
      // Deterministic shuffle with seed
      list = [...list].sort((a, b) => {
        const hashA = ((a.id * 1664525 + shuffleSeed) % 1013904223);
        const hashB = ((b.id * 1664525 + shuffleSeed) % 1013904223);
        return hashA - hashB;
      });
    }

    return list;
  }, [allWords, currentUnit, isSmartSRSSort, isShuffled, shuffleSeed, srsRecords]);

  // Reset index & flip state when unit changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [currentUnit]);

  // Reset flip state when navigating word
  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  const handleToggleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const handleShuffle = useCallback(() => {
    setIsShuffled(true);
    setIsSmartSRSSort(false);
    setShuffleSeed(Date.now());
    setCurrentIndex(0);
    setIsFlipped(false);
  }, []);

  const handleToggleSmartSRS = useCallback(() => {
    setIsSmartSRSSort(prev => {
      const next = !prev;
      if (next) {
        setIsShuffled(false);
      }
      setCurrentIndex(0);
      setIsFlipped(false);
      return next;
    });
  }, []);

  // Starred toggle handler
  const handleToggleStar = useCallback((wordId) => {
    setStarredSet(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      saveStarredWords(next, currentLevel);
      return next;
    });
  }, [currentLevel]);

  // SRS Rating handler
  const handleRateSRS = useCallback((wordId, rating) => {
    setSrsRecords(prev => {
      const currentRecord = prev[wordId];
      const updated = calculateNextReview(currentRecord, rating);
      const next = { ...prev, [wordId]: updated };
      saveSRSRecords(next, currentLevel);
      return next;
    });

    // Advance to next word
    setCurrentIndex(prev => Math.min(activeWords.length - 1, prev + 1));
  }, [activeWords.length, currentLevel]);

  // Quiz / Cloze SRS Synchronization handler (chỉ cập nhật SRS, KHÔNG làm nhảy currentIndex của FlashcardDeck)
  const handleQuizSRSSync = useCallback((wordId, isCorrect) => {
    setSrsRecords(prev => {
      const currentRecord = prev[wordId]; // Đọc từ prev để tránh stale closure!
      const rating = isCorrect ? 3 : 1;
      const updated = calculateNextReview(currentRecord, rating);
      const next = { ...prev, [wordId]: updated };
      saveSRSRecords(next, currentLevel);
      return next;
    });
  }, [currentLevel]);

  // Restore SRS and Starred data from backup file (Hỗ trợ cả v2 summary và v1)
  const handleRestoreData = useCallback((restoreResult) => {
    // 1. Luôn nạp lại state mới nhất từ storage cho cấp độ đang mở
    setSrsRecords(loadSRSRecords(currentLevel));
    setStarredSet(loadStarredWords(currentLevel));

    // 2. Nếu file sao lưu có chứa thông tin settings
    if (restoreResult?.settings?.currentLevel && restoreResult.settings.currentLevel !== currentLevel) {
      handleSelectLevel(restoreResult.settings.currentLevel);
    }
    if (restoreResult?.settings?.darkMode !== undefined) {
      setDarkMode(restoreResult.settings.darkMode);
    }

    // 3. Tương thích ngược với object đơn lẻ { level, srsRecords, starredList }
    if (restoreResult?.srsRecords && restoreResult?.level) {
      const lvl = restoreResult.level;
      saveSRSRecords(restoreResult.srsRecords, lvl);
      if (Array.isArray(restoreResult.starredList)) {
        saveStarredWords(new Set(restoreResult.starredList), lvl);
      }
      if (lvl === currentLevel) {
        setSrsRecords(restoreResult.srsRecords);
        if (Array.isArray(restoreResult.starredList)) {
          setStarredSet(new Set(restoreResult.starredList));
        }
      }
    }

    // 4. Phát tín hiệu đồng bộ cho các tab khác
    tabSyncRef.current?.broadcastDataUpdate(currentLevel, 'restore');
  }, [currentLevel, handleSelectLevel]);

  // Tab Conflict session handlers
  const handleClaimTabSession = useCallback(() => {
    tabSyncRef.current?.claimActiveSession();
    setIsTabLocked(false);
    setSrsRecords(loadSRSRecords(currentLevel));
    setStarredSet(loadStarredWords(currentLevel));
  }, [currentLevel]);

  const handleReloadData = useCallback(() => {
    setSrsRecords(loadSRSRecords(currentLevel));
    setStarredSet(loadStarredWords(currentLevel));
  }, [currentLevel]);

  // Navigation handler
  const handleNavigate = useCallback((direction) => {
    setCurrentIndex(prev => {
      const next = prev + direction;
      if (next >= 0 && next < activeWords.length) return next;
      return prev;
    });
  }, [activeWords.length]);

  // Furigana toggle cycle
  const handleToggleFurigana = useCallback(() => {
    setFuriganaMode(prev => {
      if (prev === 'show') return 'hover';
      if (prev === 'hover') return 'hide';
      return 'show';
    });
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Vô hiệu hóa phím tắt khi tab đang bị khóa chống xung đột đa cửa sổ
      if (isTabLocked) return;

      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault(); // Prevent page scroll down!
        if (studyMode === 'flashcard') {
          handleToggleFlip();
        }
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsShortcutOpen(false);
        setIsStatsOpen(false);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNavigate(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNavigate(1);
      } else if (e.key === 'f' || e.key === 'F') {
        handleToggleFurigana();
      } else if (e.key === 's' || e.key === 'S') {
        const curWord = activeWords[currentIndex];
        if (curWord) handleToggleStar(curWord.id);
      } else if (e.key === 'a' || e.key === 'A') {
        const curWord = activeWords[currentIndex];
        if (curWord) speakJapanese(curWord.word, soundSpeed);
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const curWord = activeWords[currentIndex];
        if (curWord && studyMode === 'flashcard') {
          handleRateSRS(curWord.id, Number(e.key));
        }
      } else if (e.key === 'q' || e.key === 'Q') {
        setStudyMode(prev => {
          const modes = ['flashcard', 'quiz', 'cloze', 'dictionary'];
          const nextIdx = (modes.indexOf(prev) + 1) % modes.length;
          return modes[nextIdx];
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeWords, currentIndex, soundSpeed, studyMode, isTabLocked, handleNavigate, handleToggleFlip, handleToggleFurigana, handleToggleStar, handleRateSRS]);

  // Learned count
  const learnedCount = useMemo(() => {
    return Object.values(srsRecords).filter(r => r.stage === 'good' || r.stage === 'easy').length;
  }, [srsRecords]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      
      {/* Top Header */}
      <Header
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        currentUnit={currentUnit}
        onSelectUnit={setCurrentUnit}
        unitSummaries={unitSummaries}
        studyMode={studyMode}
        onSelectMode={setStudyMode}
        furiganaMode={furiganaMode}
        onToggleFurigana={handleToggleFurigana}
        soundSpeed={soundSpeed}
        onChangeSoundSpeed={setSoundSpeed}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(prev => !prev)}
        onOpenShortcuts={() => setIsShortcutOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        learnedCount={learnedCount}
        totalWordsCount={allWords.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col items-center justify-center">
        {studyMode === 'flashcard' && (
          <FlashcardDeck
            words={activeWords}
            currentIndex={currentIndex}
            onNavigate={handleNavigate}
            onRateSRS={handleRateSRS}
            srsRecords={srsRecords}
            starredSet={starredSet}
            onToggleStar={handleToggleStar}
            furiganaMode={furiganaMode}
            soundSpeed={soundSpeed}
            isFlipped={isFlipped}
            onToggleFlip={handleToggleFlip}
            onShuffle={handleShuffle}
            isSmartSRSSort={isSmartSRSSort}
            onToggleSmartSRS={handleToggleSmartSRS}
          />
        )}

        {studyMode === 'quiz' && (
          <QuizMode
            allWords={allWords}
            currentUnit={currentUnit}
            currentLevel={currentLevel}
            furiganaMode={furiganaMode}
            soundSpeed={soundSpeed}
            onQuizSRSSync={handleQuizSRSSync}
          />
        )}

        {studyMode === 'cloze' && (
          <ClozeQuiz
            allWords={allWords}
            currentUnit={currentUnit}
            currentLevel={currentLevel}
            furiganaMode={furiganaMode}
            soundSpeed={soundSpeed}
            onQuizSRSSync={handleQuizSRSSync}
          />
        )}

        {studyMode === 'dictionary' && (
          <DictionaryView
            allWords={allWords}
            currentUnit={currentUnit}
            onSelectUnit={setCurrentUnit}
            srsRecords={srsRecords}
            starredSet={starredSet}
            onToggleStar={handleToggleStar}
            furiganaMode={furiganaMode}
            soundSpeed={soundSpeed}
          />
        )}
      </main>

      {/* Modals */}
      <ShortcutModal
        isOpen={isShortcutOpen}
        onClose={() => setIsShortcutOpen(false)}
      />

      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        currentLevel={currentLevel}
        allWords={allWords}
        unitSummaries={unitSummaries}
        srsRecords={srsRecords}
        starredSet={starredSet}
        onRestoreData={handleRestoreData}
      />

      <TabConflictModal
        isOpen={isTabLocked}
        onClaimSession={handleClaimTabSession}
        onReloadData={handleReloadData}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200/60 dark:border-slate-800/60 py-3 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>
          Mimikara Oboeru JLPT (N3 • N2 • N1) Flashcard App • Đang học cấp độ <strong className="text-indigo-600 dark:text-indigo-400">{currentLevel}</strong> ({allWords.length} từ vựng, {unitSummaries.length} Unit) • Nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">?</kbd> xem phím tắt
        </p>
      </footer>

    </div>
  );
}
