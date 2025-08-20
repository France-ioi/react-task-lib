import React, {useState} from 'react';
import {Button, Modal} from 'react-bootstrap';
import {useAppSelector} from "../typings";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {useDispatch} from "react-redux";

function TaskBar() {
  const gradingLoading = useAppSelector(state => state.gradingLoading);
  const [restartModalShow, setRestartModalShow] = useState(false);
  const {platformValidate, taskRestart} = useAppSelector(state => state.actions);
  const dispatch = useDispatch();

  const _validate = () => {
    dispatch({type: platformValidate, payload: {mode: 'done'}});
  };
  const _restart = () => {
    dispatch({type: taskRestart});
    setRestartModalShow(false);
  };

  return (
    <div className='task-bar'>
      <Modal
        show={restartModalShow}
        onHide={() => setRestartModalShow(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Confirmation
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Êtes-vous certain de vouloir recommencer cette version à partir de zéro ?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setRestartModalShow(false)}>Annuler</Button>
          <Button variant="primary" onClick={() => _restart()}>Recommencer</Button>
        </Modal.Footer>
      </Modal>
      <Button onClick={_validate} disabled={gradingLoading}>
        {gradingLoading ? <FontAwesomeIcon icon="spinner" spin/> : 'Valider'}
      </Button>

      <Button onClick={() => setRestartModalShow(true)} variant="dark">
        {"Recommencer"}
      </Button>
    </div>
  );
}

export default TaskBar;
