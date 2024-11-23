import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist';

function ChartComponent({ type, options, title, height = '400px' }) {
  const chartRef = useRef(null);
  const plotInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const prepareLayout = () => ({
      title: {
        text: title,
        x: 0.5,
        xanchor: 'center'
      },
      showlegend: true,
      legend: {
        orientation: 'h',
        y: -0.2
      },
      margin: { t: 50, l: 50, r: 50, b: 100 },
      height: parseInt(height),
      width: chartRef.current.offsetWidth,
      ...options?.layout
    });

    const prepareConfig = () => ({
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      ...options?.config
    });

    const prepareData = () => {
      if (!options?.series) return [];

      return options.series.map(series => ({
        type: type.toLowerCase(),
        ...series
      }));
    };

    try {
      // Create or update the plot
      Plotly.newPlot(
        chartRef.current,
        prepareData(),
        prepareLayout(),
        prepareConfig()
      ).then(plot => {
        plotInstance.current = plot;
      });

      // Handle window resize
      const handleResize = () => {
        if (chartRef.current) {
          Plotly.relayout(chartRef.current, {
            width: chartRef.current.offsetWidth
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        // Only purge if the element still exists
        if (chartRef.current && plotInstance.current) {
          Plotly.purge(chartRef.current);
        }
      };
    } catch (error) {
      console.error('Error creating plot:', error);
    }
  }, [type, options, title, height]);

  return (
    <div 
      ref={chartRef} 
      style={{ width: '100%', height, minHeight: '300px' }}
      className="plotly-chart-container"
    />
  );
}

export default ChartComponent; 