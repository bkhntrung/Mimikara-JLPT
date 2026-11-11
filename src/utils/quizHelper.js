import { makeRubyCloze, formatRelatedRuby } from './text.js';

/**
 * Thuật toán sinh câu hỏi thông minh cho Bài tập Điền câu (ClozeQuiz) và Trắc nghiệm (QuizMode)
 * Tuân thủ phương pháp Active Recall, Elaborative Interrogation và chuẩn đề thi JLPT
 */

/**
 * Lọc & phân tầng từ vựng theo tiến độ học của người dùng (Spaced Repetition & SRS Records)
 * 
 * @param {Array} unitWords - Danh sách từ trong Unit đang chọn
 * @param {Array} allWords - Toàn bộ từ vựng của cấp độ
 * @param {Object} srsRecords - Bản ghi SRS từ LocalStorage
 * @param {Set|Object} starredSet - Tập hợp ID từ vựng đã đánh dấu sao
 * @param {string} studyScope - 'studied' (Đã & Đang học - Mặc định) | 'weak' (Hay quên & Cần ôn) | 'all' (Toàn bộ Unit)
 * @param {Date} now - Thời điểm tính toán
 * @returns {Object} { words, fallbackAllStudied, fallbackAllWeak, stats }
 */
export function filterWordsByStudyScope(unitWords = [], allWords = [], srsRecords = {}, starredSet = new Set(), studyScope = 'studied', now = new Date()) {
  const nowDate = now instanceof Date ? now : new Date(now);

  const isWordStarred = (wordId) => {
    if (starredSet instanceof Set) return starredSet.has(wordId);
    if (starredSet && typeof starredSet === 'object') return Boolean(starredSet[wordId]);
    return false;
  };

  const getWordStatus = (w) => {
    const rec = srsRecords?.[w.id];
    const isStarred = isWordStarred(w.id);
    // Từ đã/đang học: Có bản ghi SRS khác 'new', hoặc đã được gắn sao
    const isStudied = Boolean((rec && rec.state !== 'new' && rec.stage && rec.stage !== 'new') || isStarred);

    let isDue = false;
    if (rec?.nextReview) {
      try {
        isDue = new Date(rec.nextReview) <= nowDate;
      } catch {
        isDue = false;
      }
    }

    // Từ yếu hoặc cần ôn: Đã học VÀ (Again, Hard, Leech, Gắn sao, hoặc Đã đến hạn)
    const isWeakOrDue = Boolean(
      isStudied && (
        rec?.stage === 'again' ||
        rec?.stage === 'hard' ||
        rec?.isLeech === true ||
        isStarred ||
        isDue
      )
    );

    return { rec, isStarred, isStudied, isWeakOrDue };
  };

  const studiedInUnit = unitWords.filter(w => getWordStatus(w).isStudied);
  const weakInUnit = unitWords.filter(w => getWordStatus(w).isWeakOrDue);
  const studiedInAll = allWords.filter(w => getWordStatus(w).isStudied);
  const weakInAll = allWords.filter(w => getWordStatus(w).isWeakOrDue);

  const stats = {
    studiedInUnitCount: studiedInUnit.length,
    weakInUnitCount: weakInUnit.length,
    studiedInAllCount: studiedInAll.length,
    weakInAllCount: weakInAll.length,
    unitTotalCount: unitWords.length
  };

  if (studyScope === 'weak') {
    return {
      words: weakInUnit,
      fallbackAllWeak: weakInAll,
      fallbackAllStudied: studiedInAll,
      stats
    };
  }

  if (studyScope === 'all') {
    return {
      words: unitWords,
      fallbackAllStudied: studiedInAll,
      fallbackAllWeak: weakInAll,
      stats
    };
  }

  // Mặc định: 'studied' (Từ Đã & Đang học)
  return {
    words: studiedInUnit,
    fallbackAllStudied: studiedInAll,
    fallbackAllWeak: weakInAll,
    stats
  };
}

/**
 * Tính hạn mức quota câu hỏi ưu tiên cho từng từ vựng dựa trên trạng thái ghi nhớ
 * Từ yếu / hay quên xuất hiện nhiều góc hỏi & câu ví dụ hơn; từ vững xuất hiện vừa đủ
 * 
 * @param {Object} word - Từ vựng
 * @param {Object} srsRecords - Bản ghi SRS
 * @param {Set|Object} starredSet - Tập từ gắn sao
 * @param {string} studyScope - Phạm vi học
 * @param {Date} now - Thời điểm tính toán
 * @returns {number} Số lượng câu hỏi tối đa nên sinh cho từ này (1 - 4)
 */
