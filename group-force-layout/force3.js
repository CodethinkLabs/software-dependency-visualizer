function preinit() {
    nodes = [ { "x": 350, "y": 200, "id": 1 }, { "x": 200, "y": 400, "id": 2 }, { "x": 500, "y": 400, "id": 3}, {"x": 350, "y": 150}  ];
    links = [ { "source": 0, "target": 1 }, {"source": 1, "target":2}, {"source":2, "target":3}, {"source": 3, "target":0}];
}

function init() {

    var svg = d3.select("svg");

    var lines = svg.selectAll("line").data(links).enter().append("line")
	.attr("x1", function (d) { return nodes[d.source].x; })
	.attr("y1", function (d) { return nodes[d.source].y; })
	.attr("x2", function (d) { return nodes[d.target].x; })
	.attr("y2", function (d) { return nodes[d.target].y; })
	.attr("style", "stroke: #000; stroke-width: 1px");

    var circles = svg.selectAll("circle")
	.data(nodes).enter().append("circle")
	.attr("cx", function(d) { return d.x; })
	.attr("cy", function(d) { return d.y; })
        .attr("id", function(d) { return d.id; })
	.attr("r", 30);

    var delay = 100; // milliseconds

    var force = d3.layout.force().size([700,500]).nodes(nodes).links(links);
    force.linkDistance(100);

    force.on("tick", function () {
        circles.transition().ease('linear').duration(delay)
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });

        lines.transition().ease('linear').duration(delay)
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });
    });
    var dragger = d3.behavior.drag().on("drag", dragFn);

    function dragFn(d) {
	d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
	force.start();
    }
    function clickFn(d) {
	var ident = d3.select(this).attr("id");
	console.log("Click!" + ident);
	nodes.push( { "x": 500, "y":500, "id":5});
	init();
    }
    circles.call(dragger);
    circles.on("dblclick", clickFn);
    force.start();
}

preinit();
init();
