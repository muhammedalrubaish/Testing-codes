/* بيانات تجريبية لعرض فكرة منصة صافي
   لاحقًا تُستبدل هذه البيانات بواجهة برمجية (API) حقيقية */

const SAFI_DATA = {
  categories: [
    { id: "phones",   label: "هواتف ذكية",   icon: "📱" },
    { id: "laptops",  label: "حواسيب محمولة", icon: "💻" },
    { id: "tablets",  label: "أجهزة لوحية",  icon: "📲" },
    { id: "audio",    label: "سماعات وصوتيات", icon: "🎧" },
    { id: "watches",  label: "ساعات ذكية",   icon: "⌚" },
    { id: "gaming",   label: "ألعاب إلكترونية", icon: "🎮" },
    { id: "acc",      label: "إكسسوارات",    icon: "🔌" },
  ],

  products: [
    {
      id: 1, name: "هاتف جالكسي S25 ألترا 256GB", brand: "سامسونج", category: "phones", icon: "📱",
      retail: [
        { store: "متجر التقنية الأول", city: "الرياض", rating: 4.8, price: 4399, delivery: "توصيل خلال يومين" },
        { store: "إلكترو ستور", city: "جدة", rating: 4.6, price: 4450, delivery: "توصيل خلال 3 أيام" },
        { store: "متجر المستقبل", city: "الدمام", rating: 4.7, price: 4299, delivery: "توصيل خلال يومين" },
      ],
      wholesale: [
        { store: "شركة النخبة للتوزيع", minQty: 10, price: 3950, stock: 240 },
        { store: "مؤسسة الجملة الذكية", minQty: 5, price: 4020, stock: 120 },
      ],
    },
    {
      id: 2, name: "آيفون 17 برو 256GB", brand: "آبل", category: "phones", icon: "📱",
      retail: [
        { store: "متجر المستقبل", city: "الدمام", rating: 4.7, price: 5250, delivery: "توصيل خلال يومين" },
        { store: "متجر التقنية الأول", city: "الرياض", rating: 4.8, price: 5199, delivery: "توصيل غدًا" },
        { store: "سمارت زون", city: "الرياض", rating: 4.5, price: 5340, delivery: "توصيل خلال 4 أيام" },
      ],
      wholesale: [
        { store: "الوسيط الدولي للإلكترونيات", minQty: 10, price: 4780, stock: 180 },
      ],
    },
    {
      id: 3, name: "لابتوب ماك بوك إير M4", brand: "آبل", category: "laptops", icon: "💻",
      retail: [
        { store: "إلكترو ستور", city: "جدة", rating: 4.6, price: 4899, delivery: "توصيل خلال 3 أيام" },
        { store: "متجر التقنية الأول", city: "الرياض", rating: 4.8, price: 4820, delivery: "توصيل خلال يومين" },
      ],
      wholesale: [
        { store: "شركة النخبة للتوزيع", minQty: 5, price: 4450, stock: 60 },
        { store: "الوسيط الدولي للإلكترونيات", minQty: 8, price: 4390, stock: 95 },
      ],
    },
    {
      id: 4, name: "لابتوب لينوفو ThinkPad X1", brand: "لينوفو", category: "laptops", icon: "💻",
      retail: [
        { store: "سمارت زون", city: "الرياض", rating: 4.5, price: 5620, delivery: "توصيل خلال 3 أيام" },
        { store: "متجر المستقبل", city: "الدمام", rating: 4.7, price: 5499, delivery: "توصيل خلال يومين" },
      ],
      wholesale: [
        { store: "مؤسسة الجملة الذكية", minQty: 5, price: 5100, stock: 40 },
      ],
    },
    {
      id: 5, name: "آيباد برو 11 بوصة M4", brand: "آبل", category: "tablets", icon: "📲",
      retail: [
        { store: "متجر التقنية الأول", city: "الرياض", rating: 4.8, price: 3999, delivery: "توصيل غدًا" },
        { store: "إلكترو ستور", city: "جدة", rating: 4.6, price: 4080, delivery: "توصيل خلال 3 أيام" },
      ],
      wholesale: [
        { store: "شركة النخبة للتوزيع", minQty: 6, price: 3650, stock: 75 },
      ],
    },
    {
      id: 6, name: "سماعة إيربودز برو 3", brand: "آبل", category: "audio", icon: "🎧",
      retail: [
        { store: "سمارت زون", city: "الرياض", rating: 4.5, price: 949, delivery: "توصيل غدًا" },
        { store: "متجر المستقبل", city: "الدمام", rating: 4.7, price: 899, delivery: "توصيل خلال يومين" },
        { store: "إلكترو ستور", city: "جدة", rating: 4.6, price: 925, delivery: "توصيل خلال 3 أيام" },
      ],
      wholesale: [
        { store: "مؤسسة الجملة الذكية", minQty: 20, price: 760, stock: 500 },
        { store: "الوسيط الدولي للإلكترونيات", minQty: 15, price: 785, stock: 320 },
      ],
    },
    {
      id: 7, name: "سماعة سوني WH-1000XM6", brand: "سوني", category: "audio", icon: "🎧",
      retail: [
        { store: "متجر التقنية الأول", city: "الرياض", rating: 4.8, price: 1450, delivery: "توصيل خلال يومين" },
        { store: "سمارت زون", city: "الرياض", rating: 4.5, price: 1399, delivery: "توصيل خلال 3 أيام" },
      ],
      wholesale: [
        { store: "شركة النخبة للتوزيع", minQty: 10, price: 1210, stock: 150 },
      ],
    },
    {
      id: 8, name: "ساعة آبل ووتش سيريس 11", brand: "آبل", category: "watches", icon: "⌚",
      retail: [
        { store: "إلكترو ستور", city: "جدة", rating: 4.6, price: 1799, delivery: "توصيل خلال 3 أيام" },
        { store: "متجر التقنية الأول", city: "الرياض", rating: 4.8, price: 1749, delivery: "توصيل غدًا" },
      ],
      wholesale: [
        { store: "الوسيط الدولي للإلكترونيات", minQty: 10, price: 1540, stock: 200 },
      ],
    },
    {
      id: 9, name: "ساعة سامسونج جالكسي ووتش 8", brand: "سامسونج", category: "watches", icon: "⌚",
      retail: [
        { store: "متجر المستقبل", city: "الدمام", rating: 4.7, price: 1299, delivery: "توصيل خلال يومين" },
        { store: "سمارت زون", city: "الرياض", rating: 4.5, price: 1350, delivery: "توصيل خلال 3 أيام" },
      ],
      wholesale: [
        { store: "مؤسسة الجملة الذكية", minQty: 12, price: 1080, stock: 180 },
      ],
    },
    {
      id: 10, name: "جهاز بلايستيشن 5 برو", brand: "سوني", category: "gaming", icon: "🎮",
      retail: [
        { store: "سمارت زون", city: "الرياض", rating: 4.5, price: 3150, delivery: "توصيل خلال 3 أيام" },
        { store: "متجر التقنية الأول", city: "الرياض", rating: 4.8, price: 3099, delivery: "توصيل خلال يومين" },
        { store: "متجر المستقبل", city: "الدمام", rating: 4.7, price: 3199, delivery: "توصيل خلال يومين" },
      ],
      wholesale: [
        { store: "شركة النخبة للتوزيع", minQty: 5, price: 2850, stock: 45 },
      ],
    },
    {
      id: 11, name: "شاحن سريع 65W GaN", brand: "أنكر", category: "acc", icon: "🔌",
      retail: [
        { store: "إلكترو ستور", city: "جدة", rating: 4.6, price: 149, delivery: "توصيل خلال 3 أيام" },
        { store: "متجر المستقبل", city: "الدمام", rating: 4.7, price: 139, delivery: "توصيل خلال يومين" },
        { store: "سمارت زون", city: "الرياض", rating: 4.5, price: 155, delivery: "توصيل غدًا" },
      ],
      wholesale: [
        { store: "مؤسسة الجملة الذكية", minQty: 50, price: 98, stock: 2000 },
        { store: "الوسيط الدولي للإلكترونيات", minQty: 30, price: 105, stock: 900 },
      ],
    },
    {
      id: 12, name: "باور بانك 20000mAh شحن سريع", brand: "أنكر", category: "acc", icon: "🔋",
      retail: [
        { store: "متجر التقنية الأول", city: "الرياض", rating: 4.8, price: 219, delivery: "توصيل غدًا" },
        { store: "إلكترو ستور", city: "جدة", rating: 4.6, price: 235, delivery: "توصيل خلال 3 أيام" },
      ],
      wholesale: [
        { store: "شركة النخبة للتوزيع", minQty: 40, price: 165, stock: 1500 },
      ],
    },
  ],
};
