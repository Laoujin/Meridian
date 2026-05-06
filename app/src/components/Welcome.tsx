import { story } from '../data/story';
import { asset } from '../utils/asset';

interface WelcomeProps {
  onStart: () => void;
}

export default function Welcome({ onStart }: WelcomeProps) {
  return (
    <div className="welcome">
      {story.opening.heroImage && (
        <img className="welcome__hero" src={asset(story.opening.heroImage)} alt="" />
      )}
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
