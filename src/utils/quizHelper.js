import { makeRubyCloze, formatRelatedRuby } from './text.js';

/**
 * Thuật toán sinh câu hỏi thông minh cho Bài tập Điền câu (ClozeQuiz) và Trắc nghiệm (QuizMode)
 * Tuân thủ phương pháp Active Recall, Elaborative Interrogation và chuẩn đề thi JLPT
 */

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
 */
export function buildClozeSentenceQuestions(unitWords, allWords) {
  const eligible = [];

  for (const w of unitWords) {
    if (!w.examples || w.examples.length === 0) continue;

    // Tìm ví dụ chứa từ vựng
    let matchedEx = null;
    let clozeRes = null;

    for (const ex of w.examples) {
      const res = makeRubyCloze(ex.rubyHtml, ex.japanese, w.word, w.reading);
      if (res.hasMatch) {
        matchedEx = ex;
        clozeRes = res;
        break;
      }
    }

    if (!matchedEx && w.examples.length > 0) {
      matchedEx = w.examples[0];
      clozeRes = makeRubyCloze(matchedEx.rubyHtml, matchedEx.japanese, w.word, w.reading);
    }

    if (matchedEx && clozeRes) {
      eligible.push({ word: w, example: matchedEx, clozeRes });
    }
  }

  const shuffled = [...eligible].sort(() => Math.random() - 0.5);

  return shuffled.map(({ word: target, example, clozeRes }) => {
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
    const options = [target, ...distractors].sort(() => Math.random() - 0.5);

    return {
      id: `sentence_${target.id}`,
      type: 'sentence',
      target,
      example,
      clozeText,
      clozeRubyHtml: clozeRes.clozeRubyHtml,
      solvedRubyHtml: clozeRes.solvedRubyHtml,
      options
    };
  });
}

/**
 * Sinh danh sách câu hỏi Điền từ vào Cụm từ đi kèm / Từ ghép (Collocation / Compound)
 */
export function buildClozeCollocationQuestions(unitWords, allWords) {
  const eligible = [];

  for (const w of unitWords) {
    const collocations = w.related?.collocations || [];
    const compounds = w.related?.compounds || [];
    const items = [...collocations, ...compounds];

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
        eligible.push({
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
  }

  // Nếu trong unit hiện tại không có cụm từ nào, lấy từ allWords
  const finalPool = eligible.length > 0 ? eligible : [];
  if (finalPool.length === 0 && allWords.length > 0) {
    return buildClozeCollocationQuestions(allWords, allWords);
  }

  const shuffled = [...finalPool].sort(() => Math.random() - 0.5);

  return shuffled.map(({ word: target, item, clozeRubyHtml, solvedRubyHtml, clozeText, originalText, rubyHtml, meaning, badge }, idx) => {
    const distractors = getSmartDistractors(target, unitWords, allWords, 3);
    const options = [target, ...distractors].sort(() => Math.random() - 0.5);

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
      options
    };
  });
}

/**
 * Sinh danh sách câu hỏi Trắc nghiệm 4 chế độ (QuizMode)
 * - 'kanji_to_reading': Kanji -> Cách đọc Hiragana (JLPT Mondai 1)
 * - 'kanji_to_meaning': Từ vựng -> Nghĩa tiếng Việt (JLPT Mondai 2/3)
 * - 'meaning_to_kanji': Nghĩa tiếng Việt -> Từ vựng
 * - 'synonym_antonym': Đồng nghĩa / Trái nghĩa (JLPT Mondai 4)
 */
export function buildQuizQuestions(unitWords, allWords, mode = 'kanji_to_meaning') {
  if (!unitWords || unitWords.length === 0) return [];

  if (mode === 'synonym_antonym') {
    // Lọc từ có synonyms hoặc antonyms
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
      // Fallback về allWords nếu unit hiện tại không có từ đồng/trái nghĩa
      return buildQuizQuestions(allWords, allWords, 'synonym_antonym');
    }

    const shuffledEligible = [...eligible].sort(() => Math.random() - 0.5);

    return shuffledEligible.map((qItem, idx) => {
      const target = qItem.target;
      // Tạo 3 distractors từ các từ khác
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

      const options = [correctOption, ...distractorOptions].sort(() => Math.random() - 0.5);

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
        options
      };
    });
  }

  // Chế độ 1, 2, 3: kanji_to_reading, kanji_to_meaning, meaning_to_kanji
  const shuffledPool = [...unitWords].sort(() => Math.random() - 0.5);

  return shuffledPool.map(target => {
    const distractors = getSmartDistractors(target, unitWords, allWords, 3);
    const options = [target, ...distractors].sort(() => Math.random() - 0.5);

    return {
      id: `quiz_${target.id}`,
      target,
      mode,
      options
    };
  });
}
