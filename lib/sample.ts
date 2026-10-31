import type { AnalyzeResult, Lang, Restriction } from "./schema";

// Offline demo safety net: matches public/sample-menu.svg, judged for SAMPLE_RESTRICTIONS. Also returned by MOCK_MODE.
// Korean data is shared; every user-facing text has all UI languages so the demo never shows English to a
// non-English user.
export const SAMPLE_IMAGE = "/sample-menu.svg";
export const SAMPLE_RESTRICTIONS: Restriction[] = ["halal", "crustacean"];

type T = Record<Lang, string>;
type Ing = { ko: string; t: T; flagged?: boolean };

// Shared ingredient names.
const I = {
  fishPaste: { ko: "생선살", t: { en: "fish paste", ja: "魚のすり身", zh: "鱼糜", "zh-TW": "魚漿", ar: "عجينة السمك" } },
  flour: { ko: "밀가루", t: { en: "wheat flour", ja: "小麦粉", zh: "面粉", "zh-TW": "麵粉", ar: "دقيق القمح" } },
  anchovyBroth: { ko: "멸치 육수", t: { en: "anchovy broth", ja: "煮干しだし", zh: "鳀鱼高汤", "zh-TW": "鯷魚高湯", ar: "مرق الأنشوفة" } },
  radish: { ko: "무", t: { en: "radish", ja: "大根", zh: "白萝卜", "zh-TW": "白蘿蔔", ar: "الفجل" } },
  soySauce: { ko: "간장", t: { en: "soy sauce", ja: "醤油", zh: "酱油", "zh-TW": "醬油", ar: "صلصة الصويا" } },
  riceCake: { ko: "떡", t: { en: "rice cakes", ja: "トック（韓国餅）", zh: "年糕", "zh-TW": "年糕", ar: "كعك الأرز" } },
  gochujang: { ko: "고추장", t: { en: "red chili paste", ja: "コチュジャン", zh: "韩式辣酱", "zh-TW": "韓式辣醬", ar: "معجون الفلفل الأحمر" } },
  fishCake: { ko: "어묵", t: { en: "fish cake", ja: "さつま揚げ", zh: "鱼饼", "zh-TW": "魚板", ar: "كعك السمك" } },
  sugar: { ko: "설탕", t: { en: "sugar", ja: "砂糖", zh: "糖", "zh-TW": "糖", ar: "السكر" } },
  greenOnion: { ko: "대파", t: { en: "green onion", ja: "長ねぎ", zh: "大葱", "zh-TW": "大蔥", ar: "البصل الأخضر" } },
  porkIntestine: { ko: "돼지 창자", t: { en: "pork intestine", ja: "豚の腸", zh: "猪肠", "zh-TW": "豬腸", ar: "أمعاء الخنزير" } },
  porkBlood: { ko: "돼지 피", t: { en: "pork blood", ja: "豚の血", zh: "猪血", "zh-TW": "豬血", ar: "دم الخنزير" } },
  glassNoodles: { ko: "당면", t: { en: "glass noodles", ja: "春雨", zh: "粉丝", "zh-TW": "冬粉", ar: "الشعيرية الشفافة" } },
  stickyRice: { ko: "찹쌀", t: { en: "sticky rice", ja: "もち米", zh: "糯米", "zh-TW": "糯米", ar: "الأرز الدبق" } },
  saltedShrimp: { ko: "새우젓", t: { en: "salted shrimp", ja: "アミの塩辛", zh: "虾酱", "zh-TW": "蝦醬", ar: "الروبيان المملح" } },
  shrimp: { ko: "새우", t: { en: "shrimp", ja: "エビ", zh: "虾", "zh-TW": "蝦", ar: "الروبيان" } },
  egg: { ko: "달걀", t: { en: "egg", ja: "卵", zh: "鸡蛋", "zh-TW": "雞蛋", ar: "البيض" } },
  oil: { ko: "식용유", t: { en: "cooking oil", ja: "食用油", zh: "食用油", "zh-TW": "食用油", ar: "زيت الطهي" } },
  brownSugar: { ko: "흑설탕", t: { en: "brown sugar", ja: "黒砂糖", zh: "红糖", "zh-TW": "黑糖", ar: "السكر البني" } },
  peanuts: { ko: "땅콩", t: { en: "peanuts", ja: "ピーナッツ", zh: "花生", "zh-TW": "花生", ar: "الفول السوداني" } },
  sunflower: { ko: "해바라기씨", t: { en: "sunflower seeds", ja: "ひまわりの種", zh: "葵花籽", "zh-TW": "葵花籽", ar: "بذور دوار الشمس" } },
  sweetPotato: { ko: "고구마", t: { en: "sweet potato", ja: "さつまいも", zh: "红薯", "zh-TW": "地瓜", ar: "البطاطا الحلوة" } },
} satisfies Record<string, Ing>;

