export const OFFER_READER = Symbol('OFFER_READER');

export interface OfferSnapshot {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  status: string;
  deadline: string;
}

/** Puerto hacia offers-service. */
export interface OfferReader {
  getSnapshot(offerId: string): Promise<OfferSnapshot>;
}
