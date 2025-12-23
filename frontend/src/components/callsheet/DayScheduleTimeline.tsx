import { Timeline, Tag, Card, Typography } from 'antd';
import {
  ClockCircleOutlined,
  CameraOutlined,
  CoffeeOutlined,
  CarOutlined,
} from '@ant-design/icons';
import type { MealBreak, CompanyMove } from '../../types/callSheet';

const { Title } = Typography;

interface TimelineEvent {
  time: string;
  label: string;
  type: 'crew_call' | 'first_shot' | 'meal' | 'move' | 'wrap' | 'other';
  highlight?: boolean;
}

interface DayScheduleTimelineProps {
  crewCallTime?: string;
  firstShotTime?: string;
  estimatedWrap?: string;
  meals?: MealBreak[];
  moves?: CompanyMove[];
}

export function DayScheduleTimeline({
  crewCallTime,
  firstShotTime,
  estimatedWrap,
  meals = [],
  moves = [],
}: DayScheduleTimelineProps) {
  // Build timeline events and sort by time
  const events: TimelineEvent[] = [];

  if (crewCallTime) {
    events.push({
      time: crewCallTime,
      label: 'GENERAL CREW CALL',
      type: 'crew_call',
      highlight: true,
    });
  }
  if (firstShotTime) {
    events.push({
      time: firstShotTime,
      label: 'FIRST SHOT',
      type: 'first_shot',
      highlight: true,
    });
  }
  meals.forEach(meal => {
    events.push({
      time: meal.time,
      label: `${meal.mealType} (${meal.duration} min)${meal.location ? ` @ ${meal.location}` : ''}`,
      type: 'meal',
    });
  });
  moves.forEach(move => {
    events.push({
      time: move.departTime,
      label: `Company Move → ${move.toLocation}${move.travelTime ? ` (${move.travelTime} min)` : ''}`,
      type: 'move',
    });
  });
  if (estimatedWrap) {
    events.push({
      time: estimatedWrap,
      label: 'ESTIMATED WRAP',
      type: 'wrap',
      highlight: true,
    });
  }

  // Sort by time
  events.sort((a, b) => a.time.localeCompare(b.time));

  const getIcon = (type: string) => {
    switch (type) {
      case 'crew_call':
        return <ClockCircleOutlined />;
      case 'first_shot':
        return <CameraOutlined />;
      case 'meal':
        return <CoffeeOutlined />;
      case 'move':
        return <CarOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const getColor = (type: string, highlight?: boolean) => {
    if (highlight) return 'gold';
    switch (type) {
      case 'meal':
        return 'green';
      case 'move':
        return 'blue';
      default:
        return 'gray';
    }
  };

  if (events.length === 0) {
    return (
      <Card style={{ marginBottom: 16 }}>
        <Title level={4}>Day Schedule Timeline</Title>
        <p style={{ color: '#999' }}>No schedule events defined yet</p>
      </Card>
    );
  }

  return (
    <Card style={{ marginBottom: 16 }}>
      <Title level={4}>Day Schedule Timeline</Title>
      <Timeline
        items={events.map(event => ({
          color: getColor(event.type, event.highlight),
          dot: getIcon(event.type),
          children: (
            <div style={{ fontWeight: event.highlight ? 'bold' : 'normal', marginBottom: 8 }}>
              <Tag color={event.highlight ? 'gold' : 'default'}>{event.time}</Tag>
              <span style={{ marginLeft: 8 }}>{event.label}</span>
            </div>
          ),
        }))}
      />
    </Card>
  );
}