export function getWordQuestionQuota(word, srsRecords = {}, starredSet = new Set(), studyScope = 'studied', now = new Date()) {
  const rec = srsRecords?.[word.id];
  const isStarred = starredSet instanceof Set 
    ? starredSet.has(word.id) 
    : (starredSet && typeof starredSet === 'object' && Boolean(starredSet[word.id]));
  const nowDate = now instanceof Date ? now : new Date(now);

  if (rec?.stage === 'again' || rec?.isLeech) {
    return 4; // Ưu tiên cao nhất
  }

  let isDue = false;
  if (rec?.nextReview) {
    try {
      isDue = new Date(rec.nextReview) <= nowDate;
    } catch {
      isDue = false;
    }
  }

  if (rec?.stage === 'hard' || isStarred || isDue) {
    return 3;
  }

  if (rec?.stage === 'good') {
    return 2;
  }

  if (rec?.stage === 'easy') {
    return 1;
  }

  // Từ mới (chưa có trong SRS)
  if (studyScope === 'all') {
    return 2;
  }
  return 1;
}

/**
 * Trải đều và giãn cách các câu hỏi có cùng từ đích (target.id) để không nằm sát cạnh nhau
 * Đồng thời ưu tiên các câu hỏi của từ yếu lên trước
 * 
 * @param {Array} questions - Danh sách câu hỏi
 * @returns {Array} Danh sách câu hỏi đã được sắp xếp giãn cách
 */
export function interleaveQuestionsByTarget(questions = []) {
  if (!questions || questions.length <= 1) return questions;

  // 1. Phân nhóm câu hỏi theo target.id
  const groupMap = new Map();
  for (const q of questions) {
    const tid = q.target?.id || q.id;
    if (!groupMap.has(tid)) {
      groupMap.set(tid, []);
    }
    groupMap.get(tid).push(q);
  }

  // 2. Chuyển thành danh sách các nhóm theo đúng thứ tự xuất hiện (không xáo trộn ngẫu nhiên nhóm)
  const groups = Array.from(groupMap.values());

  // Nếu mỗi nhóm chỉ có 1 câu hỏi, giữ nguyên 100% thứ tự ban đầu để đảm bảo tính đồng bộ & không nhảy câu
  let maxPerGroup = 0;
  for (const list of groups) {
    if (list.length > maxPerGroup) maxPerGroup = list.length;
  }
  if (maxPerGroup <= 1) {
    return questions;
  }

  // 3. Round-Robin rút dần từng câu hỏi từ mỗi nhóm để không 2 câu cùng từ nào nằm sát nhau
  const result = [];
  let remaining = true;

  while (remaining) {
    remaining = false;
    for (const group of groups) {
      if (group.length > 0) {
        result.push(group.shift());
        if (group.length > 0) {
          remaining = true;
        }
      }
    }
  }

  return result;
}

/**
 * Lấy danh sách từ gây nhiễu (distractors) thông minh
 * Ưu tiên các từ cùng Unit, độ dài tương đồng và thuộc tính từ vựng gần gũi
 * 
 * @param {Object} targetWord - Từ đích cần kiểm tra
 * @param {Array} unitWords - Danh sách từ trong cùng Unit
 * @param {Array} allWords - Toàn bộ từ vựng của cấp độ
 * @param {number} count - Số lượng từ gây nhiễu cần lấy (mặc định 3)
 * @returns {Array} Mảng gồm `count` từ gây nhiễu
 */
