import React from 'react';
import {range} from 'range';

export default ({starsCount, rating}) => {
  const filledStars = starsCount * rating / 100;

  return (
    <span className="star-rating">
      {range(0, starsCount).map(star =>
        <svg
          key={star}
          height="18"
          version="1.1"
          width="20"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 22 22"
        >
          <path
            fill={star < filledStars ? '#ffc90e' : '#fff'}
            stroke="none"
            d="M25,60L5,37L35,30L50,5L65,30L95,37L75,60L78,90L50,77L22,90Z"
            transform="matrix(0.24,0,0,0.24,0,0)"
            strokeWidth="4.2"
          >
          </path>
          <path
            fill="none"
            stroke="#000000"
            d="M25,60L5,37L35,30L50,5L65,30L95,37L75,60L78,90L50,77L22,90Z"
            strokeWidth="5"
            transform="matrix(0.24,0,0,0.24,0,0)"
          >
          </path>
        </svg>
      )}
    </span>
  );
}
