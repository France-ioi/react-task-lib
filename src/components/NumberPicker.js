import React from 'react';

export default ({minValue, maxValue, count, onChange}) => {
  const incrementCount = (value) => {
    changeCount(count + value);
  }

  const changeCount = (value) => {
    let newValue = value;
    if (null !== minValue) {
      newValue = Math.max(minValue, newValue);
    }
    if (null !== maxValue) {
      newValue = Math.min(maxValue, newValue);
    }

    onChange(newValue);
  }

  const handleCountChange = (e) => {
    changeCount(Number(e.target.value));
  }

  return (
    <div className="control picker-control">
      <div className="input-group number-input-group">
        <input type="button" value="-" className="button-minus" data-field="quantity" onClick={() => incrementCount(-1)}/>
        <input type="number" step="1" max="" value={count} name="quantity" className="quantity-field" onChange={(e) => handleCountChange(e)}/>
        <input type="button" value="+" className="button-plus" data-field="quantity" onClick={() => incrementCount(1)}/>
      </div>
    </div>
  );
}
