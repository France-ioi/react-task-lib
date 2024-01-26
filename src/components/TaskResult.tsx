import {Alert, Button, Modal} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import React, {useEffect, useState} from "react";
import {useAppSelector} from "../typings";
import {levels} from "../levels";

export interface TaskResultProps {
  changeLevel: (level: string, scroll: boolean) => void,
}

export function TaskResult(props: TaskResultProps) {
  const grading = useAppSelector(state => state.grading);
  const taskData = useAppSelector(state => state.taskData);
  const [previousScore, setPreviousScore] = useState(0);
  const [upgradeModalShow, setUpgradeModalShow] = useState(false);
  const [nextLevel, setNextLevel] = useState(null);
  const clientVersions = useAppSelector(state => state.clientVersions);

  const upgradeLevel = () => {
    props.changeLevel(nextLevel, true);
    setUpgradeModalShow(false);
  };

  useEffect(() => {
    if (!clientVersions || !taskData) {
      return;
    }
    const versionLevelIndex = Object.keys(clientVersions).findIndex(key => clientVersions[key].version === taskData.version.version);
    if (null === versionLevelIndex || undefined === versionLevelIndex || versionLevelIndex >= Object.keys(clientVersions).length - 1) {
      return;
    }

    const nextLevel = Object.keys(clientVersions)[versionLevelIndex + 1];

    if (grading && grading.score === 100 && previousScore !== 100) {
      setUpgradeModalShow(true);
      setPreviousScore(grading.score);
      setNextLevel(nextLevel);
    } else if (!grading || grading.score !== previousScore) {
      setPreviousScore(grading.score);
    }
  }, [clientVersions, grading, taskData, previousScore]);

  return (
    <div className="result">
      <Modal
        show={upgradeModalShow}
        onHide={() => setUpgradeModalShow(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Bravo !
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Bravo, vous avez réussi !</p>
          <p>Nous vous proposons d'essayer la version {nextLevel ? levels[nextLevel].stars : ''} étoiles.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={upgradeLevel}>Passer à la suite</Button>
        </Modal.Footer>
      </Modal>

      {!grading.error && (grading.score || grading.message) &&
        <Alert variant={typeof grading.score === 'number' && grading.score > 0 ? 'success' : 'danger'}>
          {!grading.error && grading.message &&
            <p style={{fontWeight: 'bold'}}>
              <FontAwesomeIcon icon={typeof grading.score === 'number' && grading.score > 0 ? 'check' : 'times'}/>
              <span dangerouslySetInnerHTML={{__html: grading.message}}/>
            </p>}
          {typeof grading.score === 'number' && taskData && taskData.version && false !== taskData.version.hints &&
            <p><br/>{"Votre score : "}<span style={{fontWeight: 'bold'}}>{grading.score}</span></p>}
        </Alert>
      }
      {grading.error &&
        <Alert variant='danger'>
          <FontAwesomeIcon icon="times"/>
          {grading.error}
        </Alert>
      }
    </div>
  );
}
