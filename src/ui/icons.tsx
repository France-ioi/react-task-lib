import type {SVGProps} from 'react';

/** Inline icons used by the lib (no icon font / FontAwesome dependency). */
type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: '1em',
  height: '1em',
  viewBox: '0 0 16 16',
  fill: 'currentColor',
  'aria-hidden': true,
  focusable: false,
  ...props,
  className: `fioi-icon${props.className ? ` ${props.className}` : ''}`,
});

export const CheckIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M13.5 3.3 6 10.8 2.5 7.3 1.1 8.7 6 13.6l8.9-8.9z" />
  </svg>
);

export const TimesIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12.7 2 8 6.6 3.3 2 2 3.3 6.6 8 2 12.7 3.3 14 8 9.4l4.7 4.6 1.3-1.3L9.4 8 14 3.3z" />
  </svg>
);

export const SpinnerIcon = (props: IconProps) => (
  <svg {...base({...props, className: `fioi-icon--spin${props.className ? ` ${props.className}` : ''}`})}>
    <path d="M8 1a7 7 0 1 0 7 7h-2a5 5 0 1 1-5-5z" />
  </svg>
);
