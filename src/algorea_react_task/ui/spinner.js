import React from 'react';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

function Spinner (_props) {
  return (
    <div className='text-center' style={{fontSize: '300%'}}>
      <FontAwesomeIcon icon="spinner" spin />
    </div>
  );
}

export default Spinner;
