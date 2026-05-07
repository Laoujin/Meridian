interface ScrollHintProps {
  visible: boolean;
}

export default function ScrollHint({ visible }: ScrollHintProps) {
  return (
    <div className={`scroll-hint${visible ? '' : ' scroll-hint--hidden'}`} aria-hidden={!visible}>
      <span className="scroll-hint__text">Scroll to begin</span>
      <span className="scroll-hint__chev" aria-hidden="true">⌄</span>
    </div>
  );
}
