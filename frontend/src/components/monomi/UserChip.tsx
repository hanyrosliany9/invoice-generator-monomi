import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface UserChipProps {
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const UserChip = ({ name, email, role, avatarUrl, size = 'md', className }: UserChipProps) => {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const avatarSize = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  return (
    <div className={cn('flex items-center gap-3 min-w-0', className)}>
      <Avatar className={avatarSize}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
        <AvatarFallback className="bg-brand-navy text-brand-cream font-medium text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="text-sm font-medium text-text-primary truncate">{name}</div>
        {(email || role) && (
          <div className="text-xs text-text-tertiary truncate">
            {role && <span className="text-text-secondary">{role}</span>}
            {role && email && ' · '}
            {email}
          </div>
        )}
      </div>
    </div>
  );
};
