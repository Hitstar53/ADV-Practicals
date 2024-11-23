import { useState } from 'react';
import FileUpload from './components/FileUpload';
import DatasetAnalysis from './components/DatasetAnalysis';
import QueryVisualizations from './components/QueryVisualizations';
import Navbar from './components/Navbar';

function App() {
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-800">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-[1400px] mx-auto">
          <FileUpload 
            setAnalysisData={setAnalysisData} 
            setIsLoading={setIsLoading} 
          />
          
          {isLoading && (
            <div className="flex justify-center my-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          )}

          {analysisData && (
            <div className="space-y-12 mt-8">
              <DatasetAnalysis analysisData={analysisData} />
              <QueryVisualizations />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App; 