const margin = {top: 80, right: 50, bottom: 80, left: 70};
const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Scales
const xScale = d3.scaleLinear().range([0, width]);
const yScale = d3.scaleLinear().range([height, 0]);

// Axes
const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
const yAxis = d3.axisLeft(yScale);

svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`);

svg.append("g")
    .attr("class", "y-axis");

// Load data from CSV
d3.csv("cleaned_dataset.csv").then(function(data) {
    // Convert string values to numbers
    data.forEach(d => {
        d.Release_Date = +d.Release_Date;
        d.Battery = +d.Battery;
        d.Memory = +d.Memory;
        d.Primary_Storage = +d.Primary_Storage;
        d.Primary_Camera = +d.Primary_Camera;
    });

    // Get unique brands for filter
    const brands = ['All', ...new Set(data.map(d => d.Brand))];

    // Add brand filter
    const brandSelect = d3.select("#brandFilter")
        .selectAll('option')
        .data(brands)
        .enter()
        .append('option')
        .text(d => d)
        .attr("value", d => d);

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    function updateChart(feature, color, yLabel) {
        const selectedBrand = d3.select("#brandFilter").property("value");
        const filteredData = selectedBrand === 'All' 
            ? data 
            : data.filter(d => d.Brand === selectedBrand);

        xScale.domain(d3.extent(filteredData, d => d.Release_Date));
        yScale.domain([0, d3.max(filteredData, d => d[feature])]);

        svg.select(".x-axis").call(xAxis);
        svg.select(".y-axis").call(yAxis);

        // Remove existing elements
        svg.selectAll("circle").remove();
        svg.selectAll("path").remove();

        const circles = svg.selectAll("circle")
            .data(filteredData);

        circles.enter()
            .append("circle")
            .merge(circles)
            .attr("cx", d => xScale(d.Release_Date))
            .attr("cy", d => yScale(d[feature]))
            .attr("r", 5)
            .attr("fill", color)
            .on("mouseover", (event, d) => {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`Brand: ${d.Brand}<br/>
                              Model: ${d.Model}<br/>
                              Release Date: ${d.Release_Date}<br/>
                              ${feature}: ${d[feature]}<br/>
                              OS: ${d.OS}<br/>
                              Processor: ${d.Processor}`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        circles.exit().remove();

        updateLabels("Release Year", yLabel);

        // Add annotation for the highest value
        if (filteredData.length > 0) {
            const maxValue = d3.max(filteredData, d => d[feature]);
            const maxValuePhone = filteredData.find(d => d[feature] === maxValue);
            addAnnotation(maxValuePhone.Release_Date, maxValue, 
                `Highest ${feature}: ${maxValue}`, `${maxValuePhone.Brand} ${maxValuePhone.Model}`);
        }
    }

    function updateLabels(xLabel, yLabel) {
        svg.select(".x-axis-label").remove();
        svg.append("text")
            .attr("class", "x-axis-label")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .attr("text-anchor", "middle")
            .text(xLabel);

        svg.select(".y-axis-label").remove();
        svg.append("text")
            .attr("class", "y-axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -40)
            .attr("text-anchor", "middle")
            .text(yLabel);
    }

    function addAnnotation(x, y, label, title) {
        svg.selectAll(".annotation").remove();
        let dx = 30;
        let dy = -30;
    
        // Check if annotation would go out of bounds and adjust if necessary
        if (xScale(x) + dx > width) dx = -dx;
        if (yScale(y) + dy < 0) dy = -dy;
    
        const annotations = [{
            note: { label: label, title: title },
            x: xScale(x),
            y: yScale(y),
            dy: dy,
            dx: dx
        }];
    
        const makeAnnotations = d3.annotation()
            .annotations(annotations);
    
        svg.append("g")
            .attr("class", "annotation")
            .call(makeAnnotations);
    }

    function showAll() {
        const phonesByYear = d3.rollup(data, v => v.length, d => d.Release_Date);
        const allData = Array.from(phonesByYear, ([year, count]) => ({year, count})).sort((a, b) => a.year - b.year);

        xScale.domain(d3.extent(allData, d => d.year));
        yScale.domain([0, d3.max(allData, d => d.count)]);

        svg.select(".x-axis").call(xAxis);
        svg.select(".y-axis").call(yAxis);

        // Remove existing elements
        svg.selectAll("circle").remove();
        svg.selectAll("path").remove();

        const line = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.count));

        svg.append("path")
            .datum(allData)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2)
            .attr("d", line);

        updateLabels("Release Year", "Number of Phones Released");

        // Add annotation for the peak year
        const maxCount = d3.max(allData, d => d.count);
        const peakYear = allData.find(d => d.count === maxCount);
        addAnnotation(peakYear.year, maxCount, 
            `Peak releases: ${maxCount} phones`, `Year ${peakYear.year}`);
    }

    function showScene(feature, color, yLabel, title, explanation) {
        d3.select("#title").text(title);
        d3.select("#explanation").text(explanation);
        updateChart(feature, color, yLabel);
    }

    // Scene definitions
    const scenes = {
        battery: {
            feature: "Battery",
            color: "orange",
            yLabel: "Battery Capacity (mAh)",
            title: "Smartphone Battery Capacity Over Time",
            explanation: "This chart shows how smartphone battery capacity has changed over the years. Higher values indicate longer battery life."
        },
        memory: {
            feature: "Memory",
            color: "blue",
            yLabel: "Memory (GB)",
            title: "Smartphone Memory Capacity Over Time",
            explanation: "This chart displays the evolution of smartphone memory capacity. More memory allows for better multitasking and app performance."
        },
        storage: {
            feature: "Primary_Storage",
            color: "green",
            yLabel: "Primary Storage (GB)",
            title: "Smartphone Storage Capacity Over Time",
            explanation: "This visualization shows how smartphone storage capacity has increased. More storage allows users to keep more apps, photos, and files on their devices."
        },
        camera: {
            feature: "Primary_Camera",
            color: "purple",
            yLabel: "Primary Camera (MP)",
            title: "Smartphone Camera Resolution Over Time",
            explanation: "This chart illustrates the improvement in smartphone camera resolutions. Higher megapixel counts generally allow for more detailed photos."
        },
        all: {
            title: "Number of Phones Released Per Year",
            explanation: "This line graph shows the trend in smartphone releases over the years, indicating the overall growth of the smartphone market."
        }
    };

    // Event listeners for buttons
    Object.keys(scenes).forEach(scene => {
        document.getElementById(`${scene}Btn`).addEventListener("click", () => {
            d3.selectAll("button").classed("active", false);
            d3.select(`#${scene}Btn`).classed("active", true);
            currentSceneIndex = sceneOrder.indexOf(scene);
            if (scene === 'all') {
                const s = scenes[scene];
                showScene(s.feature, s.color, s.yLabel, s.title, s.explanation);
                showAll();
                d3.select("#brandFilter").property("disabled", true);
            } else {
                const s = scenes[scene];
                showScene(s.feature, s.color, s.yLabel, s.title, s.explanation);
                d3.select("#brandFilter").property("disabled", false);
            }
            
            // Update Previous/Next button states
            document.getElementById("prevBtn").disabled = (currentSceneIndex === 0);
            document.getElementById("nextBtn").disabled = (currentSceneIndex === sceneOrder.length - 1);
        });
    });

    // Brand filter event listener
    d3.select("#brandFilter").on("change", function() {
        const currentScene = d3.select("button.active").attr("id").replace("Btn", "");
        if (currentScene !== 'all') {
            const s = scenes[currentScene];
            updateChart(s.feature, s.color, s.yLabel);
        }
    });

    // Initial scene (All)
    showScene(scenes.all.feature, scenes.all.color, scenes.all.yLabel, scenes.all.title, scenes.all.explanation);
    showAll();
    d3.select("#brandFilter").property("disabled", true);
});

const sceneOrder = ['all', 'battery', 'memory', 'storage', 'camera'];
let currentSceneIndex = 0;

function updateScene(index) {
    currentSceneIndex = index;
    const scene = sceneOrder[currentSceneIndex];
    document.getElementById(`${scene}Btn`).click();
    
    // Update button states
    document.getElementById("prevBtn").disabled = (currentSceneIndex === 0);
    document.getElementById("nextBtn").disabled = (currentSceneIndex === sceneOrder.length - 1);
}

document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentSceneIndex > 0) {
        updateScene(currentSceneIndex - 1);
    }
});

document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentSceneIndex < sceneOrder.length - 1) {
        updateScene(currentSceneIndex + 1);
    }
});

document.getElementById("prevBtn").disabled = true; // Initial scene

