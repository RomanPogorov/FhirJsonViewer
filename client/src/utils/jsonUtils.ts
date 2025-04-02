import { FhirJson } from "@/types/fhir";

interface FlattenedJsonRow {
  key: string;
  path: string;
  value: any;
  depth: number;
  isExpandable: boolean;
  isExtension: boolean;
  parentPath: string;
}

// Function to check if a path or key is an extension
function isExtensionPath(key: string, path: string): boolean {
  // Проверяем, является ли текущий ключ extension или содержит extension в пути
  // Это также проверяет, если путь содержит 'extension' как часть своего компонента
  // что означает, что данный элемент является частью объекта extension или потомком extension
  return key === 'extension' || 
         path === 'extension' || 
         path.includes('.extension') || 
         path.includes('extension[') || 
         path.match(/^extension(\.|$|\[)/) !== null;
}

// Function to create a parent path from a full path
function getParentPath(path: string): string {
  const parts = path.split('.');
  parts.pop();
  return parts.join('.');
}

// Flatten a FHIR JSON object into rows for display
export function flattenJson(json: FhirJson): FlattenedJsonRow[] {
  const result: FlattenedJsonRow[] = [];

  function traverse(obj: any, currentPath: string = '', depth: number = 0) {
    if (obj === null || obj === undefined) {
      return;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      // Add the array itself as an expandable row
      const key = currentPath.split('.').pop() || '';
      const parentPath = getParentPath(currentPath);
      
      result.push({
        key,
        path: currentPath,
        value: obj,
        depth,
        isExpandable: true,
        isExtension: isExtensionPath(key, currentPath),
        parentPath
      });

      // Traverse each array element
      obj.forEach((item, index) => {
        const itemPath = `${currentPath}[${index}]`;
        if (typeof item === 'object' && item !== null) {
          traverse(item, itemPath, depth + 1);
        } else {
          result.push({
            key: `${index}`,
            path: itemPath,
            value: item,
            depth: depth + 1,
            isExpandable: false,
            isExtension: isExtensionPath('', currentPath),
            parentPath: currentPath
          });
        }
      });
    } 
    // Handle objects
    else if (typeof obj === 'object') {
      // If not the root object, add the object itself as an expandable row
      if (currentPath) {
        const key = currentPath.split('.').pop() || '';
        const parentPath = getParentPath(currentPath);
        
        result.push({
          key,
          path: currentPath,
          value: obj,
          depth,
          isExpandable: true,
          isExtension: isExtensionPath(key, currentPath),
          parentPath
        });
      }

      // Traverse each property
      for (const key in obj) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        const value = obj[key];

        if (typeof value === 'object' && value !== null) {
          // For nested objects, add a row and continue traversing
          traverse(value, newPath, depth + 1);
        } else {
          // For primitive values, just add a row
          result.push({
            key,
            path: newPath,
            value,
            depth: depth + 1,
            isExpandable: false,
            isExtension: isExtensionPath(key, newPath),
            parentPath: currentPath
          });
        }
      }
    }
  }

  // Start traversal from the root object
  traverse(json);
  return result;
}
