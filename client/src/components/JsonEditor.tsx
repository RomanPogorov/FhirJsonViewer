import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FhirJson } from "@/types/fhir";

// Объявление типа для Monaco API, которое будет доступно глобально
declare global {
  interface Window {
    monaco: any;
  }
}

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
  const findPositionByPath = (jsonStr: string, path: string): { lineNumber: number, column: number } | null => {
    try {
      // Анализируем путь в структуру более понятную для поиска
      const pathSegments = parseJsonPath(path);
      if (!pathSegments || pathSegments.length === 0) {
        console.error('Не удалось разобрать путь:', path);
        return null;
      }
      
      console.log('Разобранные сегменты пути:', pathSegments);

      // Разбиваем JSON на строки для поиска
      const lines = jsonStr.split('\n');
      
      // Для каждого сегмента в пути, находим соответствующую строку в JSON
      let currentLineIndex = 0;
      let lastPropertyName = pathSegments[pathSegments.length - 1].key;
      
      // Ищем последнее свойство в пути
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Ищем строку, содержащую наш ключ
        const pattern = new RegExp(`"${escapeRegExp(lastPropertyName)}"\\s*:`, 'g');
        const match = pattern.exec(line);
        
        if (match) {
          // Если нашли, запоминаем эту строку
          currentLineIndex = i;
          
          // Проверяем контекст - нужно убедиться, что это именно наш путь,
          // а не просто совпадение имени свойства
          const isCorrectPath = verifyPathContext(lines, currentLineIndex, pathSegments);
          
          if (isCorrectPath) {
            console.log('Найдена соответствующая строка для свойства:', lastPropertyName, 'на строке', currentLineIndex + 1);
            return {
              lineNumber: currentLineIndex + 1, // Строки в редакторе начинаются с 1
              column: match.index! + 1 // Колонки тоже начинаются с 1
            };
          }
        }
      }
      
      // Если не нашли точное совпадение, ищем любое вхождение последнего ключа
      console.log('Не найдено точное совпадение, ищем любое вхождение ключа:', lastPropertyName);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes(`"${lastPropertyName}"`)) {
          console.log('Найдено приблизительное совпадение на строке:', i + 1);
          return { 
            lineNumber: i + 1,
            column: line.indexOf(`"${lastPropertyName}"`) + 1
          };
        }
      }
      
      console.error('Не удалось найти позицию для пути:', path);
      return null;
    } catch (err) {
      console.error('Ошибка при поиске позиции:', err);
      return null;
    }
  };
  
  // Разбор пути JSON на сегменты
  const parseJsonPath = (path: string): { key: string, isArray: boolean, index?: number }[] | null => {
    try {
      const segments: { key: string, isArray: boolean, index?: number }[] = [];
      
      // Регулярное выражение для разбора пути вида 'prop.array[0].nestedProp'
      const regex = /([^\.\[\]]+)(?:\[(\d+)\])?/g;
      let match;
      
      while ((match = regex.exec(path)) !== null) {
        const [, key, indexStr] = match;
        const isArray = indexStr !== undefined;
        const index = isArray ? parseInt(indexStr, 10) : undefined;
        
        segments.push({ key, isArray, index });
      }
      
      return segments;
    } catch (err) {
      console.error('Ошибка при разборе пути:', err);
      return null;
    }
  };
  
  // Проверка контекста пути - убеждаемся, что найденное свойство
  // находится в правильной вложенности
  const verifyPathContext = (
    lines: string[], 
    lineIndex: number, 
    pathSegments: { key: string, isArray: boolean, index?: number }[]
  ): boolean => {
    // Эта функция должна анализировать контекст JSON вокруг найденной строки,
    // чтобы убедиться, что она соответствует ожидаемому пути.
    // В простой реализации мы просто возвращаем true, но для более сложных
    // структур JSON можно реализовать проверку на соответствие всему пути
    return true;
  };

  // Экранирование спецсимволов для использования в регулярных выражениях
  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
  
  // Функция для обработки монтирования редактора
  const handleEditorDidMount = (editor: any, monaco: any) => {
    console.log('Редактор инициализирован, сохраняем ссылку');
    editorRef.current = editor;
    
    // Сохраняем ссылку на monaco глобально для доступа из других мест
    window.monaco = monaco;
    
    // Убедимся, что у нас есть актуальные данные JSON в редакторе
    if (data && typeof data === 'object') {
      try {
        // Форматируем JSON и устанавливаем его в редактор
        const jsonStr = JSON.stringify(data, null, 2);
        console.log('Устанавливаем JSON при монтировании редактора');
        setEditorValue(jsonStr);
        editor.setValue(jsonStr);
        
        // Теперь, если есть путь для фокуса, найдем позицию и переместим курсор
        if (focusPath) {
          console.log('Обработка пути при монтировании редактора:', focusPath);
          
          // Задержка, чтобы контент успел обновиться в редакторе
          setTimeout(() => {
            const currentContent = editor.getValue();
            const positionData = findPositionByPath(currentContent, focusPath);
            console.log('Найдена позиция при монтировании:', positionData);
            
            if (positionData) {
              // Увеличиваем задержку для уверенности, что редактор полностью загружен
              setTimeout(() => {
                console.log('Устанавливаем позицию при монтировании:', positionData);
                try {
                  // Перемещаем курсор и показываем соответствующую строку
                  editor.revealLineInCenter(positionData.lineNumber);
                  editor.setPosition({
                    lineNumber: positionData.lineNumber,
                    column: positionData.column
                  });
                  editor.focus();
                  
                  // Добавляем декорацию для выделения найденной строки
                  const decorations = editor.deltaDecorations([], [
                    {
                      range: new monaco.Range(
                        positionData.lineNumber,
                        1,
                        positionData.lineNumber,
                        1000
                      ),
                      options: {
                        isWholeLine: true,
                        className: 'highlighted-line',
                        glyphMarginClassName: 'highlighted-glyph'
                      }
                    }
                  ]);
                  
                  // Через некоторое время убираем выделение
                  setTimeout(() => {
                    editor.deltaDecorations(decorations, []);
                  }, 3000);
                } catch (err) {
                  console.error('Ошибка при установке позиции в handleEditorDidMount:', err);
                }
              }, 800); // Увеличиваем задержку для уверенности
            } else {
              console.log('Не удалось найти позицию при монтировании для пути:', focusPath);
            }
          }, 100);
        }
      } catch (err) {
        console.error('Ошибка при установке JSON в редактор:', err);
      }
    }
  };

  // Initialize editor with formatted JSON and handle focus path changes
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
      
      // Если редактор уже смонтирован, обновляем его содержимое
      if (editorRef.current) {
        // Получаем текущее значение из редактора 
        const currentValue = editorRef.current.getValue();
        
        // Обновляем редактор только если значение изменилось
        if (jsonStr !== currentValue) {
          console.log('Обновляем значение редактора');
          editorRef.current.setValue(jsonStr);
        }
        
        // Если есть путь для фокуса, найдем и позиционируем курсор
        if (focusPath) {
          console.log('Поиск позиции для пути в useEffect:', focusPath);
          
          // Небольшая задержка для обновления редактора
          setTimeout(() => {
            const freshContent = editorRef.current.getValue();
            const position = findPositionByPath(freshContent, focusPath);
            console.log('Найдена позиция в useEffect:', position);
            
            if (position) {
              // Увеличиваем задержку для уверенности, что редактор полностью загружен
              setTimeout(() => {
                console.log('Устанавливаем позицию в редакторе из useEffect:', position);
                try {
                  // Выделяем строку в редакторе
                  editorRef.current.revealLineInCenter(position.lineNumber);
                  editorRef.current.setPosition({
                    lineNumber: position.lineNumber,
                    column: position.column
                  });
                  editorRef.current.focus();
                  
                  // Мигаем выделением строки
                  if (window.monaco) {
                    const monaco = window.monaco;
                    const decorations = editorRef.current.deltaDecorations([], [
                      {
                        range: new monaco.Range(
                          position.lineNumber,
                          1,
                          position.lineNumber,
                          1000
                        ),
                        options: {
                          isWholeLine: true,
                          className: 'highlighted-line',
                          glyphMarginClassName: 'highlighted-glyph'
                        }
                      }
                    ]);
                    
                    // Через некоторое время убираем выделение
                    setTimeout(() => {
                      editorRef.current.deltaDecorations(decorations, []);
                    }, 3000);
                  }
                } catch (err) {
                  console.error('Ошибка при установке позиции:', err);
                }
              }, 300);
            } else {
              console.log('Не удалось найти позицию для пути в useEffect:', focusPath);
            }
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