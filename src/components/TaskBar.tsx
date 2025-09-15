import React, {useState} from 'react';
import {Button, Modal} from 'react-bootstrap';
import {useAppSelector} from "../typings";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {useDispatch} from "react-redux";
import {useTranslation} from "react-i18next";

export function TaskBar() {
  const gradingLoading = useAppSelector(state => state.gradingLoading);
  const [restartModalShow, setRestartModalShow] = useState(false);
  const {platformValidate, taskRestart} = useAppSelector(state => state.actions);
  const dispatch = useDispatch();
  const {t} = useTranslation();

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
            {t("modal.restart.title")}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{t("modal.restart.body")}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setRestartModalShow(false)}>
            {t("modal.restart.cancel")}
          </Button>
          <Button variant="primary" onClick={() => _restart()}>
            {t("modal.restart.confirm")}
          </Button>
        </Modal.Footer>
      </Modal>
      <Button onClick={_validate} disabled={gradingLoading}>
        {gradingLoading ? <FontAwesomeIcon icon="spinner" spin/> : t("app.validate")}
      </Button>

      <Button onClick={() => setRestartModalShow(true)} variant="dark">
        {t("app.restart")}
      </Button>
    </div>
  );
}

export default TaskBar;