// Shared "ask the vendor about" words.
const A = {
  shrimp: { ko: "새우", t: I.shrimp.t },
  crab: { ko: "게", t: { en: "crab", ja: "カニ", zh: "蟹", "zh-TW": "蟹", ar: "السلطعون" } },
  pork: { ko: "돼지고기", t: { en: "pork", ja: "豚肉", zh: "猪肉", "zh-TW": "豬肉", ar: "لحم الخنزير" } },
  cookingWine: { ko: "맛술", t: { en: "cooking wine", ja: "料理酒", zh: "料酒", "zh-TW": "料理米酒", ar: "خمر الطبخ" } },
  porkBroth: { ko: "돼지 육수", t: { en: "pork broth", ja: "豚骨スープ", zh: "猪骨汤", "zh-TW": "豬骨湯", ar: "مرق الخنزير" } },
  lard: { ko: "돼지기름", t: { en: "lard", ja: "ラード", zh: "猪油", "zh-TW": "豬油", ar: "شحم الخنزير" } },
};

const flag = (i: Ing): Ing => ({ ...i, flagged: true });

const ITEMS: {
  name_ko: string;
  name: T;
  about: T;
  reason: T;
  ingredients: Ing[];
  ask: { ko: string; t: T }[];
  verdict: "ok" | "ask" | "avoid";
  confidence: "high" | "medium" | "low";
  triggered: Restriction[];
}[] = [
  {
    name_ko: "어묵",
    name: { en: "Fish cake skewer", ja: "おでん串", zh: "鱼饼串", "zh-TW": "魚板串", ar: "أسياخ كعك السمك" },
    about: {
      en: "Thin sheets of fish cake folded onto a skewer and kept warm in hot broth; you can sip the broth too.",
      ja: "薄い練り物を串に刺して温かいスープに浸したもの。スープも飲めます。",
      zh: "把薄鱼饼串在竹签上泡在热汤里，汤也可以喝。",
      "zh-TW": "把薄魚板串在竹籤上泡在熱湯裡，湯也可以喝。",
      ar: "شرائح رقيقة من كعك السمك على عود تُحفظ دافئة في مرق ساخن، ويمكن شرب المرق أيضًا.",
    },
    reason: {
      en: "Usually fish paste in anchovy broth, but some stalls add shrimp, crab or pork bones to the broth.",
      ja: "通常は煮干しだしに練り物ですが、店によってはスープにエビ・カニや豚骨を使います。",
      zh: "通常是鳀鱼汤配鱼饼，但有些摊位会在汤里加虾、蟹或猪骨。",
      "zh-TW": "通常是鯷魚湯配魚板，但有些攤位會在湯裡加蝦、蟹或豬骨。",
      ar: "عادةً كعك سمك في مرق الأنشوفة، لكن بعض الأكشاك تضيف الروبيان أو السلطعون أو عظام الخنزير إلى المرق.",
    },
    ingredients: [I.fishPaste, I.flour, I.anchovyBroth, I.radish, I.soySauce],
    ask: [A.shrimp, A.crab, A.porkBroth],
    verdict: "ask",
    confidence: "medium",
    triggered: ["halal", "crustacean"],
  },
  {
    name_ko: "떡볶이",
    name: { en: "Spicy rice cakes", ja: "トッポッキ", zh: "辣炒年糕", "zh-TW": "辣炒年糕", ar: "كعك الأرز الحار" },
    about: {
      en: "Chewy rice cake sticks simmered in a sweet-and-spicy red chili sauce, eaten with a toothpick.",
      ja: "棒状の餅を甘辛いコチュジャンソースで煮込んだもの。楊枝で食べます。",
      zh: "条状年糕在甜辣的韩式辣酱里炖煮，用牙签吃。",
      "zh-TW": "條狀年糕在甜辣的韓式辣醬裡燉煮，用牙籤吃。",
      ar: "أصابع من كعك الأرز مطهوة في صلصة فلفل حلوة وحارة، تؤكل بعود أسنان.",
    },
    reason: {
      en: "Usually no pork or shellfish, but the broth and sauce vary by stall; some add cooking wine.",
      ja: "通常は豚肉やエビ・カニは入りませんが、スープやソースは店ごとに違い、料理酒を使う店もあります。",
      zh: "通常不含猪肉或虾蟹，但汤底和酱料因摊位而异，有的会加料酒。",
      "zh-TW": "通常不含豬肉或蝦蟹，但湯底和醬料因攤位而異，有的會加料理米酒。",
      ar: "عادةً بلا لحم خنزير أو روبيان، لكن المرق والصلصة يختلفان من كشك لآخر، وبعضهم يضيف خمر الطبخ.",
    },
    ingredients: [I.riceCake, I.gochujang, I.fishCake, I.anchovyBroth, I.sugar, I.greenOnion],
    ask: [A.pork, A.shrimp, A.cookingWine],
    verdict: "ask",
    confidence: "medium",
    triggered: ["halal", "crustacean"],
  },
  {
    name_ko: "순대",
    name: { en: "Korean blood sausage", ja: "スンデ（韓国式腸詰め）", zh: "韩式血肠", "zh-TW": "韓式血腸", ar: "سونديه (نقانق الدم الكورية)" },
    about: {
      en: "Steamed sausage filled with glass noodles and blood, sliced and dipped in salt or salted shrimp.",
      ja: "春雨と血を詰めて蒸した腸詰めを切り、塩やアミの塩辛につけて食べます。",
      zh: "灌入粉丝和猪血蒸熟的肠，切片后蘸盐或虾酱吃。",
      "zh-TW": "灌入冬粉和豬血蒸熟的腸，切片後沾鹽或蝦醬吃。",
      ar: "نقانق مطهوة بالبخار محشوة بالشعيرية والدم، تُقطع وتُغمس في الملح أو الروبيان المملح.",
    },
    reason: {
      en: "Made with pork intestine and pork blood, and usually served with a salted shrimp dip.",
      ja: "豚の腸と豚の血で作られ、アミの塩辛（エビ）を添えるのが一般的です。",
      zh: "用猪肠和猪血制成，通常配虾酱一起吃。",
      "zh-TW": "用豬腸和豬血製成，通常配蝦醬一起吃。",
      ar: "تُصنع من أمعاء الخنزير ودم الخنزير، وتُقدَّم عادةً مع صلصة الروبيان المملح.",
    },
    ingredients: [flag(I.porkIntestine), flag(I.porkBlood), I.glassNoodles, I.stickyRice, flag(I.saltedShrimp)],
    ask: [],
    verdict: "avoid",
    confidence: "high",
    triggered: ["halal", "crustacean"],
  },
  {
    name_ko: "새우튀김",
    name: { en: "Fried shrimp", ja: "エビの天ぷら", zh: "炸虾", "zh-TW": "炸蝦", ar: "روبيان مقلي" },
    about: {
      en: "Whole shrimp in crispy batter, often sold with other fried snacks and dipped in soy sauce.",
      ja: "エビに衣をつけて揚げたもの。ほかの揚げ物と一緒に売られ、醤油につけて食べます。",
      zh: "裹面糊炸的整只虾，常和其他炸物一起卖，蘸酱油吃。",
      "zh-TW": "裹麵糊炸的整隻蝦，常和其他炸物一起賣，沾醬油吃。",
      ar: "روبيان كامل بعجينة مقرمشة، يُباع غالبًا مع مقليات أخرى ويُغمس في صلصة الصويا.",
    },
    reason: {
      en: "Contains shrimp. Other fried items here are likely fried in the same oil.",
      ja: "エビが入っています。この店のほかの揚げ物も同じ油で揚げている可能性が高いです。",
      zh: "含有虾。这家摊位的其他炸物很可能用同一锅油。",
      "zh-TW": "含有蝦。這家攤位的其他炸物很可能用同一鍋油。",
      ar: "يحتوي على الروبيان. والمقليات الأخرى هنا تُقلى غالبًا في الزيت نفسه.",
    },
    ingredients: [flag(I.shrimp), I.flour, I.egg, I.oil],
    ask: [],
    verdict: "avoid",
    confidence: "high",
    triggered: ["crustacean"],
  },
  {
    name_ko: "씨앗호떡",
    name: { en: "Seed-filled sweet pancake", ja: "種入りホットク", zh: "坚果籽糖饼", "zh-TW": "堅果種子糖餅", ar: "فطيرة هوتوك بالبذور" },
    about: {
      en: "A hot griddled pancake filled with melted brown sugar and seeds; eaten folded in a paper cup.",
      ja: "黒砂糖と種を包んで鉄板で焼いた温かいおやき。紙コップに入れて食べます。",
      zh: "包着红糖和瓜子仁在铁板上煎的热饼，装在纸杯里吃。",
      "zh-TW": "包著黑糖和瓜子仁在鐵板上煎的熱餅，裝在紙杯裡吃。",
      ar: "فطيرة ساخنة على الصاج محشوة بالسكر البني والبذور، تؤكل في كوب ورقي.",
    },
    reason: {
      en: "Usually wheat dough with sugar and seeds, but some stalls fry it in lard. Cross-contamination cannot be ruled out.",
      ja: "通常は小麦の生地に砂糖と種ですが、ラードで焼く店もあります。交差汚染がないとは言い切れません。",
      zh: "通常是面皮包糖和籽，但有的摊位用猪油煎。无法排除交叉污染。",
      "zh-TW": "通常是麵皮包糖和種子，但有的攤位用豬油煎。無法排除交叉污染。",
      ar: "عادةً عجينة قمح بالسكر والبذور، لكن بعض الأكشاك تقليها بشحم الخنزير. لا يمكن استبعاد التلوث المتبادل.",
    },
    ingredients: [I.flour, I.brownSugar, I.peanuts, I.sunflower, I.oil],
    ask: [A.lard],
    verdict: "ask",
    confidence: "medium",
    triggered: ["halal"],
  },
  {
    name_ko: "군고구마",
    name: { en: "Roasted sweet potato", ja: "焼き芋", zh: "烤红薯", "zh-TW": "烤地瓜", ar: "بطاطا حلوة مشوية" },
    about: {
      en: "A whole sweet potato slow-roasted in a drum oven, sold hot in a paper bag.",
      ja: "ドラム缶の窯でじっくり焼いたさつまいも。紙袋に入れて熱々で売られます。",
      zh: "在铁桶炉里慢慢烤熟的整个红薯，装在纸袋里趁热卖。",
      "zh-TW": "在鐵桶爐裡慢慢烤熟的整顆地瓜，裝在紙袋裡趁熱賣。",
      ar: "حبة بطاطا حلوة كاملة مشوية ببطء في فرن أسطواني، تُباع ساخنة في كيس ورقي.",
    },
    reason: {
      en: "Usually just roasted sweet potato. Cross-contamination cannot be ruled out.",
      ja: "通常は焼いたさつまいもだけです。交差汚染がないとは言い切れません。",
      zh: "通常只是烤红薯。无法排除交叉污染。",
      "zh-TW": "通常只是烤地瓜。無法排除交叉污染。",
      ar: "عادةً بطاطا حلوة مشوية فقط. لا يمكن استبعاد التلوث المتبادل.",
    },
    ingredients: [I.sweetPotato],
    ask: [],
    verdict: "ok",
    confidence: "high",
    triggered: [],
  },
];

