/**
 * Builds an Excel file (the /admin/import format) with real Egyptian projects for a trial run.
 *
 *   npx tsx scripts/trial-projects.ts out.xlsx
 *
 * Data gathered from public listing sites in November 2026. Prices, unit sizes, delivery
 * years and map positions are approximate and NOT confirmed by the developers, so every project
 * says so in its description and no developer phone numbers are included. Replace these rows
 * with the developers' own data (portal or import) before launch.
 */
import ExcelJS from "exceljs";
import { SHEETS } from "../src/lib/admin/import/columns";

type Row = {
  dev: [ar: string, en: string];
  name: [ar: string, en: string];
  area: string;
  district: [ar: string, en: string];
  at: [lat: number, lng: number];
  status: "إطلاق جديد" | "قيد الإنشاء" | "جاهز للاستلام";
  delivery: number;
  category: "سكني" | "ساحلي وفندقي";
  unit: { type: string; bua: number; price: number; finishing: string };
  plan: { down: number; years: number; freq?: string };
  source: string;
};

const NOTE_AR = "بيانات تجريبية مجمّعة من مواقع عقارية عامة (نوفمبر 2026). السعر والمساحة وموعد التسليم والموقع على الخريطة تقريبية ولم يؤكدها المطور.";
const NOTE_EN = "Trial data gathered from public property sites (November 2026). Price, size, delivery and map position are approximate and not confirmed by the developer.";

