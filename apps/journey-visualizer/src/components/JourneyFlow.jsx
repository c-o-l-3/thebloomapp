/**
 * JourneyFlow Component
 * Editable React Flow canvas for journey visualization and editing
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { JourneyNode } from './JourneyNode';
import { JourneyEdge } from './JourneyEdge';
import { TemplateLibrary } from './TemplateLibrary';
import { TouchpointEditor } from './TouchpointEditor';
import { TOUCHPOINT_TYPE } from '../types';
import { 
  Plus, 
  Save, 
  Trash2, 
  Edit2, 
  Move,
  Mail,
  MessageSquare,
  Clock,
  GitBranch,
  MousePointer2
} from 'lucide-react';
import './JourneyFlow.css';

// Node types registry
const nodeTypes = {
  journeyNode: JourneyNode
};

// Edge types registry
const edgeTypes = {
  journeyEdge: JourneyEdge
};

/**
 * JourneyFlow - Editable journey canvas using React Flow
 */
export function JourneyFlow({ 
  journey, 
  clientSlug,
  onUpdateJourney,
  readOnly = false 
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [editingTouchpoint, setEditingTouchpoint] = useState(null);
  const [isEditMode, setIsEditMode] = useState(!readOnly);

  // Convert journey touchpoints to React Flow nodes
  useEffect(() => {
    if (journey?.touchpoints) {
      const flowNodes = journey.touchpoints.map((touchpoint, index) => ({
        id: touchpoint.id,
        type: 'journeyNode',
        position: touchpoint.position || { 
          x: 100 + (index * 250), 
          y: 100 + (index % 2 === 0 ? 0 : 100) 
        },
        data: {
          label: touchpoint.name,
          touchpointType: touchpoint.type,
          content: touchpoint.content,
          order: touchpoint.order || index,
          onEdit: () => handleEditTouchpoint(touchpoint),
          onDelete: () => handleDeleteTouchpoint(touchpoint.id)
        }
      }));
      
      const flowEdges = journey.touchpoints.slice(0, -1).map((touchpoint, index) => ({
        id: `edge-${touchpoint.id}-${journey.touchpoints[index + 1].id}`,
        source: touchpoint.id,
        target: journey.touchpoints[index + 1].id,
        type: 'journeyEdge',
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: true
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [journey]);

  // Handle node selection
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    if (!isEditMode) {
      // In view mode, clicking opens the editor
      const touchpoint = journey.touchpoints.find(t => t.id === node.id);
      if (touchpoint) {
        setEditingTouchpoint(touchpoint);
      }
    }
  }, [journey, isEditMode]);

  // Handle edge connection
  const onConnect = useCallback((params) => {
    if (!isEditMode) return;
    setEdges((eds) => addEdge({
      ...params,
      type: 'journeyEdge',
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: true
    }, eds));
  }, [isEditMode, setEdges]);

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Handle node drag stop (update positions)
  const onNodeDragStop = useCallback((event, node) => {
    if (!isEditMode) return;
    // Update touchpoint position in journey
    const updatedTouchpoints = journey.touchpoints.map(t => 
      t.id === node.id ? { ...t, position: node.position } : t
    );
    onUpdateJourney?.({ ...journey, touchpoints: updatedTouchpoints });
  }, [journey, isEditMode, onUpdateJourney]);

  // Add new touchpoint from template
  const handleAddTouchpoint = useCallback((template) => {
    const newTouchpoint = {
      id: `tp-${Date.now()}`,
      name: template.name,
      type: template.type === 'email' ? TOUCHPOINT_TYPE.EMAIL : 
            template.type === 'sms' ? TOUCHPOINT_TYPE.SMS : TOUCHPOINT_TYPE.EMAIL,
      content: {
        subject: template.subject || '',
        body: template.content || ''
      },
      position: { 
        x: 100 + (nodes.length * 250), 
        y: 100 
      },
      order: nodes.length
    };

    const updatedTouchpoints = [...(journey.touchpoints || []), newTouchpoint];
    onUpdateJourney?.({ ...journey, touchpoints: updatedTouchpoints });
    setShowTemplateLibrary(false);
  }, [journey, nodes.length, onUpdateJourney]);

  // Edit touchpoint
  const handleEditTouchpoint = useCallback((touchpoint) => {
    setEditingTouchpoint(touchpoint);
  }, []);

  // Save edited touchpoint
  const handleSaveTouchpoint = useCallback((updatedTouchpoint) => {
    const updatedTouchpoints = journey.touchpoints.map(t => 
      t.id === updatedTouchpoint.id ? updatedTouchpoint : t
    );
    onUpdateJourney?.({ ...journey, touchpoints: updatedTouchpoints });
    setEditingTouchpoint(null);
  }, [journey, onUpdateJourney]);

  // Delete touchpoint
  const handleDeleteTouchpoint = useCallback((touchpointId) => {
    if (!confirm('Are you sure you want to delete this touchpoint?')) return;
    
    const updatedTouchpoints = journey.touchpoints.filter(t => t.id !== touchpointId);
    onUpdateJourney?.({ ...journey, touchpoints: updatedTouchpoints });
    setSelectedNode(null);
  }, [journey, onUpdateJourney]);

  // Add delay node
  const handleAddDelay = useCallback(() => {
    const newTouchpoint = {
      id: `delay-${Date.now()}`,
      name: 'Wait Delay',
      type: TOUCHPOINT_TYPE.WAIT,
      content: {
        duration: 1,
        unit: 'day'
      },
      position: { 
        x: 100 + (nodes.length * 250), 
        y: 100 
      },
      order: nodes.length
    };

    const updatedTouchpoints = [...(journey.touchpoints || []), newTouchpoint];
    onUpdateJourney?.({ ...journey, touchpoints: updatedTouchpoints });
  }, [journey, nodes.length, onUpdateJourney]);

  // Add condition node
  const handleAddCondition = useCallback(() => {
    const newTouchpoint = {
      id: `cond-${Date.now()}`,
      name: 'Condition',
      type: TOUCHPOINT_TYPE.CONDITION,
      content: {
        condition: 'if tag = "interested"'
      },
      position: { 
        x: 100 + (nodes.length * 250), 
        y: 100 
      },
      order: nodes.length
    };

    const updatedTouchpoints = [...(journey.touchpoints || []), newTouchpoint];
    onUpdateJourney?.({ ...journey, touchpoints: updatedTouchpoints });
  }, [journey, nodes.length, onUpdateJourney]);

  return (
    <div className="journey-flow">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={isEditMode ? onNodesChange : undefined}
        onEdgesChange={isEditMode ? onEdgesChange : undefined}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-right"
        nodesDraggable={isEditMode}
        nodesConnectable={isEditMode}
        elementsSelectable={true}
      >
        <Background color="#cbd5e1" gap={20} />
        <Controls />
        <MiniMap 
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            switch (node.data?.touchpointType) {
              case TOUCHPOINT_TYPE.EMAIL: return '#dbeafe';
              case TOUCHPOINT_TYPE.SMS: return '#d1fae5';
              case TOUCHPOINT_TYPE.WAIT: return '#e0e7ff';
              case TOUCHPOINT_TYPE.CONDITION: return '#fce7f3';
              default: return '#f1f5f9';
            }
          }}
        />

        {/* Edit Mode Panel */}
        <Panel position="top-left" className="journey-flow__panel">
          <div className="journey-flow__toolbar">
            <button
              className={`journey-flow__mode-toggle ${isEditMode ? 'journey-flow__mode-toggle--active' : ''}`}
              onClick={() => setIsEditMode(!isEditMode)}
              title={isEditMode ? 'Switch to view mode' : 'Switch to edit mode'}
            >
              {isEditMode ? <MousePointer2 size={16} /> : <Edit2 size={16} />}
              {isEditMode ? 'Edit Mode' : 'View Mode'}
            </button>

            {isEditMode && (
              <>
                <div className="journey-flow__toolbar-divider" />
                
                <button
                  className="journey-flow__tool-btn"
                  onClick={() => setShowTemplateLibrary(true)}
                  title="Add touchpoint from template"
                >
                  <Plus size={16} />
                  Add Node
                </button>

                <button
                  className="journey-flow__tool-btn"
                  onClick={handleAddDelay}
                  title="Add delay/wait node"
                >
                  <Clock size={16} />
                  Add Delay
                </button>

                <button
                  className="journey-flow__tool-btn"
                  onClick={handleAddCondition}
                  title="Add condition node"
                >
                  <GitBranch size={16} />
                  Add Condition
                </button>

                {selectedNode && (
                  <>
                    <div className="journey-flow__toolbar-divider" />
                    
                    <button
                      className="journey-flow__tool-btn journey-flow__tool-btn--edit"
                      onClick={() => {
                        const touchpoint = journey.touchpoints.find(t => t.id === selectedNode.id);
                        if (touchpoint) handleEditTouchpoint(touchpoint);
                      }}
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>

                    <button
                      className="journey-flow__tool-btn journey-flow__tool-btn--delete"
                      onClick={() => handleDeleteTouchpoint(selectedNode.id)}
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </Panel>

        {/* Node Type Legend */}
        <Panel position="bottom-left" className="journey-flow__panel">
          <div className="journey-flow__legend">
            <span className="journey-flow__legend-title">Node Types:</span>
            <span className="journey-flow__legend-item">
              <span className="journey-flow__legend-dot journey-flow__legend-dot--email" />
              Email
            </span>
            <span className="journey-flow__legend-item">
              <span className="journey-flow__legend-dot journey-flow__legend-dot--sms" />
              SMS
            </span>
            <span className="journey-flow__legend-item">
              <span className="journey-flow__legend-dot journey-flow__legend-dot--wait" />
              Delay
            </span>
            <span className="journey-flow__legend-item">
              <span className="journey-flow__legend-dot journey-flow__legend-dot--condition" />
              Condition
            </span>
          </div>
        </Panel>

        {/* Selection Info */}
        {selectedNode && (
          <Panel position="top-right" className="journey-flow__panel">
            <div className="journey-flow__selection">
              <span className="journey-flow__selection-label">Selected:</span>
              <span className="journey-flow__selection-name">{selectedNode.data?.label}</span>
              <span className="journey-flow__selection-type">({selectedNode.data?.touchpointType})</span>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Template Library Modal */}
      <TemplateLibrary
        isOpen={showTemplateLibrary}
        onClose={() => setShowTemplateLibrary(false)}
        clientSlug={clientSlug}
        onSelectTemplate={handleAddTouchpoint}
      />

      {/* Touchpoint Editor Modal */}
      {editingTouchpoint && (
        <div className="touchpoint-editor-modal">
          <div className="touchpoint-editor-modal__content">
            <TouchpointEditor
              touchpoint={editingTouchpoint}
              clientSlug={clientSlug}
              onSave={handleSaveTouchpoint}
              onClose={() => setEditingTouchpoint(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default JourneyFlow;
