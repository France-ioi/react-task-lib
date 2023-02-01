import React, {useEffect, useState} from 'react';
import {Button, Collapse, Modal} from 'react-bootstrap';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {useAppSelector} from "../typings";

export interface CollapsableProps {
  title: any,
  children: any,
  tutorial?: any,
  closable?: boolean,
  onClose?: () => void,
  closeConfirmText?: string,
}

export default React.memo(function Collapsable (props: CollapsableProps) {
  const {title, children, tutorial, closable, onClose, closeConfirmText} = props;

  const [open, setOpen] = useState(true);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [confirmCloseModal, setConfirmCloseModal] = useState(false);
  const taskVersion = useAppSelector(state => state.taskData ? state.taskData.version.version : null);

  useEffect(() => {
    setOpen(true);
  }, [taskVersion])

  const toggleTutorial = (event) => {
    event.stopPropagation();
    if (!tutorialOpen) {
      setOpen(true);
    }
    setTutorialOpen(!tutorialOpen);
  };

  const onClickClose = (event) => {
    event.stopPropagation();
    setConfirmCloseModal(true);
  };

  const doClose = () => {
    setConfirmCloseModal(false);
    onClose();
  };

  const newTitle = React.cloneElement(title, {
    onClick: () => setOpen(!open),
    children: [
      title.props.children,
      " ",
      ...(tutorial ? [
        <a className="tutorial-link" key="icon-tutorial" onClick={(e) => toggleTutorial(e)}>
          {tutorialOpen ? 'Cacher' : 'Lire'} les explications
          <FontAwesomeIcon className="icon-tutorial" icon={tutorialOpen ? 'chevron-up' : 'chevron-down'} size="xs"/>
        </a>
        ] : []),
      closable ? <FontAwesomeIcon key="icon-close" className="icon-close" icon="times" onClick={onClickClose}/> : null,
      <FontAwesomeIcon key="icon-collapse" className="icon-collapse" icon={open ? 'chevron-up' : 'chevron-down'} />,
    ]
  });

  return (
    <React.Fragment>
      <Modal
        show={confirmCloseModal}
        onHide={() => setConfirmCloseModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Confirmation
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{closeConfirmText}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmCloseModal(false)}>Annuler</Button>
          <Button variant="primary" onClick={() => doClose()}>Confirmer</Button>
        </Modal.Footer>
      </Modal>
      {newTitle}
      <Collapse in={open}>
        <div>
          <Collapse in={tutorialOpen}>
            <div className="carousel-container">
              {tutorial}
            </div>
          </Collapse>
          {children}
        </div>
      </Collapse>
    </React.Fragment>
  );
});