const ROWS: Row[] = [
  // New Cairo
  { dev: ["ماونتن فيو", "Mountain View"], name: ["ماونتن فيو آي سيتي القاهرة الجديدة", "Mountain View iCity New Cairo"], area: "القاهرة الجديدة", district: ["التجمع الخامس", "Fifth Settlement"], at: [30.048, 31.531], status: "قيد الإنشاء", delivery: 2028, category: "سكني", unit: { type: "شقق", bua: 130, price: 12_000_000, finishing: "نصف تشطيب" }, plan: { down: 5, years: 9 }, source: "flatandvilla.com, gprproperty.com" },
  { dev: ["ماونتن فيو", "Mountain View"], name: ["ماونتن فيو هايد بارك", "Mountain View Hyde Park"], area: "القاهرة الجديدة", district: ["التجمع الخامس", "Fifth Settlement"], at: [30.005, 31.462], status: "قيد الإنشاء", delivery: 2028, category: "سكني", unit: { type: "شقق", bua: 160, price: 19_900_000, finishing: "نصف تشطيب" }, plan: { down: 20, years: 7 }, source: "flatandvilla.com" },
  { dev: ["هايد بارك للتطوير العقاري", "Hyde Park Developments"], name: ["هايد بارك القاهرة الجديدة", "Hyde Park New Cairo"], area: "القاهرة الجديدة", district: ["التجمع الخامس", "Fifth Settlement"], at: [29.996, 31.447], status: "قيد الإنشاء", delivery: 2029, category: "سكني", unit: { type: "شقق", bua: 140, price: 10_000_000, finishing: "نصف تشطيب" }, plan: { down: 5, years: 8 }, source: "egyprop.com, r1-properties.com" },
  { dev: ["بالم هيلز للتعمير", "Palm Hills Developments"], name: ["بالم هيلز القاهرة الجديدة", "Palm Hills New Cairo"], area: "القاهرة الجديدة", district: ["طريق القاهرة السويس", "Cairo–Suez Road"], at: [30.072, 31.612], status: "قيد الإنشاء", delivery: 2029, category: "سكني", unit: { type: "شقق", bua: 135, price: 8_600_000, finishing: "نصف تشطيب" }, plan: { down: 5, years: 8 }, source: "realestate-capsule.com" },
  // Mostakbal City
  { dev: ["بالم هيلز للتعمير", "Palm Hills Developments"], name: ["كابيتال جاردنز", "Capital Gardens"], area: "مدينة المستقبل", district: ["مستقبل سيتي", "Mostakbal City"], at: [30.112, 31.694], status: "قيد الإنشاء", delivery: 2028, category: "سكني", unit: { type: "شقق", bua: 110, price: 5_750_000, finishing: "نصف تشطيب" }, plan: { down: 5, years: 8 }, source: "compoundgate.com" },
  { dev: ["تطوير مصر", "Tatweer Misr"], name: ["بلوم فيلدز", "Bloomfields"], area: "مدينة المستقبل", district: ["مستقبل سيتي", "Mostakbal City"], at: [30.136, 31.69], status: "قيد الإنشاء", delivery: 2028, category: "سكني", unit: { type: "شقق", bua: 115, price: 5_800_000, finishing: "تشطيب كامل" }, plan: { down: 5, years: 11 }, source: "realestate-capsule.com" },
  { dev: ["تطوير مصر", "Tatweer Misr"], name: ["سينز", "Scenes"], area: "مدينة المستقبل", district: ["مستقبل سيتي", "Mostakbal City"], at: [30.128, 31.707], status: "إطلاق جديد", delivery: 2030, category: "سكني", unit: { type: "تاون هاوس", bua: 200, price: 12_850_000, finishing: "نصف تشطيب" }, plan: { down: 5, years: 8 }, source: "newcairocompounds.com, shary.com.eg" },
  { dev: ["حسن علام للعقارات", "Hassan Allam Properties"], name: ["بارك سنترال", "Park Central"], area: "مدينة المستقبل", district: ["مستقبل سيتي", "Mostakbal City"], at: [30.119, 31.662], status: "قيد الإنشاء", delivery: 2029, category: "سكني", unit: { type: "شقق", bua: 120, price: 7_600_000, finishing: "نصف تشطيب" }, plan: { down: 5, years: 10 }, source: "realestate-capsule.com" },
  { dev: ["مدينة مصر", "Madinet Masr"], name: ["ذا باترفلاي", "The Butterfly"], area: "مدينة المستقبل", district: ["مستقبل سيتي", "Mostakbal City"], at: [30.105, 31.676], status: "قيد الإنشاء", delivery: 2029, category: "سكني", unit: { type: "شقق", bua: 90, price: 3_500_000, finishing: "نصف تشطيب" }, plan: { down: 1.5, years: 12 }, source: "realestate-capsule.com" },
  { dev: ["ذا لاند ديفلوبرز", "The Land Developers (TLD)"], name: ["كوكون", "Cocoon"], area: "مدينة المستقبل", district: ["مستقبل سيتي", "Mostakbal City"], at: [30.143, 31.676], status: "إطلاق جديد", delivery: 2030, category: "سكني", unit: { type: "فيلات", bua: 185, price: 21_000_000, finishing: "نصف تشطيب" }, plan: { down: 10, years: 10 }, source: "newcairocompounds.com" },
  // Sheikh Zayed
  { dev: ["سوديك", "SODIC"], name: ["أليجريا", "Allegria"], area: "الشيخ زايد", district: ["طريق مصر الإسكندرية الصحراوي", "Cairo–Alex Desert Road"], at: [30.072, 30.939], status: "جاهز للاستلام", delivery: 2027, category: "سكني", unit: { type: "فيلات", bua: 300, price: 25_500_000, finishing: "نصف تشطيب" }, plan: { down: 5, years: 8 }, source: "bemarker.net, shary.eg" },
  { dev: ["سوديك", "SODIC"], name: ["سيكس ويست", "Six West"], area: "الشيخ زايد", district: ["الشيخ زايد", "Sheikh Zayed"], at: [30.041, 30.918], status: "قيد الإنشاء", delivery: 2029, category: "سكني", unit: { type: "شقق", bua: 233, price: 44_275_000, finishing: "تشطيب كامل" }, plan: { down: 10, years: 10 }, source: "masharf.com" },
  { dev: ["أورا للتطوير", "Ora Developers"], name: ["زد ويست", "ZED West"], area: "الشيخ زايد", district: ["الشيخ زايد", "Sheikh Zayed"], at: [30.047, 30.983], status: "قيد الإنشاء", delivery: 2030, category: "سكني", unit: { type: "شقق", bua: 120, price: 9_000_000, finishing: "تشطيب كامل" }, plan: { down: 10, years: 5 }, source: "masharf.com" },
  // 6th of October
  { dev: ["أوراسكوم للتنمية", "Orascom Development"], name: ["أو ويست", "O West"], area: "6 أكتوبر", district: ["طريق الواحات", "Wahat Road"], at: [29.978, 30.905], status: "قيد الإنشاء", delivery: 2029, category: "سكني", unit: { type: "شقق", bua: 120, price: 7_330_000, finishing: "تشطيب كامل" }, plan: { down: 5, years: 9 }, source: "grandeur-spaces.com" },
  { dev: ["إم سكويرد", "M Squared"], name: ["31 ويست", "31 West"], area: "6 أكتوبر", district: ["6 أكتوبر", "6th of October"], at: [30.004, 30.968], status: "إطلاق جديد", delivery: 2030, category: "سكني", unit: { type: "شقق", bua: 150, price: 13_237_120, finishing: "نصف تشطيب" }, plan: { down: 5, years: 10 }, source: "masharf.com" },
  // New Capital
  { dev: ["التعمير العربية", "Al Tameer Arabian"], name: ["ريفان", "Rivan"], area: "العاصمة الإدارية", district: ["R7", "R7"], at: [30.012, 31.731], status: "قيد الإنشاء", delivery: 2028, category: "سكني", unit: { type: "شقق", bua: 110, price: 4_225_000, finishing: "نصف تشطيب" }, plan: { down: 10, years: 12 }, source: "aqarpocket.com" },
  { dev: ["أرتال للتطوير", "Artal Development"], name: ["بلاتو", "Plato"], area: "العاصمة الإدارية", district: ["R8", "R8"], at: [30.025, 31.758], status: "قيد الإنشاء", delivery: 2028, category: "سكني", unit: { type: "شقق", bua: 85, price: 2_275_000, finishing: "نصف تشطيب" }, plan: { down: 5, years: 12 }, source: "realestate-capsule.com" },
  // North Coast
  { dev: ["إعمار مصر", "Emaar Misr"], name: ["مراسي", "Marassi"], area: "الساحل الشمالي", district: ["سيدي عبد الرحمن", "Sidi Abdel Rahman"], at: [30.962, 28.806], status: "جاهز للاستلام", delivery: 2027, category: "ساحلي وفندقي", unit: { type: "شاليهات", bua: 100, price: 8_000_000, finishing: "تشطيب كامل" }, plan: { down: 10, years: 7 }, source: "egyproperty-eg.com" },
  { dev: ["أورا للتطوير", "Ora Developers"], name: ["سيلفر ساندز", "Silversands"], area: "الساحل الشمالي", district: ["رأس الحكمة", "Ras El Hekma"], at: [31.152, 27.726], status: "قيد الإنشاء", delivery: 2028, category: "ساحلي وفندقي", unit: { type: "شاليهات", bua: 110, price: 9_700_000, finishing: "تشطيب كامل" }, plan: { down: 5, years: 10, freq: "نصف سنوي" }, source: "compoundgate.com" },
  { dev: ["بالم هيلز للتعمير", "Palm Hills Developments"], name: ["هاسيندا ووترز", "Hacienda Waters"], area: "الساحل الشمالي", district: ["رأس الحكمة", "Ras El Hekma"], at: [31.177, 27.867], status: "إطلاق جديد", delivery: 2030, category: "ساحلي وفندقي", unit: { type: "شاليهات", bua: 110, price: 10_925_000, finishing: "تشطيب كامل" }, plan: { down: 5, years: 8 }, source: "compoundgate.com" },
  // Ain Sokhna
  { dev: ["تطوير مصر", "Tatweer Misr"], name: ["إل مونتي جلالة", "Il Monte Galala"], area: "العين السخنة", district: ["الجلالة", "Galala"], at: [29.458, 32.392], status: "قيد الإنشاء", delivery: 2027, category: "ساحلي وفندقي", unit: { type: "شاليهات", bua: 100, price: 7_950_000, finishing: "تشطيب كامل" }, plan: { down: 5, years: 10 }, source: "realestate.eg, masharf.com" },
  { dev: ["لافيستا للتطوير", "La Vista Developments"], name: ["لافيستا جاردنز", "La Vista Gardens"], area: "العين السخنة", district: ["العين السخنة", "Ain Sokhna"], at: [29.598, 32.342], status: "جاهز للاستلام", delivery: 2027, category: "ساحلي وفندقي", unit: { type: "شاليهات", bua: 120, price: 10_500_000, finishing: "تشطيب كامل" }, plan: { down: 10, years: 8 }, source: "ain-sokhna-developments.com (old listing)" },
  { dev: ["مدار للتطوير", "Madaar Development"], name: ["أزها", "Azha"], area: "العين السخنة", district: ["العين السخنة", "Ain Sokhna"], at: [29.54, 32.37], status: "قيد الإنشاء", delivery: 2028, category: "ساحلي وفندقي", unit: { type: "شاليهات", bua: 120, price: 13_900_000, finishing: "تشطيب كامل" }, plan: { down: 5, years: 9 }, source: "ain-sokhna-developments.com (old listing)" },
];

