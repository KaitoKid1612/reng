// Free pinyin study for Vietnamese beginners of Mandarin: the sound chart and a typing drill.
// Sound hints compare with Vietnamese and are approximations for a first lesson, not phonetics.

export interface PinyinTone {
  tone: number;
  syllable: string;
  hanzi: string;
  meaning: string;
  hint: string;
}

export const PINYIN_TONES: readonly PinyinTone[] = [
  {
    tone: 1,
    syllable: "mā",
    hanzi: "妈",
    meaning: "mẹ",
    hint: "cao và ngang, giữ đều như ngân một nốt",
  },
  {
    tone: 2,
    syllable: "má",
    hanzi: "麻",
    meaning: "cây gai; tê",
    hint: 'đi lên, giống giọng hỏi lại "hả?"',
  },
  {
    tone: 3,
    syllable: "mǎ",
    hanzi: "马",
    meaning: "con ngựa",
    hint: "xuống thấp rồi hơi lên; hai thanh 3 liền nhau thì thanh đầu đọc như thanh 2",
  },
  {
    tone: 4,
    syllable: "mà",
    hanzi: "骂",
    meaning: "mắng",
    hint: "rơi mạnh từ cao xuống, như giọng ra lệnh",
  },
  {
    tone: 0,
    syllable: "ma",
    hanzi: "吗",
    meaning: "trợ từ hỏi",
    hint: "nhẹ và ngắn, không có dấu",
  },
];

export interface PinyinSound {
  sound: string;
  hint: string;
}

export const PINYIN_INITIALS: readonly PinyinSound[] = [
  { sound: "b", hint: 'gần "p" nhưng không bật hơi' },
  { sound: "p", hint: '"p" bật hơi mạnh' },
  { sound: "m", hint: 'như "m"' },
  { sound: "f", hint: 'như "ph"' },
  { sound: "d", hint: 'gần "t" không bật hơi' },
  { sound: "t", hint: '"th" bật hơi' },
  { sound: "n", hint: 'như "n"' },
  { sound: "l", hint: 'như "l"' },
  { sound: "g", hint: 'gần "c" không bật hơi' },
  { sound: "k", hint: '"kh" bật hơi' },
  { sound: "h", hint: 'gần "h", phát từ cổ họng' },
  { sound: "j", hint: 'gần "ch", mặt lưỡi phẳng' },
  { sound: "q", hint: '"ch" bật hơi' },
  { sound: "x", hint: 'gần "x" nhẹ' },
  { sound: "zh", hint: 'gần "tr" uốn lưỡi, không bật hơi' },
  { sound: "ch", hint: '"tr" uốn lưỡi, bật hơi' },
  { sound: "sh", hint: '"s" uốn lưỡi' },
  { sound: "r", hint: 'gần "r" uốn lưỡi nhẹ' },
  { sound: "z", hint: 'gần "ch" đầu lưỡi (ts), không bật hơi' },
  { sound: "c", hint: '"ts" bật hơi' },
  { sound: "s", hint: 'như "x"' },
];

export const PINYIN_FINAL_GROUPS: readonly { title: string; finals: readonly string[] }[] = [
  { title: "Nguyên âm đơn", finals: ["a", "o", "e", "i", "u", "ü", "er"] },
  { title: "Nguyên âm kép", finals: ["ai", "ei", "ao", "ou"] },
  { title: "Âm mũi", finals: ["an", "en", "ang", "eng", "ong"] },
  {
    title: "Bắt đầu bằng i",
    finals: ["ia", "ie", "iao", "iu", "ian", "in", "iang", "ing", "iong"],
  },
  { title: "Bắt đầu bằng u", finals: ["ua", "uo", "uai", "ui", "uan", "un", "uang"] },
  { title: "Bắt đầu bằng ü", finals: ["üe", "üan", "ün"] },
];

export interface PinyinWord {
  id: string;
  hanzi: string;
  // Tone-marked pinyin with a space between syllables, as the drill shows it.
  pinyin: string;
  meaning: string;
  // Also accepted: full tones for syllables usually read neutral (xuéshēng for xuésheng).
  also?: readonly string[];
}

