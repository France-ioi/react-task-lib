import {LEVELS} from '../levels';
import {useLibState, useLibTranslation, useRuntime} from '../react/context';
import type {LevelName} from '../types';
import {Alert} from './Alert';
import {Button} from './Button';
import {faCheck, faXmark} from '@fortawesome/free-solid-svg-icons';
import {Icon} from './icons';
import {Modal} from './Modal';

export interface TaskResultProps {
  changeLevel: (level: LevelName, scroll: boolean) => void;
  /** false: only the next-level proposal (the task shows the grading itself). */
  showGrading?: boolean;
}

/** Grading result of the current version, and the "next level" proposal when solved. */
export function TaskResult({changeLevel, showGrading = true}: TaskResultProps) {
  const runtime = useRuntime();
  const t = useLibTranslation();
  const grading = useLibState((state) => state.grading);
  const taskData = useLibState((state) => state.taskData);
  const nextLevel = useLibState((state) => state.upgradeProposal);

  const success = typeof grading.score === 'number' && grading.score > 0;
  const showScore =
    typeof grading.score === 'number' && taskData?.version.hints !== false && taskData?.version.showScore !== false;

  return (
    <div className="fioi-result">
      <Modal
        open={nextLevel !== null}
        onClose={() => runtime.dismissUpgradeProposal()}
        title={t('modal.upgrade.title')}
        footer={
          <Button
            onClick={() => {
              runtime.dismissUpgradeProposal();
              if (nextLevel) changeLevel(nextLevel, true);
            }}
          >
            {t('modal.upgrade.next_button')}
          </Button>
        }
      >
        <p>{t('modal.upgrade.success')}</p>
        <p>{t('modal.upgrade.proposal', {stars: nextLevel ? LEVELS[nextLevel].stars : ''})}</p>
      </Modal>

      {showGrading && !grading.error && (grading.score || grading.message) ? (
        <Alert variant={success ? 'success' : 'danger'}>
          {grading.message ? (
            <p className="fioi-result__message">
              <Icon icon={success ? faCheck : faXmark} /> <span dangerouslySetInnerHTML={{__html: grading.message}} />
            </p>
          ) : null}
          {showScore ? (
            <p>
              {t('score.label')} <strong>{grading.score}</strong>
            </p>
          ) : null}
        </Alert>
      ) : null}
      {showGrading && grading.error ? (
        <Alert variant="danger">
          <Icon icon={faXmark} /> {t('error.validation')} {grading.error}
        </Alert>
      ) : null}
    </div>
  );
}