export function getSmartDistractors(targetWord, unitWords = [], allWords = [], count = 3) {
  const targetId = targetWord.id;
  const targetLen = (targetWord.word || '').length;

  // 1. Ứng viên cùng Unit (loại trừ từ đích)
  const poolSameUnit = unitWords.filter(w => w.id !== targetId);

  // Sắp xếp ưu tiên độ dài tương đồng
  const sortedSameUnit = [...poolSameUnit].sort((a, b) => {
    const diffA = Math.abs((a.word || '').length - targetLen);
    const diffB = Math.abs((b.word || '').length - targetLen);
    if (diffA !== diffB) return diffA - diffB;
    return Math.random() - 0.5;
  });

  const selected = [];
  const selectedIds = new Set([targetId]);

  for (const w of sortedSameUnit) {
    if (selected.length >= count) break;
    if (!selectedIds.has(w.id)) {
      selected.push(w);
      selectedIds.add(w.id);
    }
  }

  // 2. Nếu cùng Unit không đủ (ví dụ Unit quá ít từ), lấy thêm từ allWords
  if (selected.length < count) {
    const poolAll = allWords.filter(w => !selectedIds.has(w.id));
    const sortedAll = [...poolAll].sort((a, b) => {
      const diffA = Math.abs((a.word || '').length - targetLen);
      const diffB = Math.abs((b.word || '').length - targetLen);
      if (diffA !== diffB) return diffA - diffB;
      return Math.random() - 0.5;
    });

    for (const w of sortedAll) {
      if (selected.length >= count) break;
      selected.push(w);
      selectedIds.add(w.id);
    }
  }

  return selected;
}

/**
 * Sinh danh sách câu hỏi Điền từ vào Câu ví dụ (Cloze Sentence)
 * Khai thác tối đa toàn bộ câu ví dụ (w.examples) cho mỗi từ vựng
 */
export function buildClozeSentenceQuestions(unitWords, allWords, options = {}) {
  const { 
    expandAllExamples = true, 
    srsRecords = null, 
    starredSet = null, 
    studyScope = 'all' 
  } = options;

  const eligible = [];

  for (const w of unitWords) {
    if (!w.examples || w.examples.length === 0) continue;

    // Giới hạn số câu ví dụ theo quota SRS nếu có cung cấp
    let maxQuota = 999;
    if (srsRecords) {
      maxQuota = getWordQuestionQuota(w, srsRecords, starredSet, studyScope);
    }

    if (!expandAllExamples) {
      // Chế độ 1 câu ví dụ duy nhất cho mỗi từ (không lặp từ trong cùng 1 bài thi)
      const matches = [];
      for (let exIdx = 0; exIdx < w.examples.length; exIdx++) {
        const ex = w.examples[exIdx];
        const res = makeRubyCloze(ex.rubyHtml, ex.japanese, w.word, w.reading);
        if (res.hasMatch) {
          matches.push({ word: w, example: ex, clozeRes: res, exIdx, totalExamples: w.examples.length });
        }
      }

      if (matches.length > 0) {
        // Lấy câu ví dụ đầu tiên có match để bộ câu hỏi ổn định, không bị xáo trộn vị trí khi chuyển chế độ
        const chosen = matches[0];
        eligible.push(chosen);
      } else if (w.examples.length > 0) {
        const first = w.examples[0];
        const res = makeRubyCloze(first.rubyHtml, first.japanese, w.word, w.reading);
        eligible.push({ word: w, example: first, clozeRes: res, exIdx: 0, totalExamples: w.examples.length });
      }
    } else {
      // Chế độ Mở khóa toàn bộ câu ví dụ
      let addedForWord = 0;
      let fallbackFirst = null;

      for (let exIdx = 0; exIdx < w.examples.length; exIdx++) {
        if (addedForWord >= maxQuota) break;
        const ex = w.examples[exIdx];
        const res = makeRubyCloze(ex.rubyHtml, ex.japanese, w.word, w.reading);

        if (exIdx === 0) {
          fallbackFirst = { word: w, example: ex, clozeRes: res, exIdx: 0, totalExamples: w.examples.length };
        }

        if (res.hasMatch) {
          eligible.push({ word: w, example: ex, clozeRes: res, exIdx, totalExamples: w.examples.length });
          addedForWord++;
        }
      }

      // Nếu không câu nào match, vẫn lấy câu đầu tiên làm fallback để không bỏ sót từ
      if (addedForWord === 0 && fallbackFirst) {
        eligible.push(fallbackFirst);
      }
    }
  }

  const questions = eligible.map(({ word: target, example, clozeRes, exIdx, totalExamples }) => {
    let clozeText = example.japanese || '';
    const cleanWord = (target.word || '').replace(/\(.*?\)/g, '').trim();

    if (cleanWord && clozeText.includes(cleanWord)) {
      clozeText = clozeText.split(cleanWord).join('【  ？  】');
    } else if (target.word && clozeText.includes(target.word)) {
      clozeText = clozeText.split(target.word).join('【  ？  】');
    } else if (target.reading && clozeText.includes(target.reading)) {
      clozeText = clozeText.split(target.reading).join('【  ？  】');
    } else {
      clozeText = clozeText + ' 【  ？  】';
    }

    const distractors = getSmartDistractors(target, unitWords, allWords, 3);
    const optionsList = [target, ...distractors].sort(() => Math.random() - 0.5);

    return {
      id: exIdx === 0 ? `sentence_${target.id}` : `sentence_${target.id}_${exIdx}`,
      type: 'sentence',
      target,
      example,
      exampleIndex: exIdx,
      totalExamplesForWord: totalExamples,
      clozeText,
      clozeRubyHtml: clozeRes.clozeRubyHtml,
      solvedRubyHtml: clozeRes.solvedRubyHtml,
      options: optionsList
    };
  });

  return interleaveQuestionsByTarget(questions);
}

