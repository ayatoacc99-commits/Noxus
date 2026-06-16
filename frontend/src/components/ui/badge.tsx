import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-noxus-primary/20 text-noxus-primary border border-noxus-primary/30',
        success: 'bg-noxus-success/20 text-noxus-success border border-noxus-success/30',
        warning: 'bg-noxus-warning/20 text-noxus-warning border border-noxus-warning/30',
        danger: 'bg-noxus-danger/20 text-noxus-danger border border-noxus-danger/30',
        secondary: 'bg-noxus-secondary/20 text-noxus-secondary border border-noxus-secondary/30',
        outline: 'border border-noxus-border text-noxus-text-secondary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
