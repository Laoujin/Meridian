import { story } from '../data/story';

export default function OpeningCard() {
  const card = story.opening.card;
  if (!card) return null;

  return (
    <div className="opening-card">
      {card.icon && <div className="opening-card__heart">{card.icon}</div>}
      {card.date && <div className="opening-card__date">{card.date}</div>}
      {card.text && <div className="opening-card__text">{card.text}</div>}
    </div>
  );
}
