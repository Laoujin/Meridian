import '../styles/closing.css';
import { story } from '../data/story';

interface GiftRevealProps {
  open: boolean;
  onClose: () => void;
}

export default function GiftReveal({ open, onClose }: GiftRevealProps) {
  if (!open) return null;

  return (
    <div className="gift-reveal" onClick={onClose}>
      <div className="gift-reveal__content">
        <div className="gift-reveal__box">{story.closing.giftRevealIcon ?? '🎁'}</div>
        <div className="gift-reveal__text">{story.closing.giftRevealText ?? 'A Present?'}</div>
      </div>
    </div>
  );
}
