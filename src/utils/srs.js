// Spaced Repetition System (SRS) using Hybrid FSRS-SM2 Algorithm
// Three-Component Model of Memory: Difficulty (D), Stability (S), Retrievability (R)
// Fully optimized for Mimikara JLPT (N3, N2, N1) vocabulary learning.

/**
 * Storage key generators isolated per JLPT level
 */
export function getSRSStorageKey(level = 'N1') {
  return `mimikara_${level.toLowerCase()}_srs_records`;
}

export function getStarredStorageKey(level = 'N1') {
  return `mimikara_${level.toLowerCase()}_starred`;
}

// In-memory fallback for non-browser or test environments
const memoryStorage = new Map();

function getStorage() {
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return {
    getItem: (key) => (memoryStorage.has(key) ? memoryStorage.get(key) : null),
    setItem: (key, val) => { memoryStorage.set(key, String(val)); },
    removeItem: (key) => { memoryStorage.delete(key); },
    clear: () => { memoryStorage.clear(); }
  };
}

/**
 * Load SRS records for a given JLPT level
 */
export function loadSRSRecords(level = 'N1') {
  try {
    const raw = getStorage().getItem(getSRSStorageKey(level));
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to load SRS records', e);
    return {};
  }
}

/**
 * Save SRS records for a given JLPT level
 */