/**
 * Sinh danh sách câu hỏi Điền từ vào Cụm từ đi kèm / Từ ghép / Thành ngữ (Collocation / Compound / Idiom)
 */
export function buildClozeCollocationQuestions(unitWords, allWords, options = {}) {
  const { strictPool = false, expandAllExamples = false } = options;
  const eligible = [];

  for (const w of unitWords) {
    const collocations = w.related?.collocations || [];
    const compounds = w.related?.compounds || [];
    const idioms = w.related?.idioms || [];
    const items = [...collocations, ...compounds, ...idioms];

    const matchedForWord = [];
    for (const item of items) {
      const text = item.text || '';
      if (!text) continue;

      const ruby = item.rubyHtml || item.text || '';
      let clozeRubyHtml = '';
      let solvedRubyHtml = '';
      let clozeText = text;
      let matched = false;

      // 1. Ký hiệu ― hoặc ＿
      if (/[―—＿]/.test(ruby) || /[―—＿]/.test(text)) {
        clozeRubyHtml = ruby.replace(/[―—＿]/g, '<span class="cloze animate-pulse">【 ？ 】</span>');
        solvedRubyHtml = ruby.replace(/[―—＿]/g, `<span class="cloze-solved">${w.wordHtml || w.word}</span>`);
        clozeText = text.replace(/[―—＿]/g, '【  ？  】');
        matched = true;
      } else {
        const res = makeRubyCloze(ruby, text, w.word, w.reading);
        if (res.hasMatch) {
          clozeRubyHtml = res.clozeRubyHtml;
          solvedRubyHtml = res.solvedRubyHtml;
          clozeText = text.includes(w.word) ? text.split(w.word).join('【  ？  】') : text + ' 【  ？  】';
          matched = true;
        }
      }

      if (matched) {
        matchedForWord.push({
          word: w,
          item,
          clozeRubyHtml,
          solvedRubyHtml,
          clozeText,
          originalText: item.text,
          rubyHtml: item.rubyHtml,
          meaning: item.meaning || w.meanings?.[0] || '',
          badge: item.badge || '連'
        });
      }
    }

    if (matchedForWord.length > 0) {
      if (!expandAllExamples) {
        // Mỗi từ lấy đúng 1 cụm liên ngữ đầu tiên để bộ câu hỏi ổn định, không bị xáo trộn vị trí
        const chosen = matchedForWord[0];
        eligible.push(chosen);
      } else {
        eligible.push(...matchedForWord);
      }
    }
  }

  // Nếu trong unit hiện tại không có cụm từ nào:
  // Nếu strictPool = true (chế độ lọc đã học): trả về rỗng không tự ý fallback allWords
  if (eligible.length === 0) {
    if (strictPool) return [];
    if (allWords.length > 0) {
      return buildClozeCollocationQuestions(allWords, allWords, options);
    }
  }

  const questions = eligible.map(({ word: target, item, clozeRubyHtml, solvedRubyHtml, clozeText, originalText, rubyHtml, meaning, badge }, idx) => {
    const distractors = getSmartDistractors(target, unitWords, allWords, 3);
    const optionsList = [target, ...distractors].sort(() => Math.random() - 0.5);

    return {
      id: `colloc_${target.id}_${idx}`,
      type: 'collocation',
      target,
      item,
      clozeRubyHtml,
      solvedRubyHtml,
      clozeText,
      originalText,
      rubyHtml,
      meaning,
      badge,
      options: optionsList
    };
  });

  return interleaveQuestionsByTarget(questions);
}

