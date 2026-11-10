/**
 * Tiện ích xử lý văn bản, Ruby Furigana và Từ vựng liên quan
 */

/**
 * Chuẩn hóa và làm nổi bật từ gốc trong cụm từ liên quan (collocations) và từ ghép (compounds)
 * Thay thế ký hiệu viết tắt '―', '—' hoặc '＿' bằng từ gốc có gắn class màu nổi bật và ĐẦY ĐỦ FURIGANA
 * mà không làm vỡ hoặc ảnh hưởng đến các thẻ <ruby><rt> xung quanh.
 * 
 * @param {string} htmlOrText - Chuỗi HTML hoặc Text chứa cụm từ ghép
 * @param {string|Object} headWordOrObj - Từ gốc dạng chuỗi (ví dụ: '青春') hoặc object từ vựng
 * @param {string} [headWordHtml] - Chuỗi HTML có Ruby của từ gốc (nếu có)
 * @param {string} [headReading] - Cách đọc Hiragana của từ gốc (nếu có)
 * @returns {string} Chuỗi HTML đã được thay thế đẹp mắt kèm đầy đủ Furigana
 */
export function formatRelatedRuby(htmlOrText, headWordOrObj, headWordHtml, headReading) {
  if (!htmlOrText || typeof htmlOrText !== 'string') return '';
  if (!headWordOrObj) return htmlOrText;

  let rawWord = '';
  let customHtml = headWordHtml || '';
  let reading = headReading || '';

  if (typeof headWordOrObj === 'object' && headWordOrObj !== null) {
    rawWord = headWordOrObj.word || '';
    customHtml = headWordOrObj.wordHtml || customHtml;
    reading = headWordOrObj.reading || reading;
  } else if (typeof headWordOrObj === 'string') {
    rawWord = headWordOrObj;
  }

  const cleanHead = typeof rawWord === 'string'
    ? rawWord.replace(/\(.*?\)/g, '').replace(/^[～~]/, '').trim()
    : '';

  if (!cleanHead) return htmlOrText;

  // Xây dựng chuỗi hiển thị có Ruby cho từ gốc (rubyHead)
  let rubyHead = '';
  if (customHtml && customHtml.includes('<ruby>')) {
    rubyHead = customHtml;
  } else if (reading && /[\u4E00-\u9FAF]/.test(cleanHead)) {
    rubyHead = `<ruby>${cleanHead}<rp>（</rp><rt>${reading}</rt><rp>）</rp></ruby>`;
  } else {
    rubyHead = cleanHead;
  }

  const replacement = `<span class="text-indigo-600 dark:text-indigo-400 font-bold">${rubyHead}</span>`;

  let res = htmlOrText;

  // 1. Nếu chuỗi chứa ký hiệu thay thế (― U+2015, — U+2014, ＿ U+FF3F)
  if (/[―—＿]/.test(res)) {
    res = res.replace(/[―—＿]/g, replacement);
  } else if (rubyHead.includes('<ruby>') && /[\u4E00-\u9FAF]/.test(cleanHead) && res.includes(cleanHead)) {
    // 2. Nếu không có ký hiệu [―—＿], nhưng có chứa cleanHead (chữ Hán) nằm ngoài thẻ <ruby>
    const tokens = tokenizeRuby(res);
    res = tokens.map(tok => {
      if (tok.type === 'text' && tok.text.includes(cleanHead)) {
        return tok.text.split(cleanHead).join(replacement);
      }
      return tok.raw;
    }).join('');
  }

  return res;
}

/**
 * Tách và phân tích chuỗi HTML chứa thẻ <ruby> thành danh sách các Token
 */
export function tokenizeRuby(html) {
  if (!html || typeof html !== 'string') return [];
  const tokens = [];
  const regex = /<ruby>([\s\S]*?)<\/ruby>/gi;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      const text = html.slice(lastIndex, match.index);
      tokens.push({ type: 'text', raw: text, text });
    }
    const rubyContent = match[1];
    const rtMatch = rubyContent.match(/<rt>([\s\S]*?)<\/rt>/i);
    const rtText = rtMatch ? rtMatch[1] : '';
    const baseText = rubyContent.replace(/<rp>[\s\S]*?<\/rp>/gi, '').replace(/<rt>[\s\S]*?<\/rt>/gi, '').trim();
    tokens.push({ type: 'ruby', raw: match[0], text: baseText, reading: rtText, rubyContent });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < html.length) {
    const text = html.slice(lastIndex);
    tokens.push({ type: 'text', raw: text, text });
  }
  return tokens;
}

