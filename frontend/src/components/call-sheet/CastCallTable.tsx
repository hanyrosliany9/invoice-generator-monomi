import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Popconfirm,
  App,
  TimePicker,
  Input,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { callSheetsApi } from '../../services/callSheets';
import { CALL_STATUS_COLORS } from '../../constants/departments';
import type { CastCall, CreateCastCallDto } from '../../types/callSheet';
import AddCastModal from './AddCastModal';

interface Props {
  callSheetId: string;
  castCalls: CastCall[];
}

export default function CastCallTable({ callSheetId, castCalls }: Props) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CastCall> }) =>
      callSheetsApi.updateCast(id, dto),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['call-sheet', callSheetId] }),
    onError: () => {
      message.error('Failed to update');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: callSheetsApi.removeCast,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', callSheetId] });
      message.success('Cast member removed');
    },
    onError: () => {
      message.error('Failed to delete');
    },
  });

  const columns = [
    {
      title: '#',
      dataIndex: 'castNumber',
      width: 50,
      render: (val: string, record: CastCall) => (
        <Input
          value={val || ''}
          onChange={(e) =>
            updateMutation.mutate({
              id: record.id,
              dto: { castNumber: e.target.value } as any,
            })
          }
          style={{ width: 40 }}
          size="small"
        />
      ),
    },
    {
      title: 'Actor',
      dataIndex: 'actorName',
      render: (val: string, record: CastCall) => (
        <Input
          value={val}
          onChange={(e) =>
            updateMutation.mutate({
              id: record.id,
              dto: { actorName: e.target.value } as any,
            })
          }
          size="small"
        />
      ),
    },
    {
      title: 'Character',
      dataIndex: 'character',
      render: (val: string, record: CastCall) => (
        <Input
          value={val || ''}
          onChange={(e) =>
            updateMutation.mutate({
              id: record.id,
              dto: { character: e.target.value } as any,
            })
          }
          size="small"
        />
      ),
    },
    {
      title: 'Call Time',
      dataIndex: 'callTime',
      width: 120,
      render: (val: string, record: CastCall) => (
        <TimePicker
          value={val ? dayjs(val, 'h:mm A') : null}
          onChange={(time) =>
            updateMutation.mutate({
              id: record.id,
              dto: {
                callTime: time?.format('h:mm A') || val,
              } as any,
            })
          }
          format="h:mm A"
          use12Hours
          size="small"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (val: string) => (
        <Tag color={CALL_STATUS_COLORS[val] || 'default'}>{val}</Tag>
      ),
    },
    {
      title: '',
      width: 50,
      render: (_: any, record: CastCall) => (
        <Popconfirm
          title="Delete?"
          onConfirm={() => deleteMutation.mutate(record.id)}
        >
          <Button
            icon={<DeleteOutlined />}
            danger
            size="small"
            type="text"
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card
      title="Cast Calls"
      extra={
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => setAddModalOpen(true)}
        >
          Add Cast
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={castCalls}
        rowKey="id"
        pagination={false}
        size="small"
      />

      <AddCastModal
        open={addModalOpen}
        callSheetId={callSheetId}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['call-sheet', callSheetId] });
          setAddModalOpen(false);
        }}
      />
    </Card>
  );
}
