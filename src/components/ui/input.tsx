import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const EXCLUDED_TYPES = ['number', 'date', 'datetime-local', 'time', 'email', 'password', 'color', 'range', 'file', 'hidden'];

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onChange, onBlur, style, ...props }, ref) => {
    const shouldUppercase = !type || !EXCLUDED_TYPES.includes(type);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (shouldUppercase) {
        e.target.value = e.target.value.toUpperCase();
      }
      onChange?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (e.target.value) {
        const trimmed = e.target.value.trimEnd();
        if (trimmed !== e.target.value) {
          e.target.value = trimmed;
          // Trigger a synthetic onChange so react-hook-form picks it up
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          nativeInputValueSetter?.call(e.target, trimmed);
          e.target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      onBlur?.(e);
    };

    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-primary/50 focus-visible:shadow-glow-blue/10 disabled:cursor-not-allowed disabled:opacity-50',
          shouldUppercase && 'uppercase',
          className
        )}
        style={shouldUppercase ? { textTransform: 'uppercase', ...style } : style}
        ref={ref}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };

