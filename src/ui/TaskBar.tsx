import {useState} from 'react';
import {useLibState, useLibTranslation, useRuntime} from '../react/context';
import {ValidateButtonStatus} from '../types';
import {Button} from './Button';
import {faSpinner} from '@fortawesome/free-solid-svg-icons';
import {Icon} from './icons';
import {Modal} from './Modal';

/** Validate / restart buttons. Hidden when the task is read-only. */
export function TaskBar() {
  const runtime = useRuntime();
  const t = useLibTranslation();
  const gradingLoading = useLibState((state) => state.gradingLoading);
  const status = useLibState((state) => state.validateButtonStatus);
  const readOnly = useLibState((state) => state.readOnly);
  const [restartModalOpen, setRestartModalOpen] = useState(false);

  if (readOnly) return null;

  const closeRestartModal = () => setRestartModalOpen(false);

  return (
    <div className="fioi-task-bar">
      <Modal
        open={restartModalOpen}
        onClose={closeRestartModal}
        title={t('modal.restart.title')}
        footer={
          <>
            <Button variant="secondary" onClick={closeRestartModal}>
              {t('modal.restart.cancel')}
            </Button>
            <Button
              onClick={() => {
                setRestartModalOpen(false);
                void runtime.restart();
              }}
            >
              {t('modal.restart.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('modal.restart.body')}</p>
      </Modal>
      {status !== ValidateButtonStatus.Hidden && (
        <Button
          onClick={() => void runtime.validate('done')}
          disabled={gradingLoading || status === ValidateButtonStatus.Disabled}
          aria-busy={gradingLoading}
        >
          {gradingLoading ? <Icon icon={faSpinner} spin aria-label={t('app.validate')} /> : t('app.validate')}
        </Button>
      )}
      <Button variant="dark" onClick={() => setRestartModalOpen(true)}>
        {t('app.restart')}
      </Button>
    </div>
  );
}
