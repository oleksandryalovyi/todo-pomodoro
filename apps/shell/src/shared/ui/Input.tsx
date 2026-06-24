import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && <label className="text-xs text-gray-500 uppercase">{label}</label>}
        <input
          ref={ref}
          className={`bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-tomato ${className}`}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
