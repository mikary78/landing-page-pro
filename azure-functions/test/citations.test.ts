import { describe, expect, it } from 'vitest';
import { enforceSlideCitationsAndDeckSources } from '../src/lib/citations';

describe('citations (Plan B: deck-level sources schema)', () => {
  it('should always create deck sources schema when sources exist', () => {
    const slidesJson: any = {
      deckTitle: 'Test',
      slides: [{ title: 'S1', bullets: ['a'], speakerNotes: 'note' }],
    };

    const out = enforceSlideCitationsAndDeckSources(slidesJson, [
      { title: 'A', url: 'https://a.example' },
      { title: 'B', url: 'https://b.example' },
    ]);

    expect(Array.isArray(out.sources)).toBe(true);
    expect(out.sources).toEqual([
      { id: 1, title: 'A', url: 'https://a.example' },
      { id: 2, title: 'B', url: 'https://b.example' },
    ]);
    expect(out.slides[0].speakerNotes).toMatch(/\[\d+\]/);
    // sources slide is appended
    expect(out.slides[out.slides.length - 1].title).toBe('Sources');
    expect(Array.isArray(out.slides[out.slides.length - 1].bullets)).toBe(true);
  });

  it('should set deck sources to empty array and add Sources 안내 when sources are empty', () => {
    const slidesJson: any = {
      deckTitle: 'Test',
      slides: [{ title: 'S1', bullets: ['a'], speakerNotes: '' }],
    };

    const out = enforceSlideCitationsAndDeckSources(slidesJson, []);
    expect(Array.isArray(out.sources)).toBe(true);
    expect(out.sources).toEqual([]);
    expect(out.slides[0].speakerNotes).toMatch(/Sources\s*:/i);
    // sources slide is appended even when empty
    expect(out.slides[out.slides.length - 1].title).toBe('Sources');
  });

  it('should not append sources slide if already exists', () => {
    const slidesJson: any = {
      deckTitle: 'Test',
      slides: [
        { title: 'S1', bullets: ['a'], speakerNotes: 'note' },
        { title: 'Sources', bullets: ['x'], speakerNotes: 'already', visualHint: '' },
      ],
    };

    const out = enforceSlideCitationsAndDeckSources(slidesJson, [{ title: 'A', url: 'https://a.example' }]);
    const sourcesSlides = out.slides.filter((s: any) => (s.title || '').toLowerCase() === 'sources');
    expect(sourcesSlides.length).toBe(1);
  });
});

