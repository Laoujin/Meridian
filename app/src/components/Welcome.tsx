interface WelcomeProps {
  onStart: () => void;
}

export default function Welcome({ onStart }: WelcomeProps) {
  return (
    <div className="welcome">
      <img className="welcome__hero" src="/start1.png" alt="" />
      <h1 className="welcome__title">Happy Birthday!</h1>
      <p className="welcome__joke">
        You thought you were getting something nice...
      </p>
      <button className="welcome__btn" onClick={onStart}>
        Let&apos;s start
      </button>
    </div>
  );
}
