// Helper functions for payment calculations

export interface CostItem {
  id?: number;
  cost: number;
  isPaid?: boolean;
}

export interface Stop {
  id?: number;
  accommodationPrice?: number;
  isPaid?: boolean;
  attractions?: Attraction[];
}

export interface Transport {
  id?: number;
  price: number;
  isPaid?: boolean;
}

export interface Attraction {
  id?: number;
  estimatedCost?: number;
  isPaid?: boolean;
}

/**
 * Calculate total estimated cost (all items, whether paid or not)
 */
export const calculateTotalCost = (
  stops: Stop[],
  transports: Transport[]
): number => {
  const stopsCost = stops.reduce((sum, stop) => sum + (stop.accommodationPrice || 0), 0);
  const attractionsCost = stops.reduce((sum, stop) => {
    const attrSum = stop.attractions?.reduce((s, a) => s + (a.estimatedCost || 0), 0) || 0;
    return sum + attrSum;
  }, 0);
  const transportsCost = transports.reduce((sum, t) => sum + t.price, 0);
  
  return stopsCost + attractionsCost + transportsCost;
};

/**
 * Calculate total paid amount
 */
export const calculatePaidAmount = (
  stops: Stop[],
  transports: Transport[]
): number => {
  const stopsPaid = stops.reduce((sum, stop) => {
    if (stop.isPaid && stop.accommodationPrice) {
      return sum + stop.accommodationPrice;
    }
    return sum;
  }, 0);

  const attractionsPaid = stops.reduce((sum, stop) => {
    const attrPaid = stop.attractions?.reduce((s, a) => {
      if (a.isPaid && a.estimatedCost) {
        return s + a.estimatedCost;
      }
      return s;
    }, 0) || 0;
    return sum + attrPaid;
  }, 0);

  const transportsPaid = transports.reduce((sum, t) => {
    if (t.isPaid) {
      return sum + t.price;
    }
    return sum;
  }, 0);

  return stopsPaid + attractionsPaid + transportsPaid;
};

/**
 * Calculate amount still due (estimated - paid)
 */
export const calculateAmountDue = (
  stops: Stop[],
  transports: Transport[]
): number => {
  const total = calculateTotalCost(stops, transports);
  const paid = calculatePaidAmount(stops, transports);
  return Math.max(0, total - paid);
};

/**
 * Get payment summary statistics
 */
export const getPaymentSummary = (
  stops: Stop[],
  transports: Transport[]
) => {
  const total = calculateTotalCost(stops, transports);
  const paid = calculatePaidAmount(stops, transports);
  const due = calculateAmountDue(stops, transports);
  const percentPaid = total > 0 ? (paid / total) * 100 : 0;

  return {
    total,
    paid,
    due,
    percentPaid: Math.round(percentPaid),
  };
};
