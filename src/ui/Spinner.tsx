import {SpinnerIcon} from './icons';

export function Spinner() {
  return (
    <div className="fioi-spinner" role="status" aria-busy="true">
      <SpinnerIcon />
    </div>
  );
}