/**
 * Sinh danh sách câu hỏi Kết hợp Câu ví dụ & Cụm từ liên ngữ (Combined Cloze)
 */
export function buildCombinedClozeQuestions(unitWords, allWords, options = {}) {
  const sentenceQs = buildClozeSentenceQuestions(unitWords, allWords, options);
  const collocQs = buildClozeCollocationQuestions(unitWords, allWords, options);

  if (!options.expandAllExamples) {
    // Để tránh lặp cùng 1 từ vựng trong chế độ kết hợp:
    // Xen kẽ câu hỏi giữa sentence và collocation, mỗi từ xuất hiện đúng 1 lần
    const seenWords = new Set();
    const combined = [];
    const maxLen = Math.max(sentenceQs.length, collocQs.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < sentenceQs.length && !seenWords.has(sentenceQs[i].target.id)) {
        combined.push(sentenceQs[i]);
        seenWords.add(sentenceQs[i].target.id);
      }
      if (i < collocQs.length && !seenWords.has(collocQs[i].target.id)) {
        combined.push(collocQs[i]);
        seenWords.add(collocQs[i].target.id);
      }
    }
    return interleaveQuestionsByTarget(combined);
  }

  const combined = [...sentenceQs, ...collocQs];
  return interleaveQuestionsByTarget(combined);
}

/**
 * Sinh danh sách câu hỏi Trắc nghiệm (QuizMode)
 * Hỗ trợ 5 chế độ:
 * - 'kanji_to_reading': Kanji -> Cách đọc Hiragana (JLPT Mondai 1)
 * - 'kanji_to_meaning': Từ vựng -> Nghĩa tiếng Việt (JLPT Mondai 2/3)
 * - 'meaning_to_kanji': Nghĩa tiếng Việt -> Từ vựng
 * - 'synonym_antonym': Đồng nghĩa / Trái nghĩa (JLPT Mondai 4)
 * - 'all_angles': Tổng hợp Đa chiều (Tất cả các góc hỏi cho từ đang học)
 */
