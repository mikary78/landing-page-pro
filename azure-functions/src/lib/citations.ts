export interface NormalizedSource {
  title?: string;
  url: string;
}

export interface DeckSource {
  id: number;
  title?: string;
  url: string;
}

export function normalizeSources(sources: any[]): NormalizedSource[] {
  const out: NormalizedSource[] = [];
  for (const s of sources || []) {
    const url = s?.url;
    if (typeof url !== 'string' || !url.trim()) continue;
    const title = typeof s?.title === 'string' ? s.title : undefined;
    out.push({ title, url: url.trim() });
  }
  const seen = new Set<string>();
  return out.filter((s) => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
}

export function ensureSourcesSectionMarkdown(md: string, sources: NormalizedSource[]): string {
  const hasSourcesHeader = /\n##\s*Sources\s*\n/i.test(md) || /\n##\s*출처\s*\n/i.test(md);
  if (hasSourcesHeader) return md;

  const lines =
    sources.length > 0
      ? sources.map((s, i) => `- [${i + 1}] ${s.title ? `${s.title} - ` : ''}${s.url}`)
      : ['- (웹 검색 결과가 없습니다. `TAVILY_API_KEY` 또는 `SERPER_API_KEY` 설정을 확인하세요.)'];

  return `${md.trim()}\n\n## Sources\n${lines.join('\n')}\n`;
}

export function makeDeckSources(sources: NormalizedSource[]): DeckSource[] {
  return sources.map((s, i) => ({ id: i + 1, title: s.title, url: s.url }));
}

/**
 * Plan B:
 * - slides JSON에 deck-level `sources`를 항상 표준 스키마(DeckSource[])로 유지
 * - sources가 있으면 speakerNotes에 최소 1개 [n] 강제
 * - sources가 없어도 speakerNotes에 Sources 안내문 강제
 */
export function enforceSlideCitationsAndDeckSources(
  slidesJson: any,
  sources: NormalizedSource[]
): any {
  if (!slidesJson || typeof slidesJson !== 'object') return slidesJson;
  const slides = Array.isArray(slidesJson.slides) ? slidesJson.slides : [];
  if (!slides.length) {
    // slides가 없어도 deck sources 스키마는 유지
    slidesJson.sources = Array.isArray(slidesJson.sources) ? slidesJson.sources : makeDeckSources(sources);
    return slidesJson;
  }

  if (sources.length > 0) {
    for (const slide of slides) {
      if (!slide || typeof slide !== 'object') continue;
      const notes = typeof slide.speakerNotes === 'string' ? slide.speakerNotes : '';
      const hasCitation = /\[\d+\]/.test(notes);
      if (!hasCitation) {
        slide.speakerNotes = `${notes ? `${notes}\n\n` : ''}Sources: [1]`;
      }
    }
  } else {
    for (const slide of slides) {
      if (!slide || typeof slide !== 'object') continue;
      const notes = typeof slide.speakerNotes === 'string' ? slide.speakerNotes : '';
      const hasSourcesLine = /Sources\s*:/i.test(notes);
      if (!hasSourcesLine) {
        slide.speakerNotes = `${notes ? `${notes}\n\n` : ''}Sources: (웹 검색 결과 없음 - TAVILY_API_KEY/SERPER_API_KEY 미설정 가능)`;
      }
    }
  }

  // 항상 표준 스키마로 덮어쓰기(Plan B 핵심)
  slidesJson.sources = makeDeckSources(sources);

  // Sources 슬라이드(마지막 페이지) 자동 생성: 중복 방지
  const hasSourcesSlide = slides.some((s: any) => {
    const title = typeof s?.title === 'string' ? s.title.trim().toLowerCase() : '';
    return title === 'sources' || title === '출처';
  });

  if (!hasSourcesSlide) {
    const deckSources = slidesJson.sources as DeckSource[];
    const bullets =
      deckSources.length > 0
        ? deckSources.slice(0, 12).map((s) => `[${s.id}] ${s.title ? `${s.title} - ` : ''}${s.url}`)
        : ['웹 검색 결과가 없습니다. (TAVILY_API_KEY/SERPER_API_KEY 미설정 가능)'];

    slides.push({
      title: 'Sources',
      bullets,
      speakerNotes:
        deckSources.length > 0
          ? '출처 목록 페이지입니다. 앞 슬라이드의 [n] 인용은 본 페이지의 Sources와 매칭됩니다.'
          : '웹 검색 결과가 없어 출처를 표시할 수 없습니다.',
      visualHint: 'Clean list layout with small font and plenty of whitespace.',
    });
  }

  return slidesJson;
}

