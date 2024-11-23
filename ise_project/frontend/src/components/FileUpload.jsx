function FileUpload({ setAnalysisData, setIsLoading }) {
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsLoading(true);
    try {
      // Upload the file
      await fetch('http://localhost:5000/upload-dataset', {
        method: 'POST',
        body: formData,
      });

      // Get the analysis
      const response = await fetch('http://localhost:5000/get-visualizations');
      const data = await response.json();
      setAnalysisData(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Error uploading file');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-neutral-800 p-8 rounded-lg shadow-md">
      <div className="space-y-4 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-white">Upload Dataset</h2>
        <p className="text-white">
          Upload your CSV file below, to get started
        </p>
        <div className="flex items-center justify-center w-1/4">
          <label className="flex flex-col w-full h-32 border-4 border-dashed hover:bg-gray-600 hover:border-gray-300 hover:cursor-pointer">
            <div className="flex flex-col items-center justify-center pt-7">
              <svg
                className="w-12 h-12 text-gray-400 group-hover:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="pt-1 text-sm tracking-wider text-gray-400 group-hover:text-gray-600">
                Browse CSV
              </p>
            </div>
            <input
              type="file"
              className="opacity-0"
              accept=".csv"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export default FileUpload; 