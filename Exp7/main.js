// Load the CSV file
d3.csv("../Datasets/bank_loans_cleaned.csv").then(function (data) {
  // Parse the data - Count loan status occurrences
  const loanStatusCounts = d3.rollup(
    data,
    (v) => v.length,
    (d) => d["Loan Status"]
  );

  const loanStatusArray = Array.from(loanStatusCounts, ([status, count]) => ({
    status,
    count,
  }));

  // Set the dimensions of the chart
  const margin = { top: 20, right: 30, bottom: 60, left: 60 };
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // Create an SVG element and append it to the chart div
  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Set up scales for x and y axes
  const x = d3
    .scaleBand()
    .domain(loanStatusArray.map((d) => d.status))
    .range([0, width])
    .padding(0.1);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(loanStatusArray, (d) => d.count)])
    .nice()
    .range([height, 0]);

  // Append x axis
  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .attr("class", "x-axis")
    .call(d3.axisBottom(x));

  // Append y axis
  svg.append("g").call(d3.axisLeft(y));

  // Create bars
  svg
    .selectAll(".bar")
    .data(loanStatusArray)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", (d) => x(d.status))
    .attr("y", (d) => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", (d) => height - y(d.count));

  // Add title and labels
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .attr("class", "axis-label")
    .text("Loan Status");

  svg
    .append("text")
    .attr("x", -(height / 2))
    .attr("y", -margin.left + 20)
    .attr("transform", "rotate(-90)")
    .attr("class", "axis-label")
    .text("Number of Loans");
});
