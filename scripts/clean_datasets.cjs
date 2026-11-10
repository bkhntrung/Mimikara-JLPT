const fs = require('fs');
const path = require('path');

function cleanString(str) {
  if (typeof str !== 'string') return str;

  let s = str;

  // 1. Mũi tên hai chiều
  s = s.replace(/&lt;=&gt;/g, '⇔')
       .replace(/<=>/g, '⇔')
       .replace(/&lt;-&gt;/g, '⇔')
       .replace(/<->/g, '⇔');

  // 2. Dấu ngoặc kép, nháy đơn
  s = s.replace(/&quot;/g, '"')
       .replace(/&apos;/g, "'")
       .replace(/&#039;/g, "'");

  // 3. Ký tự &
  s = s.replace(/&#038;/g, '&')
       .replace(/&amp;/g, '&');

  // 4. Các ký tự số HTML entities
  s = s.replace(/&#49;/g, '1')
       .replace(/&#48;/g, '0');

  // 5. Loại bỏ thẻ <u> và </u> thừa
  s = s.replace(/<\/?u>/gi, '');

  // 6. Xử lý badge &lt;...&gt; -> 〈...〉
  s = s.replace(/&lt;他&gt;/g, '〈他〉')
       .replace(/&lt;自&gt;/g, '〈自〉')
       .replace(/&lt;その他&gt;/g, '〈その他〉')
       .replace(/&lt;名&gt;/g, '〈名〉')
       .replace(/<他>/g, '〈他〉')
       .replace(/<自>/g, '〈自〉')
       .replace(/<その他>/g, '〈その他〉')
       .replace(/<名>/g, '〈名〉');

  // 7. Xử lý &lt;vào&gt; hoặc <vào> trong Hán Việt hoặc Text
  s = s.replace(/&lt;vào&gt;/gi, '(vào)')
       .replace(/<vào>/gi, '(vào)');

  // 8. Thẻ ruby đặc biệt không có rt
  s = s.replace(/<ruby>ランク<\/ruby>/g, 'ランク');

  // 9. Trường hợp đặc biệt khác trong n3
  s = s.replace(/&lt;あるu&gt;/g, '〈あるu〉')
       .replace(/<あるu>/g, '〈あるu〉');

  // 10. Giải mã các &lt; và &gt; còn sót lại (chuyển sang ngoặc 〈 〉 để không lẫn thẻ html)
  s = s.replace(/&lt;/g, '〈').replace(/&gt;/g, '〉');

  return s;
}

function processValue(val, key) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') {
    let cleaned = cleanString(val);
    if (key === 'hanviet' && cleaned) {
      cleaned = cleaned.toUpperCase();
    }
    return cleaned;
  }
  if (Array.isArray(val)) {
    return val.map(item => processValue(item, key));
  }
  if (typeof val === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = processValue(v, k);
    }
    return res;
  }
  return val;
}

['n1', 'n2', 'n3'].forEach(lvl => {
  const filePath = path.join(__dirname, '..', 'src', 'data', `mimikara_${lvl}.json`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  const processed = processValue(data);

  // Ghi lại file json với 2 spaces indent
  const newContent = JSON.stringify(processed, null, 2);
  fs.writeFileSync(filePath, newContent, 'utf8');

  // Kiểm tra còn HTML entity nào không
  const remainingEntities = newContent.match(/&[a-zA-Z0-9#]+;/g) || [];
  console.log(`[OK] mimikara_${lvl}.json cleaned! Remaining entities:`, remainingEntities.length);
  if (remainingEntities.length > 0) {
    console.warn('  Remaining sample:', remainingEntities.slice(0, 10));
  }
});
