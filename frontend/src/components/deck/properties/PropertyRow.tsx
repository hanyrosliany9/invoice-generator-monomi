import { useTheme } from '../../../theme';

interface PropertyRowProps {
  label: string;
  children: React.ReactNode;
  inline?: boolean;
}

export default function PropertyRow({
  label,
  children,
  inline = false,
}: PropertyRowProps) {
  const { theme: themeConfig } = useTheme();

  if (inline) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: 12, color: themeConfig.colors.text.secondary }}>{label}</label>
        {children}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, color: themeConfig.colors.text.secondary }}>{label}</label>
      {children}
    </div>
  );
}
