import {useEffect, useState, type ReactNode} from 'react';
import {useLibTranslation} from '../react/context';
import {faChevronLeft, faChevronRight} from '@fortawesome/free-solid-svg-icons';
import {Icon} from './icons';

/** Must match the slide animation duration in _carousel.scss. */
const SLIDE_DURATION_MS = 600;

interface Leaving {
  from: number;
  direction: 'next' | 'prev';
}

/**
 * Slides with previous/next controls and indicators (no auto-play, no wrap — like v3). Changing
 * slide slides the new one in from the side while the old one leaves on the other side (v3
 * Bootstrap transition); navigating during the transition restarts it from the current slide.
 */
export function Carousel({slides, label}: {slides: ReactNode[]; label?: string}) {
  const t = useLibTranslation();
  const [current, setCurrent] = useState(0);
  // The slide still rendered while it slides out.
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const index = Math.min(current, slides.length - 1);

  useEffect(() => {
    if (!leaving) return undefined;
    const timeout = window.setTimeout(() => setLeaving(null), SLIDE_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [leaving]);

  if (!slides.length) return null;

  const go = (to: number) => {
    const target = Math.max(0, Math.min(slides.length - 1, to));
    if (target === index) return;
    setLeaving({from: index, direction: target > index ? 'next' : 'prev'});
    setCurrent(target);
  };
  const outgoing = leaving && leaving.from < slides.length ? leaving : null;

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
      <div className="fioi-carousel__inner">
        <div
          key={index}
          className={`fioi-carousel__slide${outgoing ? ` fioi-carousel__slide--enter-${outgoing.direction}` : ''}`}
          role="group"
          aria-roledescription="slide"
          aria-label={t('carousel.slide', {index: index + 1, count: slides.length})}
        >
          {slides[index]}
        </div>
        {outgoing ? (
          <div
            key={`leave-${outgoing.from}`}
            className={`fioi-carousel__slide fioi-carousel__slide--leave fioi-carousel__slide--leave-${outgoing.direction}`}
            aria-hidden="true"
          >
            {slides[outgoing.from]}
          </div>
        ) : null}
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
