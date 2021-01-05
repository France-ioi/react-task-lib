import React, {useState} from 'react';
import {Collapse} from 'react-bootstrap';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

export default React.memo(function Collapsable (props) {
  const [open, setOpen] = useState(true);
  const [tutorialOpen, setTutorialOpen] = useState(true);
  const {title, children} = props;

  const toggleTutorial = (event) => {
    event.stopPropagation();
    setTutorialOpen(!tutorialOpen);
  };

  const newTitle = React.cloneElement(title, {
    onClick: () => setOpen(!open),
    children: [
      <FontAwesomeIcon key="icon-tutorial" className="icon-tutorial" icon="question-circle" size="lg" onClick={(e) => toggleTutorial(e)}/>,
      <FontAwesomeIcon key="icon-collapse" className="icon-collapse" icon={open ? 'chevron-up' : 'chevron-down'} />,
      " ",
      title.props.children
    ]
  });

  return (
    <React.Fragment>
      {newTitle}
      <Collapse in={open}>
        <div>
          <Collapse in={tutorialOpen}>
            <div>
              {props.tutorial}
            </div>
          </Collapse>
          {children}
        </div>
      </Collapse>
    </React.Fragment>
  );
});
