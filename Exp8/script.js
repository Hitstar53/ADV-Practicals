// Load data from CSV
d3.csv("../Datasets/weather_data.csv").then(data => {
    data.forEach(d => {
        d.MinTemp = +d.MinTemp;
        d.MaxTemp = +d.MaxTemp;
        d.Rainfall = +d.Rainfall;
        d.Humidity3pm = +d.Humidity3pm;
        d.Date = new Date(d.Date);
        d.Year = d.Date.getFullYear();
    });

    // Draw all charts
    drawBarChart(data);
    drawPieChart(data);
    drawScatterPlot(data);
    drawBoxPlot(data);
    drawKPIBox(data);
});

// KPI Box showing max, min temperature, max humidity, place with most rainfall
function drawKPIBox(data) {
    const maxTemp = d3.max(data, d => d.MaxTemp);
    const minTemp = d3.min(data, d => d.MinTemp);
    const maxHumidity = d3.max(data, d => d.Humidity3pm);

    // Group rainfall by location and sum it
    const rainfallByLocation = d3.rollup(
        data,
        v => d3.sum(v, d => +d.Rainfall), // Convert rainfall to number
        d => d.Location
    );

    const maxRainfallLocation = Array.from(rainfallByLocation).reduce((prev, curr) => {
        return (prev[1] > curr[1]) ? prev : curr;
    });

    const kpiData = {
        "Max Temperature": maxTemp,
        "Min Temperature": minTemp,
        "Max Humidity": maxHumidity,
        "Location with Most Rainfall": maxRainfallLocation[0] + ` (${maxRainfallLocation[1].toFixed(2)} mm)`
    };

    const kpiBox = d3.select("#kpi-box");
    kpiBox.selectAll("div").remove(); // Clear previous content

    Object.entries(kpiData).forEach(([key, value]) => {
        kpiBox.append("div")
            .attr("class", "kpi-item")
            .html(`<strong>${key}:</strong> ${value}`);
    });
}
// Bar Chart for Total Rainfall for Each Year
function drawBarChart(data) {
    const rainfallByYear = d3.rollup(data, v => d3.sum(v, d => d.Rainfall), d => d.Year);
    const formattedData = Array.from(rainfallByYear, ([year, rainfall]) => ({ year, rainfall }));

    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = 460 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#bar-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(formattedData.map(d => d.year))
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(formattedData, d => d.rainfall)])
        .nice()
        .range([height, 0]);

    svg.selectAll(".bar")
        .data(formattedData)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.year))
        .attr("y", d => y(d.rainfall))
        .attr("height", d => height - y(d.rainfall))
        .attr("width", x.bandwidth());

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y));

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .text("Total Rainfall per Year");
}

// Scatter Plot for Humidity vs Rainfall
function drawScatterPlot(data) {
    const filteredData = data.filter(d => d.Humidity3pm < 100 && d.Rainfall >= 0); // Remove outliers
    const regressionLine = getRegressionLine(filteredData);

    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = 460 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#scatter-plot")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.Humidity3pm)])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.Rainfall)])
        .range([height, 0]);

    svg.selectAll("circle")
        .data(filteredData)
        .enter().append("circle")
        .attr("cx", d => x(d.Humidity3pm))
        .attr("cy", d => y(d.Rainfall))
        .attr("r", 5)
        .attr("fill", "#69b3a2");

    // Draw regression line
    svg.append("line")
        .attr("x1", x(0))
        .attr("y1", y(regressionLine[0]))
        .attr("x2", x(d3.max(filteredData, d => d.Humidity3pm)))
        .attr("y2", y(regressionLine[1]))
        .attr("stroke", "red")
        .attr("stroke-width", 2);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y));

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .text("Humidity vs Rainfall");
}

// Linear regression to calculate correlation line
function getRegressionLine(data) {
    const n = data.length;
    const sumX = d3.sum(data, d => d.Humidity3pm);
    const sumY = d3.sum(data, d => d.Rainfall);
    const sumXY = d3.sum(data, d => d.Humidity3pm * d.Rainfall);
    const sumX2 = d3.sum(data, d => d.Humidity3pm ** 2);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
    const intercept = (sumY - slope * sumX) / n;

    return [
        intercept + slope * d3.min(data, d => d.Humidity3pm), // y for minHumidity
        intercept + slope * d3.max(data, d => d.Humidity3pm)  // y for maxHumidity
    ];
}

// Pie Chart for Sunshine Distribution
// Pie Chart for Sunshine Distribution
function drawPieChart(data) {
    const sunshineCount = d3.rollup(data, v => v.length, d => d.WindGustDir);
    const formattedData = Array.from(sunshineCount, ([direction, count]) => ({ direction, count }));

    const width = 460, height = 400, radius = Math.min(width, height) / 2;

    const svg = d3.select("#pie-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const pie = d3.pie().value(d => d.count);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    const arcs = svg.selectAll(".arc")
        .data(pie(formattedData))
        .enter().append("g")
        .attr("class", "arc");

    arcs.append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.direction));

    arcs.append("text")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("dy", ".35em")
        .text(d => d.data.direction);

    svg.append("text")
        .attr("x", 0)
        .attr("y", -height / 2 + 20)
        .attr("text-anchor", "middle")
        .text("Sunshine Distribution");
}

// Box Plot for Temperature Min/Max Each Year
function drawBoxPlot(data) {
    const groupedData = d3.group(data, d => d.Year);
    const formattedData = Array.from(groupedData, ([year, values]) => {
        return {
            year,
            min: d3.min(values, d => d.MinTemp),
            q1: d3.quantile(values, 0.25, d => d.MaxTemp),
            median: d3.median(values, d => d.MaxTemp),
            q3: d3.quantile(values, 0.75, d => d.MaxTemp),
            max: d3.max(values, d => d.MaxTemp)
        };
    });

    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = 460 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#box-plot")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(formattedData.map(d => d.year))
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([d3.min(formattedData, d => d.min), d3.max(formattedData, d => d.max)])
        .range([height, 0]);

    // Draw the box plots
    svg.selectAll(".box")
        .data(formattedData)
        .enter().append("rect")
        .attr("class", "box")
        .attr("x", d => x(d.year))
        .attr("y", d => y(d.q3))
        .attr("height", d => y(d.q1) - y(d.q3))
        .attr("width", x.bandwidth());

    // Draw the whiskers
    svg.selectAll(".whisker")
        .data(formattedData)
        .enter().append("line")
        .attr("class", "whisker")
        .attr("x1", d => x(d.year) + x.bandwidth() / 2)
        .attr("x2", d => x(d.year) + x.bandwidth() / 2)
        .attr("y1", d => y(d.max))
        .attr("y2", d => y(d.min))
        .attr("stroke", "black");

    // Draw the median line
    svg.selectAll(".median")
        .data(formattedData)
        .enter().append("line")
        .attr("class", "median")
        .attr("x1", d => x(d.year))
        .attr("x2", d => x(d.year) + x.bandwidth())
        .attr("y1", d => y(d.median))
        .attr("y2", d => y(d.median))
        .attr("stroke", "red");

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y));

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .text("Temperature Box Plot per Year");
}
