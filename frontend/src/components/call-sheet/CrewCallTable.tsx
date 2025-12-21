import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Table,
  Button,
  Space,
  Popconfirm,
  App,
  TimePicker,
  Input,
  Select,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { callSheetsApi } from '../../services/callSheets';
import { DEPARTMENTS, COMMON_POSITIONS } from '../../constants/departments';
import type { CrewCall } from '../../types/callSheet';
import AddCrewModal from './AddCrewModal';

interface Props {
  callSheetId: string;
  crewCalls: CrewCall[];
}

export default function CrewCallTable({ callSheetId, crewCalls }: Props) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CrewCall> }) =>
      callSheetsApi.updateCrew(id, dto),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['call-sheet', callSheetId] }),
    onError: () => {
      message.error('Failed to update');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: callSheetsApi.removeCrew,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', callSheetId] });
      message.success('Crew member removed');
    },
    onError: () => {
      message.error('Failed to delete');
    },
  });

  const columns = [
    {
      title: 'Department',
      dataIndex: 'department',
      width: 130,
      render: (val: string, record: CrewCall) => (
        <Select
          value={val}
          onChange={(newVal) =>
            updateMutation.mutate({
              id: record.id,
              dto: { department: newVal } as any,
            })
          }
          options={DEPARTMENTS}
          size="small"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Position',
      dataIndex: 'position',
      render: (val: string, record: CrewCall) => (
        <Select
          value={val}
          onChange={(newVal) =>
            updateMutation.mutate({
              id: record.id,
              dto: { position: newVal } as any,
            })
          }
          options={
            (COMMON_POSITIONS[record.department] || []).map((p) => ({
              label: p,
              value: p,
            })) || []
          }
          allowClear
          size="small"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      render: (val: string, record: CrewCall) => (
        <Input
          value={val}
          onChange={(e) =>
            updateMutation.mutate({
              id: record.id,
              dto: { name: e.target.value } as any,
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
      render: (val: string, record: CrewCall) => (
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
      title: 'Phone',
      dataIndex: 'phone',
      width: 120,
      render: (val: string, record: CrewCall) => (
        <Input
          value={val || ''}
          onChange={(e) =>
            updateMutation.mutate({
              id: record.id,
              dto: { phone: e.target.value } as any,
            })
          }
          size="small"
          type="tel"
        />
      ),
    },
    {
      title: '',
      width: 50,
      render: (_: any, record: CrewCall) => (
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
      title="Crew Calls"
      extra={
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => setAddModalOpen(true)}
        >
          Add Crew
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={crewCalls}
        rowKey="id"
        pagination={false}
        size="small"
      />

      <AddCrewModal
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
