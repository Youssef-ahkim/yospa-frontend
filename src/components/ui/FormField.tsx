interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  labelExtra?: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  required,
  error,
  children,
  labelExtra,
  className = "",
}: FormFieldProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-gray-700">
          {label}{" "}
          {required ? (
            <span className="text-red-500">*</span>
          ) : (
            <span className="text-gray-400 font-normal text-xs">(Optional)</span>
          )}
        </label>
        {labelExtra}
      </div>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
