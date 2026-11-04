import {useId, useState, type ReactNode} from 'react';
import {useLibTranslation} from '../react/context';
import {Button} from './Button';
import {Collapse} from './Collapse';
import {faChevronDown, faChevronUp, faXmark} from '@fortawesome/free-solid-svg-icons';
import {Icon} from './icons';
import {Modal} from './Modal';
import {Tutorial, useTutorialSlides} from './Tutorial';

export interface BlockProps {
  title: ReactNode;
  children?: ReactNode;
  /** Id of a page section holding tutorial slides (see Tutorial): adds a "show explanations" toggle. */
  tutorial?: string;
  /** The header toggles the content (default true). */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Adds a close button; with `closeConfirmText`, closing asks for confirmation. */
  onClose?: () => void;
  closeConfirmText?: ReactNode;
  className?: string;
}

/** A white section with a green title: the main layout block of tasks (v3 Collapsable + .main-block). */
export function Block({
  title,
  children,
  tutorial,
  collapsible = true,
  defaultOpen = true,
  onClose,
  closeConfirmText,
  className,
}: BlockProps) {
  const t = useLibTranslation();
  const contentId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const hasTutorial = useTutorialSlides(tutorial).length > 0;

  const close = () => {
    setConfirmClose(false);
    onClose?.();
  };

  return (
    <section className={`fioi-block${className ? ` ${className}` : ''}`}>
      <div
        className={`fioi-block__header${collapsible ? ' fioi-block__header--collapsible' : ''}`}
        onClick={collapsible ? () => setOpen(!open) : undefined}
      >
        <h2 className="fioi-block__title">{title}</h2>
        {hasTutorial ? (
          <button
            type="button"
            className="fioi-block__tutorial-toggle"
            aria-expanded={tutorialOpen}
            onClick={(event) => {
              event.stopPropagation();
              if (!tutorialOpen) setOpen(true);
              setTutorialOpen(!tutorialOpen);
            }}
          >
            {tutorialOpen ? t('tutorial.hide') : t('tutorial.show')}
            <Icon icon={tutorialOpen ? faChevronUp : faChevronDown} />
          </button>
        ) : null}
        {onClose ? (
          <button
            type="button"
            className="fioi-block__icon-button fioi-block__close"
            aria-label={t('modal.close')}
            onClick={(event) => {
              event.stopPropagation();
              if (closeConfirmText) setConfirmClose(true);
              else close();
            }}
          >
            <Icon icon={faXmark} />
          </button>
        ) : null}
        {collapsible ? (
          <button
            type="button"
            className="fioi-block__icon-button fioi-block__toggle"
            aria-expanded={open}
            aria-controls={contentId}
            aria-label={open ? t('block.collapse') : t('block.expand')}
            onClick={(event) => {
              event.stopPropagation();
              setOpen(!open);
            }}
          >
            <Icon icon={open ? faChevronUp : faChevronDown} />
          </button>
        ) : null}
      </div>
      <Collapse open={open} id={contentId}>
        {hasTutorial ? (
          <Collapse open={tutorialOpen}>
            <div className="fioi-block__tutorial">
              <Tutorial category={tutorial!} />
            </div>
          </Collapse>
        ) : null}
        <div className="fioi-block__body">{children}</div>
      </Collapse>
      {onClose && closeConfirmText ? (
        <Modal
          open={confirmClose}
          onClose={() => setConfirmClose(false)}
          title={t('modal.confirmation.title')}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmClose(false)}>
                {t('modal.confirmation.cancel')}
              </Button>
              <Button onClick={close}>{t('modal.confirmation.confirm')}</Button>
            </>
          }
        >
          <p>{closeConfirmText}</p>
        </Modal>
      ) : null}
    </section>
  );
}

export interface ContentBlockProps {
  title: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** A grey section with a green header bar (v3 .content-block), e.g. for the instructions. */
export function ContentBlock({title, icon, children, className}: ContentBlockProps) {
  return (
    <section className={`fioi-content-block${className ? ` ${className}` : ''}`}>
      <div className="fioi-content-block__header">
        {icon ? <span className="fioi-content-block__icon">{icon}</span> : null}
        <h2 className="fioi-content-block__title">{title}</h2>
      </div>
      <div className="fioi-content-block__body">{children}</div>
    </section>
  );
}
