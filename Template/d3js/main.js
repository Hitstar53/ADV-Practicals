// Placeholder CSV file name and column names
const csvFileName = "../../Datasets/Global_Education_cleaned.csv"; // Update with your file path
const columnX = "Country"; // X-axis column for line, scatter, and bubble charts
const columnY = "Unemployment_Rate"; // Y-axis column for line, scatter, and bubble charts
const columnCategory = ""; // Category column for bar and pie charts
const columnValue = "Birth_Rate"; // Value column for bar, pie, and histogram charts

// Load CSV data
d3.csv(csvFileName).then((data) => {
  // Convert numerical values if necessary
  data.forEach((d) => {
    d[columnX] = +d[columnX];
    d[columnY] = +d[columnY];
    d[columnValue] = +d[columnValue];
  });

  // 1. Bar Chart
  const barSvg = d3
    .select("#bar-chart")
    .append("svg")
    .attr("width", 400)
    .attr("height", 300);
  const barX = d3
    .scaleBand()
    .domain(data.map((d) => d[columnCategory]))
    .range([0, 350])
    .padding(0.1);
  const barY = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d[columnValue])])
    .nice()
    .range([250, 0]);
  barSvg
    .selectAll(".bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", (d) => barX(d[columnCategory]))
    .attr("y", (d) => barY(d[columnValue]))
    .attr("width", barX.bandwidth())
    .attr("height", (d) => 250 - barY(d[columnValue]));

  // 2. Line Chart
  const lineSvg = d3
    .select("#line-chart")
    .append("svg")
    .attr("width", 400)
    .attr("height", 300);
  const lineX = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d[columnX]))
    .range([0, 350]);
  const lineY = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d[columnY])])
    .range([250, 0]);
  const line = d3
    .line()
    .x((d) => lineX(d[columnX]))
    .y((d) => lineY(d[columnY]));
  lineSvg
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("d", line);

  // 3. Scatter Plot
  const scatterSvg = d3
    .select("#scatter-plot")
    .append("svg")
    .attr("width", 400)
    .attr("height", 300);
  scatterSvg
    .selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", (d) => lineX(d[columnX]))
    .attr("cy", (d) => lineY(d[columnY]))
    .attr("r", 5)
    .style("fill", "orange");

  // 4. Pie Chart
  const pieSvg = d3
    .select("#pie-chart")
    .append("svg")
    .attr("width", 300)
    .attr("height", 300)
    .append("g")
    .attr("transform", "translate(150,150)");
  const pie = d3.pie().value((d) => d[columnValue])(data);
  const arc = d3.arc().innerRadius(0).outerRadius(100);
  pieSvg
    .selectAll(".slice")
    .data(pie)
    .enter()
    .append("path")
    .attr("class", "pie-slice")
    .attr("d", arc)
    .style("fill", (d, i) => d3.schemeCategory10[i % 10]);

  // 5. Histogram
  const histogramSvg = d3
    .select("#histogram")
    .append("svg")
    .attr("width", 400)
    .attr("height", 300);
  const histogramX = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d[columnValue]))
    .range([0, 350]);
  const histogram = d3.histogram().domain(histogramX.domain()).thresholds(10)(
    data.map((d) => d[columnValue])
  );
  const histogramY = d3
    .scaleLinear()
    .domain([0, d3.max(histogram, (d) => d.length)])
    .range([250, 0]);
  histogramSvg
    .selectAll("rect")
    .data(histogram)
    .enter()
    .append("rect")
    .attr("x", (d) => histogramX(d.x0))
    .attr("y", (d) => histogramY(d.length))
    .attr("width", (d) => histogramX(d.x1) - histogramX(d.x0))
    .attr("height", (d) => 250 - histogramY(d.length));

  // 6. Bubble Chart
  const bubbleSvg = d3
    .select("#bubble-chart")
    .append("svg")
    .attr("width", 400)
    .attr("height", 300);
  const bubbleRadius = d3
    .scaleSqrt()
    .domain([0, d3.max(data, (d) => d[columnValue])])
    .range([5, 20]);
  bubbleSvg
    .selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "bubble")
    .attr("cx", (d) => lineX(d[columnX]))
    .attr("cy", (d) => lineY(d[columnY]))
    .attr("r", (d) => bubbleRadius(d[columnValue]));
});
