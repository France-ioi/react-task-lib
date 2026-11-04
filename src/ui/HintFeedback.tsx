import {useLibState, useLibTranslation} from '../react/context';
import {Alert} from './Alert';
import {CheckIcon, TimesIcon} from './icons';

/** Result of the last hint request (cleared on the next user change). */
export function HintFeedback() {
  const t = useLibTranslation();
  const data = useLibState((state) => state.hintRequest.data);
  if (!data) return null;

  if (data.success) {
    return (
      <Alert variant="success">
        <p>
          <CheckIcon /> {t('hints.fulfilled')}
        </p>
      </Alert>
    );
  }
  return (
    <Alert variant="danger">
      <p>
        <TimesIcon /> {t('hints.not_fulfilled')}
      </p>
      <p>
        {t('hints.code')} {data.code}
      </p>
      {data.error ? <p>{data.error}</p> : null}
    </Alert>
  );
}
