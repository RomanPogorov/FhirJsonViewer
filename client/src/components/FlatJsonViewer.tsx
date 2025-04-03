import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FhirJson } from "@/types/fhir";
import * as Tooltip from "@radix-ui/react-tooltip";

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
  initialEditMode?: boolean;
  onEditModeChange?: (enabled: boolean) => void;
}

export function FlatJsonViewer({
  data,
  onEdit,
  initialEditMode,
  onEditModeChange,
}: FlatJsonViewerProps) {
  const [showOnlyExtensions, setShowOnlyExtensions] = useState(false);
  const [enableEdit, setEnableEdit] = useState(initialEditMode || false);
  const [expandAll, setExpandAll] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Function to determine if a key/path is related to extensions
  const isExtensionPath = (key: string, path: string): boolean => {
    // Проверяем, является ли текущий ключ extension или содержит extension в пути
    // Это также проверяет, если путь содержит 'extension' как часть своего компонента
    // что означает, что данный элемент является частью объекта extension или потомком extension
    return (
      key === "extension" ||
      path === "extension" ||
      path.includes(".extension") ||
      path.includes("extension[") ||
      path.match(/^extension(\.|$|\[)/) !== null
    );
  };

  // Extract primitive values from nested objects and arrays
  const extractPrimitiveValues = (
    obj: any,
    prefix: string = ""
  ): FlattenedValue[] => {
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
          path: path,
        });
        return;
      }

      if (typeof value !== "object") {
        // Handle primitive values
        result.push({
          key: key,
          value: value,
          isExtension: isExtensionPath(key, path),
          path: path,
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
              path: itemPath,
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
              path: itemPath,
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
      if (
        value.length > 0 &&
        (typeof value[0] !== "object" || value[0] === null)
      ) {
        value.forEach((item, index) => {
          result.push({
            key: index.toString(),
            value: item,
            isExtension: isExtensionPath(key, `${key}[${index}]`),
            path: `${key}[${index}]`,
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
    else if (typeof value === "object") {
      // Extract all primitive values from the object
      const primitives = extractPrimitiveValues(value, key);
      result.push(...primitives);
    }
    // Handle primitive values
    else {
      result.push({
        key: key,
        value: value,
        isExtension: isExtensionPath(key, key),
        path: key,
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
    setExpandedRows((prev) => {
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
        const extensionValues = values.filter((v) => v.isExtension);

        // Если есть extension элементы, добавляем их в отфильтрованный список
        if (extensionValues.length > 0 || key === "extension") {
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
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  // Effect for window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Toggle value expansion
  const toggleValueExpansion = (path: string) => {
    setExpandedValues((prev) => {
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
    const displayValues = isExpanded
      ? values
      : values.slice(0, optimalDisplayCount);

    return (
      <div key={key} className="border-b border-gray-200 px-3 py-3">
        <div className="flex flex-row items-start">
          {/* Key column - fixed width with ellipsis and tooltip */}
          <div
            className="w-[110px] min-w-[110px] text-gray-800 pr-4 overflow-hidden text-ellipsis whitespace-nowrap"
            title={key}
          >
            {key}:
          </div>

          {/* Values column with relative positioning for gradient overlay */}
          <div className="flex-grow relative">
            {/* Gradient overlay - visible only when not expanded */}
            {hasMoreThanOptimal && !isExpanded && (
              <div
                className="absolute right-0 top-0 bottom-0 w-20 pointer-events-none z-10"
                style={{
                  background:
                    "linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,1) 90%)",
                }}
              ></div>
            )}

            {/* Show more/less button - always visible at the right edge when needed */}
            {hasMoreThanOptimal && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 px-1">
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs bg-white text-gray-800 px-3 py-3 rounded-full border border-gray-100 hover:bg-gray-100 shadow-lg"
                  onClick={() => toggleRowExpansion(key)}
                >
                  {isExpanded
                    ? "Hide"
                    : `+${values.length - optimalDisplayCount}`}
                </Button>
              </div>
            )}

            {/* Values flex container with right padding for button */}
            <div className={`flex flex-wrap gap-2`}>
              {displayValues.map((item, i) => {
                const valueStr =
                  typeof item.value === "object"
                    ? Array.isArray(item.value)
                      ? "[Array]"
                      : "[Object]"
                    : String(item.value);

                const isValueExpanded = expandedValues.has(item.path);
                // Программно обрезаем текст перед рендерингом
                const displayValue =
                  !isValueExpanded && valueStr.length > 12
                    ? valueStr.substring(0, 12) + "..."
                    : valueStr;

                return (
                  <Tooltip.Provider delayDuration={100}>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <span
                          key={`${item.path}-${i}`}
                          className={`py-1 rounded text-sm inline-flex items-center cursor-pointer overflow-hidden
                            ${
                              item.isExtension
                                ? "bg-[#FFF7ED] border border-[#FDBA74] text-[#9A3412]"
                                : "bg-[#F3F4F6] text-gray-800"
                            } ${enableEdit ? "group relative" : ""} 
                            ${isValueExpanded ? "whitespace-normal" : "whitespace-nowrap"}`}
                          onClick={() => toggleValueExpansion(item.path)}
                        >
                          <span className="px-2">{displayValue}</span>

                          {/* Edit icon (only visible when edit mode is enabled) */}
                          {enableEdit && (
                            <>
                              {/* Gradient overlay */}
                              <div
                                className="absolute right-0 top-0 bottom-0 w-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{
                                  background: item.isExtension
                                    ? "linear-gradient(to right, rgba(255, 247, 237, 0), rgba(255, 247, 237, 1) 60%)"
                                    : "linear-gradient(to right, rgba(243, 244, 246, 0), rgba(243, 244, 246, 1) 60%)",
                                }}
                              ></div>

                              {/* Edit icon */}
                              <div
                                className="absolute right-1 w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:text-blue-500 transition-opacity z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onEdit) {
                                    onEdit(item.path);
                                  }
                                }}
                                title={`Редактировать ${item.path}`}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="w-3 h-3"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </div>
                            </>
                          )}
                        </span>
                      </Tooltip.Trigger>
                      <Tooltip.Content
                        className="bg-black text-white px-2 py-1 rounded shadow-sm text-sm"
                        side="top"
                        sideOffset={5}
                      >
                        {item.path}
                        <Tooltip.Arrow className="fill-white" />
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>
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
                  onCheckedChange={(checked) =>
                    setShowOnlyExtensions(checked === true)
                  }
                  className="data-[state=checked]:bg-[#F97316] data-[state=checked]:border-[#F97316]"
                />
                <Label htmlFor="showOnlyExtensions" className="text-gray-600">
                  Extensions only
                </Label>
              </div>

              {/* Edit Toggle */}
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="enableEdit"
                  checked={enableEdit}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    setEnableEdit(isChecked);
                    if (onEditModeChange) {
                      onEditModeChange(isChecked);
                    }
                  }}
                  className="data-[state=checked]:bg-[#2563EB] data-[state=checked]:border-[#2563EB]"
                />
                <Label htmlFor="enableEdit" className="text-gray-600">
                  Edit mode
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
                Collapsed/Expanded
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Flat JSON Viewer Container */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {Object.keys(visibleRows)
          .sort() // Sort keys alphabetically for better organization
          .map((key) => renderRow(key, visibleRows[key]))}

        {Object.keys(visibleRows).length === 0 && (
          <div className="p-6 text-center text-gray-500">
            Нет данных для отображения.{" "}
            {showOnlyExtensions && "Попробуйте отключить фильтр по extensions."}
          </div>
        )}
      </div>
    </>
  );
}
