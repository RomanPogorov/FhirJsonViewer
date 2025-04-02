import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FhirJson } from "@/types/fhir";

// Type for flattened value representation
interface FlattenedValue {
  key: string;
  value: any;
  isExtension: boolean;
  path: string;
}

interface FlatJsonViewerProps {
  data: FhirJson;
  onEdit?: (path: string) => void;
}

export function FlatJsonViewer({ data, onEdit }: FlatJsonViewerProps) {
  const [showOnlyExtensions, setShowOnlyExtensions] = useState(false);
  const [enableEdit, setEnableEdit] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  // Function to determine if a key/path is related to extensions
  const isExtensionPath = (key: string, path: string): boolean => {
    // Проверяем более точно, чтобы избежать ложных срабатываний
    // Ищем точное совпадение 'extension' как ключ или часть пути в формате .extension или [extension]
    return key === 'extension' || 
           path === 'extension' || 
           path.match(/\.extension(\.|$|\[)/) !== null || 
           path.match(/\.extension\[\d+\]/) !== null;
  };
  
  // Extract primitive values from nested objects and arrays
  const extractPrimitiveValues = (obj: any, prefix: string = ""): FlattenedValue[] => {
    const result: FlattenedValue[] = [];
    
    if (obj === null || obj === undefined) {
      return result;
    }
    
    // Function to extract all primitives deeply
    const extractDeep = (value: any, path: string, key: string): void => {
      if (value === null || value === undefined) {
        result.push({
          key: key,
          value: value === null ? "null" : "undefined",
          isExtension: isExtensionPath(key, path),
          path: path
        });
        return;
      }
      
      if (typeof value !== "object") {
        // Handle primitive values
        result.push({
          key: key,
          value: value,
          isExtension: isExtensionPath(key, path),
          path: path
        });
      } else if (Array.isArray(value)) {
        // Handle arrays by processing each element
        value.forEach((item, idx) => {
          const itemPath = `${path}[${idx}]`;
          if (typeof item !== "object" || item === null) {
            // Primitive array item
            result.push({
              key: key,
              value: item,
              isExtension: isExtensionPath(key, itemPath),
              path: itemPath
            });
          } else {
            // Object array item - process all keys
            Object.entries(item).forEach(([itemKey, itemValue]) => {
              const fullItemPath = `${itemPath}.${itemKey}`;
              extractDeep(itemValue, fullItemPath, itemKey);
            });
          }
        });
      } else {
        // Handle objects by processing each property
        Object.entries(value).forEach(([objKey, objValue]) => {
          const objPath = path ? `${path}.${objKey}` : objKey;
          extractDeep(objValue, objPath, objKey);
        });
      }
    };
    
    // Start extraction process
    if (typeof obj === "object") {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          const itemPath = `${prefix}[${index}]`;
          if (typeof item !== "object" || item === null) {
            result.push({
              key: index.toString(),
              value: item,
              isExtension: isExtensionPath(prefix, itemPath),
              path: itemPath
            });
          } else {
            Object.entries(item).forEach(([key, value]) => {
              const fullPath = `${itemPath}.${key}`;
              extractDeep(value, fullPath, key);
            });
          }
        });
      } else {
        Object.entries(obj).forEach(([key, value]) => {
          const path = prefix ? `${prefix}.${key}` : key;
          extractDeep(value, path, key);
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
        const extensionValues = values.filter(v => v.isExtension);
        
        // Если есть extension элементы, добавляем их в отфильтрованный список
        if (extensionValues.length > 0 || key === 'extension') {
          filtered[key] = extensionValues.length > 0 ? extensionValues : values;
        }
      }
      
      return filtered;
    }
    
    return flattened;
  };
  
  // State to track expanded value items
  const [expandedValues, setExpandedValues] = useState<Set<string>>(new Set());
  
  // State for window width
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  
  // Effect for window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Toggle value expansion
  const toggleValueExpansion = (path: string) => {
    setExpandedValues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
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
  
  // Calculate the optimal number of items to show based on viewport size
  const getOptimalDisplayCount = (values: FlattenedValue[]): number => {
    if (values.length <= 5) return values.length;
    
    // Для широких экранов показываем больше элементов
    if (windowWidth > 1200) {
      return Math.min(values.length, 10);
    } else if (windowWidth > 768) {
      return Math.min(values.length, 7);
    } else {
      return Math.min(values.length, 5);
    }
  };
  
  // Render a single row with key and all its values
  const renderRow = (key: string, values: FlattenedValue[]) => {
    const isExpanded = expandedRows.has(key) || expandAll;
    const optimalDisplayCount = getOptimalDisplayCount(values);
    const hasMoreThanOptimal = values.length > optimalDisplayCount;
    const displayValues = isExpanded ? values : values.slice(0, optimalDisplayCount);
    
    return (
      <div key={key} className="border-b border-gray-200 px-3 py-3 hover:bg-gray-50">
        <div className="flex flex-row items-start">
          {/* Key column */}
          <div className="min-w-[120px] text-gray-500 pr-4">
            {key}:
          </div>
          
          {/* Values column with relative positioning for gradient overlay */}
          <div className="flex-grow relative">
            {/* Gradient overlay - visible only when not expanded */}
            {hasMoreThanOptimal && !isExpanded && (
              <div 
                className="absolute right-0 top-0 bottom-0 w-20 pointer-events-none z-10" 
                style={{ 
                  background: 'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,1) 90%)' 
                }}>
              </div>
            )}
            
            {/* Show more/less button - always visible at the right edge when needed */}
            {hasMoreThanOptimal && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 px-1">
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs bg-[#18273F] text-white px-2 py-1 rounded hover:bg-[#18273F]/90"
                  onClick={() => toggleRowExpansion(key)}
                >
                  {isExpanded ? 'Скрыть' : `+${values.length - optimalDisplayCount}`}
                </Button>
              </div>
            )}
            
            {/* Values flex container with right padding for button */}
            <div className={`flex flex-wrap gap-2 ${hasMoreThanOptimal ? 'pr-16' : ''}`}>
              {displayValues.map((item, i) => {
                const valueStr = typeof item.value === 'object' 
                  ? (Array.isArray(item.value) ? '[Array]' : '[Object]') 
                  : String(item.value);
                
                const isValueExpanded = expandedValues.has(item.path);
                // Программно обрезаем текст перед рендерингом
                const displayValue = !isValueExpanded && valueStr.length > 12 
                  ? valueStr.substring(0, 12) + "..." 
                  : valueStr;
                
                return (
                  <span
                    key={`${item.path}-${i}`}
                    className={`px-2 py-1 rounded text-sm inline-flex items-center cursor-pointer 
                      ${item.isExtension 
                          ? 'bg-[#FFF7ED] border border-[#FDBA74] text-[#9A3412]' 
                          : 'bg-[#F3F4F6] text-gray-800'
                      } ${enableEdit ? 'group relative' : ''}
                      ${isValueExpanded ? 'whitespace-normal' : 'whitespace-nowrap'}`}
                    title={item.path}
                    onClick={() => toggleValueExpansion(item.path)}
                  >
                    {displayValue}
                    
                    {/* Edit icon (only visible when edit mode is enabled) */}
                    {enableEdit && (
                      <span 
                        className="ml-1 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation(); // Предотвращает переключение видимости элемента
                          if (onEdit) {
                            onEdit(item.path);
                          }
                        }}
                        title={`Редактировать ${item.path}`}
                      >
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
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
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