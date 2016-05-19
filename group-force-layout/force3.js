function preinit() {
    nodes = [ { "x": 350, "y": 200, "id": 1, "type": "package", "name": "gtk" }, { "x": 200, "y": 400, "id": 2 }, { "x": 500, "y": 400, "id": 3}, {"x": 350, "y": 150}  ];
    links = [ { "source": 0, "target": 1 }, {"source": 1, "target":2}, {"source":2, "target":3}, {"source": 3, "target":0} ];

    // Go through links and replace the numeric indices with pointers to the actual node object
    // D3's force will do this anyway and it just confuses things to have the numeric IDs in there

    for(var i=0;i<links.length;i++) {
	links[i].source = nodes[links[i].source];
	links[i].target = nodes[links[i].target];
    }

    packageColours = { "package": "#f00", "object": "#0f0", "symbol": "#00f" };
}

function findNodeByID(id)
{
    // Horrible search function that should be done with a hash
    for(var i=0;i<nodes.length;i++) {
	if(nodes[i].id == id) return nodes[i];
    }
    return null;
}

function expandOrContractNode(n) {
    nodes.push( { "x": 500, "y":500, "id":5, "type": "object", "name": "gtk.o"});
    links.push( { "source": findNodeByID(1), "target": findNodeByID(5) });
}

function init() {

    svg = d3.select('body').select('svg');
    svg.selectAll("*").remove();

    var lines = svg.selectAll("line").data(links).enter().append("line")
	.attr("x1", function (d) { return d.source.x; })
	.attr("y1", function (d) { return d.source.y; })
	.attr("x2", function (d) { return d.target.x; })
	.attr("y2", function (d) { return d.target.y; })
	.attr("style", "stroke: #000; stroke-width: 1px");

    var circles = svg.selectAll("circle")
	.data(nodes).enter().append("circle")
	.attr("cx", function(d) { return d.x; })
	.attr("cy", function(d) { return d.y; })
        .attr("id", function(d) { return d.id; })
        .attr("style", function(d) { if( d.type in packageColours ) {
	    return "fill:"+packageColours[d.type];
	} else {
	    return "fill:#777";
	} } )
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
	expandOrContractNode(ident);
	init();
    }
    circles.call(dragger);
    circles.on("dblclick", clickFn);
    force.start();
}

preinit();
init();