export function saveSRSRecords(records, level = 'N1') {
  try {
    getStorage().setItem(getSRSStorageKey(level), JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save SRS records', e);
  }
}

/**
 * Load starred words set for a given JLPT level
 */
export function loadStarredWords(level = 'N1') {
  try {
    const raw = getStorage().getItem(getStarredStorageKey(level));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}

/**
 * Save starred words set for a given JLPT level
 */
export function saveStarredWords(starredSet, level = 'N1') {
  try {
    getStorage().setItem(getStarredStorageKey(level), JSON.stringify([...starredSet]));
  } catch (e) {
    console.error('Failed to save starred words', e);
  }
}

/**
 * Lấy tóm tắt dữ liệu SRS & Starred của cả 3 cấp độ (N3, N2, N1)
 */
export function getAllUserDataSummary() {
  const levels = ['N3', 'N2', 'N1'];
  const summary = {
    totalSRS: 0,
    totalStarred: 0
  };

  levels.forEach(lvl => {
    const srs = loadSRSRecords(lvl);
    const starred = loadStarredWords(lvl);
    const srsCount = Object.keys(srs).length;
    const starredCount = starred.size;

    summary[lvl] = {
      srsCount,
      starredCount
    };
    summary.totalSRS += srsCount;
    summary.totalStarred += starredCount;
  });

  return summary;
}

/**
 * Xuất toàn bộ dữ liệu người dùng (SRS + Starred + Cài đặt) cho cả 3 cấp độ N3, N2, N1
 * Chuẩn định dạng Version 2 (scope: 'ALL_LEVELS')
 */
export function exportAllUserData() {
  const levels = ['N3', 'N2', 'N1'];
  const levelsData = {};
  const summary = {
    totalSRS: 0,
    totalStarred: 0
  };

  levels.forEach(lvl => {
    const srs = loadSRSRecords(lvl);
    const starred = Array.from(loadStarredWords(lvl));
    const srsCount = Object.keys(srs).length;
    const starredCount = starred.length;

    levelsData[lvl] = {
      srsRecords: srs,
      starredList: starred
    };
    summary[lvl] = {
      srsCount,
      starredCount
    };
    summary.totalSRS += srsCount;
    summary.totalStarred += starredCount;
  });

  let currentLevel = 'N1';
  let darkMode = true;
  try {
    const storedLvl = getStorage().getItem('mimikara_level');
    if (storedLvl) currentLevel = storedLvl;
    const storedDark = getStorage().getItem('mimikara_dark_mode');
    if (storedDark !== null) darkMode = storedDark === 'true';
  } catch (e) {}

  return {
    version: 2,
    app: 'Mimikara Oboeru JLPT',
    scope: 'ALL_LEVELS',
    backupDate: new Date().toISOString(),
    settings: {
      currentLevel,
      darkMode
    },
    summary,
    levels: levelsData
  };
}

/**
 * Khôi phục / Nhập dữ liệu người dùng từ file JSON
 * Hỗ trợ định dạng v2 (ALL_LEVELS đa cấp độ) và tương thích ngược v1 (đơn cấp độ).
 * Hỗ trợ 2 chế độ:
 *  - merge: true (mặc định - Gộp thông minh, ưu tiên bản ghi mới hơn, gộp sao)
 *  - merge: false (Ghi đè hoàn toàn dữ liệu)
 * 
 * @param {string|Object} rawJsonOrObj
 * @param {Object} [options={ merge: true }]
 * @returns {Object} Kết quả import kèm summary
 */
export function importAllUserData(rawJsonOrObj, options = { merge: true }) {
  const shouldMerge = options && options.merge !== false;

  let data = rawJsonOrObj;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      throw new Error('Dữ liệu JSON không hợp lệ: ' + e.message);
    }
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Định dạng dữ liệu sao lưu không hợp lệ');
  }

  // Chuẩn bị danh sách cấp độ cần cập nhật
  const levelsToProcess = {};
  const standardLevels = ['N3', 'N2', 'N1'];

  if (data.scope === 'ALL_LEVELS' && data.levels && typeof data.levels === 'object') {
    // Định dạng Version 2: Đa cấp độ
    standardLevels.forEach(lvl => {
      if (data.levels[lvl]) {
        levelsToProcess[lvl] = {
          srsRecords: data.levels[lvl].srsRecords || {},
          starredList: Array.isArray(data.levels[lvl].starredList)
            ? data.levels[lvl].starredList
            : Array.isArray(data.levels[lvl].starred)
            ? data.levels[lvl].starred
            : []
        };
      }
    });
  } else {
    // Định dạng Version 1 (tương thích ngược) hoặc file 1 cấp độ
    const singleLevel = (data.level && ['N1', 'N2', 'N3'].includes(String(data.level).toUpperCase()))
      ? String(data.level).toUpperCase()
      : 'N1';

    levelsToProcess[singleLevel] = {
      srsRecords: data.srsRecords || {},
      starredList: Array.isArray(data.starredList)
        ? data.starredList
        : Array.isArray(data.starred)
        ? data.starred
        : []
    };
  }

  const resultSummary = {
    totalSRS: 0,
    totalStarred: 0
  };

  standardLevels.forEach(lvl => {
    const incoming = levelsToProcess[lvl];
    if (!incoming) {
      // Nếu cấp độ này không có trong file backup
      const currentSRS = loadSRSRecords(lvl);
      const currentStarred = loadStarredWords(lvl);
      resultSummary[lvl] = {
        srsCount: Object.keys(currentSRS).length,
        starredCount: currentStarred.size,
        updated: false
      };
      resultSummary.totalSRS += resultSummary[lvl].srsCount;
      resultSummary.totalStarred += resultSummary[lvl].starredCount;
      return;
    }

    let finalSRS = {};
    let finalStarred = new Set();

    if (shouldMerge) {
      // 1. Merge SRS thông minh
      const currentSRS = loadSRSRecords(lvl);
      finalSRS = { ...currentSRS };

      for (const [wordId, incRecord] of Object.entries(incoming.srsRecords || {})) {
        const curRecord = finalSRS[wordId];
        if (!curRecord) {
          finalSRS[wordId] = incRecord;
        } else {
          // So sánh lastReviewed hoặc reps
          const curTime = curRecord.lastReviewed ? new Date(curRecord.lastReviewed).getTime() : 0;
          const incTime = incRecord.lastReviewed ? new Date(incRecord.lastReviewed).getTime() : 0;

          if (incTime > curTime) {
            finalSRS[wordId] = incRecord;
          } else if (incTime === curTime) {
            const curReps = curRecord.reps || 0;
            const incReps = incRecord.reps || 0;
            finalSRS[wordId] = incReps >= curReps ? incRecord : curRecord;
          }
          // Ngược lại giữ nguyên curRecord
        }
      }

      // 2. Merge Starred thông minh (Hợp 2 tập hợp)
      const currentStarred = loadStarredWords(lvl);
      finalStarred = new Set([...currentStarred, ...(incoming.starredList || [])]);
    } else {
      // Ghi đè toàn bộ (Overwrite)
      finalSRS = { ...(incoming.srsRecords || {}) };
      finalStarred = new Set(incoming.starredList || []);
    }

    // Lưu xuống storage
    saveSRSRecords(finalSRS, lvl);
    saveStarredWords(finalStarred, lvl);

    const srsCount = Object.keys(finalSRS).length;
    const starredCount = finalStarred.size;

    resultSummary[lvl] = {
      srsCount,
      starredCount,
      updated: true
    };
    resultSummary.totalSRS += srsCount;
    resultSummary.totalStarred += starredCount;
  });

  // Khôi phục cài đặt nếu có
  if (data.settings && typeof data.settings === 'object') {
    try {
      if (data.settings.currentLevel && ['N1', 'N2', 'N3'].includes(data.settings.currentLevel)) {
        getStorage().setItem('mimikara_level', data.settings.currentLevel);
      }
      if (data.settings.darkMode !== undefined) {
        getStorage().setItem('mimikara_dark_mode', String(data.settings.darkMode));
      }
    } catch (e) {}
  }

  return {
    success: true,
    merge: shouldMerge,
    summary: resultSummary,
    settings: data.settings || null,
    levels: levelsToProcess
  };
}

