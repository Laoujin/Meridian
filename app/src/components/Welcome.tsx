interface WelcomeProps {
  onStart: () => void;
}

export default function Welcome({ onStart }: WelcomeProps) {
  return (
    <div className="welcome">
      <div className="welcome__cake">🎂</div>
      <h1 className="welcome__title">Happy Birthday!</h1>
      <p className="welcome__joke">
        So you thought you were getting something nice?<br />
        But all you got was this app?
      </p>
      <button className="welcome__btn" onClick={onStart}>
        Let&apos;s start
      </button>
    </div>
  );
}
