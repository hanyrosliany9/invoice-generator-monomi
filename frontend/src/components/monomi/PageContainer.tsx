import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const PageContainer = ({
  className, children, ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8', className)} {...props}>
    {children}
  </div>
);
