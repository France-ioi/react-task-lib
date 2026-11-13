import {faSpinner} from '@fortawesome/free-solid-svg-icons';
import {Icon} from './icons';

export function Spinner() {
  return (
    <div className="fioi-spinner" role="status" aria-busy="true">
      <Icon icon={faSpinner} spin />
    </div>
  );
}
