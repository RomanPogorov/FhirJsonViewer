import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface JsonRowProps {
  path: string;
  fullPath: string;
  keyName: string;
  value: any;
  depth: number;
  isExpanded: boolean;
  isExpandable: boolean;
  isExtension: boolean;
  enableEdit: boolean;
  onToggleExpand: () => void;
  onMouseOver: (content: string, event: React.MouseEvent) => void;
  onMouseOut: () => void;
}

export function JsonRow({
  path,
  fullPath,
  keyName,
  value,
  depth,
  isExpanded,
  isExpandable,
  isExtension,
  enableEdit,
  onToggleExpand,
  onMouseOver,
  onMouseOut
}: JsonRowProps) {
  const [isValueExpanded, setIsValueExpanded] = useState(false);
  const valueRef = useRef<HTMLSpanElement>(null);
  
  // Determine if the value is truncated and needs expansion
  const [isTruncated, setIsTruncated] = useState(false);
  
  useEffect(() => {
    if (valueRef.current) {
      setIsTruncated(
        valueRef.current.scrollWidth > valueRef.current.clientWidth
      );
    }
  }, [value]);

  // Format the display value
  const getDisplayValue = () => {
    if (typeof value === 'object' && value !== null) {
      return Array.isArray(value) ? '[Array]' : '[Object]';
    }
    
    if (typeof value === 'string' && value.length > 30 && !isValueExpanded) {
      return value.substring(0, 27) + '...';
    }
    
    return String(value);
  };

  // Calculate padding based on depth
  const getPaddingLeft = () => {
    return depth === 0 ? 'pl-3' : `pl-${depth * 3 + 3}`;
  };

  const handleToggleValue = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsValueExpanded(!isValueExpanded);
  };

  return (
    <div 
      className={`json-row border-b border-gray-200 p-3 ${getPaddingLeft()} hover:bg-[#F3F4F6] ${
        isExtension ? 'extension' : ''
      }`}
    >
      <div className="flex flex-nowrap items-start w-full relative group">
        {/* Key */}
        <div 
          className={`json-key ${depth > 0 ? 'nested-key' : ''} min-w-[120px] shrink-0 ${
            isExtension ? 'text-[#F97316]' : 'text-gray-500'
          } py-1 cursor-pointer overflow-hidden text-ellipsis`}
          data-full={fullPath}
          onMouseOver={(e) => onMouseOver(fullPath, e)}
          onMouseOut={onMouseOut}
        >
          {keyName}
        </div>
        
        {/* Value */}
        <div className="flattened-values flex-grow flex flex-nowrap gap-2 overflow-hidden">
          <span 
            ref={valueRef}
            className={`json-value ${enableEdit ? 'editable' : ''} px-2 py-1 ${
              isExtension 
                ? 'bg-[#FFF7ED] border border-[#FDBA74]' 
                : 'bg-[#F3F4F6]'
            } rounded text-gray-800 max-w-[120px] overflow-hidden text-ellipsis cursor-pointer ${
              isValueExpanded ? 'expanded max-w-none whitespace-normal overflow-visible' : ''
            }`}
            data-full={typeof value === 'object' ? JSON.stringify(value) : String(value)}
            onClick={handleToggleValue}
            onMouseOver={(e) => onMouseOver(String(value), e)}
            onMouseOut={onMouseOut}
          >
            {getDisplayValue()}
          </span>
          
          {/* Show More/Less Button for expandable items */}
          {isExpandable && (
            <Button
              variant="default"
              size="sm"
              className="toggle-more absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-[#18273F] text-white px-2 py-1 rounded hover:bg-[#18273F]/90"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </Button>
          )}
          
          {/* Edit Icon (visible when editing is enabled) */}
          {enableEdit && (
            <div className="edit-icon absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth="1.5" 
                stroke="currentColor" 
                className="w-4 h-4 text-gray-500 hover:text-[#2563EB]"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" 
                />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
