'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { Eye, EyeOff, Search } from 'lucide-react'
import {
  Checkbox as CheckboxPrimitive,
  RadioGroup as RadioPrimitive,
  Select as SelectPrimitive,
  Switch as SwitchPrimitive,
} from 'radix-ui'
import {
  forwardRef,
  useId,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from './lib'

export const inputVariants = cva('nexo-input', {
  variants: {
    size: {
      sm: 'nexo-input--sm',
      md: 'nexo-input--md',
      lg: 'nexo-input--lg',
    },
  },
  defaultVariants: { size: 'md' },
})

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, size, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(inputVariants({ size }), className)}
      {...props}
    />
  )
})

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea ref={ref} className={cn('nexo-textarea', className)} {...props} />
  )
})

export const Label = forwardRef<
  HTMLLabelElement,
  ComponentPropsWithoutRef<'label'>
>(function Label({ className, ...props }, ref) {
  return <label ref={ref} className={cn('nexo-label', className)} {...props} />
})

export function FormField({
  children,
  description,
  error,
  label,
  optional = false,
}: {
  children: (ids: {
    controlId: string
    descriptionId: string | undefined
    errorId: string | undefined
  }) => ReactNode
  description?: string
  error?: string
  label: string
  optional?: boolean
}) {
  const id = useId()
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="nexo-field" data-invalid={Boolean(error) || undefined}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="nexo-field__optional">Opcional</span>}
      </Label>
      {children({ controlId: id, descriptionId, errorId })}
      {description && (
        <p className="nexo-field__description" id={descriptionId}>
          {description}
        </p>
      )}
      {error && (
        <p className="nexo-field__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function PasswordInput({
  toggleHideLabel = 'Ocultar senha',
  toggleShowLabel = 'Mostrar senha',
  ...props
}: InputProps & { toggleHideLabel?: string; toggleShowLabel?: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="nexo-input-group">
      <Input {...props} type={visible ? 'text' : 'password'} />
      <button
        className="nexo-input-action"
        type="button"
        aria-label={visible ? toggleHideLabel : toggleShowLabel}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </button>
    </div>
  )
}

export const SearchInput = forwardRef<
  HTMLInputElement,
  Omit<InputProps, 'type'>
>(function SearchInput({ className, ...props }, ref) {
  return (
    <div className="nexo-search-input">
      <Search aria-hidden="true" />
      <Input ref={ref} type="search" className={className} {...props} />
    </div>
  )
})

export const DateInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  function DateInput(props, ref) {
    return <Input ref={ref} type="date" {...props} />
  },
)

export const NativeSelect = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function NativeSelect({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn('nexo-select-native', className)}
      {...props}
    />
  )
})

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export function Select({
  ariaLabel,
  disabled,
  onValueChange,
  options,
  placeholder = 'Selecione',
  value,
}: {
  ariaLabel: string
  disabled?: boolean
  onValueChange?: (value: string) => void
  options: readonly SelectOption[]
  placeholder?: string
  value?: string
}) {
  return (
    <SelectPrimitive.Root
      {...(disabled === undefined ? {} : { disabled })}
      {...(onValueChange ? { onValueChange } : {})}
      {...(value === undefined ? {} : { value })}
    >
      <SelectPrimitive.Trigger className="nexo-select" aria-label={ariaLabel}>
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon aria-hidden="true">⌄</SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="nexo-select-content"
          position="popper"
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                className="nexo-select-item"
                {...(option.disabled === undefined
                  ? {}
                  : { disabled: option.disabled })}
                key={option.value}
                value={option.value}
              >
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator aria-hidden="true">
                  ✓
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

export function Combobox({
  id,
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  id: string
  label: string
  onChange?: (value: string) => void
  options: readonly SelectOption[]
  placeholder?: string
  value?: string
}) {
  const listId = `${id}-options`
  return (
    <div className="nexo-combobox">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        list={listId}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(event.currentTarget.value)}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </datalist>
    </div>
  )
}

export function Checkbox({
  checked,
  disabled,
  label,
  onCheckedChange,
}: {
  checked?: boolean
  disabled?: boolean
  label: string
  onCheckedChange?: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <div className="nexo-choice">
      <CheckboxPrimitive.Root
        className="nexo-checkbox"
        id={id}
        {...(checked === undefined ? {} : { checked })}
        {...(disabled === undefined ? {} : { disabled })}
        onCheckedChange={(next) => onCheckedChange?.(next === true)}
      >
        <CheckboxPrimitive.Indicator aria-hidden="true">
          ✓
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <Label htmlFor={id}>{label}</Label>
    </div>
  )
}

export function RadioGroup({
  label,
  onValueChange,
  options,
  value,
}: {
  label: string
  onValueChange?: (value: string) => void
  options: readonly SelectOption[]
  value?: string
}) {
  return (
    <RadioPrimitive.Root
      aria-label={label}
      className="nexo-radio-group"
      {...(onValueChange ? { onValueChange } : {})}
      {...(value === undefined ? {} : { value })}
    >
      {options.map((option) => {
        const optionId = `${label}-${option.value}`.replace(/\s+/gu, '-')
        return (
          <div className="nexo-choice" key={option.value}>
            <RadioPrimitive.Item
              className="nexo-radio"
              id={optionId}
              value={option.value}
              {...(option.disabled === undefined
                ? {}
                : { disabled: option.disabled })}
            >
              <RadioPrimitive.Indicator className="nexo-radio__indicator" />
            </RadioPrimitive.Item>
            <Label htmlFor={optionId}>{option.label}</Label>
          </div>
        )
      })}
    </RadioPrimitive.Root>
  )
}

export function Switch({
  checked,
  disabled,
  label,
  onCheckedChange,
}: {
  checked?: boolean
  disabled?: boolean
  label: string
  onCheckedChange?: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <div className="nexo-choice">
      <SwitchPrimitive.Root
        className="nexo-switch"
        id={id}
        {...(checked === undefined ? {} : { checked })}
        {...(disabled === undefined ? {} : { disabled })}
        {...(onCheckedChange ? { onCheckedChange } : {})}
      >
        <SwitchPrimitive.Thumb className="nexo-switch__thumb" />
      </SwitchPrimitive.Root>
      <Label htmlFor={id}>{label}</Label>
    </div>
  )
}

export function describedBy(
  ...ids: (string | undefined)[]
): string | undefined {
  const value = ids.filter(Boolean).join(' ')
  return value.length > 0 ? value : undefined
}

export function useFilteredOptions(
  options: readonly SelectOption[],
  query: string,
): readonly SelectOption[] {
  return useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR')
    return normalized.length === 0
      ? options
      : options.filter((option) =>
          option.label.toLocaleLowerCase('pt-BR').includes(normalized),
        )
  }, [options, query])
}
