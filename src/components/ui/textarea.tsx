import * as React from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onChange, onBlur, style, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      e.target.value = e.target.value.toUpperCase();
      onChange?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (e.target.value) {
        const trimmed = e.target.value.trimEnd();
        if (trimmed !== e.target.value) {
          e.target.value = trimmed;
          const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
          nativeTextAreaValueSetter?.call(e.target, trimmed);
          e.target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      onBlur?.(e);
    };

    return (
      <textarea
        className={cn(
          'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 uppercase',
          className
        )}
        style={{ textTransform: 'uppercase', ...style }}
        ref={ref}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };

