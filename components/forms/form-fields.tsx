/**
 * Reusable Form Field Components
 * Unified form field components using shadcn/ui
 * Following DRY principles and component composition
 */

"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Form Field Wrapper Component
 * Provides consistent label, error display, and required indicator
 */
interface FormFieldWrapperProps {
  label: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormFieldWrapper({
  label,
  error,
  required,
  htmlFor,
  className = "",
  children,
}: FormFieldWrapperProps) {
  const fieldId = htmlFor || label.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={fieldId}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}

/**
 * Text Input Component
 * Wrapper for Input with consistent error handling
 */
interface TextInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TextInput({
  id,
  value,
  onChange,
  error,
  required,
  type = "text",
  placeholder,
  disabled,
  className = "",
}: TextInputProps) {
  return (
    <Input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
      disabled={disabled}
      className={`${error ? "border-red-500" : ""} ${className}`}
    />
  );
}

/**
 * Number Input Component
 * Wrapper for number input with consistent error handling
 */
interface NumberInputProps {
  id: string;
  value: number | string;
  onChange: (value: number) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export function NumberInput({
  id,
  value,
  onChange,
  error,
  required,
  placeholder,
  min,
  max,
  step,
  disabled,
  className = "",
}: NumberInputProps) {
  return (
    <Input
      id={id}
      type="number"
      value={value}
      onChange={(e) => {
        const numValue = e.target.value === '' ? 0 : parseFloat(e.target.value);
        if (!isNaN(numValue)) {
          onChange(numValue);
        }
      }}
      required={required}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={`${error ? "border-red-500" : ""} ${className}`}
    />
  );
}

/**
 * Textarea Input Component
 * Wrapper for Textarea with consistent error handling
 */
interface TextareaInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
}

export function TextareaInput({
  id,
  value,
  onChange,
  error,
  required,
  placeholder,
  rows = 3,
  disabled,
  className = "",
}: TextareaInputProps) {
  return (
    <Textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={`${error ? "border-red-500" : ""} ${className}`}
    />
  );
}

/**
 * Select Input Component
 * Wrapper for Select with consistent error handling
 */
interface SelectInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  children: React.ReactNode;
  key?: string;
  className?: string;
}

export function SelectInput({
  id,
  value,
  onChange,
  error,
  required,
  placeholder,
  disabled,
  children,
  key,
  className = "",
}: SelectInputProps) {
  return (
    <Select
      key={key}
      value={value}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger
        className={`${error ? "border-red-500" : ""} ${className}`}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {children}
      </SelectContent>
    </Select>
  );
}

/**
 * Form Field Component (Complete)
 * Combines FormFieldWrapper with TextInput for convenience
 */
interface FormFieldProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function FormField({
  label,
  id,
  value,
  onChange,
  error,
  required,
  type = "text",
  placeholder,
  disabled,
  className = "",
}: FormFieldProps) {
  return (
    <FormFieldWrapper
      label={label}
      error={error}
      required={required}
      htmlFor={id}
      className={className}
    >
      <TextInput
        id={id}
        value={value}
        onChange={onChange}
        error={error}
        required={required}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
      />
    </FormFieldWrapper>
  );
}

/**
 * Form Number Field Component (Complete)
 * Combines FormFieldWrapper with NumberInput for convenience
 */
interface FormNumberFieldProps {
  label: string;
  id: string;
  value: number | string;
  onChange: (value: number) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export function FormNumberField({
  label,
  id,
  value,
  onChange,
  error,
  required,
  placeholder,
  min,
  max,
  step,
  disabled,
  className = "",
}: FormNumberFieldProps) {
  return (
    <FormFieldWrapper
      label={label}
      error={error}
      required={required}
      htmlFor={id}
      className={className}
    >
      <NumberInput
        id={id}
        value={value}
        onChange={onChange}
        error={error}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      />
    </FormFieldWrapper>
  );
}

/**
 * Form Textarea Field Component (Complete)
 * Combines FormFieldWrapper with TextareaInput for convenience
 */
interface FormTextareaFieldProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
}

export function FormTextareaField({
  label,
  id,
  value,
  onChange,
  error,
  required,
  placeholder,
  rows = 3,
  disabled,
  className = "",
}: FormTextareaFieldProps) {
  return (
    <FormFieldWrapper
      label={label}
      error={error}
      required={required}
      htmlFor={id}
      className={className}
    >
      <TextareaInput
        id={id}
        value={value}
        onChange={onChange}
        error={error}
        required={required}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
      />
    </FormFieldWrapper>
  );
}

/**
 * Form Select Field Component (Complete)
 * Combines FormFieldWrapper with SelectInput for convenience
 */
interface FormSelectFieldProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  children: React.ReactNode;
  key?: string;
  className?: string;
}

export function FormSelectField({
  label,
  id,
  value,
  onChange,
  error,
  required,
  placeholder,
  disabled,
  children,
  key,
  className = "",
}: FormSelectFieldProps) {
  return (
    <FormFieldWrapper
      label={label}
      error={error}
      required={required}
      htmlFor={id}
      className={className}
    >
      <SelectInput
        id={id}
        value={value}
        onChange={onChange}
        error={error}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        key={key}
      >
        {children}
      </SelectInput>
    </FormFieldWrapper>
  );
}

