import {useLibTranslation} from '../react/context';

export interface NumberPickerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number | null;
  max?: number | null;
  /** Step of the − / + buttons (default 1). */
  step?: number;
  /** − / + wrap around between min and max. */
  loop?: boolean;
  readOnly?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  'aria-label'?: string;
}

const isSet = (n: number | null | undefined): n is number => n !== null && n !== undefined;

/** A number field with − / + buttons, clamped to [min, max]. */
export function NumberPicker({
  value,
  onChange,
  min,
  max,
  step = 1,
  loop = false,
  readOnly = false,
  onFocus,
  onBlur,
  'aria-label': ariaLabel,
}: NumberPickerProps) {
  const t = useLibTranslation();

  const clamp = (n: number) => {
    let result = n;
    if (isSet(min)) result = Math.max(min, result);
    if (isSet(max)) result = Math.min(max, result);
    return result;
  };

  const increment = (delta: number) => {
    let next = value + delta;
    if (loop && isSet(min) && isSet(max)) {
      const size = max - min + 1;
      next = ((((next - min) % size) + size) % size) + min;
    }
    if ((isSet(min) && next < min) || (isSet(max) && next > max)) return;
    onChange(clamp(next));
  };

  const canLoop = loop && isSet(min) && isSet(max);

  return (
    <span className="fioi-number-picker">
      <button
        type="button"
        className="fioi-number-picker__button fioi-number-picker__button--minus"
        aria-label={t('number_picker.decrease')}
        onClick={() => increment(-step)}
        disabled={readOnly || (!canLoop && isSet(min) && value - step < min)}
      >
        −
      </button>
      <input
        type="number"
        className="fioi-number-picker__input"
        value={value}
        min={min ?? undefined}
        max={max ?? undefined}
        step={1}
        aria-label={ariaLabel}
        readOnly={readOnly}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (!isNaN(parsed)) onChange(clamp(parsed));
        }}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <button
        type="button"
        className="fioi-number-picker__button fioi-number-picker__button--plus"
        aria-label={t('number_picker.increase')}
        onClick={() => increment(step)}
        disabled={readOnly || (!canLoop && isSet(max) && value + step > max)}
      >
        +
      </button>
    </span>
  );
}