export function buildQuizQuestions(unitWords, allWords, mode = 'kanji_to_meaning', options = {}) {
  if (!unitWords || unitWords.length === 0) return [];

  const {
    srsRecords = null,
    starredSet = null,
    studyScope = 'all',
    adaptiveRepeat = false,
    strictPool = false
  } = options;

  // =========================================================================
  // CHẾ ĐỘ 5: TỔNG HỢP ĐA CHIỀU (ALL ANGLES)
  // =========================================================================
  if (mode === 'all_angles') {
    const questions = [];
    const availableAngles = ['kanji_to_reading', 'kanji_to_meaning', 'meaning_to_kanji'];

    unitWords.forEach((target, idx) => {
      const syns = target.related?.synonyms || [];
      const ants = target.related?.antonyms || [];
      const relationItem = syns[0] || ants[0];

      // Luân phiên các góc hỏi cho từng từ để đảm bảo mỗi từ xuất hiện đúng 1 lần với góc hỏi đa dạng
      let angle = availableAngles[idx % availableAngles.length];
      if (idx % 4 === 3 && relationItem && relationItem.text) {
        angle = 'synonym_antonym';
      }

      if (angle === 'kanji_to_reading') {
        const dist = getSmartDistractors(target, unitWords, allWords, 3);
        questions.push({
          id: `quiz_${target.id}_angle_reading`,
          target,
          mode: 'all_angles',
          questionAngle: 'kanji_to_reading',
          options: [target, ...dist].sort(() => Math.random() - 0.5)
        });
      } else if (angle === 'meaning_to_kanji') {
        const dist = getSmartDistractors(target, unitWords, allWords, 3);
        questions.push({
          id: `quiz_${target.id}_angle_kanji`,
          target,
          mode: 'all_angles',
          questionAngle: 'meaning_to_kanji',
          options: [target, ...dist].sort(() => Math.random() - 0.5)
        });
      } else if (angle === 'synonym_antonym' && relationItem && relationItem.text) {
        const isSyn = Boolean(syns[0]);
        const otherWords = allWords.filter(w => w.id !== target.id && w.word !== relationItem.text);
        const distractors = [...otherWords].sort(() => Math.random() - 0.5).slice(0, 3);

        const correctOption = {
          id: `correct_${target.id}_angle_rel`,
          word: relationItem.text,
          wordHtml: formatRelatedRuby(relationItem.rubyHtml || relationItem.text, target.word, target.wordHtml, target.reading),
          reading: '',
          meanings: [relationItem.meaning || 'Từ đồng/trái nghĩa chính xác'],
          hanviet: '',
          isCorrect: true
        };

        const distractorOptions = distractors.map(d => ({
          id: `dist_${d.id}`,
          word: d.word,
          wordHtml: d.wordHtml || d.word,
          reading: d.reading || '',
          meanings: d.meanings || [],
          hanviet: d.hanviet || '',
          isCorrect: false
        }));

        questions.push({
          id: `quiz_${target.id}_angle_syn_ant`,
          target,
          mode: 'all_angles',
          questionAngle: 'synonym_antonym',
          relationType: isSyn ? 'synonym' : 'antonym',
          relationLabel: isSyn ? 'Từ đồng nghĩa (類義語)' : 'Từ trái nghĩa (対義語)',
          badge: isSyn ? '類' : '対',
          correctAnswer: relationItem.text,
          correctRubyHtml: correctOption.wordHtml,
          correctOptionId: correctOption.id,
          relationMeaning: relationItem.meaning || '',
          options: [correctOption, ...distractorOptions].sort(() => Math.random() - 0.5)
        });
      } else {
        // Mặc định kanji_to_meaning
        const dist = getSmartDistractors(target, unitWords, allWords, 3);
        questions.push({
          id: `quiz_${target.id}_angle_meaning`,
          target,
          mode: 'all_angles',
          questionAngle: 'kanji_to_meaning',
          options: [target, ...dist].sort(() => Math.random() - 0.5)
        });
      }
    });

    // Giữ nguyên thứ tự tuần tự của unitWords để câu hỏi đồng bộ hoàn toàn với các góc hỏi khác
    return questions;
  }

  // =========================================================================
  // CHẾ ĐỘ 4: ĐỒNG NGHĨA / TRÁI NGHĨA (SYNONYM / ANTONYM)
  // =========================================================================
  if (mode === 'synonym_antonym') {
    let eligible = [];
    const pool = unitWords.length >= 4 ? unitWords : allWords;

    for (const w of pool) {
      const syns = w.related?.synonyms || [];
      const ants = w.related?.antonyms || [];

      syns.forEach(s => {
        if (s.text && s.text.trim()) {
          eligible.push({
            target: w,
            relationType: 'synonym', // 類義語
            relationLabel: 'Từ đồng nghĩa (類義語)',
            badge: '類',
            correctAnswer: s.text,
            correctRubyHtml: formatRelatedRuby(s.rubyHtml || s.text, w.word, w.wordHtml, w.reading),
            relationMeaning: s.meaning || ''
          });
        }
      });

      ants.forEach(a => {
        if (a.text && a.text.trim()) {
          eligible.push({
            target: w,
            relationType: 'antonym', // 対義語
            relationLabel: 'Từ trái nghĩa (対義語)',
            badge: '対',
            correctAnswer: a.text,
            correctRubyHtml: formatRelatedRuby(a.rubyHtml || a.text, w.word, w.wordHtml, w.reading),
            relationMeaning: a.meaning || ''
          });
        }
      });
    }

    if (eligible.length === 0) {
      if (strictPool) return [];
      return buildQuizQuestions(allWords, allWords, 'synonym_antonym', options);
    }

    // Giữ nguyên thứ tự từ vựng của unitWords để không bị nhảy câu khi chuyển chế độ
    const questions = eligible.map((qItem, idx) => {
      const target = qItem.target;
      const otherWords = allWords.filter(w => w.id !== target.id && w.word !== qItem.correctAnswer);
      const distractors = [...otherWords].sort(() => Math.random() - 0.5).slice(0, 3);

      const correctOption = {
        id: `correct_${target.id}_${idx}`,
        word: qItem.correctAnswer,
        wordHtml: qItem.correctRubyHtml,
        reading: '',
        meanings: [qItem.relationMeaning || 'Từ đồng/trái nghĩa chính xác'],
        hanviet: '',
        isCorrect: true
      };

      const distractorOptions = distractors.map(d => ({
        id: `dist_${d.id}`,
        word: d.word,
        wordHtml: d.wordHtml || d.word,
        reading: d.reading || '',
        meanings: d.meanings || [],
        hanviet: d.hanviet || '',
        isCorrect: false
      }));

      const optionsList = [correctOption, ...distractorOptions].sort(() => Math.random() - 0.5);

      return {
        id: `syn_ant_${target.id}_${idx}`,
        target,
        mode,
        relationType: qItem.relationType,
        relationLabel: qItem.relationLabel,
        badge: qItem.badge,
        correctAnswer: qItem.correctAnswer,
        correctRubyHtml: qItem.correctRubyHtml,
        correctOptionId: correctOption.id,
        relationMeaning: qItem.relationMeaning,
        options: optionsList
      };
    });

    // Giữ nguyên thứ tự tuần tự của unitWords để câu hỏi đồng bộ hoàn toàn với các góc hỏi khác
    return questions;
  }

  // =========================================================================
  // CHẾ ĐỘ 1, 2, 3: kanji_to_reading, kanji_to_meaning, meaning_to_kanji
  // =========================================================================
  const questions = [];

  for (const target of unitWords) {
    const distractors = getSmartDistractors(target, unitWords, allWords, 3);
    const optionsList = [target, ...distractors].sort(() => Math.random() - 0.5);

    questions.push({
      id: `quiz_${target.id}`,
      target,
      mode,
      options: optionsList
    });

    // Nếu kích hoạt lặp thích ứng cho từ yếu/đang học (Again, Hard, Leech)
    if (adaptiveRepeat && srsRecords) {
      const rec = srsRecords[target.id];
      if (rec?.stage === 'again' || rec?.stage === 'hard' || rec?.isLeech) {
        const repeatDistractors = getSmartDistractors(target, unitWords, allWords, 3);
        questions.push({
          id: `quiz_${target.id}_repeat`,
          target,
          mode,
          isAdaptiveRepeat: true,
          options: [target, ...repeatDistractors].sort(() => Math.random() - 0.5)
        });
      }
    }
  }

  return interleaveQuestionsByTarget(questions);
}

