import { FhirJsonViewer } from "@/components/FhirJsonViewer";
import { sampleFhirData } from "@/data/sampleFhirData";

export default function Home() {
  return (
    <div className="bg-[#F9FAFB] font-sans text-sm text-gray-800 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#18273F]">FHIR JSON Viewer</h1>
          <p className="text-gray-500">Interactive viewer for FHIR JSON resources with extension support</p>
        </div>
        
        {/* Main Viewer Component */}
        <FhirJsonViewer data={sampleFhirData} />
      </div>
    </div>
  );
}
