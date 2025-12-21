import { Collapse } from 'antd';
import { useTheme } from '../../../theme';

interface PropertySectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function PropertySection({
  title,
  children,
  defaultOpen = true,
}: PropertySectionProps) {
  const { theme: themeConfig } = useTheme();

  return (
    <Collapse
      defaultActiveKey={defaultOpen ? ['1'] : []}
      ghost
      items={[
        {
          key: '1',
          label: <span style={{ fontWeight: 500, color: themeConfig.colors.text.primary }}>{title}</span>,
          children: <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>,
        },
      ]}
    />
  );
}
