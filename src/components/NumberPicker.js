import React from 'react';

export default ({minValue, maxValue, increment, count, onChange, readOnly, loop, onFocus, onBlur}) => {
  const incrementValue = increment ? increment : 1;
  const incrementCount = (value) => {
    let newValue = count + value;
    if (loop) {
      newValue = ((newValue + (maxValue - minValue + 1)) % (maxValue - minValue + 1)) + minValue;
    }

    if (null !== minValue && undefined !== minValue && newValue < minValue) {
      return;
    }
    if (null !== maxValue && undefined !== maxValue && newValue > maxValue) {
      return;
    }

    changeCount(newValue);
  }
  const changeCount = (value) => {
    let newValue = value;
    if (null !== minValue && undefined !== minValue) {
      newValue = Math.max(minValue, newValue);
    }
    if (null !== maxValue && undefined !== maxValue) {
      newValue = Math.min(maxValue, newValue);
    }

    onChange(newValue);
  }

  const handleCountChange = (e) => {
    changeCount(Number(e.target.value));
  };

  return (
    <div className="control picker-control">
      <div className="input-group number-input-group">
        <input
          type="button"
          value="-"
          className="button-minus"
          data-field="quantity"
          onClick={() => incrementCount(-incrementValue)}
          disabled={readOnly || (!loop && null !== minValue && undefined !== minValue && count - incrementValue < minValue)}
        />
        <input
          type="number"
          step="1"
          max=""
          value={count}
          name="quantity"
          className="quantity-field"
          onChange={(e) => handleCountChange(e)}
          onFocus={onFocus}
          onBlur={onBlur}
          readOnly={readOnly}
        />
        <input
          type="button"
          value="+"
          className="button-plus"
          data-field="quantity"
          onClick={() => incrementCount(incrementValue)}
          disabled={readOnly || (!loop && null !== maxValue && undefined !== maxValue && count + incrementValue > maxValue)}
        />
      </div>
    </div>
  );
}
