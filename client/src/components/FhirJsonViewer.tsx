import { useState, useEffect } from "react";
import { JsonRow } from "./JsonRow";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FhirJson } from "@/types/fhir";
import { flattenJson } from "@/utils/jsonUtils";

interface FhirJsonViewerProps {
  data: FhirJson;
}

interface FlattenedJsonRow {
  key: string;
  path: string;
  value: any;
  depth: number;
  isExpandable: boolean;
  isExtension: boolean;
  parentPath: string;
}

export function FhirJsonViewer({ data }: FhirJsonViewerProps) {
  const [showOnlyExtensions, setShowOnlyExtensions] = useState(false);
  const [enableEdit, setEnableEdit] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const [flattenedData, setFlattenedData] = useState<FlattenedJsonRow[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);

  // Flatten JSON data on component mount or when data changes
  useEffect(() => {
    const flattened = flattenJson(data);
    setFlattenedData(flattened);
  }, [data]);

  // Handle expand all toggle
  useEffect(() => {
    if (expandAll) {
      const allPaths = new Set<string>();
      flattenedData.forEach(row => {
        if (row.isExpandable) {
          allPaths.add(row.path);
        }
      });
      setExpandedPaths(allPaths);
    } else {
      setExpandedPaths(new Set());
    }
  }, [expandAll, flattenedData]);

  // Handle toggle expansion for a specific row
  const toggleExpansion = (path: string) => {
    setExpandedPaths(prev => {
      const newPaths = new Set(prev);
      if (newPaths.has(path)) {
        newPaths.delete(path);
      } else {
        newPaths.add(path);
      }
      return newPaths;
    });
  };

  // Handle tooltip display
  const handleMouseOver = (content: string, event: React.MouseEvent) => {
    setTooltipContent(content);
    setTooltipPosition({
      x: event.clientX + 10,
      y: event.clientY + 10
    });
    setShowTooltip(true);
  };

  const handleMouseOut = () => {
    setShowTooltip(false);
  };

  // Filter rows based on extensions toggle and expanded state
  const visibleRows = flattenedData.filter(row => {
    // If showing only extensions, filter non-extension rows
    if (showOnlyExtensions && !row.isExtension) {
      return false;
    }

    // Check if this row should be visible based on expanded paths
    if (row.depth > 0) {
      // Get parent path to check if parent is expanded
      return expandedPaths.has(row.parentPath);
    }

    // Top-level rows are always visible
    return true;
  });

  return (
    <>
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-6 sm:items-center sm:justify-between">
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-6 sm:items-center">
            {/* Extensions Toggle */}
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="showOnlyExtensions" 
                checked={showOnlyExtensions}
                onCheckedChange={(checked) => setShowOnlyExtensions(checked === true)}
                className="data-[state=checked]:bg-[#F97316] data-[state=checked]:border-[#F97316]"
              />
              <Label htmlFor="showOnlyExtensions" className="text-gray-600">
                Show only extensions
              </Label>
            </div>

            {/* Edit Toggle */}
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="enableEdit" 
                checked={enableEdit}
                onCheckedChange={(checked) => setEnableEdit(checked === true)}
                className="data-[state=checked]:bg-[#2563EB] data-[state=checked]:border-[#2563EB]"
              />
              <Label htmlFor="enableEdit" className="text-gray-600">
                Enable editing
              </Label>
            </div>
          </div>

          {/* Expand All Toggle */}
          <div className="flex items-center space-x-3">
            <Switch 
              id="expandSwitch" 
              checked={expandAll}
              onCheckedChange={setExpandAll}
              className="data-[state=checked]:bg-[#18273F]"
            />
            <Label htmlFor="expandSwitch" className="text-gray-600">
              Expand all
            </Label>
          </div>
        </div>
      </div>

      {/* JSON Viewer Container */}
      <div className="bg-white rounded-lg shadow-sm p-0 overflow-x-auto">
        {visibleRows.map((row, index) => (
          <JsonRow
            key={`${row.path}-${index}`}
            path={row.path}
            fullPath={row.path}
            keyName={row.key}
            value={row.value}
            depth={row.depth}
            isExpanded={expandedPaths.has(row.path)}
            isExpandable={row.isExpandable}
            isExtension={row.isExtension}
            enableEdit={enableEdit}
            onToggleExpand={() => toggleExpansion(row.path)}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
          />
        ))}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div 
          className="fixed bg-white border border-gray-200 rounded-md shadow-lg p-2 text-xs pointer-events-none z-50 max-w-sm"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`
          }}
        >
          {tooltipContent}
        </div>
      )}
    </>
  );
}
