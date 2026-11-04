import {useId} from 'react';

const STAR_PATH = 'M25,60L5,37L35,30L50,5L65,30L95,37L75,60L78,90L50,77L22,90Z';

/** `starsCount` stars, filled proportionally to `rating` (0–100). */
export function Stars({starsCount, rating}: {starsCount: number; rating: number}) {
  // React ids contain characters that are not safe in url(#…) references for old browsers.
  const id = `fioi${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const filledStars = (starsCount * rating) / 100;

  return (
    <span className="fioi-stars" aria-label={`${rating}%`}>
      {Array.from({length: starsCount}, (_, star) => {
        const fill = star < filledStars - 1 ? 1 : star > filledStars ? 0 : filledStars - star;
        const clipId = `${id}-star-${star}`;
        return (
          <svg
            key={star}
            height="18"
            width="20"
            viewBox="0 0 22 22"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <clipPath id={clipId} clipPathUnits="objectBoundingBox">
              <rect x="0" y="0" width={fill} height="1" />
            </clipPath>
            <path fill="#fff" stroke="none" d={STAR_PATH} transform="matrix(0.24,0,0,0.24,0,0)" />
            <path
              fill="#ffc90e"
              stroke="none"
              d={STAR_PATH}
              clipPath={`url(#${clipId})`}
              transform="matrix(0.24,0,0,0.24,0,0)"
            />
            <path fill="none" stroke="#000" d={STAR_PATH} strokeWidth="5" transform="matrix(0.24,0,0,0.24,0,0)" />
          </svg>
        );
      })}
    </span>
  );
}
