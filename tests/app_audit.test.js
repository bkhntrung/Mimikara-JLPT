import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const mimikaraN1 = JSON.parse(fs.readFileSync(path.resolve('src/data/mimikara_n1.json'), 'utf8'));
const mimikaraN2 = JSON.parse(fs.readFileSync(path.resolve('src/data/mimikara_n2.json'), 'utf8'));
const mimikaraN3 = JSON.parse(fs.readFileSync(path.resolve('src/data/mimikara_n3.json'), 'utf8'));

import { formatRelatedRuby, makeRubyCloze } from '../src/utils/text.js';
import { 
  getSmartDistractors,
  buildClozeSentenceQuestions, 
  buildClozeCollocationQuestions,
  buildQuizQuestions 
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
    assert.ok(cssContent.includes('line-height: 2.15'), 'ruby phải có line-height: 2.15 chống nhảy dòng');
    assert.ok(cssContent.includes('display: inline-ruby'), 'ruby phải có display: inline-ruby');
    assert.ok(cssContent.includes('font-size: 0.58em') || cssContent.includes('font-size: 0.5em'), 'rt phải có font-size sắc nét (0.58em hoặc 0.5em)');
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

});
