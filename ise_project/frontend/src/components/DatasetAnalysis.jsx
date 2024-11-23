import React from "react";

function DatasetAnalysis({ analysisData }) {
  // Helper function to get type-specific text color
  const getTypeColor = (type) => {
    const colors = {
      continuous: "text-blue-600",
      binary: "text-green-600",
      ordinal: "text-purple-600",
      nominal: "text-orange-600",
      datetime: "text-pink-600",
    };
    return colors[type] || "text-gray-600";
  };

  // Helper function to format values nicely
  const formatValue = (value) => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "number") {
      return Number.isInteger(value) ? value.toString() : value.toFixed(2);
    }
    return String(value);
  };

  // Helper function to format statistic keys nicely
  const formatStatKey = (key) => {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (!analysisData) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center justify-center">
        Dataset Analysis
      </h2>

      <div className="space-y-8 text-white">
        {Object.entries(analysisData).map(([column, details], index) => (
          <div
            key={column}
            className="bg-neutral-800 rounded-lg shadow-sm p-6 border border-gray-200"
          >
            <div className="space-y-4">
              {/* Column Header */}
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-xl font-medium text-white">{column}</h3>
                <div className="mt-2">
                  <span
                    className={`${getTypeColor(details?.type)} font-medium`}
                  >
                    Type: {details?.type || "unknown"}
                  </span>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-white">Missing Values: </span>
                  <span className="font-medium text-white">
                    {details?.missing_values?.percentage
                      ? `${details.missing_values.percentage.toFixed(2)}%`
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-white">Unique Values: </span>
                  <span className="font-medium text-white">
                    {details?.unique_values?.count ?? "N/A"}
                  </span>
                </div>
              </div>

              {/* Sample Values */}
              {details?.unique_values?.examples && (
                <div className="text-sm">
                  <span className="text-white block mb-2">
                    Sample Values:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {details.unique_values.examples
                      .slice(0, 3)
                      .map((example, i) => (
                        <span
                          key={i}
                          className="inline-block px-2 py-1 bg-neutral-700 rounded text-white"
                        >
                          {formatValue(example)}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Statistics */}
              {details?.statistics && (
                <div className="text-sm">
                  <span className="text-white block mb-2">Statistics:</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(details.statistics)
                      .filter(
                        ([key, value]) => value !== null && value !== undefined
                      )
                      .map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center gap-2 bg-neutral-700 px-3 py-2 rounded"
                        >
                          <span className="text-white">
                            {formatStatKey(key)}:
                          </span>
                          <span className="font-medium">
                            {typeof value === "object"
                              ? JSON.stringify(value).slice(0, 15) + "..."
                              : formatValue(value)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DatasetAnalysis;
