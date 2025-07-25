import React from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const LogoContainer = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${props => props.size || '32px'};
  height: ${props => props.size || '32px'};
`;

const LogoSvg = styled.svg`
  width: 100%;
  height: 100%;
  animation: ${props => props.spinning ? spin : 'none'} 2s linear infinite;
  transform-origin: center;
  
  .monarch-triangle {
    fill: ${props => props.color || 'white'};
    transition: fill 0.3s ease;
  }
  
  .monarch-hole {
    fill: transparent;
  }
`;

const MonarchLogo = ({ 
  size = '32px', 
  color = 'white', 
  spinning = false, 
  className = '',
  ...props 
}) => {
  return (
    <LogoContainer size={size} className={className} {...props}>
      <LogoSvg 
        viewBox="0 0 64 64" 
        spinning={spinning}
        color={color}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer triangle */}
        <path 
          className="monarch-triangle" 
          d="M32 4 L56 52 L8 52 Z" 
        />
        {/* Inner hole (triangle) */}
        <path 
          className="monarch-hole" 
          d="M32 20 L44 40 L20 40 Z" 
        />
      </LogoSvg>
    </LogoContainer>
  );
};

export default MonarchLogo;

