import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { authService } from '@/services/auth';

export interface UserChipProps {
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  size?: 'sm' | 'md';
  className?: string;
  /**
   * When true (default), wraps the chip in a DropdownMenu with Settings
   * and Sign out items.  Pass false to render a plain, non-interactive chip
   * (e.g. inside a list row).
   */
  interactive?: boolean;
}

const ChipInner = ({
  name,
  email,
  role,
  avatarUrl,
  size = 'md',
  className,
}: Omit<UserChipProps, 'interactive'>) => {
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

export const UserChip = ({
  name,
  email,
  role,
  avatarUrl,
  size = 'md',
  className,
  interactive = true,
}: UserChipProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  if (!interactive) {
    return (
      <ChipInner
        name={name}
        email={email}
        role={role}
        avatarUrl={avatarUrl}
        size={size}
        className={className}
      />
    );
  }

  const handleSignOut = async () => {
    // Best-effort: ask backend to invalidate the httpOnly refresh cookie.
    // If the request fails we still clear local state so the user is
    // never stuck in an authenticated-but-broken session.
    await authService.logout();
    logout();
    navigate('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-3 min-w-0 rounded-md px-1 py-1',
            'transition-colors hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-navy-ring/60',
            className,
          )}
          aria-label={t('auth.userMenu', 'User menu')}
        >
          <ChipInner
            name={name}
            email={email}
            role={role}
            avatarUrl={avatarUrl}
            size={size}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-44 bg-bg-raised border-border-subtle text-text-primary"
      >
        <DropdownMenuItem
          onClick={() => navigate('/settings')}
          className="gap-2 cursor-pointer focus:bg-bg-sunken focus:text-text-primary"
        >
          <Settings className="h-4 w-4 text-text-tertiary" />
          {t('auth.settings', 'Settings')}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border-subtle" />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="gap-2 cursor-pointer text-danger focus:bg-danger/10 focus:text-danger"
        >
          <LogOut className="h-4 w-4" />
          {t('auth.signOut', 'Sign out')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
