import type {ReactNode} from 'react';

export function Alert({variant, children}: {variant: 'success' | 'danger'; children: ReactNode}) {
  return (
    <div className={`fioi-alert fioi-alert--${variant}`} role={variant === 'danger' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
