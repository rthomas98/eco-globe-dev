/** Private drafts and published buyer demand. API validates lifecycle and ownership. */
export type WantedListingStatusCode = "draft" | "open" | "closed";
export type WantedListingFields = {
  title: string;
  materialTypeCode: string;
  quantity: number | null;
  quantityUnit: string | null;
  targetPricePerUnit: number | null;
  currencyCode: string | null;
  countryCode: string | null;
  stateProvince: string | null;
  notes: string | null;
  needByDate: string | null;
};
export type WantedListingDraftWrite = Pick<
  WantedListingFields,
  "title" | "materialTypeCode"
> &
  Partial<Omit<WantedListingFields, "title" | "materialTypeCode">> & {
    statusCode: "draft";
  };
export type WantedListingOpenWrite = Omit<
  WantedListingDraftWrite,
  "statusCode" | "quantity" | "countryCode"
> & {
  statusCode?: "open";
  quantity: number;
  countryCode: string;
};
export type WantedListingWrite =
  | WantedListingDraftWrite
  | WantedListingOpenWrite;
export type WantedListingPatch = Partial<WantedListingFields> & {
  statusCode?: WantedListingStatusCode;
  isOpen?: boolean;
};
export type PersistedWantedListing = WantedListingFields & {
  id: number;
  buyerCompanyId: number | null;
  buyerCompanyName: string | null;
  materialTypeName: string;
  statusCode: WantedListingStatusCode;
  isOpen: boolean;
  createdAt: string;
  responseCount: number;
  acceptedCount: number;
};
