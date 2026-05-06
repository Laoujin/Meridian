import { story } from '../data/story';

interface WelcomeProps {
  onStart: () => void;
}

export default function Welcome({ onStart }: WelcomeProps) {
  return (
    <div className="welcome">
      <img className="welcome__hero" src={story.opening.heroImage ?? '/start1.png'} alt="" />
      <h1 className="welcome__title">{story.opening.welcomeTitle}</h1>
      {story.opening.welcomeSubtitle && (
        <p className="welcome__joke">{story.opening.welcomeSubtitle}</p>
      )}
      <button className="welcome__btn" onClick={onStart}>
        Let&apos;s start
      </button>
    </div>
  );
}