/**
 * Calculate current memory retrievability probability R(t, S)
 * Based on FSRS v4.5 forgetting curve power model:
 * R(t, S) = (1 + (19/81) * (t / S))^(-0.5)
 * 
 * Properties:
 * - At t = 0 (immediately after review): R = 1.0 (100%)
 * - At t = S (elapsed days equal to stability S): R = (1 + 19/81)^(-0.5) = (100/81)^(-0.5) = 9/10 = 0.90 (90%)
 * - As t -> infinity: R decreases monotonically towards 0
 * 
 * @param {Object} record - SRS record of the word
 * @param {Date|string|number} [now=new Date()] - Reference timestamp
 * @returns {number} Retrievability probability between 0.0 and 1.0
 */
export function getRetrievability(record, now = new Date()) {
  if (!record || record.state === 'new' || !record.lastReviewed) {
    return 0;
  }

  const S = typeof record.stability === 'number' && record.stability > 0
    ? record.stability
    : (typeof record.interval === 'number' && record.interval > 0 ? record.interval : 0);

  if (S <= 0) {
    return 0;
  }

  const nowDate = now instanceof Date ? now : new Date(now);
  const lastReviewedDate = new Date(record.lastReviewed);
  const diffMs = nowDate.getTime() - lastReviewedDate.getTime();
  const t = Math.max(0, diffMs / (24 * 60 * 60 * 1000));

  const R = Math.pow(1 + (19 / 81) * (t / S), -0.5);
  return Math.max(0, Math.min(1, R));
}

/**
 * Calculate next review schedule using Hybrid FSRS-SM2 algorithm
 * 
 * Rating options:
 * 1: 'again' (Chưa nhớ / Quên)
 * 2: 'hard' (Hơi khó / Nhớ vất vả)
 * 3: 'good' (Nhớ tốt / Đúng hẹn)
 * 4: 'easy' (Rất vững / Dễ dàng)
 * 
 * @param {Object} currentRecord - Existing SRS record or undefined/null
 * @param {number} rating - Grade from 1 to 4
 * @param {Date|string|number} [now=new Date()] - Reference review time
 * @returns {Object} Updated SRSRecord
 */
