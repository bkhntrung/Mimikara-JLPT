import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Volume2, 
  Star, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  CheckCircle2, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { speakJapanese, stopSpeech } from '../utils/audio';
import { formatRelatedRuby, formatExampleMeaning } from '../utils/text';

export default function DictionaryView({
  allWords,
  currentUnit,
  onSelectUnit,
  srsRecords,
  starredSet,
  onToggleStar,
  furiganaMode,
  soundSpeed
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'starred', 'new', 'learning', 'mastered'
  const [expandedId, setExpandedId] = useState(null);

  // Dọn dẹp âm thanh khi rời khỏi từ điển
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // Filter words
  const filteredWords = useMemo(() => {
    return allWords.filter(w => {
      // Unit filter
      if (currentUnit !== 0 && w.unit !== currentUnit) return false;

      // Status filter
      if (statusFilter === 'starred' && !starredSet.has(w.id)) return false;
      const stage = srsRecords[w.id]?.stage || 'new';
      if (statusFilter === 'new' && stage !== 'new') return false;
      if (statusFilter === 'learning' && (stage !== 'again' && stage !== 'hard')) return false;
      if (statusFilter === 'mastered' && (stage !== 'good' && stage !== 'easy')) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchKanji = w.word.toLowerCase().includes(q);
        const matchReading = w.reading.toLowerCase().includes(q);
        const matchHanviet = w.hanviet && w.hanviet.toLowerCase().includes(q);
        const matchMeaning = w.meanings?.some(m => m.toLowerCase().includes(q));
        const matchExample = w.examples?.some(e => e.japanese.includes(q) || e.meaning.toLowerCase().includes(q));
        if (!matchKanji && !matchReading && !matchHanviet && !matchMeaning && !matchExample) {
          return false;
        }
      }

      return true;
    });
  }, [allWords, currentUnit, statusFilter, searchTerm, starredSet, srsRecords]);

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const furiganaClass = furiganaMode === 'hide' ? 'furigana-hide' : furiganaMode === 'hover' ? 'furigana-hover' : '';

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      
      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        
        {/* Search Bar */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Kanji, Hiragana, Hán Việt hoặc nghĩa tiếng Việt..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Xóa
            </button>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Tất cả ({allWords.length})
          </button>

          <button
            onClick={() => setStatusFilter('starred')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
              statusFilter === 'starred'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Star className="w-3 h-3 fill-current" />
            <span>Yêu thích ({starredSet.size})</span>
          </button>

          <button
            onClick={() => setStatusFilter('mastered')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
              statusFilter === 'mastered'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Đã thuộc</span>
          </button>
        </div>

      </div>

      {/* Result stats bar */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-500">
        <span>Hiển thị <b>{filteredWords.length}</b> từ vựng</span>
        {currentUnit !== 0 && (
          <span>Đang lọc theo: <b>Unit {currentUnit}</b></span>
        )}
      </div>

      {/* Word List Table/Cards */}
      <div className="space-y-2">
        {filteredWords.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            Không tìm thấy từ vựng nào khớp với bộ lọc.
          </div>
        ) : (
          filteredWords.map((w) => {
            const isExpanded = expandedId === w.id;
            const isStarred = starredSet.has(w.id);
            const stage = srsRecords[w.id]?.stage || 'new';

            return (
              <div
                key={w.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 shadow-sm overflow-hidden transition-all duration-200 hover:border-indigo-300 dark:hover:border-indigo-700"
              >
                {/* Summary Row */}
                <div
                  onClick={() => toggleExpand(w.id)}
                  className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-400 w-10">
                      #{w.id}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakJapanese(w.word, soundSpeed);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span 
                          className={`font-japanese text-xl font-bold text-slate-800 dark:text-slate-100 ${furiganaClass}`}
                          dangerouslySetInnerHTML={{ __html: w.wordHtml || w.word }}
                        />
                        {w.hanviet && (
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {w.hanviet}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {w.reading}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300 text-right max-w-xs sm:max-w-md truncate">
                      {w.meanings?.join('; ')}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(w.id);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isStarred 
                            ? 'text-amber-500' 
                            : 'text-slate-300 hover:text-amber-500'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`} />
                      </button>

                      <div className="text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 space-y-4 animate-fadeIn">
                    
                    {/* Meanings */}
                    <div className="space-y-1">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Các nét nghĩa
                      </div>
                      <div className="space-y-1">
                        {w.meanings?.map((m, mi) => (
                          <div key={mi} className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center">
                              {mi + 1}
                            </span>
                            <span>{m}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Example Sentences */}
                    {w.examples?.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Ví dụ minh họa ({w.examples.length})
                        </div>
                        <div className="space-y-2.5">
                          {w.examples.map((ex, ei) => (
                            <div key={ei} className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                              <div className="flex items-start justify-between gap-3">
                                <div 
                                  className={`jp-sentence font-japanese text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed ${furiganaClass}`}
                                  dangerouslySetInnerHTML={{ __html: ex.rubyHtml || ex.japanese }}
                                />
                                <button
                                  onClick={() => speakJapanese(ex.japanese, soundSpeed)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg shrink-0 transition-colors"
                                >
                                  <Volume2 className="w-4 h-4" />
                                </button>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-300 italic">
                                {formatExampleMeaning(ex.meaning)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Related Words (Collocations, Synonyms, Antonyms, Compounds, Idioms, Notes) */}
                    {((w.related?.collocations?.length || 0) + 
                      (w.related?.compounds?.length || 0) + 
                      (w.related?.synonyms?.length || 0) + 
                      (w.related?.antonyms?.length || 0) + 
                      (w.related?.relatedWords?.length || 0) + 
                      (w.related?.idioms?.length || 0) + 
                      (w.related?.notes?.length || 0)) > 0 && (
                      <div className="space-y-2.5">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Từ liên quan, Cụm đi kèm & Từ ghép
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Collocations 連 */}
                          {w.related.collocations?.map((c, ci) => (
                            <div key={`col-${ci}`} className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-2.5">
                              <span className="px-2 py-0.5 rounded-lg font-bold text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 shrink-0 mt-1">
                                連 Đi kèm
                              </span>
                              <div className="space-y-1">
                                <div 
                                  className={`jp-sentence font-japanese text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed ${furiganaClass}`} 
                                  dangerouslySetInnerHTML={{ __html: formatRelatedRuby(c.rubyHtml || c.text, w.word, w.wordHtml, w.reading) }} 
                                />
                                <div className="text-sm text-slate-600 dark:text-slate-300">{c.meaning}</div>
                              </div>
                            </div>
                          ))}

                          {/* Compounds 合 */}
                          {w.related.compounds?.map((c, ci) => (
                            <div key={`c-${ci}`} className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5">
                              <span className="px-2 py-0.5 rounded-lg font-bold text-xs bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 shrink-0 mt-1">
                                合 Từ ghép
                              </span>
                              <div className="space-y-1">
                                <div 
                                  className={`jp-sentence font-japanese text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed ${furiganaClass}`} 
                                  dangerouslySetInnerHTML={{ __html: formatRelatedRuby(c.rubyHtml || c.text, w.word, w.wordHtml, w.reading) }} 
                                />
                                <div className="text-sm text-slate-600 dark:text-slate-300">{c.meaning}</div>
                              </div>
                            </div>
                          ))}

                          {/* Synonyms 類 */}
                          {w.related.synonyms?.map((s, si) => (
                            <div key={`s-${si}`} className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-start gap-2.5">
                              <span className="px-2 py-0.5 rounded-lg font-bold text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 shrink-0 mt-1">
                                類 Đồng nghĩa
                              </span>
                              <div className="space-y-1">
                                <div 
                                  className={`jp-sentence font-japanese text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed ${furiganaClass}`} 
                                  dangerouslySetInnerHTML={{ __html: formatRelatedRuby(s.rubyHtml || s.text, w.word, w.wordHtml, w.reading) }} 
                                />
                                <div className="text-sm text-slate-600 dark:text-slate-300">{s.meaning}</div>
                              </div>
                            </div>
                          ))}

                          {/* Antonyms 対 */}
                          {w.related.antonyms?.map((a, ai) => (
                            <div key={`a-${ai}`} className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5">
                              <span className="px-2 py-0.5 rounded-lg font-bold text-xs bg-rose-200 dark:bg-rose-800 text-rose-800 dark:text-rose-200 shrink-0 mt-1">
                                対 Trái nghĩa
                              </span>
                              <div className="space-y-1">
                                <div 
                                  className={`jp-sentence font-japanese text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed ${furiganaClass}`} 
                                  dangerouslySetInnerHTML={{ __html: formatRelatedRuby(a.rubyHtml || a.text, w.word, w.wordHtml, w.reading) }} 
                                />
                                <div className="text-sm text-slate-600 dark:text-slate-300">{a.meaning}</div>
                              </div>
                            </div>
                          ))}

                          {/* Related Words 関 */}
                          {w.related.relatedWords?.map((r, ri) => (
                            <div key={`rel-${ri}`} className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5">
                              <span className="px-2 py-0.5 rounded-lg font-bold text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 shrink-0 mt-1">
                                関 Liên quan
                              </span>
                              <div className="space-y-1">
                                <div 
                                  className={`jp-sentence font-japanese text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed ${furiganaClass}`} 
                                  dangerouslySetInnerHTML={{ __html: formatRelatedRuby(r.rubyHtml || r.text, w.word, w.wordHtml, w.reading) }} 
                                />
                                <div className="text-sm text-slate-600 dark:text-slate-300">{r.meaning}</div>
                              </div>
                            </div>
                          ))}

                          {/* Idioms 慣 */}
                          {w.related.idioms?.map((idm, idi) => (
                            <div key={`idm-${idi}`} className="p-3 rounded-2xl bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 flex items-start gap-2.5">
                              <span className="px-2 py-0.5 rounded-lg font-bold text-xs bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 shrink-0 mt-1">
                                慣 Quán ngữ
                              </span>
                              <div className="space-y-1">
                                <div 
                                  className={`jp-sentence font-japanese text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed ${furiganaClass}`} 
                                  dangerouslySetInnerHTML={{ __html: formatRelatedRuby(idm.rubyHtml || idm.text, w.word, w.wordHtml, w.reading) }} 
                                />
                                <div className="text-sm text-slate-600 dark:text-slate-300">{idm.meaning}</div>
                              </div>
                            </div>
                          ))}

                          {/* Notes ※ */}
                          {w.related.notes?.map((nte, ni) => (
                            <div key={`nte-${ni}`} className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
                              <span className="px-2 py-0.5 rounded-lg font-bold text-xs bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0 mt-1">
                                ※ Lưu ý
                              </span>
                              <div className="space-y-1">
                                <div 
                                  className={`jp-sentence font-japanese text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed ${furiganaClass}`} 
                                  dangerouslySetInnerHTML={{ __html: formatRelatedRuby(nte.rubyHtml || nte.text, w.word, w.wordHtml, w.reading) }} 
                                />
                                <div className="text-sm text-slate-600 dark:text-slate-300">{nte.meaning}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
