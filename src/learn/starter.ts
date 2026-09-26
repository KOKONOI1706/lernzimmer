// Built-in A1 starter decks (own content; needs a native-speaker review before release).
// Row format: [gender, word, plural (null = normally singular only), vi, en]
import type { Gender } from './words';
import { WORDS } from './words';
import type { CardFields } from './csv';

type NounRow = [Gender, string, string | null, string, string];
type PlainRow = [string, string, string];

const NOUNS: Record<string, NounRow[]> = {
  wohnen: [
    ['der', 'Tisch', 'Tische', 'cái bàn', 'table'], ['der', 'Stuhl', 'Stühle', 'cái ghế', 'chair'],
    ['das', 'Bett', 'Betten', 'cái giường', 'bed'], ['der', 'Schrank', 'Schränke', 'cái tủ', 'cupboard, wardrobe'],
    ['die', 'Lampe', 'Lampen', 'cái đèn', 'lamp'], ['das', 'Fenster', 'Fenster', 'cửa sổ', 'window'],
    ['die', 'Tür', 'Türen', 'cánh cửa', 'door'], ['das', 'Zimmer', 'Zimmer', 'căn phòng', 'room'],
    ['die', 'Küche', 'Küchen', 'nhà bếp', 'kitchen'], ['das', 'Bad', 'Bäder', 'phòng tắm', 'bathroom'],
    ['das', 'Sofa', 'Sofas', 'ghế sofa', 'sofa'], ['der', 'Teppich', 'Teppiche', 'tấm thảm', 'carpet'],
    ['die', 'Wohnung', 'Wohnungen', 'căn hộ', 'apartment'], ['das', 'Haus', 'Häuser', 'ngôi nhà', 'house'],
    ['der', 'Schlüssel', 'Schlüssel', 'chìa khóa', 'key'], ['der', 'Spiegel', 'Spiegel', 'cái gương', 'mirror'],
    ['das', 'Regal', 'Regale', 'cái kệ', 'shelf'], ['der', 'Kühlschrank', 'Kühlschränke', 'tủ lạnh', 'fridge'],
    ['die', 'Treppe', 'Treppen', 'cầu thang', 'stairs'], ['der', 'Garten', 'Gärten', 'khu vườn', 'garden'],
  ],
  essen: [
    ['das', 'Brot', 'Brote', 'bánh mì', 'bread'], ['das', 'Brötchen', 'Brötchen', 'bánh mì nhỏ', 'bread roll'],
    ['die', 'Brezel', 'Brezeln', 'bánh xoắn Brezel', 'pretzel'], ['der', 'Kaffee', 'Kaffees', 'cà phê', 'coffee'],
    ['der', 'Tee', 'Tees', 'trà', 'tea'], ['das', 'Wasser', null, 'nước', 'water'],
    ['die', 'Milch', null, 'sữa', 'milk'], ['der', 'Saft', 'Säfte', 'nước ép', 'juice'],
    ['das', 'Bier', 'Biere', 'bia', 'beer'], ['der', 'Wein', 'Weine', 'rượu vang', 'wine'],
    ['der', 'Apfel', 'Äpfel', 'quả táo', 'apple'], ['die', 'Banane', 'Bananen', 'quả chuối', 'banana'],
    ['die', 'Orange', 'Orangen', 'quả cam', 'orange'], ['die', 'Kartoffel', 'Kartoffeln', 'khoai tây', 'potato'],
    ['die', 'Tomate', 'Tomaten', 'cà chua', 'tomato'], ['das', 'Ei', 'Eier', 'quả trứng', 'egg'],
    ['der', 'Käse', null, 'phô mai', 'cheese'], ['die', 'Wurst', 'Würste', 'xúc xích', 'sausage'],
    ['das', 'Fleisch', null, 'thịt', 'meat'], ['der', 'Fisch', 'Fische', 'cá', 'fish'],
    ['der', 'Reis', null, 'gạo, cơm', 'rice'], ['die', 'Nudelsuppe', 'Nudelsuppen', 'món súp mì (như phở)', 'noodle soup'],
    ['die', 'Suppe', 'Suppen', 'món súp', 'soup'], ['der', 'Kuchen', 'Kuchen', 'bánh ngọt', 'cake'],
    ['der', 'Zucker', null, 'đường', 'sugar'], ['das', 'Salz', null, 'muối', 'salt'],
    ['das', 'Frühstück', 'Frühstücke', 'bữa sáng', 'breakfast'], ['das', 'Mittagessen', 'Mittagessen', 'bữa trưa', 'lunch'],
    ['das', 'Abendessen', 'Abendessen', 'bữa tối', 'dinner'], ['die', 'Tasse', 'Tassen', 'cái tách', 'cup'],
    ['das', 'Glas', 'Gläser', 'cái ly', 'glass'], ['der', 'Teller', 'Teller', 'cái đĩa', 'plate'],
    ['der', 'Löffel', 'Löffel', 'cái thìa', 'spoon'], ['die', 'Gabel', 'Gabeln', 'cái nĩa', 'fork'],
    ['das', 'Messer', 'Messer', 'con dao', 'knife'], ['die', 'Rechnung', 'Rechnungen', 'hóa đơn', 'bill'],
  ],
  familie: [
    ['die', 'Familie', 'Familien', 'gia đình', 'family'], ['die', 'Mutter', 'Mütter', 'mẹ', 'mother'],
    ['der', 'Vater', 'Väter', 'bố', 'father'], ['der', 'Bruder', 'Brüder', 'anh/em trai', 'brother'],
    ['die', 'Schwester', 'Schwestern', 'chị/em gái', 'sister'], ['das', 'Kind', 'Kinder', 'đứa trẻ', 'child'],
    ['der', 'Sohn', 'Söhne', 'con trai', 'son'], ['die', 'Tochter', 'Töchter', 'con gái', 'daughter'],
    ['die', 'Oma', 'Omas', 'bà', 'grandma'], ['der', 'Opa', 'Opas', 'ông', 'grandpa'],
    ['der', 'Mann', 'Männer', 'người đàn ông; chồng', 'man; husband'], ['die', 'Frau', 'Frauen', 'người phụ nữ; vợ', 'woman; wife'],
    ['der', 'Freund', 'Freunde', 'người bạn (nam)', 'friend (m)'], ['die', 'Freundin', 'Freundinnen', 'người bạn (nữ)', 'friend (f)'],
    ['der', 'Nachbar', 'Nachbarn', 'hàng xóm (nam)', 'neighbour (m)'], ['der', 'Name', 'Namen', 'tên', 'name'],
    ['das', 'Baby', 'Babys', 'em bé', 'baby'], ['der', 'Mensch', 'Menschen', 'con người', 'human, person'],
  ],
  stadt: [
    ['die', 'Stadt', 'Städte', 'thành phố', 'city'], ['die', 'Straße', 'Straßen', 'con đường', 'street'],
    ['der', 'Bahnhof', 'Bahnhöfe', 'nhà ga', 'train station'], ['der', 'Zug', 'Züge', 'tàu hỏa', 'train'],
    ['der', 'Bus', 'Busse', 'xe buýt', 'bus'], ['das', 'Auto', 'Autos', 'xe ô tô', 'car'],
    ['das', 'Fahrrad', 'Fahrräder', 'xe đạp', 'bicycle'], ['das', 'Flugzeug', 'Flugzeuge', 'máy bay', 'plane'],
    ['die', 'U-Bahn', 'U-Bahnen', 'tàu điện ngầm', 'underground, metro'], ['die', 'Haltestelle', 'Haltestellen', 'trạm dừng xe', 'stop (bus, tram)'],
    ['die', 'Fahrkarte', 'Fahrkarten', 'vé tàu xe', 'ticket'], ['der', 'Flughafen', 'Flughäfen', 'sân bay', 'airport'],
    ['der', 'Markt', 'Märkte', 'cái chợ', 'market'], ['der', 'Supermarkt', 'Supermärkte', 'siêu thị', 'supermarket'],
    ['die', 'Apotheke', 'Apotheken', 'hiệu thuốc', 'pharmacy'], ['das', 'Krankenhaus', 'Krankenhäuser', 'bệnh viện', 'hospital'],
    ['die', 'Bank', 'Banken', 'ngân hàng', 'bank'], ['die', 'Post', null, 'bưu điện', 'post office'],
    ['das', 'Restaurant', 'Restaurants', 'nhà hàng', 'restaurant'], ['das', 'Café', 'Cafés', 'quán cà phê', 'café'],
    ['das', 'Hotel', 'Hotels', 'khách sạn', 'hotel'], ['der', 'Park', 'Parks', 'công viên', 'park'],
    ['die', 'Kirche', 'Kirchen', 'nhà thờ', 'church'], ['das', 'Museum', 'Museen', 'bảo tàng', 'museum'],
    ['die', 'Ampel', 'Ampeln', 'đèn giao thông', 'traffic light'], ['der', 'Platz', 'Plätze', 'quảng trường; chỗ ngồi', 'square; seat'],
  ],
  schule: [
    ['die', 'Schule', 'Schulen', 'trường học', 'school'], ['der', 'Lehrer', 'Lehrer', 'thầy giáo', 'teacher (m)'],
    ['die', 'Lehrerin', 'Lehrerinnen', 'cô giáo', 'teacher (f)'], ['das', 'Buch', 'Bücher', 'quyển sách', 'book'],
    ['das', 'Heft', 'Hefte', 'quyển vở', 'exercise book'], ['der', 'Stift', 'Stifte', 'cây bút', 'pen'],
    ['der', 'Kuli', 'Kulis', 'bút bi', 'ballpoint pen'], ['die', 'Tafel', 'Tafeln', 'cái bảng', 'board'],
    ['das', 'Papier', null, 'giấy', 'paper'], ['die', 'Hausaufgabe', 'Hausaufgaben', 'bài tập về nhà', 'homework'],
    ['die', 'Prüfung', 'Prüfungen', 'kỳ thi', 'exam'], ['die', 'Frage', 'Fragen', 'câu hỏi', 'question'],
    ['die', 'Antwort', 'Antworten', 'câu trả lời', 'answer'], ['das', 'Wort', 'Wörter', 'từ', 'word'],
    ['der', 'Satz', 'Sätze', 'câu', 'sentence'], ['die', 'Sprache', 'Sprachen', 'ngôn ngữ', 'language'],
    ['die', 'Arbeit', 'Arbeiten', 'công việc', 'work'], ['der', 'Beruf', 'Berufe', 'nghề nghiệp', 'job, profession'],
    ['das', 'Büro', 'Büros', 'văn phòng', 'office'], ['der', 'Computer', 'Computer', 'máy tính', 'computer'],
    ['das', 'Handy', 'Handys', 'điện thoại di động', 'mobile phone'], ['die', 'Universität', 'Universitäten', 'trường đại học', 'university'],
    ['der', 'Kurs', 'Kurse', 'khóa học', 'course'],
  ],
  zeit: [
    ['der', 'Tag', 'Tage', 'ngày', 'day'], ['die', 'Woche', 'Wochen', 'tuần', 'week'],
    ['der', 'Monat', 'Monate', 'tháng', 'month'], ['das', 'Jahr', 'Jahre', 'năm', 'year'],
    ['die', 'Stunde', 'Stunden', 'giờ, tiếng', 'hour'], ['die', 'Minute', 'Minuten', 'phút', 'minute'],
    ['die', 'Uhr', 'Uhren', 'đồng hồ', 'clock, watch'], ['der', 'Morgen', 'Morgen', 'buổi sáng', 'morning'],
    ['der', 'Abend', 'Abende', 'buổi tối', 'evening'], ['die', 'Nacht', 'Nächte', 'ban đêm', 'night'],
    ['das', 'Wochenende', 'Wochenenden', 'cuối tuần', 'weekend'], ['der', 'Montag', 'Montage', 'thứ Hai', 'Monday'],
    ['der', 'Sonntag', 'Sonntage', 'Chủ nhật', 'Sunday'], ['der', 'Geburtstag', 'Geburtstage', 'sinh nhật', 'birthday'],
    ['der', 'Urlaub', 'Urlaube', 'kỳ nghỉ', 'holiday, vacation'], ['der', 'Termin', 'Termine', 'cuộc hẹn', 'appointment'],
  ],
  koerper: [
    ['der', 'Kopf', 'Köpfe', 'cái đầu', 'head'], ['das', 'Auge', 'Augen', 'con mắt', 'eye'],
    ['das', 'Ohr', 'Ohren', 'cái tai', 'ear'], ['die', 'Nase', 'Nasen', 'cái mũi', 'nose'],
    ['der', 'Mund', 'Münder', 'cái miệng', 'mouth'], ['der', 'Zahn', 'Zähne', 'cái răng', 'tooth'],
    ['die', 'Hand', 'Hände', 'bàn tay', 'hand'], ['der', 'Arm', 'Arme', 'cánh tay', 'arm'],
    ['das', 'Bein', 'Beine', 'cái chân', 'leg'], ['der', 'Fuß', 'Füße', 'bàn chân', 'foot'],
    ['der', 'Bauch', 'Bäuche', 'cái bụng', 'belly'], ['der', 'Rücken', 'Rücken', 'cái lưng', 'back'],
    ['das', 'Herz', 'Herzen', 'trái tim', 'heart'], ['der', 'Arzt', 'Ärzte', 'bác sĩ (nam)', 'doctor (m)'],
    ['die', 'Ärztin', 'Ärztinnen', 'bác sĩ (nữ)', 'doctor (f)'],
  ],
  kleidung: [
    ['die', 'Hose', 'Hosen', 'cái quần', 'trousers'], ['das', 'Hemd', 'Hemden', 'áo sơ mi', 'shirt'],
    ['das', 'T-Shirt', 'T-Shirts', 'áo phông', 'T-shirt'], ['der', 'Rock', 'Röcke', 'chân váy', 'skirt'],
    ['das', 'Kleid', 'Kleider', 'váy đầm', 'dress'], ['die', 'Jacke', 'Jacken', 'áo khoác', 'jacket'],
    ['der', 'Mantel', 'Mäntel', 'áo măng tô', 'coat'], ['der', 'Schuh', 'Schuhe', 'chiếc giày', 'shoe'],
    ['die', 'Mütze', 'Mützen', 'mũ len', 'woolly hat'], ['der', 'Schal', 'Schals', 'khăn quàng', 'scarf'],
    ['die', 'Tasche', 'Taschen', 'cái túi', 'bag'],
  ],
  natur: [
    ['das', 'Wetter', null, 'thời tiết', 'weather'], ['der', 'Regen', null, 'mưa', 'rain'],
    ['die', 'Sonne', 'Sonnen', 'mặt trời', 'sun'], ['der', 'Schnee', null, 'tuyết', 'snow'],
    ['der', 'Wind', 'Winde', 'gió', 'wind'], ['die', 'Wolke', 'Wolken', 'đám mây', 'cloud'],
    ['der', 'Himmel', 'Himmel', 'bầu trời', 'sky'], ['der', 'Baum', 'Bäume', 'cái cây', 'tree'],
    ['die', 'Blume', 'Blumen', 'bông hoa', 'flower'], ['der', 'Wald', 'Wälder', 'khu rừng', 'forest'],
    ['das', 'Meer', 'Meere', 'biển', 'sea'], ['der', 'Berg', 'Berge', 'ngọn núi', 'mountain'],
    ['der', 'Fluss', 'Flüsse', 'con sông', 'river'], ['der', 'See', 'Seen', 'cái hồ', 'lake'],
    ['der', 'Hund', 'Hunde', 'con chó', 'dog'], ['die', 'Katze', 'Katzen', 'con mèo', 'cat'],
    ['der', 'Vogel', 'Vögel', 'con chim', 'bird'],
  ],
  freizeit: [
    ['die', 'Musik', null, 'âm nhạc', 'music'], ['das', 'Lied', 'Lieder', 'bài hát', 'song'],
    ['der', 'Film', 'Filme', 'bộ phim', 'film'], ['das', 'Spiel', 'Spiele', 'trò chơi', 'game'],
    ['der', 'Sport', null, 'thể thao', 'sport'], ['das', 'Hobby', 'Hobbys', 'sở thích', 'hobby'],
    ['das', 'Geschenk', 'Geschenke', 'món quà', 'present'], ['das', 'Foto', 'Fotos', 'bức ảnh', 'photo'],
    ['die', 'Zeitung', 'Zeitungen', 'tờ báo', 'newspaper'], ['das', 'Fest', 'Feste', 'lễ hội, bữa tiệc', 'festival, party'],
    ['das', 'Konzert', 'Konzerte', 'buổi hòa nhạc', 'concert'], ['die', 'Reise', 'Reisen', 'chuyến đi', 'trip, journey'],
  ],
};

