import { useTranslation } from 'react-i18next';
import { Modal } from 'antd';
import { ShortcutTable } from '@/components/shortcuts/ShortcutTable';
import { getArea, type ShortcutArea, shortcutsInArea } from '@/shortcuts/registry';
import { openShortcutsHelp } from '@/shortcuts/helpKey';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

// The deck editor's own keys, then what works while presenting, then app-wide keys.
const AREAS: ShortcutArea[] = ['deckEditor', 'presentation', 'global'];

/** Deck editor shortcuts dialog. Content comes from src/shortcuts/registry.ts. */
export default function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      title={t('shortcuts.ui.title')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      centered
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 } }}
    >
      <div data-testid="deck-shortcuts" className="space-y-5">
        {AREAS.map((area) => (
          <section key={area} aria-labelledby={`deck-sc-${area}`}>
            <h3 id={`deck-sc-${area}`} className="mb-1 text-sm font-semibold text-text-primary">
              {t(getArea(area).labelKey)}
            </h3>
            <ShortcutTable shortcuts={shortcutsInArea(area, 'staff')} dense />
          </section>
        ))}
        <button
          type="button"
          onClick={() => { onClose(); openShortcutsHelp(); }}
          className="text-sm text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
        >
          {t('shortcuts.ui.openOverlay')}
        </button>
      </div>
    </Modal>
  );
}
