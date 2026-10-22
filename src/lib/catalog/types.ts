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

export type Photo = { group: PhotoGroup; caption: Text };

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
  areaRange: [number, number];
  subTypes: SubType[];
  finishings: Finishing[];
};
