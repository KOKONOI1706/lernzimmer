import type { Card } from '../../learn/cards';
import type { Lang } from '../../i18n/strings';

/** Meaning in the UI language, falling back to the other translation. */
export function meaning(card: Pick<Card, 'vi' | 'en'>, lang: Lang): string {
  if (lang === 'vi') return card.vi || card.en || '';
  if (lang === 'en') return card.en || card.vi || '';
  return [card.vi, card.en].filter(Boolean).join(' · ');
}

export const exampleTranslation = (card: Pick<Card, 'example'>, lang: Lang) =>
  lang === 'vi' ? card.example?.vi ?? card.example?.en : card.example?.en ?? card.example?.vi;

/** German headword with its article in gender colour. */
export function Headword({ card, hideArticle = false }: { card: Pick<Card, 'de' | 'gender'>; hideArticle?: boolean }) {
  return (
    <span className="headword" lang="de">
      {card.gender && (hideArticle ? <span className="headword__blank">___</span> : <span className={`headword__art g-${card.gender}`}>{card.gender}</span>)}
      {card.gender && ' '}
      {card.de}
    </span>
  );
}

/** Full answer side: headword, plural, meaning, example. */
export function CardBack({ card, lang }: { card: Card; lang: Lang }) {
  const tr = exampleTranslation(card, lang);
  return (
    <div className={`cardface cardface--back ${card.gender ? `cardface--${card.gender}` : ''}`}>
      <div className="cardface__main"><Headword card={card} /></div>
      {card.gender && card.plural !== undefined && (
        <div className="cardface__plural" lang="de">{card.plural ? <><span className="g-die">die</span> {card.plural}</> : '—'}</div>
      )}
      <div className="cardface__meaning">{meaning(card, lang)}</div>
      {card.example && (
        <blockquote className="word__example">
          <span lang="de">„{card.example.de}“</span>
          {tr && <small>{tr}</small>}
        </blockquote>
      )}
    </div>
  );
}