/**
 * Tạo câu khuyết ngữ cảnh (Cloze Deletion) có chứa đầy đủ thẻ Furigana <ruby>
 * Giữ nguyên 100% tất cả các thẻ <ruby> và Furigana của mọi chữ Hán xung quanh,
 * chỉ thay thế khối ruby của từ đích (hoặc từ đích ghép) thành ô khuyết 【 ？ 】
 * 
 * @param {string} rubyHtml - Chuỗi HTML chứa câu ví dụ có thẻ <ruby>
 * @param {string} plainJp - Chuỗi câu ví dụ tiếng Nhật dạng plain text
 * @param {string} word - Từ vựng đích cần tạo cloze
 * @param {string} reading - Cách đọc Hiragana của từ đích
 * @returns {Object} { clozeRubyHtml, solvedRubyHtml, targetHtml, hasMatch }
 */
export function makeRubyCloze(rubyHtml, plainJp, word, reading) {
  const cleanWord = typeof word === 'string' 
    ? word.replace(/\(.*?\)/g, '').replace(/^[～~]/, '').trim() 
    : '';

  const html = rubyHtml || plainJp || '';
  if (!html) {
    return {
      clozeRubyHtml: '',
      solvedRubyHtml: '',
      targetHtml: '',
      hasMatch: false
    };
  }

  const tokens = tokenizeRuby(html);

  // Xây dựng chuỗi văn bản thuần túy và ghi nhận vị trí index của từng token
  let fullPlainText = '';
  tokens.forEach(tok => {
    tok.start = fullPlainText.length;
    fullPlainText += tok.text;
    tok.end = fullPlainText.length;
  });

  let matchStart = -1;
  let matchEnd = -1;

  // 1. Khớp chính xác cleanWord trong chuỗi văn bản thuần túy
  if (cleanWord && fullPlainText.includes(cleanWord)) {
    matchStart = fullPlainText.indexOf(cleanWord);
    matchEnd = matchStart + cleanWord.length;
  }

  // 2. Khớp thể chia động từ hoặc tính từ (Stem match)
  if (matchStart === -1 && cleanWord.length > 1) {
    try {
      const escapedStem = cleanWord.slice(0, -1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const stemRegex = new RegExp(escapedStem + '([ぁ-んァ-ヶ]*)');
      const m = fullPlainText.match(stemRegex);
      if (m && m.index !== undefined) {
        matchStart = m.index;
        matchEnd = matchStart + m[0].length;
      }
    } catch (e) {}
  }

  // 3. Khớp theo reading trong thẻ ruby hoặc plain
  if (matchStart === -1 && reading) {
    const cleanReading = reading.replace(/\(.*?\)/g, '').trim();
    if (cleanReading) {
      for (const tok of tokens) {
        if (tok.type === 'ruby' && tok.reading && (tok.reading === cleanReading || tok.reading.includes(cleanReading))) {
          matchStart = tok.start;
          matchEnd = tok.end;
          break;
        }
      }
    }
  }

  // 4. Khớp thẻ ruby chứa cleanWord (ví dụ từ ghép)
  if (matchStart === -1 && cleanWord) {
    for (const tok of tokens) {
      if (tok.type === 'ruby' && tok.text.includes(cleanWord)) {
        matchStart = tok.start;
        matchEnd = tok.end;
        break;
      }
    }
  }

  if (matchStart === -1) {
    // Không tìm thấy từ trong câu ví dụ, trả về nguyên bản
    return {
      clozeRubyHtml: html,
      solvedRubyHtml: html,
      targetHtml: cleanWord,
      hasMatch: false
    };
  }

  // Mở rộng biên giới hạn nếu vị trí cắt cắt ngang qua một thẻ ruby
  // (ví dụ: từ đích là 世帯, nằm trong thẻ ruby <ruby>世帯数<rt>せたいすう</rt></ruby>)
  for (const tok of tokens) {
    if (tok.type === 'ruby') {
      if (tok.start < matchStart && matchStart < tok.end) {
        matchStart = tok.start;
      }
      if (tok.start < matchEnd && matchEnd < tok.end) {
        matchEnd = tok.end;
      }
    }
  }

  // Tái thiết lập các chuỗi HTML
  const clozeParts = [];
  const targetRawParts = [];
  let clozeInserted = false;

  for (const tok of tokens) {
    if (tok.end <= matchStart) {
      // Nằm hoàn toàn trước từ đích
      clozeParts.push(tok.raw);
    } else if (tok.start >= matchEnd) {
      // Nằm hoàn toàn sau từ đích
      clozeParts.push(tok.raw);
    } else {
      // Nằm giao hoặc bên trong từ đích
      if (tok.type === 'text') {
        const textStart = tok.start;
        const textEnd = tok.end;

        if (textStart < matchStart) {
          const beforePart = tok.text.slice(0, matchStart - textStart);
          clozeParts.push(beforePart);
        }

        const midStartInTok = Math.max(0, matchStart - textStart);
        const midEndInTok = Math.min(tok.text.length, matchEnd - textStart);
        if (midStartInTok < midEndInTok) {
          targetRawParts.push(tok.text.slice(midStartInTok, midEndInTok));
        }

        if (!clozeInserted) {
          clozeParts.push('<span class="cloze animate-pulse">【 ？ 】</span>');
          clozeInserted = true;
        }

        if (textEnd > matchEnd) {
          const afterPart = tok.text.slice(matchEnd - textStart);
          clozeParts.push(afterPart);
        }
      } else {
        // Token ruby nằm trong từ đích
        targetRawParts.push(tok.raw);
        if (!clozeInserted) {
          clozeParts.push('<span class="cloze animate-pulse">【 ？ 】</span>');
          clozeInserted = true;
        }
      }
    }
  }

  const targetHtml = targetRawParts.join('');
  const solvedRubyHtml = clozeParts.map(p => {
    if (p === '<span class="cloze animate-pulse">【 ？ 】</span>') {
      return `<span class="cloze-solved">${targetHtml}</span>`;
    }
    return p;
  }).join('');

  return {
    clozeRubyHtml: clozeParts.join(''),
    solvedRubyHtml,
    targetHtml,
    hasMatch: true
  };
}

/**
 * Giải mã an toàn toàn bộ HTML entities còn sót lại trong chuỗi văn bản
 * 
 * @param {string} str - Chuỗi cần làm sạch
 * @returns {string} Chuỗi văn bản thuần túy không chứa HTML entities
 */
export function cleanDisplayText(str) {
  if (!str || typeof str !== 'string') return '';

  return str
    .replace(/&lt;=&gt;/g, '⇔')
    .replace(/<=>/g, '⇔')
    .replace(/&lt;-&gt;/g, '⇔')
    .replace(/<->/g, '⇔')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&#49;/g, '1')
    .replace(/&#48;/g, '0')
    .replace(/&lt;/g, '〈')
    .replace(/&gt;/g, '〉');
}

/**
 * Định dạng câu dịch nghĩa của ví dụ minh họa
 * Nếu câu dịch đã bắt đầu bằng dấu ngoặc kép (", “, 「) thì giữ nguyên, không bọc thêm "" lặp lại.
 * Nếu chưa có thì mới bọc vào dấu ngoặc kép "..." trang nhã.
 * 
 * @param {string} str - Câu dịch thô
 * @returns {string} Chuỗi hiển thị hoàn hảo
 */
export function formatExampleMeaning(str) {
  if (!str || typeof str !== 'string') return '';
  const cleaned = cleanDisplayText(str).trim();
  if (!cleaned) return '';

  // Kiểm tra nếu đã bắt đầu bằng dấu ngoặc kép
  const startsWithQuote = /^["'“‘「『]/.test(cleaned);
  if (startsWithQuote) {
    return cleaned;
  }

  return `"${cleaned}"`;
}