export function calculateNextReview(currentRecord, rating, now = new Date()) {
  const nowDate = now instanceof Date ? now : new Date(now);
  const prev = currentRecord || {};

  let state = prev.state || 'new';
  let stage = prev.stage || 'new';
  let repetitions = typeof prev.repetitions === 'number' ? prev.repetitions : 0;
  let lapses = typeof prev.lapses === 'number' ? prev.lapses : 0;
  let easeFactor = typeof prev.easeFactor === 'number' ? prev.easeFactor : 2.5;
  let difficulty = typeof prev.difficulty === 'number' ? prev.difficulty : 5.0;
  let stability = typeof prev.stability === 'number' ? prev.stability : 0;
  let interval = typeof prev.interval === 'number' ? prev.interval : 0;
  let priorInterval = prev.priorInterval !== undefined ? prev.priorInterval : null;
  let step = typeof prev.step === 'number' ? prev.step : 0;
  let history = Array.isArray(prev.history) ? [...prev.history] : [];

  // Elapsed days since last review
  let t = 0;
  if (prev.lastReviewed) {
    const diffMs = nowDate.getTime() - new Date(prev.lastReviewed).getTime();
    t = Math.max(0, diffMs / (24 * 60 * 60 * 1000));
  }

  // 1. Update Intrinsic Difficulty D in [1.0, 10.0] with mean reversion to 5.0
  let deltaD = 0;
  if (rating === 1) deltaD = 1.2;
  else if (rating === 2) deltaD = 0.5;
  else if (rating === 3) deltaD = 0.0;
  else if (rating === 4) deltaD = -0.8;

  const dNext = (difficulty + deltaD) * 0.9 + 5.0 * 0.1;
  difficulty = Math.max(1.0, Math.min(10.0, Number(dNext.toFixed(2))));

  // 2. Update Ease Factor EF in [1.3, 3.0]
  if (rating === 1) easeFactor -= 0.2;
  else if (rating === 2) easeFactor -= 0.15;
  else if (rating === 3) easeFactor += 0.0;
  else if (rating === 4) easeFactor += 0.15;
  easeFactor = Math.max(1.3, Math.min(3.0, Number(easeFactor.toFixed(2))));

  // Check if card has already been learned or is currently in review/relearning
  const isLearnedCard = repetitions > 0 || state === 'review' || state === 'relearning';

  // Overdue bonus: if user reviews late (t > interval) and still recalls successfully (rating >= 3)
  const I_eff = (t > interval && interval > 0)
    ? Math.max(interval, (interval + t) / 2)
    : interval;

  // 3. State transitions & interval calculations
  if (rating === 1) { // Again (Quên / Chưa nhớ)
    if (isLearnedCard) {
      lapses += 1;
      const savedPrior = (state === 'relearning' && priorInterval && priorInterval > 1)
        ? priorInterval
        : Math.max(1, Math.round((interval || 1) * 0.4));
      priorInterval = savedPrior;
      state = 'relearning';
      interval = 10 / 1440; // 10 minutes (in days)
      stability = Math.max(0.5, Number((stability * 0.3).toFixed(2)));
      repetitions = 0;
      stage = 'again';
      step = 0;
    } else {
      state = 'learning';
      interval = 1 / 1440; // 1 minute (in days)
      stability = 0.25;
      repetitions = 0;
      stage = 'again';
      step = 0;
    }
  } else if (rating === 2) { // Hard (Hơi khó)
    if (!isLearnedCard && (repetitions === 0 && state !== 'review' && state !== 'relearning')) {
      state = 'learning';
      interval = 6 / 1440; // 6 minutes (in days)
      stability = 0.6;
      repetitions = 1;
      stage = 'hard';
      step = 1;
    } else {
      state = 'review';
      interval = Math.max(1, Math.round(interval * 1.2));
      stability = interval;
      repetitions += 1;
      stage = 'hard';
      step = 0;
    }
  } else if (rating === 3) { // Good (Nhớ tốt)
    if (state === 'relearning' && priorInterval && priorInterval > 1) {
      interval = priorInterval;
      priorInterval = null;
    } else if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 3;
    } else {
      const factor = easeFactor * (1 + (10 - difficulty) * 0.03);
      interval = Math.min(365, Math.max(interval + 1, Math.round(I_eff * factor)));
    }
    state = 'review';
    repetitions += 1;
    stability = interval;
    stage = 'good';
    step = 0;
  } else if (rating === 4) { // Easy (Rất vững)
    if (repetitions === 0) {
      interval = 4;
    } else if (repetitions === 1) {
      interval = 7;
    } else {
      const factor = easeFactor * 1.35 * (1 + (10 - difficulty) * 0.04);
      interval = Math.min(365, Math.max(interval + 2, Math.round(I_eff * factor)));
    }
    state = 'review';
    repetitions += 1;
    stability = interval;
    stage = 'easy';
    step = 0;
    priorInterval = null;
  }

  // Leech detection: marked if lapsed 4 or more times
  const isLeech = lapses >= 4;

  const nextDate = new Date(nowDate.getTime() + interval * 24 * 60 * 60 * 1000);

  // Keep up to 20 recent review history logs
  const newHistoryItem = {
    timestamp: nowDate.toISOString(),
    rating,
    interval
  };
  history.push(newHistoryItem);
  if (history.length > 20) {
    history = history.slice(-20);
  }

  return {
    wordId: prev.wordId,
    state,
    stage,
    step,
    repetitions,
    lapses,
    isLeech,
    interval,
    priorInterval,
    easeFactor,
    stability,
    difficulty,
    lastReviewed: nowDate.toISOString(),
    nextReview: nextDate.toISOString(),
    history
  };
}

