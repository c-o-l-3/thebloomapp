/**
 * JourneyEdge Component
 * Custom edge for React Flow journey transitions
 */

import React, { memo } from 'react';
import { getBezierPath, EdgeLabelRenderer } from 'reactflow';
import './JourneyEdge.css';

/**
 * JourneyEdge - Custom edge component for React Flow
 */
export const JourneyEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  label,
  markerEnd
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  const hasCondition = data?.condition;
  const isDefault = !hasCondition;

  return (
    <>
      <path
        id={id}
        d={edgePath}
        className={`journey-edge ${hasCondition ? 'journey-edge--conditional' : ''}`}
        style={style}
        markerEnd={markerEnd}
      />
      
      <EdgeLabelRenderer>
        <div
          className="journey-edge__label"
          style={{
            position: 'absolute',
            left: labelX,
            top: labelY,
            transform: `translate(-50%, -50%)`
          }}
        >
          {label && (
            <span className={`journey-edge__label-text ${hasCondition ? 'journey-edge__label-text--conditional' : ''}`}>
              {label}
            </span>
          )}
          {hasCondition && (
            <span className="journey-edge__condition-badge">
              {data.condition}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

JourneyEdge.displayName = 'JourneyEdge';

export default JourneyEdge;
