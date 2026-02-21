/**
 * Testy jednostkowe dla client/src/utils/attractionTags.ts
 * Testuje: ATTRACTION_TAGS, getAttractionTagInfo, getAvailableAttractionTags
 */
import { describe, it, expect } from 'vitest';
import {
  ATTRACTION_TAGS,
  getAttractionTagInfo,
  getAvailableAttractionTags,
  type AttractionTag,
} from './attractionTags';

// ─────────────────────────────────────────────────────────────────────────────
// ATTRACTION_TAGS – stałe wartości
// ─────────────────────────────────────────────────────────────────────────────
describe('ATTRACTION_TAGS', () => {
  const expectedTags: AttractionTag[] = [
    'beauty',
    'cafe',
    'must_see',
    'accommodation',
    'nature',
    'airport',
    'food',
    'attraction',
    'train_station',
  ];

  it('zawiera wszystkie 9 zdefiniowanych tagów', () => {
    expect(Object.keys(ATTRACTION_TAGS)).toHaveLength(9);
  });

  it.each(expectedTags)('tag "%s" ma wymagane pola', (tag) => {
    const info = ATTRACTION_TAGS[tag];
    expect(info).toBeDefined();
    expect(info.value).toBe(tag);
    expect(info.label).toBeTruthy();
    expect(info.emoji).toBeTruthy();
    expect(info.bgLight).toBeTruthy();
    expect(info.textColor).toBeTruthy();
    expect(info.borderColor).toBeTruthy();
    expect(info.markerColor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('każdy tag ma unikalny markerColor (kolor mapy)', () => {
    const colors = Object.values(ATTRACTION_TAGS).map((t) => t.markerColor);
    const unique = new Set(colors);
    expect(unique.size).toBe(colors.length);
  });

  it('beauty ma różowy kolor markera', () => {
    expect(ATTRACTION_TAGS.beauty.markerColor).toBe('#db2777');
  });

  it('airport ma podniebny kolor markera', () => {
    expect(ATTRACTION_TAGS.airport.markerColor).toBe('#0ea5e9');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getAttractionTagInfo
// ─────────────────────────────────────────────────────────────────────────────
describe('getAttractionTagInfo', () => {
  it('zwraca informacje dla istniejącego tagu', () => {
    const info = getAttractionTagInfo('cafe');
    expect(info).not.toBeNull();
    expect(info?.value).toBe('cafe');
    expect(info?.label).toBe('Café');
  });

  it('zwraca null dla undefined', () => {
    expect(getAttractionTagInfo(undefined)).toBeNull();
  });

  it('zwraca null dla nieznanego tagu (type cast)', () => {
    const info = getAttractionTagInfo('unknown_tag' as AttractionTag);
    expect(info).toBeNull();
  });

  it('zwraca pełne informacje dla "must_see"', () => {
    const info = getAttractionTagInfo('must_see');
    expect(info?.label).toBe('Must See');
    expect(info?.emoji).toBe('📷');
    expect(info?.markerColor).toBe('#8b5cf6');
  });

  it('zwraca pełne informacje dla "train_station"', () => {
    const info = getAttractionTagInfo('train_station');
    expect(info?.label).toBe('Train Station');
  });

  it('zwraca pełne informacje dla "accommodation"', () => {
    const info = getAttractionTagInfo('accommodation');
    expect(info?.label).toBe('Accommodation');
    expect(info?.emoji).toBe('💤');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getAvailableAttractionTags
// ─────────────────────────────────────────────────────────────────────────────
describe('getAvailableAttractionTags', () => {
  it('zwraca tablicę z 9 tagami', () => {
    const tags = getAvailableAttractionTags();
    expect(tags).toHaveLength(9);
  });

  it('każdy element to obiekt z polem value, label, emoji', () => {
    const tags = getAvailableAttractionTags();
    for (const tag of tags) {
      expect(tag).toHaveProperty('value');
      expect(tag).toHaveProperty('label');
      expect(tag).toHaveProperty('emoji');
    }
  });

  it('zawiera wszystkie zdefiniowane wartości tagów', () => {
    const tags = getAvailableAttractionTags();
    const values = tags.map((t) => t.value);
    expect(values).toContain('beauty');
    expect(values).toContain('cafe');
    expect(values).toContain('must_see');
    expect(values).toContain('accommodation');
    expect(values).toContain('nature');
    expect(values).toContain('airport');
    expect(values).toContain('food');
    expect(values).toContain('attraction');
    expect(values).toContain('train_station');
  });

  it('zwraca nową tablicę za każdym wywołaniem (nie mutuje)', () => {
    const t1 = getAvailableAttractionTags();
    const t2 = getAvailableAttractionTags();
    expect(t1).not.toBe(t2); // different reference
    expect(t1).toEqual(t2);  // same content
  });
});
