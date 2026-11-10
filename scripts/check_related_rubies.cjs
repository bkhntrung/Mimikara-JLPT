const fs = require('fs');

function hasKanjiOutsideRuby(html) {
  if (!html || typeof html !== 'string') return false;
  // Loại bỏ các thẻ <ruby>...</ruby>
  const withoutRuby = html.replace(/<ruby>[\s\S]*?<\/ruby>/gi, '');
  // Loại bỏ các ký hiệu gạch ngang thay thế ―, —, ＿
  const stripped = withoutRuby.replace(/[―—＿]/g, '');
  // Kiểm tra còn chữ Hán không
  return /[\u4E00-\u9FAF]/.test(stripped);
}

['n1', 'n2', 'n3'].forEach(lvl => {
  const data = JSON.parse(fs.readFileSync('src/data/mimikara_' + lvl + '.json', 'utf8'));
  let count = 0;
  data.vocabulary.forEach(w => {
    if (!w.related) return;
    Object.entries(w.related).forEach(([cat, list]) => {
      if (!Array.isArray(list)) return;
      list.forEach((item, idx) => {
        const text = item.rubyHtml || item.text || '';
        if (hasKanjiOutsideRuby(text)) {
          count++;
          console.log(`[${lvl}] w#${w.id} (${w.word}) related.${cat}[${idx}]: text='${item.text}', rubyHtml='${item.rubyHtml}'`);
        }
      });
    });
  });
  console.log(`Total ${lvl} missing ruby in related:`, count);
});
