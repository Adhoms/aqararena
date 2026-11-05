import type {
  Amenity,
  AreaSlug,
  Finishing,
  InstallmentFrequency,
  PhotoGroup,
  ProjectStatus,
  PropertyCategory,
  SubType,
  ZoneKind,
} from "@/lib/property";

/** A text in both languages. */
export type Text = { ar: string; en: string };

export type Developer = {
  slug: string;
  name: Text;
  foundedYear?: number;
  about: Text;
  verified: boolean;
  /** Uploaded logo, when there is one. */
  logoUrl?: string;
  contacts: {
    hotline?: string;
    salesPhone?: string;
    whatsapp?: string;
    email?: string;
    website?: string;
    hqAddress?: Text;
  };
};

/** A clickable rectangle on the master plan, in percent of the plan's width/height. */
export type MasterPlanZone = {
  id: string;
  kind: ZoneKind;
  short: Text;
  name: Text;
  phase?: Text;
  description: Text;
  areaFeddan?: number;
  buildings?: number;
  units?: number;
  subTypes: SubType[];
  shape: { x: number; y: number; w: number; h: number };
};

export type Typology = {
  code: string;
  category: PropertyCategory;
  subType: SubType;
  name: Text;
  buaM2: number;
  bedrooms?: number;
  bathrooms?: number;
  gardenM2?: number;
  roofM2?: number;
  finishing: Finishing;
  priceFrom: number;
};

export type PaymentPlan = {
  name: Text;
  downPaymentPct: number;
  deliveryPaymentPct: number;
  years: number;
  frequency: InstallmentFrequency;
  cashDiscountPct?: number;
};

/** A project photo. `url` is set for uploaded photos; the demo data has none and draws art instead. */
export type Photo = { group: PhotoGroup; caption: Text; url?: string; width?: number; height?: number };

export type Project = {
  slug: string;
  developerSlug: string;
  areaSlug: AreaSlug;
  /** Where the project is, for the map. */
  location?: { lat: number; lng: number };
  name: Text;
  district: Text;
  description: Text;
  categories: PropertyCategory[];
  status: ProjectStatus;
  launchYear?: number;
  /** ISO date of the launch, when known. */
  launchDate?: string;
  /** Refundable amount to reserve a unit at launch (EOI), in EGP. */
  bookingFee?: number;
  /** Official brochure (PDF) from the developer. */
  brochureUrl?: string;
  deliveryYear: number;
  progressPct?: number;
  landFeddan?: number;
  greenPct?: number;
  unitsCount?: number;
  amenities: Amenity[];
  zones: MasterPlanZone[];
  typologies: Typology[];
  paymentPlans: PaymentPlan[];
  fees: { maintenancePct?: number; garageFee?: number; clubFee?: number };
  photos: Photo[];
  /** The picture for cards and the page top: the first exterior photo, else the first photo. */
  cover?: string;
  /** Uploaded master-plan image. */
  masterPlanUrl?: string;
  /** Uploaded floor plans and layout sketches. */
  floorPlans?: { url: string; caption: Text }[];
  distances: { place: Text; minutes: number }[];
  isFeatured: boolean;
  pricesUpdated?: string;
};

/** Figures derived from a project's unit types and plans, used on cards and in comparison. */
export type ProjectSummary = {
  startingPrice: number;
  avgPricePerM2: number;
  minDownPct: number;
  maxYears: number;
  maxCashDiscountPct: number;
  /** Lowest monthly equivalent for the cheapest unit across installment plans (0 when only cash). */
  minMonthly: number;
  /**
   * The cheapest way in: the cheapest unit on the plan with the lowest down payment. Cards show the
   * down payment in EGP next to the monthly figure of that same plan, so the two always belong together.
   * Both 0 when the project only sells for cash.
   */
  entryDown: number;
  entryMonthly: number;
  areaRange: [number, number];
  subTypes: SubType[];
  finishings: Finishing[];
};
