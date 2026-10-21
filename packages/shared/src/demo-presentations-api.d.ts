/** Approved public snapshots. These examples are never available for purchase. */
export interface DemoPresentation {
  id: string;
  kind: "seller" | "buyer";
  companyName: string;
  title: string;
  materialTypeCode: string;
  quantity: number | null;
  quantityUnitCode: string | null;
  price: number | null;
  currencyCode: string | null;
  priceUnitCode: string | null;
  priceEstimated: boolean;
  quantityEstimated: boolean;
}

export interface DemoPresentationList {
  ok: true;
  presentations: DemoPresentation[];
}