async function main() {
  const out = process.argv[2] ?? "trial-projects.xlsx";
  const wb = new ExcelJS.Workbook();
  const sheet = (key: string) => {
    const def = SHEETS.find((s) => s.key === key)!;
    const ws = wb.addWorksheet(def.name);
    ws.addRow(def.columns.map((c) => c.header));
    return (values: Record<string, unknown>) => ws.addRow(def.columns.map((c) => values[c.key] ?? null));
  };
  const dev = sheet("developers");
  const proj = sheet("projects");
  const typ = sheet("typologies");
  const plan = sheet("plans");

  const seen = new Set<string>();
  for (const r of ROWS) {
    if (!seen.has(r.dev[1])) {
      seen.add(r.dev[1]);
      dev({ nameAr: r.dev[0], nameEn: r.dev[1], verified: "لا" });
    }
    proj({
      developer: r.dev[1],
      nameAr: r.name[0],
      nameEn: r.name[1],
      area: r.area,
      districtAr: r.district[0],
      districtEn: r.district[1],
      status: r.status,
      deliveryDate: r.delivery,
      categories: r.category,
      latitude: r.at[0],
      longitude: r.at[1],
      descriptionAr: `${NOTE_AR} المصدر: ${r.source}.`,
      descriptionEn: `${NOTE_EN} Source: ${r.source}.`,
      published: "نعم",
      isFeatured: "لا",
    });
    typ({
      project: r.name[1],
      code: "T-1",
      subType: r.unit.type,
      category: r.category,
      finishing: r.unit.finishing,
      buaM2: r.unit.bua,
      priceFrom: r.unit.price,
    });
    plan({
      project: r.name[1],
      downPaymentPct: r.plan.down,
      years: r.plan.years,
      frequency: r.plan.freq ?? "ربع سنوي",
      nameAr: `${r.plan.down}% مقدم على ${r.plan.years} سنين`,
    });
  }
  await wb.xlsx.writeFile(out);
  console.log(`${ROWS.length} projects, ${seen.size} developers → ${out}`);
}

main();
