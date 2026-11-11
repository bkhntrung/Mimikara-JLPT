import fs from 'fs';
import path from 'path';

const levels = [
  { name: 'N1', file: 'src/data/mimikara_n1.json' },
  { name: 'N2', file: 'src/data/mimikara_n2.json' },
  { name: 'N3', file: 'src/data/mimikara_n3.json' }
];

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

const outDir = path.resolve('anki_exports');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const allLines = [
  '#separator:tab',
  '#html:true',
  '#tags column:9',
  'Word\tReading\tFurigana\tHanViet\tMeaning\tExamples\tRelated\tLevel_Unit\tTags'
];

levels.forEach(({ name, file }) => {
  const raw = fs.readFileSync(path.resolve(file), 'utf8');
  const data = JSON.parse(raw);
  const words = data.vocabulary || [];

  const levelLines = [
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
    const levelUnit = `${name} - Unit ${unitPadded}`;
    const tags = `Mimikara Mimikara::${name} Mimikara::${name}::Unit${unitPadded}`;

    const line = [word, reading, furigana, hanviet, meaning, examples, related, levelUnit, tags].join('\t');
    levelLines.push(line);
    allLines.push(line);
  });

  const levelOutPath = path.join(outDir, `mimikara_${name.toLowerCase()}_anki.tsv`);
  fs.writeFileSync(levelOutPath, levelLines.join('\n'), 'utf8');
  console.log(`Exported ${words.length} words to ${levelOutPath}`);
});

const allOutPath = path.join(outDir, 'mimikara_all_3201_anki.tsv');
fs.writeFileSync(allOutPath, allLines.join('\n'), 'utf8');
console.log(`Exported ALL ${allLines.length - 4} words to ${allOutPath}`);