/**
 * Tạo câu hỏi ôn lại (Retry Question) khi người dùng trả lời sai
 * Đảo lại vị trí đáp án hoặc sinh distractors mới hoàn toàn để chống nhớ vẹt vị trí
 * 
 * @param {Object} failedQuestion - Câu hỏi vừa trả lời sai
 * @param {Array} unitWords - Danh sách từ trong Unit
 * @param {Array} allWords - Toàn bộ từ vựng
 * @returns {Object} Câu hỏi retry mới
 */
export function createRetryQuestion(failedQuestion, unitWords = [], allWords = []) {
  const retryCount = (failedQuestion.retryCount || 0) + 1;
  const target = failedQuestion.target;
  let options = [];

  const isSynAnt = failedQuestion.mode === 'synonym_antonym' || failedQuestion.questionAngle === 'synonym_antonym';

  if (isSynAnt) {
    // Đảo lại thứ tự options hiện tại
    options = [...failedQuestion.options].sort(() => Math.random() - 0.5);
  } else {
    // Sinh bộ từ gây nhiễu mới
    const distractors = getSmartDistractors(target, unitWords, allWords, 3);
    options = [target, ...distractors].sort(() => Math.random() - 0.5);
  }

  return {
    ...failedQuestion,
    id: `${failedQuestion.id}_retry_${retryCount}_${Date.now()}`,
    isRetry: true,
    retryCount,
    options
  };
}

/**
 * Chèn câu hỏi ôn lại vào hàng đợi sau một khoảng cách spacing (mặc định sau 3-4 câu)
 * 
 * @param {Array} questionQueue - Hàng đợi câu hỏi hiện tại
 * @param {number} currentIndex - Vị trí câu hỏi hiện tại
 * @param {Object} retryQuestion - Câu hỏi ôn lại
 * @param {number} spacing - Khoảng cách chèn lùi về sau (mặc định 4)
 * @returns {Array} Hàng đợi câu hỏi mới
 */
export function insertRetryQuestion(questionQueue, currentIndex, retryQuestion, spacing = 4) {
  const newQueue = [...questionQueue];
  const insertIdx = Math.min(newQueue.length, currentIndex + spacing);
  newQueue.splice(insertIdx, 0, retryQuestion);
  return newQueue;
}
