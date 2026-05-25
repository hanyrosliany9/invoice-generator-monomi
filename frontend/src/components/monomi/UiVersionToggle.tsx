import { Sparkles, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUiVersion } from '@/hooks/useUiVersion';

export const UiVersionToggle = ({ canShow }: { canShow: boolean }) => {
  const { isV2, toggle } = useUiVersion();
  if (!canShow) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => { toggle(); location.reload(); }}
      className="rounded-full text-xs font-medium border-border-default hover:bg-bg-glass"
    >
      {isV2 ? (
        <><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Back to classic</>
      ) : (
        <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Try new design</>
      )}
    </Button>
  );
};
