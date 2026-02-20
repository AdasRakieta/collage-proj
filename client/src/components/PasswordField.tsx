import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

const PasswordField: React.FC<PasswordFieldProps> = ({ label, icon, ...props }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      {label && (
        <label htmlFor={props.id} className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
            {icon}
          </span>
        )}
        <input
          {...props}
          type={visible ? 'text' : 'password'}
          className={
            // always keep user's custom classes but add padding if icon exists
            `${props.className ? props.className : 'w-full pr-12 py-3 rounded-xl bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all'} ${icon ? 'pl-12' : ''}`.trim()
          }
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className={
            `absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-transform duration-200 ` +
            (visible ? 'rotate-180' : '')
          }
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
};

export default PasswordField;
