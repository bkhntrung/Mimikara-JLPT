import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const mimikaraN1 = JSON.parse(fs.readFileSync(path.resolve('src/data/mimikara_n1.json'), 'utf8'));
const mimikaraN2 = JSON.parse(fs.readFileSync(path.resolve('src/data/mimikara_n2.json'), 'utf8'));
const mimikaraN3 = JSON.parse(fs.readFileSync(path.resolve('src/data/mimikara_n3.json'), 'utf8'));

import { formatRelatedRuby, makeRubyCloze } from '../src/utils/text.js';
import { getSmartStudyQueue } from '../src/utils/srs.js';
import { 
  getSmartDistractors,
  buildClozeSentenceQuestions, 
  buildClozeCollocationQuestions,
  buildCombinedClozeQuestions,
  buildQuizQuestions,
  filterWordsByStudyScope,
  getWordQuestionQuota,
  createRetryQuestion,
  insertRetryQuestion,
  interleaveQuestionsByTarget
} from '../src/utils/quizHelper.js';

describe('Kiểm toán Toàn diện Dữ liệu & Hệ thống Bài tập Mimikara (Audit & Exercises Test Suite)', () => {

  // =========================================================================
  // PHẦN 1: KIỂM TOÁN TOÀN VẸN DỮ LIỆU ĐẦU VÀO (DATASETS N1, N2, N3)
  // =========================================================================

  test('Test 1.1: Tổng số lượng từ vựng đạt chuẩn 3,201 từ trên cả 3 cấp độ (N1, N2, N3)', () => {
    assert.equal(mimikaraN1.vocabulary.length, 1170, 'N1 phải có chính xác 1,170 từ vựng');
    assert.equal(mimikaraN2.vocabulary.length, 1160, 'N2 phải có chính xác 1,160 từ vựng');
    assert.equal(mimikaraN3.vocabulary.length, 871, 'N3 phải có chính xác 871 từ vựng');

    const totalVocab = mimikaraN1.vocabulary.length + mimikaraN2.vocabulary.length + mimikaraN3.vocabulary.length;
    assert.equal(totalVocab, 3201, 'Tổng số từ vựng toàn bộ 3 cấp độ phải đạt đúng 3,201 từ');
  });

  test('Test 1.2: Toàn bộ 3,201 từ vựng không bị rỗng word, reading, meanings và không có ký tự lỗi encoding', () => {
    const datasets = [
      { level: 'N1', data: mimikaraN1.vocabulary },
      { level: 'N2', data: mimikaraN2.vocabulary },
      { level: 'N3', data: mimikaraN3.vocabulary }
    ];

    for (const { level, data } of datasets) {
      for (const w of data) {
        assert.ok(w.id, `Từ vựng thiếu id tại level ${level}: ${JSON.stringify(w)}`);
        assert.ok(w.word && w.word.trim().length > 0, `Từ vựng bị rỗng word tại id=${w.id} level ${level}`);
        assert.ok(w.reading && w.reading.trim().length > 0, `Từ vựng bị rỗng reading tại id=${w.id} level ${level}`);
        assert.ok(Array.isArray(w.meanings) && w.meanings.length > 0 && w.meanings[0].trim().length > 0, `Từ vựng bị rỗng meanings tại id=${w.id} level ${level}`);

        // Kiểm tra không có ký tự lỗi encoding (Replacement character U+FFFD)
        assert.ok(!w.word.includes('\ufffd'), `Phát hiện lỗi encoding trong word id=${w.id} level ${level}`);
        assert.ok(!w.reading.includes('\ufffd'), `Phát hiện lỗi encoding trong reading id=${w.id} level ${level}`);
        for (const m of w.meanings) {
          assert.ok(!m.includes('\ufffd'), `Phát hiện lỗi encoding trong meanings id=${w.id} level ${level}`);
        }
      }
    }
  });

  test('Test 1.3: Dữ liệu câu ví dụ và cụm từ liên quan (compounds, collocations) hợp lệ', () => {
    let totalExamples = 0;
    let totalCollocations = 0;
    let totalCompounds = 0;

    const allVocab = [...mimikaraN1.vocabulary, ...mimikaraN2.vocabulary, ...mimikaraN3.vocabulary];
    for (const w of allVocab) {
      if (w.examples) {
        totalExamples += w.examples.length;
        for (const ex of w.examples) {
          assert.ok(ex.japanese && ex.japanese.trim().length > 0, `Ví dụ tiếng Nhật rỗng tại word id=${w.id}`);
          assert.ok(ex.meaning && ex.meaning.trim().length > 0, `Nghĩa ví dụ rỗng tại word id=${w.id}`);
        }
      }

      if (w.related?.collocations) {
        totalCollocations += w.related.collocations.length;
        for (const col of w.related.collocations) {
          assert.ok(col.text && col.text.trim().length > 0, `Collocation text rỗng tại word id=${w.id}`);
        }
      }

      if (w.related?.compounds) {
        totalCompounds += w.related.compounds.length;
        for (const comp of w.related.compounds) {
          assert.ok(comp.text && comp.text.trim().length > 0, `Compound text rỗng tại word id=${w.id}`);
        }
      }
    }

    assert.ok(totalExamples > 8000, `Tổng số câu ví dụ thực tế phải > 8,000 (thực tế: ${totalExamples})`);
    assert.ok(totalCollocations > 1000, `Tổng số collocations phải > 1,000 (thực tế: ${totalCollocations})`);
    assert.ok(totalCompounds > 1500, `Tổng số compounds phải > 1,500 (thực tế: ${totalCompounds})`);
  });

  // =========================================================================
  // PHẦN 2: KIỂM TOÁN LOGIC BÀI TẬP ĐIỀN CÂU (CLOZE QUIZ)
  // =========================================================================

  test('Test 2.1: Sinh câu hỏi Điền vào Câu ví dụ (sentence mode) chứa ô khuyết 【  ？  】 và 4 đáp án phân biệt', () => {
    const questions = buildClozeSentenceQuestions(mimikaraN1.vocabulary.slice(0, 50), mimikaraN1.vocabulary);
    assert.ok(questions.length > 0, 'Phải sinh được câu hỏi điền câu ví dụ');

    for (const q of questions.slice(0, 15)) {
      assert.ok(q.clozeText.includes('【  ？  】'), `Câu hỏi phải chứa ký hiệu chỗ trống 【  ？  】: ${q.clozeText}`);
      assert.equal(q.options.length, 4, 'Mỗi câu hỏi phải có chính xác 4 phương án lựa chọn');

      const optionIds = new Set(q.options.map(o => o.id));
      assert.equal(optionIds.size, 4, '4 phương án lựa chọn phải hoàn toàn phân biệt (không trùng lặp ID)');

      assert.ok(optionIds.has(q.target.id), 'Danh sách phương án phải chứa đáp án đúng (target word)');
    }
  });

  test('Test 2.2: Sinh câu hỏi Điền vào Cụm từ liên ngữ / Từ ghép (collocation mode) chuẩn xác', () => {
    const questions = buildClozeCollocationQuestions(mimikaraN1.vocabulary.slice(0, 50), mimikaraN1.vocabulary);
    assert.ok(questions.length > 0, 'Phải sinh được câu hỏi collocation cloze');

    for (const q of questions.slice(0, 15)) {
      assert.ok(q.clozeText.includes('【  ？  】'), `Cụm từ câu hỏi phải chứa 【  ？  】: ${q.clozeText}`);
      assert.equal(q.options.length, 4, 'Phải có 4 phương án');
      const optionIds = new Set(q.options.map(o => o.id));
      assert.equal(optionIds.size, 4, '4 phương án phải phân biệt');
      assert.ok(optionIds.has(q.target.id), 'Phải chứa đáp án đúng');
    }
  });

  test('Test 2.3: Thuật toán Smart Distractors ưu tiên độ dài tương đồng và cùng Unit', () => {
    const targetWord = mimikaraN1.vocabulary[0]; // 青春 (length 2)
    const unitWords = mimikaraN1.vocabulary.filter(w => w.unit === targetWord.unit);
    const distractors = getSmartDistractors(targetWord, unitWords, mimikaraN1.vocabulary, 3);

    assert.equal(distractors.length, 3, 'Phải sinh đúng 3 distractors');
    const allIds = new Set([targetWord.id, ...distractors.map(d => d.id)]);
    assert.equal(allIds.size, 4, 'Từ đích và 3 distractors phải độc nhất không trùng nhau');

    // Kiểm tra độ dài từ gây nhiễu gần với từ đích (độ chênh lệch <= 3)
    for (const d of distractors) {
      const lenDiff = Math.abs(d.word.length - targetWord.word.length);
      assert.ok(lenDiff <= 3, `Độ dài distractor ${d.word} (${d.word.length}) quá lệch so với từ đích ${targetWord.word} (${targetWord.word.length})`);
    }
  });

  // =========================================================================
  // PHẦN 3: KIỂM TOÁN LOGIC TRẮC NGHIỆM ĐA CHIỀU (QUIZ MODE 4 CHẾ ĐỘ JLPT)
  // =========================================================================

  test('Test 3.1: Chế độ 1 kanji_to_reading (JLPT Mondai 1 - Cách đọc Hiragana)', () => {
    const unitWords = mimikaraN1.vocabulary.slice(0, 30);
    const questions = buildQuizQuestions(unitWords, mimikaraN1.vocabulary, 'kanji_to_reading');

    assert.ok(questions.length > 0);
    for (const q of questions.slice(0, 10)) {
      assert.ok(q.target.word, 'Phải có từ chữ Kanji làm đề bài');
      assert.ok(q.target.reading, 'Phải có cách đọc Hiragana');
      assert.equal(q.options.length, 4, 'Phải có 4 phương án');
      const optionIds = new Set(q.options.map(o => o.id));
      assert.equal(optionIds.size, 4, '4 phương án không trùng lặp');
    }
  });

  test('Test 3.2: Chế độ 2 kanji_to_meaning (JLPT Mondai 2/3 - Từ -> Nghĩa tiếng Việt)', () => {
    const unitWords = mimikaraN2.vocabulary.slice(0, 30);
    const questions = buildQuizQuestions(unitWords, mimikaraN2.vocabulary, 'kanji_to_meaning');

    assert.ok(questions.length > 0);
    for (const q of questions.slice(0, 10)) {
      assert.ok(q.target.word);
      assert.ok(q.target.meanings?.length > 0);
      assert.equal(q.options.length, 4);
    }
  });

  test('Test 3.3: Chế độ 3 meaning_to_kanji (Nghĩa tiếng Việt -> Từ vựng tiếng Nhật)', () => {
    const unitWords = mimikaraN3.vocabulary.slice(0, 30);
    const questions = buildQuizQuestions(unitWords, mimikaraN3.vocabulary, 'meaning_to_kanji');

    assert.ok(questions.length > 0);
    for (const q of questions.slice(0, 10)) {
      assert.ok(q.target.meanings?.length > 0);
      assert.equal(q.options.length, 4);
      const optionIds = new Set(q.options.map(o => o.id));
      assert.equal(optionIds.size, 4);
      assert.ok(optionIds.has(q.target.id));
    }
  });

  test('Test 3.4: Chế độ 4 synonym_antonym (JLPT Mondai 4 - 類義語・対義語)', () => {
    const questions = buildQuizQuestions(mimikaraN1.vocabulary, mimikaraN1.vocabulary, 'synonym_antonym');

    assert.ok(questions.length > 0, 'Phải sinh được câu hỏi đồng nghĩa/trái nghĩa');
    for (const q of questions.slice(0, 15)) {
      assert.ok(['synonym', 'antonym'].includes(q.relationType));
      assert.ok(q.correctAnswer, 'Phải có từ đáp án đồng nghĩa/trái nghĩa');
      assert.ok(['類', '対'].includes(q.badge));
      assert.equal(q.options.length, 4, 'Phải có đúng 4 phương án');

      const optionIds = new Set(q.options.map(o => o.id));
      assert.equal(optionIds.size, 4, '4 phương án phải phân biệt');
      assert.ok(q.options.some(o => o.id === q.correctOptionId || o.isCorrect === true), 'Phải có đáp án đúng trong 4 phương án');
    }
  });

  // =========================================================================
  // PHẦN 4: KIỂM TOÁN TIỆN ÍCH formatRelatedRuby & CHỐNG LỆCH DÒNG FURIGANA
  // =========================================================================

  test('Test 4.1: formatRelatedRuby thay thế chính xác dấu ― và ＿ bằng từ gốc nổi bật', () => {
    // Trường hợp 1: Dấu ― trong từ ghép N1
    const rawN1 = '―<ruby>時代<rp>（</rp><rt>じだい</rt><rp>）</rp></ruby>';
    const formattedN1 = formatRelatedRuby(rawN1, '青春');
    assert.equal(
      formattedN1,
      '<span class="text-indigo-600 dark:text-indigo-400 font-bold">青春</span><ruby>時代<rp>（</rp><rt>じだい</rt><rp>）</rp></ruby>'
    );

    // Trường hợp 2: Dấu ＿ trong từ ghép / cụm từ N2
    const rawN2 = '＿経験、＿観';
    const formattedN2 = formatRelatedRuby(rawN2, '人生');
    assert.equal(
      formattedN2,
      '<span class="text-indigo-600 dark:text-indigo-400 font-bold">人生</span>経験、<span class="text-indigo-600 dark:text-indigo-400 font-bold">人生</span>観'
    );

    // Trường hợp 3: Từ gốc có ngoặc hoặc dấu ngã (ví dụ: ～に先立って)
    const rawTilde = '―する';
    const formattedTilde = formatRelatedRuby(rawTilde, '～に先立って');
    assert.equal(
      formattedTilde,
      '<span class="text-indigo-600 dark:text-indigo-400 font-bold">に先立って</span>する'
    );

    // Trường hợp 4: Chuỗi không chứa ký hiệu gạch ngang -> giữ nguyên hoàn toàn
    const plain = '<ruby>社会<rp>（</rp><rt>しゃかい</rt><rp>）</rp></ruby>';
    assert.equal(formatRelatedRuby(plain, '世の中'), plain);

    // Trường hợp 5: Null / undefined / empty string -> an toàn không crash
    assert.equal(formatRelatedRuby('', 'test'), '');
    assert.equal(formatRelatedRuby(null, 'test'), '');
    assert.equal(formatRelatedRuby('―時代', null), '―時代');

    // Trường hợp 6: Hỗ trợ Furigana cho từ gốc khi truyền wordHtml hoặc reading
    const formattedWithHtml = formatRelatedRuby(rawN1, '青春', '<ruby>青春<rp>（</rp><rt>せいしゅん</rt><rp>）</rp></ruby>', 'せいしゅん');
    assert.equal(
      formattedWithHtml,
      '<span class="text-indigo-600 dark:text-indigo-400 font-bold"><ruby>青春<rp>（</rp><rt>せいしゅん</rt><rp>）</rp></ruby></span><ruby>時代<rp>（</rp><rt>じだい</rt><rp>）</rp></ruby>'
    );

    // Trường hợp 7: Hỗ trợ truyền object từ vựng { word, wordHtml, reading }
    const wordObj = { word: '青春', wordHtml: '<ruby>青春<rp>（</rp><rt>せいしゅん</rt><rp>）</rp></ruby>', reading: 'せいしゅん' };
    const formattedWithObj = formatRelatedRuby(rawN1, wordObj);
    assert.equal(
      formattedWithObj,
      '<span class="text-indigo-600 dark:text-indigo-400 font-bold"><ruby>青春<rp>（</rp><rt>せいしゅん</rt><rp>）</rp></ruby></span><ruby>時代<rp>（</rp><rt>じだい</rt><rp>）</rp></ruby>'
    );

    // Trường hợp 8: Từ gốc xuất hiện trực tiếp trong văn bản ngoài thẻ <ruby> (không dùng dấu gạch)
    const rawNoDash = '青春時代';
    const formattedNoDash = formatRelatedRuby(rawNoDash, wordObj);
    assert.ok(
      formattedNoDash.includes('<span class="text-indigo-600 dark:text-indigo-400 font-bold"><ruby>青春<rp>（</rp><rt>せいしゅん</rt><rp>）</rp></ruby></span>')
    );
  });

  test('Test 4.2: makeRubyCloze bảo toàn 100% thẻ <ruby> xung quanh và thay thế trọn vẹn từ đích thành ô cloze', () => {
    // Trường hợp từ #4 N1: 世帯
    const word4 = mimikaraN1.vocabulary.find(w => w.id === 4 && w.word === '世帯');
    assert.ok(word4, 'Phải tìm thấy từ #4 世帯 trong mimikara_n1.json');

    const ex1 = word4.examples[0];
    const res = makeRubyCloze(ex1.rubyHtml, ex1.japanese, word4.word, word4.reading);

    assert.ok(res.hasMatch, 'makeRubyCloze phải nhận diện được từ đích trong câu ví dụ');
    
    // Kiểm tra bảo toàn các thẻ ruby xung quanh:
    assert.ok(res.clozeRubyHtml.includes('<ruby>都市部<rp>（</rp><rt>としぶ</rt><rp>）</rp></ruby>'), 'clozeRubyHtml phải giữ nguyên Furigana của 都市部');
    assert.ok(res.clozeRubyHtml.includes('<ruby>一人<rp>（</rp><rt>ひとり</rt><rp>）</rp></ruby>'), 'clozeRubyHtml phải giữ nguyên Furigana của 一人');
    assert.ok(res.clozeRubyHtml.includes('<ruby>住<rp>（</rp><rt>ず</rt><rp>）</rp></ruby>まい'), 'clozeRubyHtml phải giữ nguyên Furigana của 住まい');
    assert.ok(res.clozeRubyHtml.includes('<ruby>多<rp>（</rp><rt>おお</rt><rp>）</rp></ruby>い'), 'clozeRubyHtml phải giữ nguyên Furigana của 多い');

    // Kiểm tra ô cloze thay thế trọn vẹn khối 世帯数, không bị rớt chữ 数
    assert.ok(res.clozeRubyHtml.includes('<span class="cloze animate-pulse">【 ？ 】</span>'), 'clozeRubyHtml phải chứa ô cloze animate-pulse');
    assert.ok(!res.clozeRubyHtml.includes('【 ？ 】 数'), 'Chữ 数 không được phép bị rớt ra ngoài ô điền');

    // Kiểm tra solvedRubyHtml chứa đáp án giải mã với Furigana
    assert.ok(res.solvedRubyHtml.includes('<span class="cloze-solved">'), 'solvedRubyHtml phải có class cloze-solved');
    assert.ok(res.solvedRubyHtml.includes('<ruby>世帯数<rp>（</rp><rt>せたいすう</rt><rp>）</rp></ruby>'), 'solvedRubyHtml phải giữ nguyên Furigana của từ đích giải mã');
  });

  // =========================================================================
  // PHẦN 5: KIỂM TOÁN TYPOGRAPHY, FONT CHỮ VÀ CSS CHỐNG LỆCH DÒNG
  // =========================================================================

  test('Test 5.1: index.html đã nhúng đầy đủ Google Fonts Be Vietnam Pro và Noto Sans JP', () => {
    const htmlPath = path.resolve('index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    assert.ok(htmlContent.includes('Be+Vietnam+Pro'), 'index.html phải có font Be Vietnam Pro');
    assert.ok(htmlContent.includes('Noto+Sans+JP'), 'index.html phải có font Noto Sans JP');
  });

  test('Test 5.2: tailwind.config.js cấu hình đúng font-sans và font-japanese', () => {
    const tailwindPath = path.resolve('tailwind.config.js');
    const tailwindContent = fs.readFileSync(tailwindPath, 'utf8');

    assert.ok(tailwindContent.includes('Be Vietnam Pro'), 'tailwind.config.js phải chứa Be Vietnam Pro trong font family');
    assert.ok(tailwindContent.includes('Noto Sans JP'), 'tailwind.config.js phải chứa Noto Sans JP trong font family');
    assert.ok(tailwindContent.includes('japanese:'), 'tailwind.config.js phải có cấu hình japanese font');
  });

  test('Test 5.3: src/index.css định nghĩa chuẩn xác CSS chống lệch dòng cho ruby, rt, cloze, jp-sentence', () => {
    const cssPath = path.resolve('src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert.ok(cssContent.includes('ruby-position: over'), 'ruby phải có ruby-position: over');
    assert.ok(cssContent.includes('ruby-align: center'), 'ruby phải có ruby-align: center chống tách rời chữ Hán');
    assert.ok(cssContent.includes('display: inline-ruby'), 'ruby phải có display: inline-ruby');
    assert.ok(cssContent.includes('font-size: 0.52em') || cssContent.includes('font-size: 0.58em'), 'rt phải có font-size sắc nét (0.52em)');
    assert.ok(cssContent.includes('.jp-sentence'), 'src/index.css phải định nghĩa class .jp-sentence');
    assert.ok(cssContent.includes('overflow-wrap: anywhere') || cssContent.includes('word-break: break-word'), '.jp-sentence phải có chống tràn chữ');
    assert.ok(cssContent.includes('.cloze'), 'src/index.css phải có class .cloze');
    assert.ok(cssContent.includes('.cloze-solved'), 'src/index.css phải có class .cloze-solved');
  });

  test('Test 5.4: Kiểm toán tính năng Nâng cấp QuizMode, Header Progress và Backup/Restore', () => {
    // 1. Kiểm tra QuizMode có cỡ chữ lớn và nút phát âm câu ví dụ
    const quizPath = path.resolve('src/components/QuizMode.jsx');
    const quizContent = fs.readFileSync(quizPath, 'utf8');
    assert.ok(quizContent.includes('font-japanese text-base sm:text-lg font-semibold'), 'QuizMode phải có font-japanese lớn cho câu ví dụ');
    assert.ok(quizContent.includes('speakJapanese(target.examples[0].japanese'), 'QuizMode phải có nút phát âm câu ví dụ');

    // 2. Kiểm tra Header hiển thị số từ thực tế tránh ảo giác mất dữ liệu
    const headerPath = path.resolve('src/components/Header.jsx');
    const headerContent = fs.readFileSync(headerPath, 'utf8');
    assert.ok(headerContent.includes('learnedCount > 0 ? `${learnedCount} từ (${percentLearned}%)`'), 'Header phải hiển thị số từ đã thuộc thực tế');

    // 3. Kiểm tra StatsModal có tính năng Export & Import JSON Backup
    const statsPath = path.resolve('src/components/StatsModal.jsx');
    const statsContent = fs.readFileSync(statsPath, 'utf8');
    assert.ok(statsContent.includes('handleExportBackup'), 'StatsModal phải có hàm handleExportBackup');
    assert.ok(statsContent.includes('handleFileChange'), 'StatsModal phải có hàm handleFileChange');
    assert.ok(statsContent.includes('mimikara_backup_'), 'StatsModal phải định dạng tên file mimikara_backup_');
  });

  test('Test 5.5: Kiểm toán chống hồi quy Modal - Đóng khi click backdrop và conditional rendering', () => {
    // 1. Kiểm tra StatsModal.jsx
    const statsPath = path.resolve('src/components/StatsModal.jsx');
    const statsContent = fs.readFileSync(statsPath, 'utf8');
    assert.ok(statsContent.includes('if (!isOpen) return null;'), 'StatsModal phải có if (!isOpen) return null;');
    assert.ok(statsContent.includes('onClick={onClose}'), 'StatsModal backdrop phải có onClick={onClose}');
    assert.ok(statsContent.includes('e.stopPropagation()'), 'StatsModal modal box phải chặn nổi bọt sự kiện');

    // 2. Kiểm tra ShortcutModal.jsx
    const shortcutPath = path.resolve('src/components/ShortcutModal.jsx');
    const shortcutContent = fs.readFileSync(shortcutPath, 'utf8');
    assert.ok(shortcutContent.includes('if (!isOpen) return null;'), 'ShortcutModal phải có if (!isOpen) return null;');
    assert.ok(shortcutContent.includes('onClick={onClose}'), 'ShortcutModal backdrop phải có onClick={onClose}');
    assert.ok(shortcutContent.includes('e.stopPropagation()'), 'ShortcutModal modal box phải chặn nổi bọt sự kiện');

    // 3. Kiểm tra serve.cjs hỗ trợ dual-stack IPv4/IPv6 và bảo toàn Origin cổng 4173
    const servePath = path.resolve('serve.cjs');
    const serveContent = fs.readFileSync(servePath, 'utf8');
    assert.ok(serveContent.includes('server.listen(port, () => {'), 'serve.cjs phải listen dual-stack không truyền chuỗi localhost');
    assert.ok(serveContent.includes('err.code === \'EADDRINUSE\''), 'serve.cjs phải bắt lỗi EADDRINUSE');
    assert.ok(serveContent.includes('process.exit(0)'), 'serve.cjs phải thoát nhẹ nhàng khi port đã chạy');
  });

  test('Test 5.6: Kiểm toán module tabSync, TabConflictModal và Sao lưu hợp nhất N3•N2•N1', async () => {
    // 1. Kiểm tra module tabSync.js
    const tabSyncModule = await import('../src/utils/tabSync.js');
    assert.ok(typeof tabSyncModule.generateTabId === 'function', 'Phải có hàm generateTabId');
    const id1 = tabSyncModule.generateTabId();
    const id2 = tabSyncModule.generateTabId();
    assert.ok(id1.startsWith('tab_'));
    assert.notEqual(id1, id2, 'Các tab ID phải phân biệt');
    assert.ok(tabSyncModule.TabSyncManager, 'Phải có lớp TabSyncManager');

    const manager = new tabSyncModule.TabSyncManager({
      tabId: 'test_tab_1'
    });
    assert.equal(manager.tabId, 'test_tab_1');
    assert.ok(typeof manager.claimActiveSession === 'function');
    assert.ok(typeof manager.destroy === 'function');
    manager.destroy();

    // 2. Kiểm tra TabConflictModal.jsx
    const modalPath = path.resolve('src/components/TabConflictModal.jsx');
    const modalContent = fs.readFileSync(modalPath, 'utf8');
    assert.ok(modalContent.includes('if (!isOpen) return null;'), 'TabConflictModal phải có conditional rendering');
    assert.ok(modalContent.includes('Phát hiện cửa sổ học trùng lặp!'), 'Phải có thông báo xung đột đa tab');
    assert.ok(modalContent.includes('onClaimSession'), 'Phải có prop onClaimSession');
    assert.ok(modalContent.includes('onReloadData'), 'Phải có prop onReloadData');

    // 3. Kiểm tra App.jsx đã tích hợp TabSync & TabConflictModal
    const appPath = path.resolve('src/App.jsx');
    const appContent = fs.readFileSync(appPath, 'utf8');
    assert.ok(appContent.includes('TabConflictModal'), 'App.jsx phải nhúng TabConflictModal');
    assert.ok(appContent.includes('TabSyncManager'), 'App.jsx phải khởi tạo TabSyncManager');
    assert.ok(appContent.includes('if (isTabLocked) return;'), 'Phím tắt phải bị khóa khi tab trùng lặp');

    // 4. Kiểm tra StatsModal.jsx hỗ trợ sao lưu toàn diện N3•N2•N1
    const statsPath = path.resolve('src/components/StatsModal.jsx');
    const statsContent = fs.readFileSync(statsPath, 'utf8');
    assert.ok(statsContent.includes('exportAllUserData'), 'StatsModal phải dùng exportAllUserData');
    assert.ok(statsContent.includes('importAllUserData'), 'StatsModal phải dùng importAllUserData');
    assert.ok(statsContent.includes('getAllUserDataSummary'), 'StatsModal phải dùng getAllUserDataSummary');
    assert.ok(statsContent.includes('Xuất Sao Lưu Toàn Bộ (N3•N2•N1 .json)'), 'StatsModal phải có nút xuất toàn bộ N3•N2•N1');
    assert.ok(statsContent.includes('Gộp thông minh (Khuyên dùng)'), 'StatsModal phải có tùy chọn Gộp thông minh');
  });

  test('Test 5.7: Kiểm toán làm sạch 100% HTML Entities trong JSON & formatExampleMeaning', async () => {
    // 1. Kiểm toán toàn bộ 3 file JSON không còn bất kỳ HTML entity nào (&quot;, &lt;, &gt;, &amp;, &#038;, &#039;, &#49;, &#48;)
    const levels = ['n1', 'n2', 'n3'];
    for (const lvl of levels) {
      const filePath = path.resolve(`src/data/mimikara_${lvl}.json`);
      const rawContent = fs.readFileSync(filePath, 'utf8');
      const entities = rawContent.match(/&[a-zA-Z0-9#]+;/g) || [];
      assert.equal(entities.length, 0, `mimikara_${lvl}.json không được chứa bất kỳ HTML entity nào. Tìm thấy: ${entities.slice(0, 5)}`);
      
      // Không còn thẻ <u> thừa
      assert.ok(!rawContent.includes('<u>') && !rawContent.includes('</u>'), `mimikara_${lvl}.json không được chứa thẻ <u>`);

      // Không còn <ruby> không có rt
      assert.ok(!rawContent.includes('<ruby>ランク</ruby>'), `mimikara_${lvl}.json không được chứa <ruby>ランク</ruby>`);
    }

    // 2. Kiểm toán hàm formatExampleMeaning và cleanDisplayText
    const { formatExampleMeaning, cleanDisplayText } = await import('../src/utils/text.js');
    
    // Câu hội thoại từ #25 N1 迷信 (vốn đã có ngoặc kép ở đầu)
    const quoteSentence = '"Cửa chính quay hướng Bắc thì vận may không tốt." "Chuyện đó chỉ là mê tín mà thôi."';
    const formattedQuote = formatExampleMeaning(quoteSentence);
    assert.equal(formattedQuote, quoteSentence, 'Câu đã có dấu ngoặc kép không được bọc thêm dấu ngoặc kép thừa ở ngoài');

    // Câu thường không có ngoặc kép ở đầu
    const normalSentence = 'Mặt trời mọc ở đằng Đông.';
    const formattedNormal = formatExampleMeaning(normalSentence);
    assert.equal(formattedNormal, '"Mặt trời mọc ở đằng Đông."', 'Câu thường phải được bọc trong dấu ngoặc kép trang nhã');

    // Kiểm tra cleanDisplayText xử lý an toàn
    assert.equal(cleanDisplayText('&quot;Hello&quot; &lt;=&gt; &amp; test'), '"Hello" ⇔ & test');

    // 3. Kiểm toán Hán Việt N2 và N3 đồng bộ viết hoa
    const dataN2 = JSON.parse(fs.readFileSync(path.resolve('src/data/mimikara_n2.json'), 'utf8'));
    const wordN2_1 = dataN2.vocabulary[0];
    assert.equal(wordN2_1.hanviet, 'NHÂN SINH', 'Hán Việt N2 phải được viết IN HOA đồng bộ');

    const dataN3 = JSON.parse(fs.readFileSync(path.resolve('src/data/mimikara_n3.json'), 'utf8'));
    const wordN3_1 = dataN3.vocabulary[0];
    assert.equal(wordN3_1.hanviet, 'NAM TÍNH', 'Hán Việt N3 phải được viết IN HOA đồng bộ');
  });

  test('Test 5.8: Kiểm toán Furigana và Cỡ chữ chuẩn cho Từ liên quan, Từ đồng nghĩa & Cụm đi kèm', () => {
    // 1. Kiểm toán 100% mục related trong cả 3 file JSON không còn chữ Hán ngoài thẻ <ruby>
    const levels = ['n1', 'n2', 'n3'];
    for (const lvl of levels) {
      const filePath = path.resolve(`src/data/mimikara_${lvl}.json`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let missingCount = 0;

      for (const w of data.vocabulary) {
        if (!w.related) continue;
        const categories = ['synonyms', 'antonyms', 'compounds', 'collocations', 'relatedWords', 'idioms', 'notes'];
        for (const cat of categories) {
          const items = w.related[cat];
          if (!Array.isArray(items)) continue;
          for (const item of items) {
            const ruby = item.rubyHtml || '';
            const plain = ruby.replace(/<ruby>[\s\S]*?<\/ruby>/gi, '').replace(/[―—＿]/g, '');
            if (/[\u4E00-\u9FAF]/.test(plain)) {
              missingCount++;
            }
          }
        }
      }

      assert.equal(missingCount, 0, `mimikara_${lvl}.json không được có mục related nào còn chữ Hán ngoài thẻ <ruby>`);
    }

    // 2. Kiểm toán FlashcardDeck.jsx dùng cỡ chữ text-base sm:text-lg cho từ liên quan và formatRelatedRuby
    const flashcardPath = path.resolve('src/components/FlashcardDeck.jsx');
    const flashcardContent = fs.readFileSync(flashcardPath, 'utf8');
    assert.ok(flashcardContent.includes('formatRelatedRuby'), 'FlashcardDeck phải dùng formatRelatedRuby');
    assert.ok(flashcardContent.includes('text-base sm:text-lg font-semibold'), 'FlashcardDeck phải áp dụng cỡ chữ text-base sm:text-lg cho từ liên quan');

    // 3. Kiểm toán DictionaryView.jsx dùng cỡ chữ text-base sm:text-lg cho từ liên quan và formatRelatedRuby
    const dictPath = path.resolve('src/components/DictionaryView.jsx');
    const dictContent = fs.readFileSync(dictPath, 'utf8');
    assert.ok(dictContent.includes('formatRelatedRuby'), 'DictionaryView phải dùng formatRelatedRuby');
    assert.ok(dictContent.includes('text-base sm:text-lg font-semibold'), 'DictionaryView phải áp dụng cỡ chữ text-base sm:text-lg');

    // 4. Kiểm toán QuizMode.jsx và ClozeQuiz.jsx nâng cấp Furigana và cỡ chữ
    const quizPath = path.resolve('src/components/QuizMode.jsx');
    const quizContent = fs.readFileSync(quizPath, 'utf8');
    assert.ok(quizContent.includes('currentQ.correctRubyHtml'), 'QuizMode phải hỗ trợ currentQ.correctRubyHtml');
    assert.ok(quizContent.includes('text-base sm:text-lg font-bold'), 'QuizMode phải dùng text-base sm:text-lg font-bold cho đáp án giải thích đồng/trái nghĩa');

    const clozePath = path.resolve('src/components/ClozeQuiz.jsx');
    const clozeContent = fs.readFileSync(clozePath, 'utf8');
    assert.ok(clozeContent.includes('text-base sm:text-lg font-bold'), 'ClozeQuiz phải dùng text-base sm:text-lg font-bold cho đáp án giải thích');
    assert.ok(clozeContent.includes('target.wordHtml || target.word'), 'ClozeQuiz phải render target.wordHtml với Furigana');
  });

  test('Test 5.9: Kiểm toán chống lộ đáp án âm thanh khi lật mặt sau và chuyển thẻ (Audio Answer Leak Prevention)', () => {
    // 1. Kiểm tra FlashcardDeck.jsx: Đã import useRef và stopSpeech
    const flashcardPath = path.resolve('src/components/FlashcardDeck.jsx');
    const flashcardContent = fs.readFileSync(flashcardPath, 'utf8');
    assert.ok(flashcardContent.includes('useRef'), 'FlashcardDeck phải import useRef');
    assert.ok(flashcardContent.includes('stopSpeech'), 'FlashcardDeck phải import stopSpeech');
    assert.ok(flashcardContent.includes('prevFlippedRef'), 'FlashcardDeck phải dùng prevFlippedRef để theo dõi trạng thái lật');
    assert.ok(flashcardContent.includes('prevWordIdRef'), 'FlashcardDeck phải dùng prevWordIdRef để phát hiện chuyển từ');
    assert.ok(flashcardContent.includes('if (!isSameWord)'), 'FlashcardDeck phải chặn phát âm khi chuyển sang từ mới');
    assert.ok(flashcardContent.includes('wasFlippedToBack'), 'FlashcardDeck chỉ phát âm khi chuyển từ false sang true trên cùng một từ');

    // 2. Kiểm tra App.jsx: Đã gọi stopSpeech() và setIsFlipped(false) đồng bộ khi chuyển thẻ
    const appPath = path.resolve('src/App.jsx');
    const appContent = fs.readFileSync(appPath, 'utf8');
    assert.ok(appContent.includes('stopSpeech'), 'App.jsx phải import stopSpeech');
    
    // handleNavigate phải reset flip và dừng audio ngay lập tức
    const handleNavigateMatch = appContent.match(/handleNavigate\s*=\s*useCallback\(\s*\(direction\)\s*=>\s*\{([\s\S]*?)\},\s*\[activeWords\.length\]\)/);
    assert.ok(handleNavigateMatch, 'App.jsx phải có handleNavigate');
    assert.ok(handleNavigateMatch[1].includes('stopSpeech()'), 'handleNavigate phải gọi stopSpeech()');
    assert.ok(handleNavigateMatch[1].includes('setIsFlipped(false)'), 'handleNavigate phải gọi setIsFlipped(false) đồng bộ');

    // handleRateSRS phải reset flip và dừng audio ngay lập tức
    const handleRateSRSMatch = appContent.match(/handleRateSRS\s*=\s*useCallback\(\s*\(wordId,\s*rating\)\s*=>\s*\{([\s\S]*?)\},\s*\[activeWords\.length,\s*currentLevel\]\)/);
    assert.ok(handleRateSRSMatch, 'App.jsx phải có handleRateSRS');
    assert.ok(handleRateSRSMatch[1].includes('stopSpeech()'), 'handleRateSRS phải gọi stopSpeech()');
    assert.ok(handleRateSRSMatch[1].includes('setIsFlipped(false)'), 'handleRateSRS phải gọi setIsFlipped(false) đồng bộ');

    // 3. Kiểm tra DictionaryView.jsx: Đã import useEffect và stopSpeech
    const dictPath = path.resolve('src/components/DictionaryView.jsx');
    const dictContent = fs.readFileSync(dictPath, 'utf8');
    assert.ok(dictContent.includes('useEffect'), 'DictionaryView.jsx phải import useEffect');
    assert.ok(dictContent.includes('stopSpeech'), 'DictionaryView.jsx phải import stopSpeech');

    // 4. Kiểm thử mô phỏng máy trạng thái âm thanh (Audio State Machine Simulation)
    let speechPlayedCount = 0;
    let speechStoppedCount = 0;
    let lastSpokenWord = null;

    const mockSpeak = (word) => {
      speechPlayedCount++;
      lastSpokenWord = word;
    };
    const mockStop = () => {
      speechStoppedCount++;
    };

    class SimulatedAudioController {
      constructor() {
        this.prevFlipped = false;
        this.prevWordId = null;
        this.autoPlayAudio = true;
      }

      onStateUpdate(currentWord, isFlipped) {
        const isSameWord = this.prevWordId === currentWord?.id;
        const wasFlippedToBack = !this.prevFlipped && isFlipped;

        this.prevFlipped = isFlipped;
        this.prevWordId = currentWord?.id;

        if (!isSameWord) {
          mockStop();
          return;
        }

        if (!isFlipped) {
          mockStop();
          return;
        }

        if (wasFlippedToBack && this.autoPlayAudio && currentWord) {
          mockSpeak(currentWord.word);
        }
      }
    }

    const controller = new SimulatedAudioController();
    const wordA = { id: 101, word: '日本語' };
    const wordB = { id: 102, word: '勉強' };

    // Bước 1: Khởi tạo ở mặt trước từ A (isFlipped = false)
    controller.onStateUpdate(wordA, false);
    assert.equal(speechPlayedCount, 0, 'Mặt trước thẻ A ban đầu tuyệt đối không được phát âm');

    // Bước 2: Người dùng lật sang mặt sau từ A (isFlipped = true)
    controller.onStateUpdate(wordA, true);
    assert.equal(speechPlayedCount, 1, 'Khi lật sang mặt sau từ A thì phải phát âm từ A');
    assert.equal(lastSpokenWord, '日本語', 'Từ được phát âm phải là từ A');

    // Bước 3: Người dùng bấm Next chuyển sang từ B (Trong khi từ A đang ở mặt sau!)
    // Ngay cả khi xảy ra render bất đồng bộ nơi isFlipped vẫn đang là true:
    controller.onStateUpdate(wordB, true);
    assert.equal(speechPlayedCount, 1, 'Chuyển sang từ B TUYỆT ĐỐI KHÔNG được phát âm từ B (không lộ đáp án)');
    assert.ok(speechStoppedCount >= 1, 'Phải gọi mockStop để ngắt âm thanh từ A');

    // Bước 4: Thẻ B hoàn tất reset về mặt trước (isFlipped = false)
    controller.onStateUpdate(wordB, false);
    assert.equal(speechPlayedCount, 1, 'Mặt trước từ B vẫn giữ im lặng');

    // Bước 5: Người dùng quyết định lật mặt sau từ B (isFlipped = true)
    controller.onStateUpdate(wordB, true);
    assert.equal(speechPlayedCount, 2, 'Khi chủ động lật sang mặt sau từ B thì mới được phát âm từ B');
    assert.equal(lastSpokenWord, '勉強', 'Từ được phát âm phải là từ B');

    // Bước 6: Người dùng lật ngược lại mặt trước từ B (isFlipped = false)
    controller.onStateUpdate(wordB, false);
    assert.equal(speechPlayedCount, 2, 'Không phát âm thêm khi lật lại mặt trước');
    assert.ok(speechStoppedCount >= 2, 'Phải ngắt âm thanh khi lật lại mặt trước');
  });

  test('Test 5.10: Kiểm toán tĩnh toàn bộ các file JSX trong src/ đảm bảo import đầy đủ React hooks (Chống lỗi màn hình trắng ReferenceError)', () => {
    function getAllJsxFiles(dir) {
      let results = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getAllJsxFiles(fullPath));
        } else if (file.endsWith('.jsx')) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const hooks = ['useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'useContext', 'useReducer'];
    const jsxFiles = getAllJsxFiles(path.resolve('src'));

    assert.ok(jsxFiles.length >= 10, 'Phải có ít nhất 10 file JSX trong src/');

    const missingImports = [];

    for (const filePath of jsxFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const relPath = path.relative(path.resolve('.'), filePath).replace(/\\/g, '/');

      // Tìm tất cả hooks được import từ 'react'
      const reactImports = new Set();
      const importRegex = /import\s+(?:(?:\*\s+as\s+\w+|React|\w+)\s*,?\s*)?(?:\{([^}]+)\})?\s*from\s*['"]react['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        if (match[1]) {
          match[1].split(',').forEach(item => {
            const cleaned = item.trim().replace(/^type\s+/, '');
            if (cleaned) reactImports.add(cleaned);
          });
        }
      }

      // Kiểm tra từng hook
      for (const hook of hooks) {
        const usageRegex = new RegExp(`\\b${hook}\\s*\\(`, 'g');
        if (usageRegex.test(content)) {
          const isImported = reactImports.has(hook) || content.includes(`React.${hook}`);
          if (!isImported) {
            missingImports.push(`${relPath} sử dụng ${hook} nhưng chưa import từ 'react'`);
          }
        }
      }
    }

    assert.deepEqual(missingImports, [], `Phát hiện file JSX thiếu import React hook dẫn tới ReferenceError: ${missingImports.join('; ')}`);

    // Kiểm tra an toàn khởi tạo ref trong App.jsx (tránh Temporal Dead Zone)
    const appPath = path.resolve('src/App.jsx');
    const appContent = fs.readFileSync(appPath, 'utf8');
    assert.ok(!appContent.includes('useRef(activeWords)'), 'App.jsx không được truyền activeWords vào useRef trước khi activeWords được khai báo');
    assert.ok(appContent.includes('activeWordsRef = useRef([])'), 'activeWordsRef phải được khởi tạo an toàn với mảng rỗng');
  });

  test('Test 5.11: Kiểm toán Hệ thống Bài tập Thích ứng theo Từ Đã & Đang Học (Adaptive Mastery Exercises & Spaced Error Re-queue)', () => {
    // 1. Kiểm tra filterWordsByStudyScope
    const mockWords = [
      { id: 1, word: '青春', unit: 1 },
      { id: 2, word: '晩年', unit: 1 },
      { id: 3, word: '葬式', unit: 1 },
      { id: 4, word: '世帯', unit: 1 },
      { id: 5, word: '一体', unit: 1 }
    ];

    const now = new Date('2026-11-11T12:00:00Z');
    const mockSrs = {
      1: { id: 1, state: 'review', stage: 'good', nextReview: '2026-11-20T12:00:00Z' }, // Studied, vững
      2: { id: 2, state: 'learning', stage: 'again', nextReview: '2026-11-11T10:00:00Z' }, // Weak (Again, overdue)
      3: { id: 3, state: 'learning', stage: 'hard', nextReview: '2026-11-12T12:00:00Z' }, // Weak (Hard)
      4: { id: 4, state: 'new', stage: 'new' } // Chưa học (new)
      // 5: chưa có record
    };
    const mockStarred = new Set([5]); // Từ 5 gắn sao -> được tính là studied và weak

    // Kiểm tra chế độ 'studied'
    const studiedResult = filterWordsByStudyScope(mockWords, mockWords, mockSrs, mockStarred, 'studied', now);
    const studiedIds = studiedResult.words.map(w => w.id);
    assert.deepEqual(studiedIds.sort(), [1, 2, 3, 5], 'Chế độ studied phải lấy các từ có stage !== new hoặc gắn sao, loại bỏ hoàn toàn từ new và chưa học');
    assert.equal(studiedResult.words.some(w => w.id === 4), false, 'Từ new tuyệt đối không nằm trong danh sách studied');

    // Kiểm tra chế độ 'weak'
    const weakResult = filterWordsByStudyScope(mockWords, mockWords, mockSrs, mockStarred, 'weak', now);
    const weakIds = weakResult.words.map(w => w.id);
    assert.deepEqual(weakIds.sort(), [2, 3, 5], 'Chế độ weak phải lấy đúng từ again, hard, overdue hoặc gắn sao');

    // Kiểm tra quota ưu tiên
    assert.equal(getWordQuestionQuota({ id: 2 }, mockSrs, mockStarred, 'studied', now), 4, 'Từ again phải có quota = 4');
    assert.equal(getWordQuestionQuota({ id: 3 }, mockSrs, mockStarred, 'studied', now), 3, 'Từ hard phải có quota = 3');
    assert.equal(getWordQuestionQuota({ id: 1 }, mockSrs, mockStarred, 'studied', now), 2, 'Từ good phải có quota = 2');

    // 2. Kiểm tra buildClozeSentenceQuestions mở khóa nhiều câu ví dụ
    const multiExWords = mimikaraN1.vocabulary.filter(w => w.examples && w.examples.length >= 2).slice(0, 10);
    const multiExQuestions = buildClozeSentenceQuestions(multiExWords, mimikaraN1.vocabulary, { expandAllExamples: true });
    assert.ok(multiExQuestions.length > multiExWords.length, 'Số câu hỏi sinh ra từ các từ có nhiều ví dụ phải lớn hơn số từ đầu vào');

    // 3. Kiểm tra buildQuizQuestions chế độ all_angles
    const sampleWords = mimikaraN1.vocabulary.slice(0, 5);
    const allAngleQuestions = buildQuizQuestions(sampleWords, mimikaraN1.vocabulary, 'all_angles', {
      srsRecords: { [sampleWords[0].id]: { stage: 'again' } }
    });
    assert.ok(allAngleQuestions.length >= sampleWords.length, 'Chế độ all_angles phải sinh đủ câu hỏi đa chiều');
    const anglesFound = new Set(allAngleQuestions.map(q => q.questionAngle));
    assert.ok(anglesFound.has('kanji_to_reading'), 'Phải có góc hỏi kanji_to_reading');
    assert.ok(anglesFound.has('kanji_to_meaning'), 'Phải có góc hỏi kanji_to_meaning');

    // 4. Kiểm tra Vòng lặp Sửa sai (createRetryQuestion & insertRetryQuestion)
    const originalQ = allAngleQuestions[0];
    const retryQ = createRetryQuestion(originalQ, sampleWords, mimikaraN1.vocabulary);
    assert.equal(retryQ.isRetry, true, 'Câu hỏi retry phải có cờ isRetry = true');
    assert.equal(retryQ.retryCount, 1, 'Lần retry đầu tiên phải có retryCount = 1');
    assert.notEqual(retryQ.id, originalQ.id, 'ID câu hỏi retry phải khác ID gốc');

    const queue = [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }, { id: 'q3' }, { id: 'q4' }, { id: 'q5' }];
    const newQueue = insertRetryQuestion(queue, 1, retryQ, 3);
    assert.equal(newQueue.length, 7, 'Hàng đợi sau khi chèn phải tăng 1 phần tử');
    assert.equal(newQueue[4].id, retryQ.id, 'Câu hỏi retry phải xuất hiện tại vị trí currentIndex + spacing (1 + 3 = 4)');
  });

  test('Test 5.12: Kiểm toán Chống lỗi Reset/Mất phản hồi khi trả lời bài tập (Quiz State Persistence & Anti-Duplication)', () => {
    // 1. Kiểm tra tĩnh QuizMode.jsx: Không được chứa srsRecords trong dependencies của useEffect sinh câu hỏi
    const quizPath = path.resolve('src/components/QuizMode.jsx');
    const quizContent = fs.readFileSync(quizPath, 'utf8');

    assert.ok(quizContent.includes('srsRecordsRef = useRef(srsRecords)'), 'QuizMode phải dùng srsRecordsRef để truy cập srsRecords');
    assert.ok(quizContent.includes('starredSetRef = useRef(starredSet)'), 'QuizMode phải dùng starredSetRef để truy cập starredSet');
    
    // Dependencies của useEffect sinh câu hỏi không được chứa srsRecords hoặc starredSet
    const quizEffectMatch = quizContent.match(/useEffect\(\(\)\s*=>\s*\{[\s\S]*?setQuizPool\(builtQuestions\);[\s\S]*?\},\s*\[(.*?)\]\);/);
    assert.ok(quizEffectMatch, 'QuizMode phải có useEffect tạo builtQuestions');
    assert.ok(!quizEffectMatch[1].includes('srsRecords'), 'QuizMode useEffect sinh câu hỏi TUYỆT ĐỐI KHÔNG phụ thuộc vào srsRecords (tránh reset câu hỏi khi trả lời)');
    assert.ok(!quizEffectMatch[1].includes('starredSet'), 'QuizMode useEffect sinh câu hỏi TUYỆT ĐỐI KHÔNG phụ thuộc vào starredSet');

    // 2. Kiểm tra tĩnh ClozeQuiz.jsx: Tương tự QuizMode
    const clozePath = path.resolve('src/components/ClozeQuiz.jsx');
    const clozeContent = fs.readFileSync(clozePath, 'utf8');

    assert.ok(clozeContent.includes('srsRecordsRef = useRef(srsRecords)'), 'ClozeQuiz phải dùng srsRecordsRef để truy cập srsRecords');
    assert.ok(clozeContent.includes('starredSetRef = useRef(starredSet)'), 'ClozeQuiz phải dùng starredSetRef để truy cập starredSet');

    const clozeEffectMatch = clozeContent.match(/useEffect\(\(\)\s*=>\s*\{[\s\S]*?setQuestions\(builtQuestions\);[\s\S]*?\},\s*\[(.*?)\]\);/);
    assert.ok(clozeEffectMatch, 'ClozeQuiz phải có useEffect tạo builtQuestions');
    assert.ok(!clozeEffectMatch[1].includes('srsRecords'), 'ClozeQuiz useEffect sinh câu hỏi TUYỆT ĐỐI KHÔNG phụ thuộc vào srsRecords (tránh reset câu hỏi khi trả lời)');
    assert.ok(!clozeEffectMatch[1].includes('starredSet'), 'ClozeQuiz useEffect sinh câu hỏi TUYỆT ĐỐI KHÔNG phụ thuộc vào starredSet');

    // 3. Kiểm tra tính năng Không lặp từ trong cùng 1 phiên bài tập (Deduplication)
    const unit1Words = mimikaraN1.vocabulary.filter(w => w.unit === 1);
    
    // a. Standard Quiz: Mỗi từ chỉ xuất hiện đúng 1 câu hỏi khi adaptiveRepeat: false
    const standardQuestions = buildQuizQuestions(unit1Words, mimikaraN1.vocabulary, 'kanji_to_reading', { adaptiveRepeat: false });
    const standardWordIds = standardQuestions.map(q => q.target.id);
    const standardUniqueIds = new Set(standardWordIds);
    assert.equal(standardWordIds.length, standardUniqueIds.size, 'Standard Quiz không được có từ vựng bị lặp lại trong cùng phiên');

    // b. Cloze Sentence: Mỗi từ xuất hiện đúng 1 câu khi expandAllExamples: false
    const clozeQuestions = buildClozeSentenceQuestions(unit1Words, mimikaraN1.vocabulary, { expandAllExamples: false });
    const clozeWordIds = clozeQuestions.map(q => q.target.id);
    const clozeUniqueIds = new Set(clozeWordIds);
    assert.equal(clozeWordIds.length, clozeUniqueIds.size, 'Cloze Sentence không được có từ vựng bị lặp lại trong cùng phiên khi không mở rộng');

    // c. Cloze Collocation: Mỗi từ xuất hiện tối đa 1 câu khi expandAllExamples: false
    const collocQuestions = buildClozeCollocationQuestions(unit1Words, mimikaraN1.vocabulary, { expandAllExamples: false });
    const collocWordIds = collocQuestions.map(q => q.target.id);
    const collocUniqueIds = new Set(collocWordIds);
    assert.equal(collocWordIds.length, collocUniqueIds.size, 'Cloze Collocation không được có từ vựng bị lặp lại trong cùng phiên khi không mở rộng');

    // d. All Angles Quiz: Luân phiên góc hỏi, mỗi từ xuất hiện đúng 1 lần
    const allAngles = buildQuizQuestions(unit1Words, mimikaraN1.vocabulary, 'all_angles', { adaptiveRepeat: false });
    const allAngleWordIds = allAngles.map(q => q.target.id);
    const allAngleUniqueIds = new Set(allAngleWordIds);
    assert.equal(allAngleWordIds.length, allAngleUniqueIds.size, 'All Angles Quiz không được có từ vựng bị lặp lại trong cùng phiên');
  });

  test('Test 5.13: Kiểm toán Bảo lưu Vị trí Từ vựng khi Bật/Tắt Sắp xếp Thông minh SRS (Smart SRS Index Preservation)', () => {
    // 1. Kiểm tra tĩnh App.jsx: handleToggleSmartSRS phải tìm lại vị trí từ hiện tại
    const appPath = path.resolve('src/App.jsx');
    const appContent = fs.readFileSync(appPath, 'utf8');

    assert.ok(appContent.includes('const curWord = activeWordsRef.current[currentIndexRef.current];'), 'handleToggleSmartSRS phải lấy từ hiện tại từ ref');
    assert.ok(appContent.includes('nextList.findIndex(w => w.id === curWord.id)'), 'handleToggleSmartSRS phải tìm lại index của từ hiện tại trong danh sách mới');
    assert.ok(appContent.includes('setCurrentIndex(newIdx)'), 'handleToggleSmartSRS phải đặt currentIndex tới vị trí mới của từ');

    // 2. Mô phỏng hành vi bảo lưu từ vựng khi Bật và Tắt SRS
    const baseWords = mimikaraN1.vocabulary.filter(w => w.unit === 1);
    const mockSrs = {
      [baseWords[25].id]: { state: 'learning', stage: 'again', nextReview: new Date(Date.now() - 3600000).toISOString() }, // Overdue
      [baseWords[5].id]: { state: 'review', stage: 'good', nextReview: new Date(Date.now() + 86400000).toISOString() }
    };

    // Người dùng đang ở từ thứ 15 trong danh sách thông thường
    const initialIndex = 14;
    const viewedWord = baseWords[initialIndex];

    // BƯỚC 1: Bật SRS -> Danh sách được sắp xếp lại theo getSmartStudyQueue
    const smartQueue = getSmartStudyQueue(baseWords, mockSrs);
    const smartIndex = smartQueue.findIndex(w => w.id === viewedWord.id);
    assert.ok(smartIndex !== -1, 'Từ hiện tại phải tồn tại trong hàng đợi thông minh SRS');
    assert.equal(smartQueue[smartIndex].id, viewedWord.id, 'Thẻ từ hiển thị sau khi bật SRS phải giữ nguyên đúng từ vựng');

    // BƯỚC 2: Tắt SRS -> Danh sách quay trở lại thứ tự gốc
    const normalIndex = baseWords.findIndex(w => w.id === smartQueue[smartIndex].id);
    assert.equal(normalIndex, initialIndex, 'Sau khi tắt SRS, vị trí phải quay về đúng vị trí ban đầu trong sách');
    assert.equal(baseWords[normalIndex].id, viewedWord.id, 'Thẻ từ hiển thị sau khi tắt SRS phải giữ nguyên đúng từ vựng');
  });

  test('Test 5.14: Kiểm toán Chống Spam Chu kỳ SRS & Chống Lặp Thẻ Khi Đánh Giá (Anti-Spam Rating & Queue Stabilization)', async () => {
    // 1. Kiểm tra tĩnh App.jsx: Chống spam và ổn định hàng đợi phiên học
    const appPath = path.resolve('src/App.jsx');
    const appContent = fs.readFileSync(appPath, 'utf8');

    assert.ok(appContent.includes('sessionInitialRecordsRef = useRef({})'), 'App.jsx phải có sessionInitialRecordsRef để lưu snapshot ban đầu chống spam');
    assert.ok(appContent.includes('isRatingLockedRef = useRef(false)'), 'App.jsx phải có isRatingLockedRef debounce chống click đúp spam');
    assert.ok(appContent.includes('isSessionCompleted'), 'App.jsx phải quản lý trạng thái isSessionCompleted khi học hết danh sách');
    assert.ok(appContent.includes('sessionInitialRecordsRef.current[wordId]'), 'handleRateSRS phải tham chiếu bản ghi gốc ban đầu của phiên');

    // 2. Mô phỏng hành vi: Người dùng spam bấm phím 4 (Rất vững) liên tục 10 lần trong 1 phiên
    const { calculateNextReview } = await import('../src/utils/srs.js');
    const testWordId = 999;
    const sessionInitialMock = {};
    let currentSrsState = {};

    const simulateRateInSession = (wordId, rating) => {
      // Logic chống spam chu kỳ giống hệt trong App.jsx
      if (sessionInitialMock[wordId] === undefined) {
        sessionInitialMock[wordId] = currentSrsState[wordId] || null;
      }
      const baseRecord = sessionInitialMock[wordId];
      const updated = calculateNextReview(baseRecord, rating);
      currentSrsState[wordId] = updated;
      return updated;
    };

    // Bấm lần 1: Rất vững (Rating 4) -> chu kỳ ban đầu 4 ngày
    const rec1 = simulateRateInSession(testWordId, 4);
    assert.equal(rec1.interval, 4, 'Lần 1 bấm Rất vững phải có chu kỳ 4 ngày');

    // Bấm tiếp lần 2, 3, 4 ... 10 liên tục (Spam)
    for (let i = 2; i <= 10; i++) {
      const spamRec = simulateRateInSession(testWordId, 4);
      assert.equal(spamRec.interval, 4, `Lần ${i} spam bấm phím 4 TUYỆT ĐỐI KHÔNG được kéo dài chu kỳ lên (vẫn phải là 4 ngày)`);
      assert.equal(spamRec.repetitions, 1, `Lần ${i} số lần lặp repetitions không được tăng lũy kế vô tận`);
    }

    // 3. Kiểm tra FlashcardDeck.jsx: Có cơ chế debounce và màn hình hoàn thành phiên học
    const deckPath = path.resolve('src/components/FlashcardDeck.jsx');
    const deckContent = fs.readFileSync(deckPath, 'utf8');
    assert.ok(deckContent.includes('isRatingPending'), 'FlashcardDeck phải có state isRatingPending debounce nút bấm');
    assert.ok(deckContent.includes('isSessionCompleted'), 'FlashcardDeck phải hỗ trợ prop isSessionCompleted');
    assert.ok(deckContent.includes('Hoàn thành phiên ôn tập'), 'FlashcardDeck phải hiển thị màn hình chúc mừng hoàn thành phiên');
  });

  test('Test 5.15: Kiểm toán Chống Kẹt Bảng khi Bấm Hay Quên & Chống Nhảy Câu Trắc Nghiệm khi Đổi Dạng Bài Tập', async () => {
    // 1. Kiểm tra tĩnh QuizMode.jsx và ClozeQuiz.jsx: Thanh điều khiển luôn được hiển thị ở trên cùng
    const quizPath = path.resolve('src/components/QuizMode.jsx');
    const quizContent = fs.readFileSync(quizPath, 'utf8');

    assert.ok(quizContent.includes('isDirectionOnlyChange'), 'QuizMode phải có cờ isDirectionOnlyChange để nhận diện chỉ đổi dạng bài tập');
    assert.ok(quizContent.includes('currentWordIdRef'), 'QuizMode phải có currentWordIdRef để lưu ID từ vựng đang làm');
    assert.ok(quizContent.includes('builtQuestions.findIndex(q => q.target?.id === targetId)'), 'QuizMode phải tìm lại câu hỏi của đúng từ vựng đó khi đổi dạng bài tập');
    assert.ok(!quizContent.includes('if (quizPool.length === 0 && !isCompleted) {\n    const unitText'), 'QuizMode không được return sớm che khuất thanh chọn dạng bài tập và thanh scope');

    const clozePath = path.resolve('src/components/ClozeQuiz.jsx');
    const clozeContent = fs.readFileSync(clozePath, 'utf8');
    assert.ok(clozeContent.includes('isTypeOnlyChange'), 'ClozeQuiz phải có cờ isTypeOnlyChange để nhận diện chỉ đổi dạng bài tập');
    assert.ok(clozeContent.includes('currentWordIdRef'), 'ClozeQuiz phải có currentWordIdRef');
    assert.ok(!clozeContent.includes('if (questions.length === 0 && !isCompleted) {\n    const unitText'), 'ClozeQuiz không được return sớm che khuất thanh chọn dạng bài tập và thanh scope');

    // 2. Kiểm toán tính Đồng bộ Thứ tự Câu hỏi giữa các dạng bài tập trong quizHelper.js
    const { buildQuizQuestions } = await import('../src/utils/quizHelper.js');
    const unit1Words = mimikaraN1.vocabulary.filter(w => w.unit === 1);

    const readingQuestions = buildQuizQuestions(unit1Words, mimikaraN1.vocabulary, 'kanji_to_reading');
    const meaningQuestions = buildQuizQuestions(unit1Words, mimikaraN1.vocabulary, 'kanji_to_meaning');
    const kanjiQuestions = buildQuizQuestions(unit1Words, mimikaraN1.vocabulary, 'meaning_to_kanji');
    const allAnglesQuestions = buildQuizQuestions(unit1Words, mimikaraN1.vocabulary, 'all_angles');

    // Kiểm tra tính nhất quán 100% giữa các dạng câu hỏi:
    // Câu thứ i ở chế độ Cách đọc, Từ -> Nghĩa, Nghĩa -> Từ, Đa chiều PHẢI CÙNG LÀ TỪ ĐÍCH ĐÓ!
    for (let i = 0; i < unit1Words.length; i++) {
      const targetId = unit1Words[i].id;
      assert.equal(readingQuestions[i].target.id, targetId, `Câu ${i} ở dạng Cách đọc phải tương ứng với từ vựng thứ ${i}`);
      assert.equal(meaningQuestions[i].target.id, targetId, `Câu ${i} ở dạng Từ -> Nghĩa phải tương ứng với từ vựng thứ ${i}`);
      assert.equal(kanjiQuestions[i].target.id, targetId, `Câu ${i} ở dạng Nghĩa -> Từ phải tương ứng với từ vựng thứ ${i}`);
      assert.equal(allAnglesQuestions[i].target.id, targetId, `Câu ${i} ở dạng Đa chiều phải tương ứng với từ vựng thứ ${i}`);
    }
  });

  test('Test 5.16: Kiểm toán Bộ chuyển đổi và xuất thẻ Anki TSV (Anki Export Suite)', async () => {
    const { generateAnkiTSV } = await import('../src/utils/ankiExport.js');
    const sampleWords = mimikaraN1.vocabulary.slice(0, 5);
    const tsvOutput = generateAnkiTSV(sampleWords, 'N1');

    const lines = tsvOutput.split('\n');
    assert.equal(lines[0], '#separator:tab', 'Anki TSV phải bắt đầu bằng #separator:tab');
    assert.equal(lines[1], '#html:true', 'Anki TSV phải có #html:true để hiển thị Ruby và HTML');
    assert.equal(lines[2], '#tags column:9', 'Anki TSV phải chỉ định cột tag là cột 9');
    assert.equal(lines[3], 'Word\tReading\tFurigana\tHanViet\tMeaning\tExamples\tRelated\tLevel_Unit\tTags', 'Header cột phải chính xác 9 trường');

    // Kiểm tra số dòng: 4 dòng header + 5 dòng từ vựng = 9 dòng
    assert.equal(lines.length, 9, 'Số dòng xuất ra phải đúng 4 header + 5 từ vựng');

    // Kiểm tra dòng dữ liệu từ vựng đầu tiên
    const firstFields = lines[4].split('\t');
    assert.equal(firstFields.length, 9, 'Mỗi dòng dữ liệu phải có đủ 9 trường phân tách bằng TAB');
    assert.equal(firstFields[0], sampleWords[0].word);
    assert.equal(firstFields[1], sampleWords[0].reading);
    assert.ok(firstFields[7].startsWith('N1 - Unit'), 'Level_Unit phải có tiền tố cấp độ và unit');
    assert.ok(firstFields[8].includes('Mimikara::N1'), 'Tag phân cấp Anki phải chứa Mimikara::N1');
  });

});