/**
 * Format interval in days to compact, user-friendly Vietnamese label
 * 
 * Rules:
 * - < 1 / 24 (< 1 hour): X phút (minimum 1 phút)
 * - < 1 (< 1 day): X giờ
 * - 1..29 days: X ngày
 * - 30..364 days: X.X tháng (or X tháng if integer)
 * - >= 365 days: 1 năm (or X năm)
 * 
 * @param {number} intervalDays - Interval in days
 * @returns {string} Formatted label (e.g., '10 phút', '2 giờ', '3 ngày', '1.5 tháng', '1 năm')
 */
export function formatIntervalLabel(intervalDays) {
  if (typeof intervalDays !== 'number' || isNaN(intervalDays) || intervalDays <= 0) {
    return '1 phút';
  }

  // Under 1 hour (< 1 / 24 day)
  if (intervalDays < 1 / 24) {
    const mins = Math.max(1, Math.round(intervalDays * 1440));
    return `${mins} phút`;
  }

  // Under 1 day (< 1 day)
  if (intervalDays < 1) {
    const hours = Math.max(1, Math.round(intervalDays * 24));
    return `${hours} giờ`;
  }

  // 1 to 29 days
  if (intervalDays < 30) {
    const days = Math.round(intervalDays);
    return `${days} ngày`;
  }

  // 30 to 364 days
  if (intervalDays < 365) {
    const months = intervalDays / 30;
    const rounded = Math.round(months * 10) / 10;
    if (rounded % 1 === 0) {
      return `${rounded.toFixed(0)} tháng`;
    }
    return `${rounded.toFixed(1)} tháng`;
  }

  // >= 365 days
  const years = Math.round(intervalDays / 365);
  return `${years} năm`;
}

/**
 * Preview next review interval labels for all 4 grading buttons for a given card
 * 
 * @param {Object} currentRecord - Current SRS record
 * @param {Date|string|number} [now=new Date()] - Reference timestamp
 * @returns {{ 1: string, 2: string, 3: string, 4: string }}
 */
export function previewNextIntervals(currentRecord, now = new Date()) {
  return {
    1: formatIntervalLabel(calculateNextReview(currentRecord, 1, now).interval),
    2: formatIntervalLabel(calculateNextReview(currentRecord, 2, now).interval),
    3: formatIntervalLabel(calculateNextReview(currentRecord, 3, now).interval),
    4: formatIntervalLabel(calculateNextReview(currentRecord, 4, now).interval)
  };
}

/**
 * Filter words that are due for review (including new unstudied words)
 * 
 * @param {Array} words - Array of vocabulary items
 * @param {Object} srsRecords - Map of wordId -> SRSRecord
 * @param {Date|string|number} [now=new Date()] - Reference timestamp
 * @returns {Array} Words that are due or new
 */
export function getDueWords(words, srsRecords = {}, now = new Date()) {
  const nowDate = now instanceof Date ? now : new Date(now);
  return words.filter((w) => {
    const rec = srsRecords[w.id];
    if (!rec || rec.state === 'new') return true;
    if (!rec.nextReview) return true;
    return new Date(rec.nextReview) <= nowDate;
  });
}

/**
 * Cognitive Priority Smart Study Queue
 * Orders words according to cognitive learning urgency:
 * 1. Due learning / relearning cards (short-term memory consolidation, nextReview <= now)
 * 2. Due review cards (nextReview <= now), sorted ascending by Retrievability R(t, S) (save fading memories first!)
 * 3. New unstudied words (state === 'new' or unrecorded)
 * 4. Not due cards, sorted ascending by nextReview
 * 
 * @param {Array} words - Vocabulary word list
 * @param {Object} srsRecords - Map of wordId -> SRSRecord
 * @param {Object} [options={}] - Custom options
 * @param {Date|string|number} [now=new Date()] - Reference timestamp
 * @returns {Array} Smart sorted words list
 */
