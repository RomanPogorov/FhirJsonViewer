import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FhirJson } from "@/types/fhir";

interface JsonEditorProps {
  data: FhirJson;
  onUpdateJson: (json: FhirJson) => void;
}

export function JsonEditor({ data, onUpdateJson }: JsonEditorProps) {
  const [editorValue, setEditorValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
    } catch (err) {
      console.error("JSON stringify error:", err);
      setError("Невозможно отформатировать JSON: " + (err as Error).message);
    }
  }, [data]);

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