const ASK_ALL: T = {
  en: "Which items have no pork, alcohol, shrimp or crab?",
  ja: "豚肉・お酒・エビ・カニが入っていないメニューはどれですか？",
  zh: "哪些菜不含猪肉、酒、虾或蟹？",
  "zh-TW": "哪些菜不含豬肉、酒、蝦或蟹？",
  ar: "أي الأصناف لا تحتوي على لحم الخنزير أو الكحول أو الروبيان أو السلطعون؟",
};

export function sampleResult(lang: Lang): AnalyzeResult {
  const ing = (i: Ing) => `${i.t[lang]} (${i.ko})`;
  return {
    readable: true,
    items: ITEMS.map((it) => ({
      name_ko: it.name_ko,
      name: it.name[lang],
      about: it.about[lang],
      likely_ingredients: it.ingredients.map(ing),
      flagged_ingredients: it.ingredients.filter((i) => i.flagged).map(ing),
      verdict: it.verdict,
      confidence: it.confidence,
      reason: it.reason[lang],
      triggered_restrictions: it.triggered,
      ask_about: it.ask.map((a) => ({ ko: a.ko, local: a.t[lang] })),
    })),
    ask_all_ko: "돼지고기, 술, 새우·게가 안 들어간 메뉴가 뭐예요?",
    ask_all: ASK_ALL[lang],
    other_ko: "",
    notes: "",
    label_contains: "",
    label_facility: "",
  };
}
