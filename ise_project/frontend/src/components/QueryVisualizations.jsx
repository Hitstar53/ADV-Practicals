import { useState, useEffect } from 'react';
import ChartComponent from './ChartComponent';

function QueryVisualizations() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [error, setError] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);

  const fetchChartData = async () => {
    if (dataFetched) return;
    
    setError(null);
    try {
      console.log('Fetching chart data...');
      const response = await fetch('http://localhost:5000/get-chart-data');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Chart data received:', data);
      setChartData(data);

      // After getting the data, fetch initial visualization suggestions
      console.log('Fetching visualization suggestions...');
      const suggestionsResponse = await fetch('http://localhost:5000/get-visualization-suggestions');
      if (!suggestionsResponse.ok) {
        throw new Error(`HTTP error! status: ${suggestionsResponse.status}`);
      }
      const suggestionsData = await suggestionsResponse.json();
      console.log('Suggestions received:', suggestionsData);
      setSuggestions(suggestionsData);
      setDataFetched(true);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log('Submitting query:', query);
      const response = await fetch('http://localhost:5000/query-visualizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Query response:', data);
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const prepareChartOptions = (visualization) => {
    if (!chartData?.data || !visualization) return null;

    const { chart_type, variables } = visualization;
    const data = chartData.data;

    switch (chart_type.toLowerCase()) {
      case 'bar': {
        const xData = [...new Set(data.map(item => item[variables[0]]))];
        const yData = xData.map(x => {
          const items = data.filter(item => item[variables[0]] === x);
          return items.length > 0 ? items[0][variables[1]] : 0;
        });

        return {
          series: [{
            x: xData,
            y: yData,
            name: variables[1] || variables[0],
            type: 'bar'
          }],
          layout: {
            xaxis: {
              tickangle: -45,
              title: variables[0]
            },
            yaxis: {
              title: variables[1] || 'Count'
            }
          }
        };
      }

      case 'line':
      case 'area': {
        const xData = [...new Set(data.map(item => item[variables[0]]))].sort();
        const traces = variables.slice(1).map(variable => ({
          x: xData,
          y: xData.map(x => {
            const items = data.filter(item => item[variables[0]] === x);
            return items.length > 0 ? items[0][variable] : null;
          }),
          name: variable,
          type: 'scatter',
          mode: 'lines',
          fill: chart_type === 'area' ? 'tonexty' : 'none'
        }));

        return {
          series: traces,
          layout: {
            xaxis: {
              tickangle: -45,
              title: variables[0]
            },
            yaxis: {
              title: variables[1] || 'Value'
            }
          }
        };
      }

      case 'scatter':
      case 'bubble': {
        return {
          series: [{
            x: data.map(item => item[variables[0]]),
            y: data.map(item => item[variables[1]]),
            mode: 'markers',
            type: 'scatter',
            marker: {
              size: chart_type === 'bubble' && variables[2] 
                ? data.map(item => item[variables[2]]) 
                : 10
            },
            text: data.map(item => `${variables[0]}: ${item[variables[0]]}<br>${variables[1]}: ${item[variables[1]]}`),
            hoverinfo: 'text'
          }],
          layout: {
            xaxis: { title: variables[0] },
            yaxis: { title: variables[1] }
          }
        };
      }

      case 'pie':
      case 'donut': {
        const counts = data.reduce((acc, item) => {
          const key = item[variables[0]];
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        return {
          series: [{
            values: Object.values(counts),
            labels: Object.keys(counts),
            type: 'pie',
            hole: chart_type === 'donut' ? 0.5 : 0,
            textinfo: 'label+percent',
            hoverinfo: 'label+value+percent'
          }],
          layout: {
            legend: { orientation: 'h', y: -0.2 }
          }
        };
      }

      case 'heatmap': {
        const xCategories = [...new Set(data.map(item => item[variables[0]]))];
        const yCategories = [...new Set(data.map(item => item[variables[1]]))];
        const zValues = yCategories.map(y => 
          xCategories.map(x => {
            const items = data.filter(item => 
              item[variables[0]] === x && item[variables[1]] === y
            );
            return items.length > 0 ? items[0][variables[2]] || 1 : 0;
          })
        );

        return {
          series: [{
            type: 'heatmap',
            x: xCategories,
            y: yCategories,
            z: zValues,
            colorscale: 'Viridis'
          }],
          layout: {
            xaxis: { title: variables[0] },
            yaxis: { title: variables[1] }
          }
        };
      }

      case 'box': {
        return {
          series: [{
            y: data.map(item => item[variables[0]]),
            type: 'box',
            name: variables[0],
            boxpoints: 'outliers'
          }],
          layout: {
            yaxis: { title: variables[0] }
          }
        };
      }

      case 'violin': {
        return {
          series: [{
            y: data.map(item => item[variables[0]]),
            type: 'violin',
            name: variables[0],
            box: { visible: true },
            meanline: { visible: true }
          }],
          layout: {
            yaxis: { title: variables[0] }
          }
        };
      }

      case 'radar': {
        const categories = variables.slice(1);
        return {
          series: [{
            type: 'scatterpolar',
            r: categories.map(cat => {
              const values = data.map(item => item[cat]);
              // Calculate mean manually since Math.mean doesn't exist
              return values.reduce((sum, val) => sum + val, 0) / values.length;
            }),
            theta: categories,
            fill: 'toself'
          }],
          layout: {
            polar: {
              radialaxis: { visible: true, showticklabels: true },
              angularaxis: { direction: "clockwise" }
            }
          }
        };
      }

      default:
        console.log('Unsupported chart type:', chart_type);
        return {
          series: [{
            type: 'scatter',
            x: [0],
            y: [0],
            text: [`Unsupported chart type: ${chart_type}`],
            mode: 'text'
          }],
          layout: {
            showlegend: false
          }
        };
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
        <button
          onClick={fetchChartData}
          className="mt-2 bg-red-100 text-red-800 px-4 py-2 rounded hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Initial Visualization Suggestions */}
      {suggestions && !result && (
        <div className="bg-neutral-800 p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center justify-center">
            Automatic Dashboard
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {suggestions.map((viz, index) => (
              <div
                key={index}
                className="bg-neutral-600 text-white p-6 rounded-lg"
              >
                <h3 className="font-semibold mb-4">{viz.description}</h3>
                {viz.variables && viz.variables.length > 0 ? (
                  <ChartComponent
                    type={viz.chart_type.toLowerCase()}
                    options={prepareChartOptions(viz)}
                    title=""
                    height="300px"
                  />
                ) : (
                  <div className="text-gray-500 italic">
                    Unable to create visualization: missing variables
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Query Interface */}
      <div className="bg-neutral-800 text-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-white mb-6 flex flex-col items-center justify-center text-center">
          Automated Querying
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="query"
              className="block text-sm font-medium text-white mb-2"
            >
              Enter a query to generate visualization
            </label>
            <input
              type="text"
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-neutral-800"
              placeholder="e.g., Show me the distribution of sales by region"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="bg-slate-400 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Loading...
              </span>
            ) : (
              "Analyse"
            )}
          </button>
        </form>

        {/* Query Results */}
        {result && chartData && (
          <div className="mt-8 space-y-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-4">
                Primary Visualization
              </h3>
              {result.primary_visualization.variables &&
              result.primary_visualization.variables.length > 0 ? (
                <ChartComponent
                  type={result.primary_visualization.chart_type.toLowerCase()}
                  options={prepareChartOptions(result.primary_visualization)}
                  title={query}
                />
              ) : (
                <div className="text-gray-500 italic">
                  Unable to create visualization: missing variables
                </div>
              )}
            </div>

            {result.alternative_visualizations?.length > 0 && (
              <div className="space-y-6">
                <h3 className="font-semibold text-lg">
                  Alternative Visualizations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {result.alternative_visualizations.map((viz, index) => (
                    <div key={index} className="bg-gray-50 p-6 rounded-lg">
                      {viz.variables && viz.variables.length > 0 ? (
                        <ChartComponent
                          type={viz.chart_type.toLowerCase()}
                          options={prepareChartOptions(viz)}
                          title={query}
                          height="300px"
                        />
                      ) : (
                        <div className="text-gray-500 italic">
                          Unable to create visualization: missing variables
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default QueryVisualizations;