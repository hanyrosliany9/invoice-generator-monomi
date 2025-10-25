import React, { useMemo } from 'react'
import { Card, Empty, Space, Tag, Tooltip } from 'antd'
import { ProjectMilestone } from '../../services/milestones'
import { getStatusColor, getPriorityColor, buildDependencyTree, calculateCriticalPath } from '../../utils/calendarUtils'
import { formatIDR } from '../../utils/currency'
import dayjs from 'dayjs'

interface DependencyVisualizationProps {
  milestones: ProjectMilestone[]
  onMilestoneClick: (milestone: ProjectMilestone) => void
}

interface NodePosition {
  x: number
  y: number
  milestone: ProjectMilestone
}

/**
 * Dependency Visualization - Shows milestone dependencies as a directed acyclic graph
 * Visual representation with:
 * - Nodes for each milestone
 * - Connecting lines showing dependencies
 * - Color coding for status and priority
 * - Critical path highlighting
 */
export const DependencyVisualization: React.FC<DependencyVisualizationProps> = ({
  milestones,
  onMilestoneClick,
}) => {
  if (milestones.length === 0) {
    return <Empty description="No milestones to display" />
  }

  const dependencyTree = useMemo(() => buildDependencyTree(milestones), [milestones])
  const criticalPath = useMemo(() => calculateCriticalPath(milestones), [milestones])

  // Calculate node positions using a hierarchical layout
  const nodePositions = useMemo(() => {
    const positions = new Map<string, NodePosition>()
    const levels = new Map<number, string[]>()

    // Group nodes by level
    dependencyTree.forEach((node) => {
      const levelNodes = levels.get(node.level) || []
      levelNodes.push(node.milestoneId)
      levels.set(node.level, levelNodes)
    })

    // Calculate positions
    const levelHeight = 100
    const nodeWidth = 200
    let maxNodesInLevel = 0

    levels.forEach((nodes) => {
      maxNodesInLevel = Math.max(maxNodesInLevel, nodes.length)
    })

    const canvasWidth = Math.max(800, maxNodesInLevel * nodeWidth + 100)

    levels.forEach((nodes, level) => {
      const levelWidth = nodes.length * nodeWidth
      const startX = (canvasWidth - levelWidth) / 2

      nodes.forEach((nodeId, index) => {
        const milestone = milestones.find((m) => m.id === nodeId)
        if (milestone) {
          positions.set(nodeId, {
            x: startX + index * nodeWidth,
            y: level * levelHeight + 50,
            milestone,
          })
        }
      })
    })

    return positions
  }, [dependencyTree, milestones])

  const canvasHeight = useMemo(() => {
    let maxLevel = 0
    dependencyTree.forEach((node) => {
      maxLevel = Math.max(maxLevel, node.level)
    })
    return (maxLevel + 1) * 100 + 100
  }, [dependencyTree])

  const canvasWidth = useMemo(() => {
    let maxX = 0
    nodePositions.forEach((pos) => {
      maxX = Math.max(maxX, pos.x + 200)
    })
    return Math.max(800, maxX + 50)
  }, [nodePositions])

  // SVG rendering with dependency lines
  return (
    <Card
      title="Dependency Visualization"
      style={{ marginTop: '24px' }}
    >
      <div style={{ overflowX: 'auto' }}>
        <svg
          width={canvasWidth}
          height={canvasHeight}
          style={{
            border: '1px solid #d9d9d9',
            backgroundColor: '#fafafa',
            borderRadius: '4px',
          }}
        >
          {/* Render dependency lines first (background) */}
          {milestones.map((milestone) => {
            const fromPos = nodePositions.get(milestone.id)
            if (!fromPos || !milestone.predecessorId) return null

            const toPos = nodePositions.get(milestone.predecessorId)
            if (!toPos) return null

            const isCritical =
              criticalPath.includes(milestone.id) &&
              criticalPath.includes(milestone.predecessorId)

            return (
              <g key={`line-${milestone.id}`}>
                {/* Arrow line */}
                <path
                  d={`M ${fromPos.x + 100} ${fromPos.y}
                     L ${fromPos.x + 100} ${(fromPos.y + toPos.y) / 2}
                     L ${toPos.x + 100} ${(fromPos.y + toPos.y) / 2}
                     L ${toPos.x + 100} ${toPos.y + 40}`}
                  stroke={isCritical ? '#ff4d4f' : '#1890ff'}
                  strokeWidth={isCritical ? 2 : 1.5}
                  fill="none"
                  markerEnd={`url(#arrowhead-${isCritical ? 'critical' : 'normal'})`}
                  strokeDasharray={isCritical ? '0' : '5,5'}
                  opacity={0.7}
                />
              </g>
            )
          })}

          {/* Arrow markers */}
          <defs>
            <marker
              id="arrowhead-normal"
              markerWidth="10"
              markerHeight="10"
              refX="5"
              refY="5"
              orient="auto"
            >
              <polygon points="0 0, 10 5, 0 10" fill="#1890ff" />
            </marker>
            <marker
              id="arrowhead-critical"
              markerWidth="10"
              markerHeight="10"
              refX="5"
              refY="5"
              orient="auto"
            >
              <polygon points="0 0, 10 5, 0 10" fill="#ff4d4f" />
            </marker>
          </defs>

          {/* Render nodes (foreground) */}
          {Array.from(nodePositions.entries()).map(([milestoneId, pos]) => {
            const isCritical = criticalPath.includes(milestoneId)
            const node = dependencyTree.get(milestoneId)
            const hasChildren = node && node.children.length > 0

            return (
              <g key={`node-${milestoneId}`}>
                {/* Node shadow */}
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={200}
                  height={40}
                  rx={4}
                  fill={isCritical ? 'rgba(255, 77, 79, 0.1)' : 'rgba(0, 0, 0, 0.02)'}
                  stroke={isCritical ? '#ff4d4f' : getStatusColor(pos.milestone.status)}
                  strokeWidth={isCritical ? 2 : 1.5}
                  cursor="pointer"
                  onClick={() => onMilestoneClick(pos.milestone)}
                  style={{
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))'
                    e.currentTarget.style.strokeWidth = String(isCritical ? 3 : 2)
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = 'none'
                    e.currentTarget.style.strokeWidth = String(isCritical ? 2 : 1.5)
                  }}
                />

                {/* Priority border */}
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={4}
                  height={40}
                  rx={2}
                  fill={getPriorityColor(pos.milestone.priority)}
                />

                {/* Node label */}
                <text
                  x={pos.x + 10}
                  y={pos.y + 15}
                  fontSize="12"
                  fontWeight="bold"
                  fill="#262626"
                  cursor="pointer"
                  onClick={() => onMilestoneClick(pos.milestone)}
                >
                  #{pos.milestone.milestoneNumber}
                </text>

                <text
                  x={pos.x + 10}
                  y={pos.y + 28}
                  fontSize="10"
                  fill="#595959"
                  cursor="pointer"
                  onClick={() => onMilestoneClick(pos.milestone)}
                  style={{ maxWidth: '185px' }}
                >
                  {pos.milestone.name.length > 20
                    ? pos.milestone.name.substring(0, 17) + '...'
                    : pos.milestone.name}
                </text>

                {/* Tooltip trigger area */}
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={200}
                  height={40}
                  fill="transparent"
                  cursor="pointer"
                />

                {/* Info popup on hover via title - using SVG title element */}
                <title>{`${pos.milestone.name}
Status: ${pos.milestone.status}
Priority: ${pos.milestone.priority}
${dayjs(pos.milestone.plannedStartDate).format('DD MMM')} - ${dayjs(pos.milestone.plannedEndDate).format('DD MMM YYYY')}
Progress: ${pos.milestone.completionPercentage || 0}%
${isCritical ? '⚠️ On critical path' : ''}`}</title>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ marginTop: '16px' }}>
        <Space wrap>
          <div>
            <span style={{ display: 'inline-block', width: '20px', height: '20px', backgroundColor: '#1890ff', marginRight: '8px' }} />
            Normal Dependency
          </div>
          <div>
            <span style={{ display: 'inline-block', width: '20px', height: '20px', backgroundColor: '#ff4d4f', marginRight: '8px' }} />
            Critical Path Dependency
          </div>
          <div style={{ marginLeft: '16px' }}>
            <span style={{ display: 'inline-block', width: '4px', height: '20px', backgroundColor: '#ff4d4f', marginRight: '8px' }} />
            High Priority
          </div>
          <div>
            <span style={{ display: 'inline-block', width: '4px', height: '20px', backgroundColor: '#faad14', marginRight: '8px' }} />
            Medium Priority
          </div>
          <div>
            <span style={{ display: 'inline-block', width: '4px', height: '20px', backgroundColor: '#52c41a', marginRight: '8px' }} />
            Low Priority
          </div>
        </Space>
      </div>
    </Card>
  )
}
