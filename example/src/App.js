import React from 'react';

import {Collapsable} from 'react-task-lib';
import 'bootstrap/dist/css/bootstrap.css';
import 'react-task-lib/dist/index.css';

const App = () => {
  return <div className="container" id="container">
    <div className="main-block">
      <Collapsable
        title={<div className="main-block-header">{"Texte chiffré"}</div>}
        tutorial={<div>dggfgfg</div>}
      >
        <div>Element</div>
      </Collapsable>
    </div>
  </div>;
}

export default App;
