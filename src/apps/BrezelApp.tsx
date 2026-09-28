import { useEffect, useState } from 'react';
import { useProfile, SHOP, type ShopItem } from '../gamify/store';
import { ACHIEVEMENTS, foodAt, FOOD_MAX, levelInfo, liveStreak, MAX_FREEZES, moodOf, QUEST_REWARD, type Mood, type Pet } from '../gamify/rules';
import { isoDate } from '../calendar/dates';
import { useSettings } from '../state/settings';
import { canSpeak, speak } from '../learn/tts';
import { Sprite, type SpriteName } from '../ui/Sprite';
import { fmt, useT, type StringKey } from '../i18n';
import type { Lang } from '../i18n/strings';

/** What Brezel says, in German with a translation (content, not UI strings). */
const LINES: Record<Mood, { de: string; tr: Record<Lang, string> }> = {
  happy: { de: 'Wuff! Heute lernen wir super!', tr: { vi: 'Gâu! Hôm nay mình học giỏi quá!', en: 'Woof! We’re learning great today!', de: '' } },
  ok: { de: 'Noch ein paar Karten? Ich hätte gern einen Snack.', tr: { vi: 'Thêm vài thẻ nữa nhé? Mình muốn ăn vặt chút.', en: 'A few more cards? I’d love a snack.', de: '' } },
  hungry: { de: 'Ich habe Hunger… Wiederhol ein paar Karten für mich!', tr: { vi: 'Mình đói quá… Ôn vài thẻ cho mình nhé!', en: 'I’m hungry… review a few cards for me!', de: '' } },
  sleepy: { de: 'Gähn… Es ist spät. Gute Nacht!', tr: { vi: 'Ngáp… Khuya rồi. Chúc ngủ ngon!', en: 'Yawn… It’s late. Good night!', de: '' } },
};

/** Brezel with his hat; `unit` = CSS px per art pixel of the dog sprite. */
export function PetView({ pet, mood, unit = 12 }: { pet: Pet; mood: Mood; unit?: number }) {
  return (
    <div className={`pet pet--${mood}`} style={{ width: 16 * unit, height: 16 * unit }}>
      <Sprite name="dachshund" px={unit} animate={mood !== 'sleepy'} />
      {pet.hat && (
        <Sprite name={pet.hat as SpriteName} px={unit / 2} animate={false} className="pet__hat"
          style={{ left: 7.5 * unit, top: pet.hat === 'non_la' ? -2.2 * unit : pet.hat === 'hat_beret' ? 0 : -0.8 * unit }} />
      )}
      {mood === 'sleepy' && <span className="pet__zzz">z Z z</span>}
      {mood === 'happy' && <Sprite name="sparkle" px={unit / 3} className="pet__spark" />}
    </div>
  );
}

function Bar({ value, max, cls }: { value: number; max: number; cls?: string }) {
  const n = 20, on = Math.round((value / max) * n);
  return <span className={`pbar ${cls ?? ''}`} aria-hidden>{Array.from({ length: n }, (_, i) => <i key={i} className={i < on ? 'on' : ''} />)}</span>;
}