const VERBS: PlainRow[] = [
  ['sein', 'thì, là, ở', 'to be'], ['haben', 'có', 'to have'], ['gehen', 'đi (bộ)', 'to go, to walk'],
  ['kommen', 'đến', 'to come'], ['machen', 'làm', 'to make, to do'], ['essen', 'ăn', 'to eat'],
  ['trinken', 'uống', 'to drink'], ['schlafen', 'ngủ', 'to sleep'], ['lernen', 'học', 'to learn'],
  ['arbeiten', 'làm việc', 'to work'], ['wohnen', 'sống, ở', 'to live (somewhere)'], ['sprechen', 'nói', 'to speak'],
  ['lesen', 'đọc', 'to read'], ['schreiben', 'viết', 'to write'], ['hören', 'nghe', 'to hear, to listen'],
  ['sehen', 'nhìn, thấy', 'to see'], ['spielen', 'chơi', 'to play'], ['kaufen', 'mua', 'to buy'],
  ['bezahlen', 'trả tiền', 'to pay'], ['fahren', 'đi (bằng xe), lái xe', 'to go (by vehicle), to drive'], ['fliegen', 'bay', 'to fly'],
  ['kochen', 'nấu ăn', 'to cook'], ['fragen', 'hỏi', 'to ask'], ['antworten', 'trả lời', 'to answer'],
  ['verstehen', 'hiểu', 'to understand'], ['brauchen', 'cần', 'to need'], ['möchten', 'muốn (lịch sự)', 'would like'],
  ['können', 'có thể', 'can, to be able to'], ['müssen', 'phải', 'must, to have to'], ['heißen', 'tên là', 'to be called'],
  ['aufstehen', 'thức dậy (tách được: ich stehe … auf)', 'to get up (separable)'], ['anrufen', 'gọi điện (tách được: ich rufe … an)', 'to phone (separable)'],
  ['einkaufen', 'đi mua sắm (tách được)', 'to go shopping (separable)'],
];

