import { useState, useRef } from "react";
import { FhirJsonViewer } from "@/components/FhirJsonViewer";
import { FlatJsonViewer } from "@/components/FlatJsonViewer";
import { sampleFhirData } from "@/data/sampleFhirData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FhirJson } from "@/types/fhir";

export default function Home() {
  const [viewType, setViewType] = useState<"tree" | "flat">("flat");
  const [jsonData, setJsonData] = useState<FhirJson>(sampleFhirData);
  const [showSample, setShowSample] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
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
      fileInputRef.current.value = '';
    }
    toast({
      title: "Примерные данные загружены",
      description: "Показан встроенный пример FHIR данных",
    });
  };
  
  return (
    <div className="bg-[#F9FAFB] font-sans text-sm text-gray-800 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex justify-between flex-col md:flex-row md:items-end gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#18273F]">FHIR JSON Viewer</h1>
            <p className="text-gray-500">Interactive viewer for FHIR JSON resources with extension support</p>
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
              onClick={handleUploadClick}
              className="text-gray-700 border-gray-300"
            >
              Загрузить JSON
            </Button>
            {!showSample && (
              <Button 
                variant="ghost" 
                onClick={handleResetToSample}
                className="text-gray-500"
              >
                Вернуться к примеру
              </Button>
            )}
          </div>
        </div>
        
        {/* View Type Selector */}
        <Tabs defaultValue="flat" className="mb-6" onValueChange={(value) => setViewType(value as "tree" | "flat")}>
          <TabsList className="grid w-[400px] grid-cols-2 mb-4">
            <TabsTrigger value="flat">Плоский вид</TabsTrigger>
            <TabsTrigger value="tree">Древовидный вид</TabsTrigger>
          </TabsList>
          <TabsContent value="flat">
            <FlatJsonViewer data={jsonData} />
          </TabsContent>
          <TabsContent value="tree">
            <FhirJsonViewer data={jsonData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
