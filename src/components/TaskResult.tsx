import {Alert, Button, Modal} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import React, {useEffect, useState} from "react";
import {useAppSelector} from "../typings";
import {levels} from "../levels";
import {useTranslation} from "react-i18next";

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

  const {t} = useTranslation();

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
            {t("modal.upgrade.title")}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{t("modal.upgrade.success")}</p>
          <p>
            {t("modal.upgrade.proposal", { stars: nextLevel ? levels[nextLevel].stars : "" })}
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={upgradeLevel}>
            {t("modal.upgrade.next_button")}
          </Button>
        </Modal.Footer>
      </Modal>

      {!grading.error && (grading.score || grading.message) &&
        <Alert variant={typeof grading.score === 'number' && grading.score > 0 ? 'success' : 'danger'}>
          {!grading.error && grading.message &&
            <p style={{fontWeight: 'bold'}}>
              <FontAwesomeIcon icon={typeof grading.score === 'number' && grading.score > 0 ? 'check' : 'times'}/>
              <span dangerouslySetInnerHTML={{__html: grading.message}}/>
            </p>}
          {typeof grading.score === 'number' && taskData && taskData.version && false !== taskData.version.hints && false !== taskData.version.showScore &&
            <p>{t("score.label")} <span style={{fontWeight: 'bold'}}>{grading.score}</span></p>}
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