const PHRASES: PlainRow[] = [
  ['Guten Morgen!', 'Chào buổi sáng!', 'Good morning!'], ['Guten Tag!', 'Xin chào! (ban ngày)', 'Hello! (daytime)'],
  ['Tschüss!', 'Tạm biệt!', 'Bye!'], ['Danke schön!', 'Cảm ơn nhiều!', 'Thank you very much!'],
  ['Bitte.', 'Xin mời. / Không có gì.', 'Please. / You’re welcome.'], ['Entschuldigung!', 'Xin lỗi!', 'Excuse me! / Sorry!'],
  ['Wie geht’s?', 'Bạn khỏe không?', 'How are you?'], ['Ich komme aus Vietnam.', 'Tôi đến từ Việt Nam.', 'I’m from Vietnam.'],
  ['Ich verstehe das nicht.', 'Tôi không hiểu điều đó.', 'I don’t understand that.'],
  ['Können Sie das bitte wiederholen?', 'Anh/chị nhắc lại được không ạ?', 'Could you repeat that, please?'],
  ['Wie viel kostet das?', 'Cái này giá bao nhiêu?', 'How much does this cost?'],
  ['Wo ist die Toilette?', 'Nhà vệ sinh ở đâu?', 'Where is the toilet?'],
  ['Ich hätte gern einen Kaffee.', 'Cho tôi một cà phê.', 'I’d like a coffee.'],
];

const examples = new Map(WORDS.map((w) => [w.de, w.example]));

export const STARTER_VERSION = 1;

export const STARTER_DECKS: { key: string; name: string; cards: CardFields[] }[] = [
  {
    key: 'a1-nomen',
    name: 'A1 · Nomen',
    cards: Object.entries(NOUNS).flatMap(([tag, rows]) => rows.map(([gender, de, plural, vi, en]): CardFields => ({
      de, gender, plural, vi, en, example: examples.get(de), tags: ['a1', tag],
    }))),
  },
  {
    key: 'a1-verben',
    name: 'A1 · Verben & Sätze',
    cards: [
      ...VERBS.map(([de, vi, en]): CardFields => ({ de, vi, en, tags: ['a1', 'verb'] })),
      ...PHRASES.map(([de, vi, en]): CardFields => ({ de, vi, en, tags: ['a1', 'satz'] })),
    ],
  },
];
