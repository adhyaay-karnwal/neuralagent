import React from 'react';
import styled from 'styled-components';
import MonarchLogo from './MonarchLogo';

const ProgressContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 24px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(0, 0, 0, 0.9);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

const ProgressText = styled.span`
  color: white;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    switch (props.status) {
      case 'running': return '#10B981';
      case 'error': return '#EF4444';
      case 'completed': return '#3B82F6';
      default: return '#6B7280';
    }
  }};
  animation: ${props => props.status === 'running' ? 'pulse 2s infinite' : 'none'};
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const TaskProgressIndicator = ({ 
  taskName = 'Processing task...', 
  status = 'running',
  showLogo = true,
  className = '',
  ...props 
}) => {
  const isRunning = status === 'running';
  
  return (
    <ProgressContainer className={className} {...props}>
      {showLogo && (
        <MonarchLogo 
          size="20px" 
          spinning={isRunning}
          color="white"
        />
      )}
      <ProgressText>{taskName}</ProgressText>
      <StatusDot status={status} />
    </ProgressContainer>
  );
};

export default TaskProgressIndicator;

