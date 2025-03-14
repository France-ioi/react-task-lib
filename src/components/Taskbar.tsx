import React from 'react';
import {Button} from 'react-bootstrap';
import {useAppSelector} from "../typings";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

function TaskBar (props) {
  const gradingLoading = useAppSelector(state => state.gradingLoading);

  return (
     <div className='task-bar'>
        <Button onClick={props.onValidate} disabled={gradingLoading}>
          {gradingLoading ? <FontAwesomeIcon icon="spinner" spin /> : 'Valider' }
        </Button>

       <Button onClick={props.onRestart} variant="dark">
         {"Recommencer"}
       </Button>
     </div>
  );
}

export default TaskBar;
