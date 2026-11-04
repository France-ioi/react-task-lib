import {useState, type ReactNode} from 'react';
import {useLibTranslation} from '../react/context';
import {faChevronLeft, faChevronRight} from '@fortawesome/free-solid-svg-icons';
import {Icon} from './icons';

/** Slides with previous/next controls and indicators (no auto-play, no wrap — like v3). */
export function Carousel({slides, label}: {slides: ReactNode[]; label?: string}) {
  const t = useLibTranslation();
  const [current, setCurrent] = useState(0);
  const index = Math.min(current, slides.length - 1);
  if (!slides.length) return null;

  const go = (to: number) => setCurrent(Math.max(0, Math.min(slides.length - 1, to)));

  return (
    <div
      className="fioi-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'Left') go(index - 1);
        if (event.key === 'ArrowRight' || event.key === 'Right') go(index + 1);
      }}
    >
      <div
        className="fioi-carousel__slide"
        role="group"
        aria-roledescription="slide"
        aria-label={t('carousel.slide', {index: index + 1, count: slides.length})}
      >
        {slides[index]}
      </div>
      {index > 0 ? (
        <button
          type="button"
          className="fioi-carousel__control fioi-carousel__control--prev"
          aria-label={t('carousel.previous')}
          onClick={() => go(index - 1)}
        >
          <Icon icon={faChevronLeft} />
        </button>
      ) : null}
      {index < slides.length - 1 ? (
        <button
          type="button"
          className="fioi-carousel__control fioi-carousel__control--next"
          aria-label={t('carousel.next')}
          onClick={() => go(index + 1)}
        >
          <Icon icon={faChevronRight} />
        </button>
      ) : null}
      {slides.length > 1 ? (
        <div className="fioi-carousel__indicators">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`fioi-carousel__indicator${i === index ? ' fioi-carousel__indicator--active' : ''}`}
              aria-label={t('carousel.slide', {index: i + 1, count: slides.length})}
              aria-current={i === index}
              onClick={() => go(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
