import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// The 13 official administrative regions of Saudi Arabia, each with its
// most populous cities — used to populate city/region pickers app-wide.
const REGIONS: Array<{
  nameEn: string;
  nameAr: string;
  cities: Array<{ nameEn: string; nameAr: string }>;
}> = [
  {
    nameEn: "Riyadh",
    nameAr: "الرياض",
    cities: [
      { nameEn: "Riyadh", nameAr: "الرياض" },
      { nameEn: "Al Kharj", nameAr: "الخرج" },
      { nameEn: "Al Diriyah", nameAr: "الدرعية" },
      { nameEn: "Al Majma'ah", nameAr: "المجمعة" },
      { nameEn: "Dawadmi", nameAr: "الدوادمي" },
    ],
  },
  {
    nameEn: "Makkah",
    nameAr: "مكة المكرمة",
    cities: [
      { nameEn: "Jeddah", nameAr: "جدة" },
      { nameEn: "Makkah", nameAr: "مكة المكرمة" },
      { nameEn: "Taif", nameAr: "الطائف" },
      { nameEn: "Rabigh", nameAr: "رابغ" },
      { nameEn: "Al Qunfudhah", nameAr: "القنفذة" },
    ],
  },
  {
    nameEn: "Madinah",
    nameAr: "المدينة المنورة",
    cities: [
      { nameEn: "Madinah", nameAr: "المدينة المنورة" },
      { nameEn: "Yanbu", nameAr: "ينبع" },
      { nameEn: "Al Ula", nameAr: "العلا" },
    ],
  },
  {
    nameEn: "Eastern Province",
    nameAr: "المنطقة الشرقية",
    cities: [
      { nameEn: "Dammam", nameAr: "الدمام" },
      { nameEn: "Khobar", nameAr: "الخبر" },
      { nameEn: "Dhahran", nameAr: "الظهران" },
      { nameEn: "Al Ahsa", nameAr: "الأحساء" },
      { nameEn: "Jubail", nameAr: "الجبيل" },
      { nameEn: "Qatif", nameAr: "القطيف" },
    ],
  },
  {
    nameEn: "Asir",
    nameAr: "عسير",
    cities: [
      { nameEn: "Abha", nameAr: "أبها" },
      { nameEn: "Khamis Mushait", nameAr: "خميس مشيط" },
      { nameEn: "Bisha", nameAr: "بيشة" },
    ],
  },
  {
    nameEn: "Tabuk",
    nameAr: "تبوك",
    cities: [
      { nameEn: "Tabuk", nameAr: "تبوك" },
      { nameEn: "Duba", nameAr: "ضباء" },
      { nameEn: "Umluj", nameAr: "أملج" },
    ],
  },
  {
    nameEn: "Qassim",
    nameAr: "القصيم",
    cities: [
      { nameEn: "Buraidah", nameAr: "بريدة" },
      { nameEn: "Unaizah", nameAr: "عنيزة" },
    ],
  },
  {
    nameEn: "Hail",
    nameAr: "حائل",
    cities: [{ nameEn: "Hail", nameAr: "حائل" }],
  },
  {
    nameEn: "Northern Borders",
    nameAr: "الحدود الشمالية",
    cities: [{ nameEn: "Arar", nameAr: "عرعر" }],
  },
  {
    nameEn: "Jazan",
    nameAr: "جازان",
    cities: [
      { nameEn: "Jazan", nameAr: "جازان" },
      { nameEn: "Abu Arish", nameAr: "أبو عريش" },
    ],
  },
  {
    nameEn: "Najran",
    nameAr: "نجران",
    cities: [{ nameEn: "Najran", nameAr: "نجران" }],
  },
  {
    nameEn: "Al Bahah",
    nameAr: "الباحة",
    cities: [{ nameEn: "Al Bahah", nameAr: "الباحة" }],
  },
  {
    nameEn: "Al Jouf",
    nameAr: "الجوف",
    cities: [
      { nameEn: "Sakaka", nameAr: "سكاكا" },
      { nameEn: "Qurayyat", nameAr: "القريات" },
    ],
  },
];

const PLATFORM_SETTINGS: Record<string, string> = {
  service_fee_pct: "10",
  min_listing_price_sar: "50",
  max_photos_per_listing: "10",
  otp_expiry_minutes: "5",
  otp_max_attempts: "3",
  payout_min_threshold_sar: "100",
  dispute_window_hours: "48",
  dispute_resolution_hours: "72",
  boost_price_sar: "25",
  boost_duration_days: "7",
  flat_shipping_fee_sar: "25",
};

const BRANDS: Array<{ nameEn: string; nameAr: string }> = [
  { nameEn: "Elie Saab", nameAr: "إيلي صعب" },
  { nameEn: "Zuhair Murad", nameAr: "زهير مراد" },
  { nameEn: "Rani Zakhem", nameAr: "راني زخم" },
  { nameEn: "Toni Maticevski", nameAr: "توني ماتيسيفسكي" },
  { nameEn: "Yousef Al Jasmi", nameAr: "يوسف الجسمي" },
  { nameEn: "H&M", nameAr: "إتش آند إم" },
  { nameEn: "Zara", nameAr: "زارا" },
  { nameEn: "Other", nameAr: "أخرى" },
];

const STYLE_TAGS: Array<{ nameEn: string; nameAr: string }> = [
  { nameEn: "Maxi", nameAr: "ماكسي" },
  { nameEn: "Midi", nameAr: "ميدي" },
  { nameEn: "Mini", nameAr: "ميني" },
  { nameEn: "Abaya-style", nameAr: "تصميم عباية" },
  { nameEn: "Kaftan", nameAr: "قفطان" },
  { nameEn: "Ball Gown", nameAr: "فستان سهرة" },
  { nameEn: "Mermaid", nameAr: "حورية البحر" },
  { nameEn: "A-Line", nameAr: "إيه لاين" },
];

async function main() {
  for (const region of REGIONS) {
    const createdRegion = await prisma.region.upsert({
      where: { nameEn: region.nameEn },
      update: { nameAr: region.nameAr },
      create: { nameEn: region.nameEn, nameAr: region.nameAr },
    });

    for (const city of region.cities) {
      await prisma.city.upsert({
        where: { nameEn_regionId: { nameEn: city.nameEn, regionId: createdRegion.id } },
        update: { nameAr: city.nameAr },
        create: { nameEn: city.nameEn, nameAr: city.nameAr, regionId: createdRegion.id },
      });
    }
  }

  for (const [key, value] of Object.entries(PLATFORM_SETTINGS)) {
    await prisma.platformSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  for (const brand of BRANDS) {
    await prisma.brand.upsert({
      where: { nameEn: brand.nameEn },
      update: { nameAr: brand.nameAr },
      create: brand,
    });
  }

  for (const tag of STYLE_TAGS) {
    await prisma.styleTag.upsert({
      where: { nameEn: tag.nameEn },
      update: { nameAr: tag.nameAr },
      create: tag,
    });
  }

  const regionCount = await prisma.region.count();
  const cityCount = await prisma.city.count();
  console.log(`Seeded ${regionCount} regions, ${cityCount} cities, ${BRANDS.length} brands, ${STYLE_TAGS.length} style tags, ${Object.keys(PLATFORM_SETTINGS).length} platform settings.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
