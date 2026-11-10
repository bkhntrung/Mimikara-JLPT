const fs = require('fs');
const path = require('path');

function fixDataset(lvl, fixes) {
  const filePath = path.join(__dirname, '..', 'src', 'data', `mimikara_${lvl}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  data.vocabulary.forEach(w => {
    if (fixes[w.id]) {
      fixes[w.id](w);
    }
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// 1. N1 Fixes (7 mục)
fixDataset('n1', {
  64: (w) => {
    // 循環: relatedWords[0] ガ回る、ガ巡る
    w.related.relatedWords[0].rubyHtml = 'ガ<ruby>回<rp>（</rp><rt>まわ</rt><rp>）</rp></ruby>る、ガ<ruby>巡<rp>（</rp><rt>めぐ</rt><rp>）</rp></ruby>る';
  },
  70: (w) => {
    // 面会: compounds[1] 病院など
    w.related.compounds[1].rubyHtml = w.related.compounds[1].rubyHtml.replace('※病院など', '※<ruby>病院<rp>（</rp><rt>びょういん</rt><rp>）</rp></ruby>など');
  },
  357: (w) => {
    // 反応: collocations[2] ＿がいい⇔悪い
    w.related.collocations[2].rubyHtml = '＿がいい ⇔ <ruby>悪<rp>（</rp><rt>わる</rt><rp>）</rp></ruby>い';
  },
  485: (w) => {
    // パック: compounds[2] ＿旅行
    w.related.compounds[2].rubyHtml = '＿<ruby>旅行<rp>（</rp><rt>りょこう</rt><rp>）</rp></ruby>、＿ツアー　（パッケージツアー）';
  },
  584: (w) => {
    // さほど: notes[1] 古い言い方
    w.related.notes[1].rubyHtml = 'さ＝それ　<ruby>少<rp>（</rp><rt>すこ</rt><rp>）</rp></ruby>し<ruby>古<rp>（</rp><rt>ふる</rt><rp>）</rp></ruby>い<ruby>言<rp>（</rp><rt>い</rt><rp>）</rp></ruby>い<ruby>方<rp>（</rp><rt>かた</rt><rp>）</rp></ruby>。';
  },
  600: (w) => {
    // 第一: notes[0] 言いたいときに使う
    w.related.notes[0].rubyHtml = w.related.notes[0].rubyHtml.replace('言いたいときに使う。', '<ruby>言<rp>（</rp><rt>い</rt><rp>）</rp></ruby>いたいときに<ruby>使<rp>（</rp><rt>つか</rt><rp>）</rp></ruby>う。');
  },
  609: (w) => {
    // 心地: compounds[4] 良い家
    w.related.compounds[4].rubyHtml = w.related.compounds[4].rubyHtml.replace('の良い<ruby>家', 'の<ruby>良<rp>（</rp><rt>よ</rt><rp>）</rp></ruby>い<ruby>家');
  }
});

// 2. N2 Fixes (8 mục)
fixDataset('n2', {
  50: (w) => {
    // 感情: collocations[0]
    w.related.collocations[0].rubyHtml = '＿を<ruby>出<rp>（</rp><rt>だ</rt><rp>）</rp></ruby>す ⇔ <ruby>抑<rp>（</rp><rt>おさ</rt><rp>）</rp></ruby>える、＿に<ruby>走<rp>（</rp><rt>はし</rt><rp>）</rp></ruby>る、＿<ruby>的<rp>（</rp><rt>てき</rt><rp>）</rp></ruby>になる';
  },
  125: (w) => {
    // 敷く: compounds[0] 敷布団、敷物、風呂敷
    w.related.compounds[0].rubyHtml = '<ruby>敷布団<rp>（</rp><rt>しきぶとん</rt><rp>）</rp></ruby>、<ruby>敷物<rp>（</rp><rt>しきもの</rt><rp>）</rp></ruby>、<ruby>風呂敷<rp>（</rp><rt>ふろしき</rt><rp>）</rp></ruby>';
  },
  191: (w) => {
    // 湿る: compounds[0] 湿り気
    w.related.compounds[0].rubyHtml = '<ruby>湿<rp>（</rp><rt>しめ</rt><rp>）</rp></ruby>り<ruby>気<rp>（</rp><rt>け</rt><rp>）</rp></ruby>、<ruby>湿<rp>（</rp><rt>しめ</rt><rp>）</rp></ruby>っぽい';
  },
  208: (w) => {
    // 関わる: synonyms[0] & notes[0]
    w.related.synonyms[0].rubyHtml = '<ruby>関係<rp>（</rp><rt>かんけい</rt><rp>）</rp></ruby>する、<ruby>関係<rp>（</rp><rt>かんけい</rt><rp>）</rp></ruby>がある';
    w.related.notes[0].rubyHtml = '<ruby>関<rp>（</rp><rt>かか</rt><rp>）</rp></ruby>わり→＿がある ⇔ ない';
  },
  231: (w) => {
    // 貧しい: antonyms[0] 裕福な
    w.related.antonyms[0].rubyHtml = '<ruby>豊<rp>（</rp><rt>ゆた</rt><rp>）</rp></ruby>かな、<ruby>裕福<rp>（</rp><rt>ゆうふく</rt><rp>）</rp></ruby>な';
  },
  656: (w) => {
    // 増大: relatedWords[0] 増加
    w.related.relatedWords[0].rubyHtml = '<ruby>増加<rp>（</rp><rt>ぞうか</rt><rp>）</rp></ruby>';
  },
  946: (w) => {
    // 性能: collocations[0] 悪い
    w.related.collocations[0].rubyHtml = '＿がいい ⇔ <ruby>悪<rp>（</rp><rt>わる</rt><rp>）</rp></ruby>い、＿が<ruby>高<rp>（</rp><rt>たか</rt><rp>）</rp></ruby>い、＿が<ruby>高<rp>（</rp><rt>たか</rt><rp>）</rp></ruby>まる、＿を<ruby>高<rp>（</rp><rt>たか</rt><rp>）</rp></ruby>める';
  }
});

// 3. N3 Fixes (6 mục)
fixDataset('n3', {
  281: (w) => {
    // 大変な: idioms[0] 目に遭う
    w.related.idioms[0].rubyHtml = '＿<ruby>目<rp>（</rp><rt>め</rt><rp>）</rp></ruby>に<ruby>遭<rp>（</rp><rt>あ</rt><rp>）</rp></ruby>う';
  },
  388: (w) => {
    // 近道: relatedWords[0] 回り道
    w.related.relatedWords[0].rubyHtml = '<ruby>回<rp>（</rp><rt>まわ</rt><rp>）</rp></ruby>り<ruby>道<rp>（</rp><rt>みち</rt><rp>）</rp></ruby>';
  },
  405: (w) => {
    // 西洋: compounds[0] & relatedWords[0]
    w.related.compounds[0].rubyHtml = '＿<ruby>人<rp>（</rp><rt>じん</rt><rp>）</rp></ruby>、＿<ruby>風<rp>（</rp><rt>ふう</rt><rp>）</rp></ruby>、＿<ruby>文化<rp>（</rp><rt>ぶんか</rt><rp>）</rp></ruby>、＿<ruby>料理<rp>（</rp><rt>りょうり</rt><rp>）</rp></ruby>';
    w.related.relatedWords[0].rubyHtml = 'アジア、<ruby>欧米<rp>（</rp><rt>おうべい</rt><rp>）</rp></ruby>';
  },
  562: (w) => {
    // 硬い/固い: idioms[0] 口が＿
    w.related.idioms[0].rubyHtml = '<ruby>頭<rp>（</rp><rt>あたま</rt><rp>）</rp></ruby>が＿、<ruby>口<rp>（</rp><rt>くち</rt><rp>）</rp></ruby>が＿';
  },
  585: (w) => {
    // 可能な: compounds[0]
    w.related.compounds[0].rubyHtml = '<ruby>可能性<rp>（</rp><rt>かのうせい</rt><rp>）</rp></ruby>→　＿が｛ある／<ruby>高<rp>（</rp><rt>たか</rt><rp>）</rp></ruby>い／<ruby>大<rp>（</rp><rt>おお</rt><rp>）</rp></ruby>きい｝ ⇔ ｛ない／<ruby>低<rp>（</rp><rt>ひく</rt><rp>）</rp></ruby>い／<ruby>小<rp>（</rp><rt>ちい</rt><rp>）</rp></ruby>さい｝';
  }
});

console.log('[DONE] 21 items in N1, N2, N3 updated successfully!');
