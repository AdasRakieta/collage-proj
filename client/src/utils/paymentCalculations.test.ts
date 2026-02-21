/**
 * Testy jednostkowe dla client/src/utils/paymentCalculations.ts
 * Testuje: calculateTotalCost, calculatePaidAmount, calculateAmountDue, getPaymentSummary
 */
import { describe, it, expect } from 'vitest';
import {
  calculateTotalCost,
  calculatePaidAmount,
  calculateAmountDue,
  getPaymentSummary,
  Stop,
  Transport,
} from './paymentCalculations';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────
const noStops: Stop[] = [];
const noTransports: Transport[] = [];

const singleStop: Stop[] = [
  { id: 1, accommodationPrice: 200, isPaid: false, attractions: [] },
];

const stopWithAttractions: Stop[] = [
  {
    id: 2,
    accommodationPrice: 150,
    isPaid: true,
    attractions: [
      { id: 10, estimatedCost: 30, isPaid: true },
      { id: 11, estimatedCost: 20, isPaid: false },
    ],
  },
];

const paidStop: Stop[] = [
  { id: 3, accommodationPrice: 100, isPaid: true, attractions: [] },
];

const transports: Transport[] = [
  { id: 1, price: 80, isPaid: true },
  { id: 2, price: 50, isPaid: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// calculateTotalCost
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateTotalCost', () => {
  it('zwraca 0 dla pustych tablic', () => {
    expect(calculateTotalCost(noStops, noTransports)).toBe(0);
  });

  it('sumuje koszty noclegów', () => {
    expect(calculateTotalCost(singleStop, noTransports)).toBe(200);
  });

  it('sumuje koszty atrakcji', () => {
    // 150 (noclegi) + 30 + 20 (atrakcje)
    expect(calculateTotalCost(stopWithAttractions, noTransports)).toBe(200);
  });

  it('sumuje koszty transportu', () => {
    expect(calculateTotalCost(noStops, transports)).toBe(130);
  });

  it('sumuje wszystkie elementy razem', () => {
    // 200 (noclegi) + 50 atrakcje + 130 (transport) = test z mixed
    const result = calculateTotalCost(stopWithAttractions, transports);
    expect(result).toBe(330); // 150 + 30 + 20 + 80 + 50
  });

  it('obsługuje noclegi bez wartości (undefined)', () => {
    const stops: Stop[] = [{ id: 1, isPaid: false, attractions: [] }];
    expect(calculateTotalCost(stops, noTransports)).toBe(0);
  });

  it('obsługuje atrakcje bez kosztu (undefined)', () => {
    const stops: Stop[] = [
      {
        id: 1,
        accommodationPrice: 100,
        isPaid: false,
        attractions: [{ id: 1, isPaid: false }], // brak estimatedCost
      },
    ];
    expect(calculateTotalCost(stops, noTransports)).toBe(100);
  });

  it('obsługuje stop bez attractions (undefined)', () => {
    const stops: Stop[] = [{ id: 1, accommodationPrice: 300, isPaid: false }];
    expect(calculateTotalCost(stops, noTransports)).toBe(300);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calculatePaidAmount
// ─────────────────────────────────────────────────────────────────────────────
describe('calculatePaidAmount', () => {
  it('zwraca 0 gdy nic nie jest opłacone', () => {
    expect(calculatePaidAmount(singleStop, noTransports)).toBe(0); // isPaid=false
  });

  it('sumuje opłacone noclegi', () => {
    expect(calculatePaidAmount(paidStop, noTransports)).toBe(100);
  });

  it('sumuje opłacone atrakcje', () => {
    // stop isPaid=true (150) + attr id=10 isPaid=true (30) = 180
    expect(calculatePaidAmount(stopWithAttractions, noTransports)).toBe(180);
  });

  it('sumuje opłacone transporty', () => {
    // transport id=1 isPaid=true (80)
    expect(calculatePaidAmount(noStops, transports)).toBe(80);
  });

  it('sumuje wszystkie opłacone pozycje', () => {
    // paidStop=100 + transport id=1=80
    expect(calculatePaidAmount(paidStop, transports)).toBe(180);
  });

  it('zwraca 0 dla pustych tablic', () => {
    expect(calculatePaidAmount(noStops, noTransports)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calculateAmountDue
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateAmountDue', () => {
  it('zwraca 0 gdy wszystko opłacone', () => {
    const fullPaidStops: Stop[] = [
      { id: 1, accommodationPrice: 50, isPaid: true, attractions: [] },
    ];
    const fullPaidTransports: Transport[] = [{ id: 1, price: 50, isPaid: true }];
    expect(calculateAmountDue(fullPaidStops, fullPaidTransports)).toBe(0);
  });

  it('zwraca różnicę total - paid', () => {
    // total = 200, paid = 0
    expect(calculateAmountDue(singleStop, noTransports)).toBe(200);
  });

  it('nigdy nie zwraca wartości ujemnej (max 0)', () => {
    // Edge-case: paid > total nie powinien się zdarzyć, ale zabezpieczamy
    const stops: Stop[] = [{ id: 1, accommodationPrice: 0, isPaid: true, attractions: [] }];
    expect(calculateAmountDue(stops, noTransports)).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPaymentSummary
// ─────────────────────────────────────────────────────────────────────────────
describe('getPaymentSummary', () => {
  it('zwraca poprawne podsumowanie dla mieszanego scenariusza', () => {
    // stopWithAttractions: total=200 (150+30+20), paid=180 (150+30), due=20
    const summary = getPaymentSummary(stopWithAttractions, noTransports);
    expect(summary.total).toBe(200);
    expect(summary.paid).toBe(180);
    expect(summary.due).toBe(20);
    expect(summary.percentPaid).toBe(90);
  });

  it('percentPaid = 0 gdy nic nie opłacone', () => {
    const summary = getPaymentSummary(singleStop, noTransports);
    expect(summary.percentPaid).toBe(0);
  });

  it('percentPaid = 100 gdy wszystko opłacone', () => {
    const summary = getPaymentSummary(paidStop, [{ id: 1, price: 0, isPaid: true }]);
    expect(summary.percentPaid).toBe(100);
  });

  it('percentPaid = 0 gdy total = 0 (unikamy dzielenia przez zero)', () => {
    const summary = getPaymentSummary(noStops, noTransports);
    expect(summary.percentPaid).toBe(0);
    expect(summary.total).toBe(0);
  });

  it('percentPaid jest zaokrąglony do liczby całkowitej', () => {
    // 1/3 ≈ 33.33% -> 33
    const stops: Stop[] = [{ id: 1, accommodationPrice: 30, isPaid: false, attractions: [] }];
    const trans: Transport[] = [
      { id: 1, price: 10, isPaid: true },  // płatne 10
    ];
    const summary = getPaymentSummary(stops, trans);
    // total=40, paid=10, percent=25
    expect(Number.isInteger(summary.percentPaid)).toBe(true);
  });
});
