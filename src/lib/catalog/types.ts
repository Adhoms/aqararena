import type {
  Amenity,
  AreaSlug,
  Currency,
  Finishing,
  InstallmentFrequency,
  PhotoGroup,
  ProjectStatus,
  PropertyCategory,
  SubType,
  UnitAvailability,
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

/** One home (or shop, or office) of a unit type, as the developer last reported it. */
export type Unit = {
  id: string;
  /** The unit type it belongs to (`Typology.code`). */
  typologyCode: string;
  building?: string;
  /** 0 is the ground floor. */
  floor?: number;
  number?: string;
  /** A key from ORIENTATIONS, or the developer's own wording. */
  orientation?: string;
  /** A key from UNIT_VIEWS, or the developer's own wording. */
  view?: string;
  /** The unit's own price; empty when the developer only publishes the type's starting price. */
  price?: number;
  availability: UnitAvailability;
};

/** A project's unit-by-unit inventory. `updated` is the ISO date of the newest change. */
export type ProjectUnits = { units: Unit[]; updated?: string };

/** The project's average price per m² on a day it changed. */
export type PricePoint = { date: string; perM2: number };

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
  /** Refundable amount to reserve a unit at launch (EOI), in the project's currency. */
  bookingFee?: number;
  /** The currency of every price of this project; EGP when not set (the demo data). */
  currency?: Currency;
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
  /** Average price per m² at each change, oldest first. Empty until prices have been recorded. */
  /** Demo data for the database seed only; the public site no longer shows or loads it. */
  priceHistory?: PricePoint[];
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
