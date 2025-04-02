import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FhirJson } from "@/types/fhir";

interface FlatJsonViewerProps {
  data: FhirJson;
}

// Type for flattened value representation
interface FlattenedValue {
  key: string;
  value: any;
  isExtension: boolean;
  path: string;
}

export function FlatJsonViewer({ data }: FlatJsonViewerProps) {
  const [showOnlyExtensions, setShowOnlyExtensions] = useState(false);
  const [enableEdit, setEnableEdit] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  // Function to determine if a key/path is related to extensions
  const isExtensionPath = (key: string, path: string): boolean => {
    return key === 'extension' || path.includes('extension') || path.includes('Extension');
  };
  
  // Extract primitive values from nested objects
  const extractPrimitiveValues = (obj: any, prefix: string = ""): FlattenedValue[] => {
    const result: FlattenedValue[] = [];
    
    if (obj === null || obj === undefined) {
      return result;
    }
    
    // Process based on type
    if (typeof obj === "object") {
      if (Array.isArray(obj)) {
        // For arrays, process each item
        obj.forEach((item, index) => {
          if (typeof item === "object" && item !== null) {
            // For objects in arrays, extract inner values
            Object.entries(item).forEach(([key, value]) => {
              if (typeof value !== "object" || value === null) {
                // Only add primitive values
                result.push({
                  key: key,
                  value: value,
                  isExtension: isExtensionPath(key, `${prefix}[${index}].${key}`),
                  path: `${prefix}[${index}].${key}`
                });
              } else if (key === "url" || key === "code" || key === "system" || key === "display" || key === "text" || key === "value") {
                // Special handling for common FHIR attributes within objects
                result.push({
                  key: key,
                  value: typeof value === "object" ? JSON.stringify(value) : value,
                  isExtension: isExtensionPath(key, `${prefix}[${index}].${key}`),
                  path: `${prefix}[${index}].${key}`
                });
              }
            });
          } else {
            // Add primitive array values directly
            result.push({
              key: index.toString(),
              value: item,
              isExtension: isExtensionPath(prefix, prefix),
              path: `${prefix}[${index}]`
            });
          }
        });
      } else {
        // For objects, extract primitive values
        Object.entries(obj).forEach(([key, value]) => {
          if (typeof value !== "object" || value === null) {
            // Add primitive values directly
            result.push({
              key: key,
              value: value,
              isExtension: isExtensionPath(key, prefix ? `${prefix}.${key}` : key),
              path: prefix ? `${prefix}.${key}` : key
            });
          } else if (key === "url" || key === "code" || key === "system" || key === "display" || key === "text" || key === "value") {
            // Special handling for common FHIR attributes
            result.push({
              key: key,
              value: typeof value === "object" ? JSON.stringify(value) : value,
              isExtension: isExtensionPath(key, prefix ? `${prefix}.${key}` : key),
              path: prefix ? `${prefix}.${key}` : key
            });
          }
          
          // If value is extension array, mark it specially
          if (key === "extension" && Array.isArray(value)) {
            const extensionPath = prefix ? `${prefix}.${key}` : key;
            result.push({
              key: "extension",
              value: `[${value.length} items]`,
              isExtension: true,
              path: extensionPath
            });
          }
        });
      }
    }
    
    return result;
  };
  
  // Process top level keys and their immediate values
  const processTopLevelEntry = (key: string, value: any): FlattenedValue[] => {
    const result: FlattenedValue[] = [];
    
    if (value === null || value === undefined) {
      return result;
    }
    
    // Special case for meta.extension
    if (key === 'meta' && typeof value === 'object' && value.extension) {
      result.push({
        key: 'meta.extension',
        value: '[Extension]',
        isExtension: true,
        path: 'meta.extension'
      });
    }
    
    // Top level arrays
    if (Array.isArray(value)) {
      // For arrays with primitive values
      if (value.length > 0 && (typeof value[0] !== 'object' || value[0] === null)) {
        value.forEach((item, index) => {
          result.push({
            key: index.toString(),
            value: item,
            isExtension: false,
            path: `${key}[${index}]`
          });
        });
      } 
      // For arrays with object values
      else {
        value.forEach((item, index) => {
          // Extract primitive values from each object in array
          const primitives = extractPrimitiveValues(item, `${key}[${index}]`);
          result.push(...primitives);
          
          // Special handling for extensions
          if (item.extension) {
            result.push({
              key: 'extension',
              value: `[${item.extension.length} items]`,
              isExtension: true,
              path: `${key}[${index}].extension`
            });
          }
        });
      }
    } 
    // Handle objects
    else if (typeof value === 'object') {
      // Extract all primitive values from the object
      const primitives = extractPrimitiveValues(value, key);
      result.push(...primitives);
    } 
    // Handle primitive values
    else {
      result.push({
        key: key,
        value: value,
        isExtension: false,
        path: key
      });
    }
    
    return result;
  };
  
  // Function that flattens the entire FHIR object by top-level keys
  const flattenValues = (data: FhirJson): Record<string, FlattenedValue[]> => {
    const result: Record<string, FlattenedValue[]> = {};
    
    // Process each top-level entry
    Object.entries(data).forEach(([key, value]) => {
      result[key] = processTopLevelEntry(key, value);
    });
    
    return result;
  };
  
  // Toggle row expansion
  const toggleRowExpansion = (key: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };
  
  // Filter visible rows based on extensions toggle
  const getVisibleRows = () => {
    const flattened = flattenValues(data);
    
    if (showOnlyExtensions) {
      // Filter to only show groups containing extensions
      const filtered: Record<string, FlattenedValue[]> = {};
      
      for (const key in flattened) {
        const values = flattened[key];
        const hasExtension = values.some(v => v.isExtension);
        if (hasExtension || key === 'extension') {
          filtered[key] = values;
        }
      }
      
      return filtered;
    }
    
    return flattened;
  };
  
  // Render a single row with key and all its values
  const renderRow = (key: string, values: FlattenedValue[]) => {
    const isExpanded = expandedRows.has(key) || expandAll;
    const hasMoreThan5 = values.length > 5;
    const displayValues = isExpanded ? values : values.slice(0, 5);
    
    return (
      <div key={key} className="border-b border-gray-200 px-3 py-3 hover:bg-gray-50">
        <div className="flex flex-row items-start">
          {/* Key column */}
          <div className="min-w-[120px] text-gray-500 pr-4">
            {key}:
          </div>
          
          {/* Values column */}
          <div className="flex-grow flex flex-wrap gap-2">
            {displayValues.map((item, i) => (
              <span
                key={`${item.path}-${i}`}
                className={`px-2 py-1 rounded text-sm inline-flex items-center ${
                  item.isExtension 
                    ? 'bg-[#FFF7ED] border border-[#FDBA74] text-[#9A3412]' 
                    : 'bg-[#F3F4F6] text-gray-800'
                } ${enableEdit ? 'group relative' : ''}`}
                title={item.path}
              >
                {typeof item.value === 'object' ? 
                  (Array.isArray(item.value) ? '[Array]' : '[Object]') : 
                  String(item.value)}
                
                {/* Edit icon (only visible when edit mode is enabled) */}
                {enableEdit && (
                  <span className="ml-1 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 20 20" 
                      fill="currentColor" 
                      className="w-3 h-3"
                    >
                      <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                    </svg>
                  </span>
                )}
              </span>
            ))}
            
            {/* Show more/less button */}
            {hasMoreThan5 && (
              <Button
                variant="default"
                size="sm"
                className="text-xs bg-[#18273F] text-white px-2 py-1 rounded hover:bg-[#18273F]/90 ml-2"
                onClick={() => toggleRowExpansion(key)}
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Update expandedRows when expandAll changes
  useEffect(() => {
    if (expandAll) {
      // Add all keys to expanded set
      const allKeys = Object.keys(getVisibleRows());
      setExpandedRows(new Set(allKeys));
    } else {
      // Clear the set
      setExpandedRows(new Set());
    }
  }, [expandAll, data]);
  
  const visibleRows = getVisibleRows();
  
  return (
    <>
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col space-y-4">
          {/* Top row controls */}
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
                  Показать только extensions
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
                  Показать редактирование
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
                Развернуть все
              </Label>
            </div>
          </div>
          
          {/* Bottom row with copy/export buttons */}
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                toast({
                  title: "Скопировано!",
                  description: "JSON скопирован в буфер обмена",
                });
              }}
              className="text-xs"
            >
              Копировать JSON
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", "fhir-data.json");
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
                toast({
                  title: "Файл экспортирован",
                  description: "FHIR JSON сохранен в файл fhir-data.json",
                });
              }}
              className="text-xs"
            >
              Экспорт в файл
            </Button>
          </div>
        </div>
      </div>

      {/* Flat JSON Viewer Container */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {Object.keys(visibleRows)
          .sort() // Sort keys alphabetically for better organization
          .map(key => renderRow(key, visibleRows[key]))}
        
        {Object.keys(visibleRows).length === 0 && (
          <div className="p-6 text-center text-gray-500">
            Нет данных для отображения. {showOnlyExtensions && "Попробуйте отключить фильтр по extensions."}
          </div>
        )}
      </div>
    </>
  );
}