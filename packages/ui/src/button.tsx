import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './lib'

export const buttonVariants = cva('nexo-button', {
  variants: {
    variant: {
      primary: 'nexo-button--primary',
      secondary: 'nexo-button--secondary',
      ghost: 'nexo-button--ghost',
      outline: 'nexo-button--outline',
      destructive: 'nexo-button--destructive',
    },
    size: {
      sm: 'nexo-button--sm',
      md: 'nexo-button--md',
      lg: 'nexo-button--lg',
    },
    block: { true: 'nexo-button--block' },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
})

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  loadingLabel?: string
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
}

export function Button({
  block,
  children,
  className,
  disabled,
  leadingIcon,
  loading = false,
  loadingLabel = 'Carregando',
  size,
  trailingIcon,
  type = 'button',
  variant,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ block, size, variant }), className)}
      disabled={loading ? true : disabled}
      type={type}
      aria-busy={loading ? true : undefined}
      {...props}
    >
      {loading ? (
        <span
          className="nexo-spinner nexo-spinner--button"
          aria-hidden="true"
        />
      ) : (
        leadingIcon
      )}
      <span>{loading ? loadingLabel : children}</span>
      {!loading && trailingIcon}
    </button>
  )
}

export interface IconButtonProps
  extends Omit<ButtonProps, 'children' | 'leadingIcon' | 'trailingIcon'> {
  label: string
  icon: ReactNode
}

export function IconButton({ icon, label, ...props }: IconButtonProps) {
  return (
    <Button className="nexo-icon-button" aria-label={label} {...props}>
      <span aria-hidden="true">{icon}</span>
    </Button>
  )
}
