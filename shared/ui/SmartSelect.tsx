"use client";

type SmartSelectOption = {
  label: string;
  value: string;
};

type SmartSelectProps = {
  label: string;
  value: string;
  options: SmartSelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
};

export function SmartSelect({
  label,
  value,
  options,
  placeholder = "Select option",
  onChange,
}: SmartSelectProps) {
  return (
    <div className="w-full">
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border bg-white p-3 text-sm outline-none focus:border-blue-500"
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