export function BrezelApp() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const p = useProfile();
  const [now, setNow] = useState(Date.now());
  const [naming, setNaming] = useState(false);
  useEffect(() => { useProfile.getState().ensureToday(); const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);

  const mood = moodOf(p.pet, now);
  const food = foodAt(p.pet, now);
  const lv = levelInfo(p.xp);
  const streak = liveStreak(p.streak, isoDate(new Date(now)));
  const line = LINES[mood];

  return (
    <div className="brezel">
      <section className="brezel__hero">
        <button className="brezel__petbtn" onClick={() => canSpeak() && speak(line.de)} aria-label={line.de}>
          <PetView pet={p.pet} mood={mood} unit={10} />
        </button>
        <div className="brezel__side">
          <div className="brezel__name">
            {naming
              ? <input className="px-input" autoFocus defaultValue={p.pet.name} maxLength={20} onBlur={(e) => { p.renamePet(e.target.value); setNaming(false); }} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
              : <><b>{p.pet.name}</b><button className="px-btn" onClick={() => setNaming(true)}>{t('pet.rename')}</button></>}
          </div>
          <div className="px-dialog brezel__say" lang="de">
            ✱ {line.de}
            {line.tr[lang] && <small>{line.tr[lang]}</small>}
          </div>
          <div className="brezel__meter"><span className="px-label">{t('pet.food')}</span><Bar value={food} max={FOOD_MAX} cls="pbar--food" /></div>
          <p className="brezel__hint">{t('pet.feedHint')}</p>
        </div>
      </section>

      <section className="brezel__stats">
        <div className="brezel__stat brezel__stat--wide">
          <span className="px-label">Level</span>
          <b className="brezel__level">{lv.name}</b>
          <Bar value={lv.into} max={lv.needed} cls="pbar--xp" />
          <small>{lv.into} / {lv.needed} XP</small>
        </div>
        <div className="brezel__stat"><span className="px-label">{t('prof.streak')}</span><b><Sprite name="fire" px={2} /> {streak}</b><small>{t('prof.best')}: {p.streak.best}</small></div>
        <div className="brezel__stat"><span className="px-label">{t('prof.coins')}</span><b><Sprite name="coin" px={2} /> {p.coins}</b><small>❄ {p.streak.freezes}/{MAX_FREEZES}</small></div>
      </section>

      <section className="brezel__section">
        <h4 className="px-label">{t('quest.title')}</h4>
        <ul className="quests">
          {p.quests.list.map((q) => {
            const done = q.progress >= q.target;
            return (
              <li key={q.id} className={`quest ${q.claimed ? 'is-claimed' : done ? 'is-done' : ''}`}>
                <span className="quest__text">{fmt(t(`quest.${q.type}` as StringKey), { n: q.target })}</span>
                <Bar value={q.progress} max={q.target} cls="pbar--quest" />
                <span className="quest__count">{q.progress}/{q.target}</span>
                {q.claimed ? <span className="quest__claimed">{t('quest.claimed')}</span> : (
                  <button className="px-btn px-btn--primary" disabled={!done} title={`+${QUEST_REWARD.xp} XP · +${QUEST_REWARD.coins}`}
                    onClick={() => p.claimQuest(q.id)}>{t('quest.claim')}</button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="brezel__section">
        <h4 className="px-label">{t('ach.title')} · {Object.keys(p.achievements).length}/{ACHIEVEMENTS.length}</h4>
        <ul className="badges">
          {ACHIEVEMENTS.map((a) => {
            const at = p.achievements[a.id];
            return (
              <li key={a.id} className={`badge ${at ? 'is-on' : ''}`} title={at ? new Date(at).toLocaleDateString() : '?'}>
                <Sprite name={a.icon as SpriteName} px={2} animate={false} />
                <span>{t(`ach.${a.id}` as StringKey)}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="brezel__section">
        <h4 className="px-label">{t('shop.title')}</h4>
        <ul className="shop">
          {SHOP.map((it) => {
            const owned = it.id !== 'freeze' && p.owned.includes(it.id);
            const wearing = p.pet.hat === it.id;
            return (
              <li key={it.id} className="shop__item">
                <Sprite name={it.icon as SpriteName} px={3} animate={false} />
                <span className="shop__name">{t(`shop.${it.id}` as StringKey)}{it.id === 'freeze' && <small> ({p.streak.freezes}/{MAX_FREEZES})</small>}</span>
                {owned ? (
                  <button className="px-btn" onClick={() => p.wear(wearing ? undefined : it.id)}>{wearing ? t('shop.off') : t('shop.wear')}</button>
                ) : (
                  <button className="px-btn px-btn--primary" disabled={p.coins < it.price || (it.id === 'freeze' && p.streak.freezes >= MAX_FREEZES)} onClick={() => p.buy(it.id as ShopItem)}>
                    <Sprite name="coin" px={1} /> {it.price}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
