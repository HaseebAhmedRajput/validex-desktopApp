 

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyle = "font-sans font-semibold text-xs tracking-wider uppercase py-2.5 px-4 rounded-lg transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border";
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-sm",
    secondary: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm",
    danger: "bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-sm",
    outline: "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-inner",
    ghost: "bg-transparent hover:bg-slate-50 text-slate-600 border-transparent",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading && (
        <div className="h-3.5 w-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin mr-1.5" />
      )}
      {children}
    </button>
  );
};
