/**
 * Xuất dữ liệu từ vựng Mimikara sang định dạng Anki TSV chuẩn
 * Tương thích 100% với Anki Desktop, AnkiMobile (iOS) và AnkiDroid (Android)
 */

function sanitizeTsv(text) {
  if (!text) return '';
  return String(text).replace(/\t/g, ' ').replace(/\r?\n/g, '<br>');
}

function formatExamples(examples = []) {
  if (!examples || examples.length === 0) return '';
  return examples.map((ex, idx) => {
    const jp = ex.rubyHtml || ex.japanese || '';
    const vn = ex.meaning || '';
    return `<div class="example-item"><div class="example-jp">${idx + 1}. ${jp}</div><div class="example-vn">${vn}</div></div>`;
  }).join('');
}

function formatRelated(related = {}) {
  const parts = [];

  if (related.compounds?.length > 0) {
    const items = related.compounds.map(c => `<b>${c.text}</b>${c.meaning ? ': ' + c.meaning : ''}`).join('； ');
    parts.push(`<div class="rel-row"><span class="rel-badge badge-compound">合</span> ${items}</div>`);
  }
  if (related.collocations?.length > 0) {
    const items = related.collocations.map(c => `<b>${c.text}</b>${c.meaning ? ': ' + c.meaning : ''}`).join('； ');
    parts.push(`<div class="rel-row"><span class="rel-badge badge-colloc">連</span> ${items}</div>`);
  }
  if (related.synonyms?.length > 0) {
    const items = related.synonyms.map(c => `<b>${c.text}</b>${c.meaning ? ': ' + c.meaning : ''}`).join('； ');
    parts.push(`<div class="rel-row"><span class="rel-badge badge-syn">類</span> ${items}</div>`);
  }
  if (related.antonyms?.length > 0) {
    const items = related.antonyms.map(c => `<b>${c.text}</b>${c.meaning ? ': ' + c.meaning : ''}`).join('； ');
    parts.push(`<div class="rel-row"><span class="rel-badge badge-ant">対</span> ${items}</div>`);
  }

  return parts.join('');
}

export function generateAnkiTSV(words = [], levelName = 'N1') {
  const lines = [
    '#separator:tab',
    '#html:true',
    '#tags column:9',
    'Word\tReading\tFurigana\tHanViet\tMeaning\tExamples\tRelated\tLevel_Unit\tTags'
  ];

  words.forEach(w => {
    const word = sanitizeTsv(w.word);
    const reading = sanitizeTsv(w.reading);
    const furigana = sanitizeTsv(w.wordHtml || w.word);
    const hanviet = sanitizeTsv(w.hanviet || '');
    const meaning = sanitizeTsv((w.meanings || []).map((m, i) => `${i + 1}. ${m}`).join('<br>'));
    const examples = sanitizeTsv(formatExamples(w.examples));
    const related = sanitizeTsv(formatRelated(w.related));
    const unitPadded = String(w.unit || 0).padStart(2, '0');
    const levelUnit = `${levelName} - Unit ${unitPadded}`;
    const tags = `Mimikara Mimikara::${levelName} Mimikara::${levelName}::Unit${unitPadded}`;

    lines.push([word, reading, furigana, hanviet, meaning, examples, related, levelUnit, tags].join('\t'));
  });

  return lines.join('\n');
}

export function downloadAnkiTSV(words = [], levelName = 'N1') {
  const tsvContent = generateAnkiTSV(words, levelName);
  const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const fileName = `mimikara_${levelName.toLowerCase()}_anki.tsv`;

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
