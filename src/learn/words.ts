// Starter A1 nouns for "Wort des Tages" (own list; to be reviewed by a native speaker before release).
// plural: full plural form without article, or null for nouns normally used only in the singular.

export type Gender = 'der' | 'die' | 'das';

export interface Word {
  de: string;
  gender: Gender;
  plural: string | null;
  vi: string;
  en: string;
  example: { de: string; vi: string; en: string };
}

const w = (gender: Gender, de: string, plural: string | null, vi: string, en: string, exDe: string, exVi: string, exEn: string): Word =>
  ({ gender, de, plural, vi, en, example: { de: exDe, vi: exVi, en: exEn } });

export const WORDS: Word[] = [
  w('der', 'Tisch', 'Tische', 'cái bàn', 'table', 'Das Buch liegt auf dem Tisch.', 'Quyển sách nằm trên bàn.', 'The book is on the table.'),
  w('die', 'Lampe', 'Lampen', 'cái đèn', 'lamp', 'Die Lampe ist neu.', 'Cái đèn này mới.', 'The lamp is new.'),
  w('das', 'Buch', 'Bücher', 'quyển sách', 'book', 'Ich lese ein Buch.', 'Tôi đọc một quyển sách.', 'I am reading a book.'),
  w('der', 'Kaffee', 'Kaffees', 'cà phê', 'coffee', 'Ich trinke gern Kaffee.', 'Tôi thích uống cà phê.', 'I like drinking coffee.'),
  w('die', 'Tasse', 'Tassen', 'cái tách', 'cup', 'Eine Tasse Tee, bitte.', 'Cho tôi một tách trà.', 'A cup of tea, please.'),
  w('das', 'Fenster', 'Fenster', 'cửa sổ', 'window', 'Mach bitte das Fenster auf.', 'Làm ơn mở cửa sổ ra.', 'Please open the window.'),
  w('der', 'Stuhl', 'Stühle', 'cái ghế', 'chair', 'Der Stuhl ist bequem.', 'Cái ghế này rất thoải mái.', 'The chair is comfortable.'),
  w('die', 'Uhr', 'Uhren', 'đồng hồ', 'clock, watch', 'Wie viel Uhr ist es?', 'Mấy giờ rồi?', 'What time is it?'),
  w('das', 'Zimmer', 'Zimmer', 'căn phòng', 'room', 'Mein Zimmer ist klein.', 'Phòng của tôi nhỏ.', 'My room is small.'),
  w('der', 'Hund', 'Hunde', 'con chó', 'dog', 'Der Hund heißt Brezel.', 'Con chó tên là Brezel.', 'The dog is called Brezel.'),
  w('die', 'Katze', 'Katzen', 'con mèo', 'cat', 'Die Katze schläft.', 'Con mèo đang ngủ.', 'The cat is sleeping.'),
  w('das', 'Brot', 'Brote', 'bánh mì', 'bread', 'Das Brot ist frisch.', 'Bánh mì còn mới.', 'The bread is fresh.'),
  w('die', 'Brezel', 'Brezeln', 'bánh xoắn Brezel', 'pretzel', 'Eine Brezel, bitte!', 'Cho tôi một cái bánh Brezel!', 'A pretzel, please!'),
  w('der', 'Regen', null, 'mưa', 'rain', 'Ich mag den Regen.', 'Tôi thích mưa.', 'I like the rain.'),
  w('die', 'Sonne', 'Sonnen', 'mặt trời', 'sun', 'Die Sonne scheint.', 'Mặt trời đang chiếu sáng.', 'The sun is shining.'),
  w('das', 'Wetter', null, 'thời tiết', 'weather', 'Wie ist das Wetter heute?', 'Thời tiết hôm nay thế nào?', 'What is the weather like today?'),
  w('der', 'Zug', 'Züge', 'tàu hỏa', 'train', 'Der Zug fährt nach Berlin.', 'Tàu chạy tới Berlin.', 'The train goes to Berlin.'),
  w('die', 'Straße', 'Straßen', 'con đường', 'street', 'Die Straße ist laut.', 'Con đường này ồn ào.', 'The street is noisy.'),
  w('das', 'Fahrrad', 'Fahrräder', 'xe đạp', 'bicycle', 'Ich fahre mit dem Fahrrad.', 'Tôi đi bằng xe đạp.', 'I go by bike.'),
  w('der', 'Apfel', 'Äpfel', 'quả táo', 'apple', 'Der Apfel ist rot.', 'Quả táo màu đỏ.', 'The apple is red.'),
  w('die', 'Milch', null, 'sữa', 'milk', 'Kaffee mit Milch, bitte.', 'Cho tôi cà phê sữa.', 'Coffee with milk, please.'),
  w('das', 'Wasser', null, 'nước', 'water', 'Ich trinke viel Wasser.', 'Tôi uống nhiều nước.', 'I drink a lot of water.'),
  w('der', 'Freund', 'Freunde', 'người bạn (nam)', 'friend (m)', 'Mein Freund kommt aus Hanoi.', 'Bạn tôi đến từ Hà Nội.', 'My friend is from Hanoi.'),
  w('die', 'Freundin', 'Freundinnen', 'người bạn (nữ)', 'friend (f)', 'Meine Freundin lernt Deutsch.', 'Bạn tôi (nữ) học tiếng Đức.', 'My friend is learning German.'),
  w('das', 'Kind', 'Kinder', 'đứa trẻ', 'child', 'Das Kind spielt im Garten.', 'Đứa trẻ đang chơi trong vườn.', 'The child is playing in the garden.'),
  w('der', 'Lehrer', 'Lehrer', 'thầy giáo', 'teacher (m)', 'Der Lehrer ist sehr nett.', 'Thầy giáo rất tốt bụng.', 'The teacher is very nice.'),
  w('die', 'Schule', 'Schulen', 'trường học', 'school', 'Die Schule beginnt um acht Uhr.', 'Trường học bắt đầu lúc tám giờ.', 'School starts at eight.'),
  w('das', 'Heft', 'Hefte', 'quyển vở', 'exercise book', 'Schreib das in dein Heft.', 'Hãy viết điều đó vào vở của bạn.', 'Write that in your exercise book.'),
  w('der', 'Stift', 'Stifte', 'cây bút', 'pen', 'Hast du einen Stift?', 'Bạn có bút không?', 'Do you have a pen?'),
  w('die', 'Tafel', 'Tafeln', 'cái bảng', 'board', 'Sie schreibt an die Tafel.', 'Cô ấy viết lên bảng.', 'She writes on the board.'),
  w('das', 'Handy', 'Handys', 'điện thoại di động', 'mobile phone', 'Mein Handy ist leer.', 'Điện thoại của tôi hết pin.', 'My phone battery is dead.'),
  w('der', 'Bahnhof', 'Bahnhöfe', 'nhà ga', 'train station', 'Wo ist der Bahnhof?', 'Nhà ga ở đâu?', 'Where is the train station?'),
  w('die', 'Wohnung', 'Wohnungen', 'căn hộ', 'apartment', 'Die Wohnung hat drei Zimmer.', 'Căn hộ có ba phòng.', 'The apartment has three rooms.'),
  w('das', 'Haus', 'Häuser', 'ngôi nhà', 'house', 'Das Haus ist alt.', 'Ngôi nhà này cũ.', 'The house is old.'),
  w('der', 'Markt', 'Märkte', 'cái chợ', 'market', 'Am Samstag gehe ich auf den Markt.', 'Thứ bảy tôi đi chợ.', 'On Saturday I go to the market.'),
  w('die', 'Nudelsuppe', 'Nudelsuppen', 'món súp mì (như phở)', 'noodle soup', 'Phở ist eine Nudelsuppe aus Vietnam.', 'Phở là một món súp mì của Việt Nam.', 'Phở is a noodle soup from Vietnam.'),
  w('das', 'Geschenk', 'Geschenke', 'món quà', 'present', 'Das Geschenk ist für dich.', 'Món quà này dành cho bạn.', 'The present is for you.'),
  w('der', 'Morgen', 'Morgen', 'buổi sáng', 'morning', 'Guten Morgen!', 'Chào buổi sáng!', 'Good morning!'),
  w('die', 'Nacht', 'Nächte', 'ban đêm', 'night', 'Gute Nacht!', 'Chúc ngủ ngon!', 'Good night!'),
  w('das', 'Jahr', 'Jahre', 'năm', 'year', 'Ein Jahr hat zwölf Monate.', 'Một năm có mười hai tháng.', 'A year has twelve months.'),
  w('die', 'Woche', 'Wochen', 'tuần', 'week', 'Eine Woche hat sieben Tage.', 'Một tuần có bảy ngày.', 'A week has seven days.'),
  w('der', 'Tag', 'Tage', 'ngày', 'day', 'Schönen Tag noch!', 'Chúc bạn một ngày tốt lành!', 'Have a nice day!'),
];

/** Days since 1970-01-01 in local time. */
export const localDayNumber = (d: Date) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60_000) / 86_400_000);

/** Same word all day, a different one tomorrow. Stepping by a number coprime with the list length visits every word. */
export function wordOfDay(d = new Date(), words = WORDS): Word {
  const n = words.length;
  let step = 17;
  while (gcd(step, n) !== 1) step++;
  return words[(((localDayNumber(d) * step) % n) + n) % n];
}

function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a; }
