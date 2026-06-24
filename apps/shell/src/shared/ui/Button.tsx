import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', ...props }, ref) => {
    const baseClasses = 'flex items-center gap-1 rounded-md font-medium transition-all';

    const variantClasses = {
      primary: 'bg-tomato text-white px-3 py-2 text-sm hover:opacity-90',
      secondary: 'bg-gray-700 text-gray-200 px-3 py-2 text-sm hover:opacity-90',
      ghost: 'border border-gray-600 text-gray-500 px-2 py-1 text-xs hover:text-gray-400',
    };

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
