import { useState, useRef, useEffect } from "react";
import { FlatJsonViewer } from "@/components/FlatJsonViewer";
import { JsonEditor } from "@/components/JsonEditor";
import { sampleFhirData } from "@/data/sampleFhirData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FhirJson } from "@/types/fhir";

export default function Home() {
  const [viewType, setViewType] = useState<"view" | "edit">("view");
  const [jsonData, setJsonData] = useState<FhirJson>(sampleFhirData);
  const [showSample, setShowSample] = useState(true);
  const [focusPath, setFocusPath] = useState<string | undefined>(undefined);
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Обработчик для изменения состояния режима редактирования
  const handleEditModeChange = (enabled: boolean) => {
    setEditModeEnabled(enabled);
  };

  // Синхронизация состояния при смене вкладок
  useEffect(() => {
    // Нет необходимости ничего делать при смене на вкладку редактирования
    // Но при возврате на вкладку просмотра нужно сохранить состояние редактирования
  }, [viewType]);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        setJsonData(parsed);
        setShowSample(false);
        toast({
          title: "Файл успешно загружен",
          description: `Загружен FHIR документ: ${file.name}`,
        });
      } catch (error) {
        toast({
          title: "Ошибка при загрузке файла",
          description: "Файл должен содержать корректный JSON формат",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file);
  };

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Reset to sample data
  const handleResetToSample = () => {
    setJsonData(sampleFhirData);
    setShowSample(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast({
      title: "Примерные данные загружены",
      description: "Показан встроенный пример FHIR данных",
    });
  };

  // Update JSON data from editor
  const handleJsonUpdate = (updatedJson: FhirJson) => {
    setJsonData(updatedJson);
    // Switch back to view mode after successful update
    setViewType("view");
    // Сброс пути фокуса после редактирования
    setFocusPath(undefined);
  };

  // Функция для перехода к редактированию конкретного поля
  const handleEditField = (path: string) => {
    setFocusPath(path);
    setViewType("edit");

    // Программно активируем вкладку редактирования, если требуется
    if (tabsRef.current) {
      const editTab = tabsRef.current.querySelector(
        '[data-state="inactive"][value="edit"]'
      );
      if (editTab && editTab instanceof HTMLElement) {
        editTab.click();
      }
    }

    toast({
      title: "Переход к редактированию",
      description: `Редактирование поля: ${path}`,
    });
  };

  return (
    <div className="bg-[#f3f3f3] font-sans text-sm text-gray-800 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex justify-between flex-col md:flex-row md:items-end gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#18273F]">
              Aidbox JSON Viewer
            </h1>
            <p className="text-gray-500">
              Interactive viewer for FHIR JSON resources with extension support
            </p>
          </div>

          {/* File Upload Controls */}
          <div className="flex items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(
                  JSON.stringify(jsonData, null, 2)
                );
                toast({
                  title: "Скопировано!",
                  description: "JSON скопирован в буфер обмена",
                });
              }}
              className="text-gray-700 border-gray-300"
            >
              Copy JSON
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                const dataStr =
                  "data:text/json;charset=utf-8," +
                  encodeURIComponent(JSON.stringify(jsonData, null, 2));
                const downloadAnchorNode = document.createElement("a");
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
              className="text-gray-700 border-gray-300"
            >
              Export JSON
            </Button>

            <Button
              variant="outline"
              onClick={handleUploadClick}
              className="text-gray-700 border-gray-300"
            >
              Upload JSON
            </Button>
            {!showSample && (
              <Button
                variant="ghost"
                onClick={handleResetToSample}
                className="text-gray-500"
              >
                Reset to default
              </Button>
            )}
          </div>
        </div>

        {/* View Type Selector */}
        <Tabs
          defaultValue="view"
          className="mb-6"
          value={viewType}
          onValueChange={(value) => setViewType(value as "view" | "edit")}
          ref={tabsRef}
        >
          <TabsList className="grid w-full grid-cols-2 mb-4 justify-center text-neutral-100 bg-gray-400">
            <TabsTrigger value="view">View</TabsTrigger>
            <TabsTrigger value="edit">Edit</TabsTrigger>
          </TabsList>
          <TabsContent value="view">
            <FlatJsonViewer
              data={jsonData}
              onEdit={handleEditField}
              initialEditMode={editModeEnabled}
              onEditModeChange={handleEditModeChange}
            />
          </TabsContent>
          <TabsContent value="edit">
            <JsonEditor
              data={jsonData}
              onUpdateJson={handleJsonUpdate}
              focusPath={focusPath}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
