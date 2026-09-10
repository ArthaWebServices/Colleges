import React, { useState, useRef, useEffect } from 'react';

export const MagneticButton = ({ children, className = '', strength = 0.35, onClick, ...props }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTouchDevice(!window.matchMedia('(hover: hover)').matches || window.innerWidth < 768);
    }
  }, []);

  const handleMouseMove = (e) => {
    if (isTouchDevice || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distanceX = (e.clientX - centerX) * strength;
    const distanceY = (e.clientY - centerY) * strength;

    setPosition({ x: distanceX, y: distanceY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: isTouchDevice ? 'none' : `translate3d(${position.x}px, ${position.y}px, 0px)`,
        transition: position.x === 0 && position.y === 0 ? 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'transform 0.1s ease-out',
      }}
      className={`inline-block cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default MagneticButton;