export function getSmartStudyQueue(words, srsRecords = {}, options = {}, now = new Date()) {
  const nowDate = now instanceof Date ? now : new Date(now);

  const learningDue = [];
  const reviewDue = [];
  const newCards = [];
  const notDue = [];

  for (const word of words) {
    const rec = srsRecords[word.id];
    if (!rec || rec.state === 'new') {
      newCards.push(word);
    } else {
      const nextReviewDate = rec.nextReview ? new Date(rec.nextReview) : new Date(0);
      const isDue = nextReviewDate <= nowDate;

      if (isDue) {
        if (rec.state === 'learning' || rec.state === 'relearning') {
          learningDue.push({ word, rec, nextReviewDate });
        } else {
          // Review state
          const retrievability = getRetrievability(rec, nowDate);
          reviewDue.push({ word, rec, nextReviewDate, retrievability });
        }
      } else {
        notDue.push({ word, rec, nextReviewDate });
      }
    }
  }

  // 1. Learning/Relearning due cards sorted by nextReview ascending
  learningDue.sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime());

  // 2. Review due cards sorted by retrievability ascending (lowest probability of recall first)
  reviewDue.sort((a, b) => {
    if (a.retrievability !== b.retrievability) {
      return a.retrievability - b.retrievability;
    }
    return a.nextReviewDate.getTime() - b.nextReviewDate.getTime();
  });

  // 3. New cards retain natural order

  // 4. Not due cards sorted by nextReview ascending
  notDue.sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime());

  return [
    ...learningDue.map(item => item.word),
    ...reviewDue.map(item => item.word),
    ...newCards,
    ...notDue.map(item => item.word)
  ];
}

/**
 * Generate comprehensive SRS learning analytics and 7-day review forecast
 * 
 * @param {Array} allWords - All vocabulary items for the level
 * @param {Object} srsRecords - Map of wordId -> SRSRecord
 * @param {Date|string|number} [now=new Date()] - Reference timestamp
 * @returns {Object} Analytics summary object
 */
export function getSRSAnalytics(allWords = [], srsRecords = {}, now = new Date()) {
  const nowDate = now instanceof Date ? now : new Date(now);
  const total = allWords.length;

  let newCount = 0;
  let againCount = 0;
  let hardCount = 0;
  let goodCount = 0;
  let easyCount = 0;
  let dueReviewCount = 0;
  let leechCount = 0;

  const learnedRecords = [];

  for (const word of allWords) {
    const rec = srsRecords[word.id];
    const stage = rec?.stage || 'new';

    if (!rec || stage === 'new') {
      newCount++;
    } else if (stage === 'again') {
      againCount++;
    } else if (stage === 'hard') {
      hardCount++;
    } else if (stage === 'good') {
      goodCount++;
    } else if (stage === 'easy') {
      easyCount++;
    }

    if (rec && (rec.isLeech === true || (typeof rec.lapses === 'number' && rec.lapses >= 4))) {
      leechCount++;
    }

    if (rec && rec.state !== 'new' && rec.lastReviewed) {
      learnedRecords.push(rec);
      const nextReviewDate = rec.nextReview ? new Date(rec.nextReview) : null;
      if (nextReviewDate && nextReviewDate <= nowDate) {
        dueReviewCount++;
      }
    }
  }

  const masteredTotal = goodCount + easyCount;

  let avgRetention = 0;
  let avgStability = 0;
  let avgDifficulty = 5.0;

  if (learnedRecords.length > 0) {
    const sumR = learnedRecords.reduce((acc, rec) => acc + getRetrievability(rec, nowDate), 0);
    avgRetention = Math.round((sumR / learnedRecords.length) * 100);

    const sumS = learnedRecords.reduce((acc, rec) => acc + (rec.stability || rec.interval || 0), 0);
    avgStability = Number((sumS / learnedRecords.length).toFixed(1));

    const sumD = learnedRecords.reduce((acc, rec) => acc + (rec.difficulty || 5.0), 0);
    avgDifficulty = Number((sumD / learnedRecords.length).toFixed(1));
  }

  // 7-Day Review Forecast
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
  const endOfToday = startOfToday + MS_PER_DAY;

  const bucketCounts = [0, 0, 0, 0, 0, 0, 0];

  for (const rec of learnedRecords) {
    if (!rec.nextReview) continue;
    const reviewTime = new Date(rec.nextReview).getTime();
    if (reviewTime <= endOfToday) {
      bucketCounts[0]++;
    } else {
      const diffDays = Math.floor((reviewTime - startOfToday) / MS_PER_DAY);
      if (diffDays >= 1 && diffDays < 7) {
        bucketCounts[diffDays]++;
      }
    }
  }

  const forecast7Days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfToday + i * MS_PER_DAY);
    const dayLabel = i === 0 ? 'Hôm nay' : `+${i} ngày`;
    const item = {
      day: i,
      label: dayLabel,
      date: d.toISOString().slice(0, 10),
      count: bucketCounts[i],
      valueOf() {
        return this.count;
      }
    };
    forecast7Days.push(item);
  }

  return {
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
    avgDifficulty,
    forecast7Days
  };
}