export const PINYIN_WORDS: readonly PinyinWord[] = [
  { id: "nihao", hanzi: "你好", pinyin: "nǐ hǎo", meaning: "xin chào" },
  { id: "xiexie", hanzi: "谢谢", pinyin: "xiè xie", meaning: "cảm ơn", also: ["xiè xiè"] },
  { id: "zaijian", hanzi: "再见", pinyin: "zài jiàn", meaning: "tạm biệt" },
  { id: "laoshi", hanzi: "老师", pinyin: "lǎo shī", meaning: "thầy cô giáo" },
  { id: "xuesheng", hanzi: "学生", pinyin: "xué sheng", meaning: "học sinh", also: ["xué shēng"] },
  { id: "pengyou", hanzi: "朋友", pinyin: "péng you", meaning: "bạn bè", also: ["péng yǒu"] },
  { id: "zhongguo", hanzi: "中国", pinyin: "Zhōng guó", meaning: "Trung Quốc" },
  { id: "yuenan", hanzi: "越南", pinyin: "Yuè nán", meaning: "Việt Nam" },
  { id: "hanyu", hanzi: "汉语", pinyin: "Hàn yǔ", meaning: "tiếng Hán" },
  { id: "wo", hanzi: "我", pinyin: "wǒ", meaning: "tôi" },
  { id: "ni", hanzi: "你", pinyin: "nǐ", meaning: "bạn" },
  { id: "ta", hanzi: "他", pinyin: "tā", meaning: "anh ấy" },
  { id: "shi", hanzi: "是", pinyin: "shì", meaning: "là" },
  { id: "bu", hanzi: "不", pinyin: "bù", meaning: "không" },
  { id: "chi", hanzi: "吃", pinyin: "chī", meaning: "ăn" },
  { id: "he", hanzi: "喝", pinyin: "hē", meaning: "uống" },
  { id: "shui", hanzi: "水", pinyin: "shuǐ", meaning: "nước" },
  { id: "cha", hanzi: "茶", pinyin: "chá", meaning: "trà" },
  { id: "mifan", hanzi: "米饭", pinyin: "mǐ fàn", meaning: "cơm" },
  { id: "shu", hanzi: "书", pinyin: "shū", meaning: "sách" },
  { id: "xuexiao", hanzi: "学校", pinyin: "xué xiào", meaning: "trường học" },
  { id: "jia", hanzi: "家", pinyin: "jiā", meaning: "nhà" },
  { id: "jintian", hanzi: "今天", pinyin: "jīn tiān", meaning: "hôm nay" },
  { id: "mingtian", hanzi: "明天", pinyin: "míng tiān", meaning: "ngày mai" },
  { id: "zuotian", hanzi: "昨天", pinyin: "zuó tiān", meaning: "hôm qua" },
  { id: "yi", hanzi: "一", pinyin: "yī", meaning: "một" },
  { id: "er", hanzi: "二", pinyin: "èr", meaning: "hai" },
  { id: "san", hanzi: "三", pinyin: "sān", meaning: "ba" },
  { id: "si", hanzi: "四", pinyin: "sì", meaning: "bốn" },
  { id: "wu", hanzi: "五", pinyin: "wǔ", meaning: "năm" },
  { id: "liu", hanzi: "六", pinyin: "liù", meaning: "sáu" },
  { id: "qi", hanzi: "七", pinyin: "qī", meaning: "bảy" },
  { id: "ba", hanzi: "八", pinyin: "bā", meaning: "tám" },
  { id: "jiu", hanzi: "九", pinyin: "jiǔ", meaning: "chín" },
  { id: "shi2", hanzi: "十", pinyin: "shí", meaning: "mười" },
  { id: "baba", hanzi: "爸爸", pinyin: "bà ba", meaning: "bố", also: ["bà bà"] },
  { id: "mama", hanzi: "妈妈", pinyin: "mā ma", meaning: "mẹ", also: ["mā mā"] },
  { id: "mao", hanzi: "猫", pinyin: "māo", meaning: "con mèo" },
  { id: "gou", hanzi: "狗", pinyin: "gǒu", meaning: "con chó" },
  { id: "da", hanzi: "大", pinyin: "dà", meaning: "to, lớn" },
  { id: "xiao", hanzi: "小", pinyin: "xiǎo", meaning: "nhỏ" },
  { id: "hao", hanzi: "好", pinyin: "hǎo", meaning: "tốt" },
  { id: "hen", hanzi: "很", pinyin: "hěn", meaning: "rất" },
  { id: "xihuan", hanzi: "喜欢", pinyin: "xǐ huan", meaning: "thích", also: ["xǐ huān"] },
  { id: "nv", hanzi: "女", pinyin: "nǚ", meaning: "nữ" },
  { id: "lv", hanzi: "绿", pinyin: "lǜ", meaning: "màu xanh lá" },
  { id: "qu", hanzi: "去", pinyin: "qù", meaning: "đi" },
  { id: "yu", hanzi: "鱼", pinyin: "yú", meaning: "con cá" },
];

export const PINYIN_SESSION_SIZE = 10;

// Spaces, apostrophes and capital letters do not change the answer; v stands for ü.
export function normalizePinyin(value: string) {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("vi")
    .replace(/[\s'’]/g, "")
    .replace(/v/g, "ü");
}

export function isPinyinCorrect(answer: string, word: PinyinWord) {
  const normalized = normalizePinyin(answer);
  return [word.pinyin, ...(word.also ?? [])].some((form) => normalizePinyin(form) === normalized);
}

// A random draw without repeats; random is injected so tests are repeatable.
export function pickPinyinSession(
  words: readonly PinyinWord[],
  size: number,
  random: () => number,
) {
  const pool = [...words];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  return pool.slice(0, size);
}
