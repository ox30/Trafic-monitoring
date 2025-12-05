/**
 * Liste des tronçons globaux du réseau
 */

import { 
  GlobalSegment, 
  formatDirection,
} from '../domain/network'
import { mockNetworkNodes } from '../data/mockNetwork'
import './SegmentList.css'

interface SegmentListProps {
  segments: GlobalSegment[]
  selectedSegmentId: string | null
  onSelectSegment: (segmentId: string | null) => void
}

export function SegmentList({ segments, selectedSegmentId, onSelectSegment }: SegmentListProps) {
  return (
    <div className="segment-list">
      <div className="segment-list-header">
        <h2>Tronçons réseau</h2>
        <span className="segment-count">{segments.length} tronçons</span>
      </div>
      <div className="segment-table-container">
        <table className="segment-table">
          <thead>
            <tr>
              <th>Axe</th>
              <th>De</th>
              <th>À</th>
              <th>Dir.</th>
              <th>Km</th>
            </tr>
          </thead>
          <tbody>
            {segments.map(segment => (
              <SegmentRow 
                key={segment.id}
                segment={segment}
                isSelected={segment.id === selectedSegmentId}
                onSelect={() => onSelectSegment(segment.id === selectedSegmentId ? null : segment.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface SegmentRowProps {
  segment: GlobalSegment
  isSelected: boolean
  onSelect: () => void
}

function SegmentRow({ segment, isSelected, onSelect }: SegmentRowProps) {
  const fromNode = mockNetworkNodes.find(n => n.id === segment.fromNodeId)
  const toNode = mockNetworkNodes.find(n => n.id === segment.toNodeId)

  return (
    <tr 
      className={`segment-row ${isSelected ? 'segment-row-selected' : ''}`}
      onClick={onSelect}
    >
      <td>
        <span className="axis-badge">{segment.axisCode}</span>
      </td>
      <td className="segment-node">
        {fromNode?.name || segment.fromNodeId}
      </td>
      <td className="segment-node">
        {toNode?.name || segment.toNodeId}
      </td>
      <td className="segment-direction">
        <span className={`direction-badge direction-${segment.direction.toLowerCase()}`}>
          {formatDirection(segment.direction)}
        </span>
      </td>
      <td className="segment-length">
        {segment.lengthKm.toFixed(1)}
      </td>
    </tr>
  )
}
