import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FhirJson } from "@/types/fhir";

interface JsonEditorProps {
  data: FhirJson;
  onUpdateJson: (json: FhirJson) => void;
  focusPath?: string; // Путь к элементу, на котором нужно сфокусироваться
}

export function JsonEditor({ data, onUpdateJson, focusPath }: JsonEditorProps) {
  const [editorValue, setEditorValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const editorRef = useRef<any>(null);

  // Функция для нахождения позиции элемента в текстовом JSON по пути
  const findPositionByPath = (jsonStr: string, path: string): { startLineNumber: number, startColumn: number } | null => {
    // Преобразуем путь в массив ключей и индексов
    const pathParts = path.split(/\.|\[|\]/).filter(part => part !== '');
    
    if (pathParts.length === 0) return null;
    
    // Базовые шаблоны поиска для различных частей пути
    const patterns: string[] = [];
    let currentPath = '';
    
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      
      // Если текущая часть пути - число, значит это индекс массива
      if (!isNaN(Number(part))) {
        // Не добавляем его в шаблон отдельно, так как он уже учтен в предыдущей части с [индекс]
        continue;
      }
      
      // Обновляем текущий путь
      if (currentPath) {
        // Проверяем, следующая часть - индекс или ключ
        const nextPart = pathParts[i + 1];
        
        if (nextPart && !isNaN(Number(nextPart))) {
          // Если следующая часть - индекс, добавляем её в квадратных скобках
          currentPath += `.${part}[${nextPart}]`;
          i++; // Пропускаем следующую часть, так как мы уже её учли
        } else {
          currentPath += `.${part}`;
        }
      } else {
        currentPath = part;
      }
      
      // Добавляем шаблон для поиска текущей части пути
      patterns.push(`"${part}"\\s*:`);
    }
    
    // Поиск позиции последнего шаблона в JSON-строке
    if (patterns.length > 0) {
      const lastPattern = patterns[patterns.length - 1];
      const lines = jsonStr.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const lineContent = lines[i];
        const match = lineContent.match(lastPattern);
        
        if (match) {
          return {
            startLineNumber: i + 1, // Номера строк в Monaco начинаются с 1
            startColumn: match.index! + 1 // Номера колонок тоже начинаются с 1
          };
        }
      }
    }
    
    return null;
  };
  
  // Функция для обработки монтирования редактора
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    
    // Если есть путь для фокуса и редактор готов, найдем позицию и переместим курсор
    if (focusPath && editor) {
      const position = findPositionByPath(editorValue, focusPath);
      if (position) {
        setTimeout(() => {
          editor.revealLineInCenter(position.startLineNumber);
          editor.setPosition(position);
          editor.focus();
        }, 100);
      }
    }
  };

  // Initialize editor with formatted JSON
  useEffect(() => {
    if (!data || typeof data !== 'object') {
      setError("Некорректные данные JSON");
      return;
    }

    try {
      const jsonStr = JSON.stringify(data, null, 2);
      console.log("Updating editor value:", jsonStr.slice(0, 100) + "...");
      setEditorValue(jsonStr);
      setError(null);
      
      // Если редактор уже смонтирован и есть путь для фокуса
      if (editorRef.current && focusPath) {
        const position = findPositionByPath(jsonStr, focusPath);
        if (position) {
          setTimeout(() => {
            editorRef.current.revealLineInCenter(position.startLineNumber);
            editorRef.current.setPosition(position);
            editorRef.current.focus();
          }, 100);
        }
      }
    } catch (err) {
      console.error("JSON stringify error:", err);
      setError("Невозможно отформатировать JSON: " + (err as Error).message);
    }
  }, [data, focusPath]);

  // Handle editor changes
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorValue(value);
      
      // Clear any previous validation errors
      setError(null);
    }
  };
  
  // Apply changes to the JSON
  const handleApplyChanges = () => {
    try {
      const parsedJson = JSON.parse(editorValue) as FhirJson;
      onUpdateJson(parsedJson);
      toast({
        title: "Изменения сохранены",
        description: "JSON успешно обновлен",
      });
    } catch (err) {
      setError("Ошибка в JSON: " + (err as Error).message);
      toast({
        title: "Ошибка синтаксиса",
        description: "Проверьте формат JSON и исправьте ошибки",
        variant: "destructive"
      });
    }
  };
  
  // Format JSON
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(editorValue);
      const formatted = JSON.stringify(parsed, null, 2);
      setEditorValue(formatted);
      setError(null);
      toast({
        title: "JSON отформатирован",
        description: "Код успешно отформатирован"
      });
    } catch (err) {
      setError("Ошибка в JSON: " + (err as Error).message);
      toast({
        title: "Ошибка форматирования",
        description: "Проверьте формат JSON и исправьте ошибки",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg text-gray-800 font-medium">JSON редактор</h3>
          <div className="space-x-2">
            <Button 
              variant="outline" 
              onClick={handleFormatJson}
              size="sm"
            >
              Форматировать
            </Button>
            <Button 
              onClick={handleApplyChanges}
              size="sm"
            >
              Применить изменения
            </Button>
          </div>
        </div>
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>
      
      {/* Monaco Editor */}
      <div className="flex-grow bg-white rounded-lg shadow-sm overflow-hidden">
        <Editor
          height="75vh"
          width="100%"
          language="json"
          defaultValue={editorValue}
          value={editorValue}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            formatOnPaste: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontSize: 14,
            wordWrap: 'on',
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto'
            }
          }}
          loading="Загрузка редактора..."
        />
      </div>
    </div>
  );
}