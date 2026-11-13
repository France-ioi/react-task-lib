import type {ReactNode} from 'react';

export interface AlertProps {
  variant: 'success' | 'danger';
  children: ReactNode;
  className?: string;
}

export function Alert({variant, children, className}: AlertProps) {
  return (
    <div
      className={`fioi-alert fioi-alert--${variant}${className ? ` ${className}` : ''}`}
      role={variant === 'danger' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}
