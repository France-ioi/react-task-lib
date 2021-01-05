import React from 'react';

import {Collapsable, TutorialCarousel} from 'react-task-lib';
import 'bootstrap/dist/css/bootstrap.css';
import 'react-task-lib/dist/index.css';

const App = () => {
  return <div className="container" id="container">
    <div className="main-block">
      <Collapsable
        title={<div className="main-block-header">{"Texte chiffré"}</div>}
        tutorial={<TutorialCarousel>
          <div>
            <h3>Titre 1</h3>
            <p>Explication 1</p>
          </div>
          <div>
            <h3>Titre 2</h3>
            <p>Explication 2</p>
          </div>
        </TutorialCarousel>}
      >
        <div>Contenu du bloc</div>
      </Collapsable>
    </div>
  </div>;
}

export default App;
