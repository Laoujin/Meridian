import '../styles/closing.css';

interface ClosingSequenceProps {
  onWhatsNext: () => void;
}

export default function ClosingSequence({ onWhatsNext }: ClosingSequenceProps) {
  return (
    <div className="closing-sequence closing-sequence--bottom">
      <div className="closing-whats-next">
        <button className="closing-whats-next__btn" onClick={onWhatsNext}>
          what's next? ✨
        </button>
      </div>
    </div>
  );
}
