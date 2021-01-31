import React, {useState} from 'react';
import {useStore} from 'react-redux'
import {Collapse} from 'react-bootstrap';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

export default React.memo(function Collapsable (props) {
  const [open, setOpen] = useState(true);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const {title, children} = props;
  const [previousVersion, setPreviousVersion] = useState(null);

  const store = useStore();
  store.subscribe(() => {
    const state = store.getState();
    if (state.taskData && state.taskData.version) {
      if (null !== previousVersion && previousVersion !== state.taskData.version.version) {
        setOpen(true);
      }
      setPreviousVersion(state.taskData.version.version);
    }
  });

  const toggleTutorial = (event) => {
    event.stopPropagation();
    if (!tutorialOpen) {
      setOpen(true);
    }
    setTutorialOpen(!tutorialOpen);
  };

  const newTitle = React.cloneElement(title, {
    onClick: () => setOpen(!open),
    children: [
      title.props.children,
      " ",
      ...(props.tutorial ? [
        <a className="tutorial-link" key="icon-tutorial" onClick={(e) => toggleTutorial(e)}>
          {tutorialOpen ? 'Cacher' : 'Lire'} les explications
          <FontAwesomeIcon className="icon-tutorial" icon={tutorialOpen ? 'chevron-up' : 'chevron-down'} size="xs"/>
        </a>
        ] : []),
      <FontAwesomeIcon key="icon-collapse" className="icon-collapse" icon={open ? 'chevron-up' : 'chevron-down'} />,
    ]
  });

  return (
    <React.Fragment>
      {newTitle}
      <Collapse in={open}>
        <div>
          <Collapse in={tutorialOpen}>
            <div className="carousel-container">
              {props.tutorial}
            </div>
          </Collapse>
          {children}
        </div>
      </Collapse>
    </React.Fragment>
  );
});
