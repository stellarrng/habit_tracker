import { useState, useRef, useEffect } from 'react';
import styles from './MultiSelectDropdown.module.css';
import { CheckIcon } from './Icons';

interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  renderOptionAddition?: (option: string, isHovered: boolean) => React.ReactNode;
}

export default function MultiSelectDropdown({ 
  options, 
  selected, 
  onChange, 
  placeholder = 'Select...',
  className,
  renderOptionAddition
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const safeSelected = Array.isArray(selected) ? selected : [];

  const toggleOption = (option: string) => {
    if (safeSelected.includes(option)) {
      onChange(safeSelected.filter(o => o !== option));
    } else {
      onChange([...safeSelected, option]);
    }
  };

  const displayText = safeSelected.length === 0 
    ? placeholder 
    : safeSelected.length === 1 
      ? safeSelected[0] 
      : `${placeholder.replace('All ', '')} (${safeSelected.length})`;

  return (
    <div className={`${styles.container} ${className || ''}`} ref={containerRef}>
      <div 
        className={`${styles.trigger} ${isOpen ? styles.triggerActive : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.text}>{displayText}</span>
        <svg className={styles.caret} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && (
        <div 
          className={styles.menu}
          style={renderOptionAddition ? { overflow: 'visible' } : undefined}
        >
          {options.map(option => (
            <div 
              key={option} 
              className={styles.optionContainer}
              onMouseEnter={() => setHoveredOption(option)}
              onMouseLeave={() => setHoveredOption(null)}
            >
              <div 
                className={styles.menuItem}
                onClick={() => toggleOption(option)}
              >
                <div className={`${styles.checkbox} ${safeSelected.includes(option) ? styles.checked : ''}`}>
                  {safeSelected.includes(option) && <CheckIcon style={{ width: 12, height: 12 }} />}
                </div>
                <span>{option}</span>
              </div>
              {renderOptionAddition && renderOptionAddition(option, hoveredOption === option)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
