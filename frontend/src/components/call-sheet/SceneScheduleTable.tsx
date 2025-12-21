import { Card, Table, Typography } from 'antd';
import type { CallSheetScene } from '../../types/callSheet';

const { Text } = Typography;

interface Props {
  callSheetId: string;
  scenes: CallSheetScene[];
}

export default function SceneScheduleTable({ callSheetId, scenes }: Props) {
  const columns = [
    {
      title: 'Scene #',
      dataIndex: 'sceneNumber',
      width: 80,
    },
    {
      title: 'Scene Name',
      dataIndex: 'sceneName',
    },
    {
      title: 'INT/EXT',
      dataIndex: 'intExt',
      width: 100,
    },
    {
      title: 'Day/Night',
      dataIndex: 'dayNight',
      width: 100,
    },
    {
      title: 'Location',
      dataIndex: 'location',
    },
    {
      title: 'Pages',
      dataIndex: 'pageCount',
      width: 70,
      render: (val: number) => (val ? val.toFixed(2) : '0'),
    },
    {
      title: 'Cast',
      dataIndex: 'castIds',
      width: 80,
      render: (val: string) => (
        <Text type="secondary">{val || '-'}</Text>
      ),
    },
  ];

  return (
    <Card title="Scene Schedule">
      <Table
        columns={columns}
        dataSource={scenes}
        rowKey="id"
        pagination={false}
        size="small"
      />
    </Card>
  );
}
