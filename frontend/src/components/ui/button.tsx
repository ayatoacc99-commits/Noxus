import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noxus-primary/50 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-noxus-primary text-white hover:bg-noxus-primary-hover shadow-glow-sm',
        secondary: 'bg-noxus-secondary/20 text-noxus-secondary border border-noxus-secondary/30 hover:bg-noxus-secondary/30',
        success: 'bg-noxus-success/20 text-noxus-success border border-noxus-success/30 hover:bg-noxus-success/30',
        warning: 'bg-noxus-warning/20 text-noxus-warning border border-noxus-warning/30 hover:bg-noxus-warning/30',
        danger: 'bg-noxus-danger/20 text-noxus-danger border border-noxus-danger/30 hover:bg-noxus-danger/30',
        ghost: 'bg-noxus-surface text-noxus-text-secondary border border-noxus-border hover:bg-noxus-card hover:text-noxus-text',
        outline: 'border border-noxus-border bg-transparent hover:bg-noxus-surface text-noxus-text-secondary hover:text-noxus-text',
        link: 'text-noxus-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
