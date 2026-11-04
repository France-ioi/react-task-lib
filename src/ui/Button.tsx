import type {ButtonHTMLAttributes} from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'dark';
}

export function Button({variant = 'primary', className, type = 'button', ...props}: ButtonProps) {
  return (
    <button
      type={type}
      className={`fioi-button fioi-button--${variant}${className ? ` ${className}` : ''}`}
      {...props}
    />
  );
}
