function preinit() {
    uniqueID = 100;
    nodes = [ Node("gtk", "package") ];
    links = [ ];

    // Go through links and replace the numeric indices with pointers to the actual node object
    // D3's force will do this anyway and it just confuses things to have the numeric IDs in there

    for(var i=0;i<links.length;i++) {
	links[i].source = nodes[links[i].source];
	links[i].target = nodes[links[i].target];
    }

    packageColours = { "package": "#f00", "object": "#0f0", "symbol": "#00f" };
}

function Node(name, type)
{
    return { "x": 350 + Math.random(), "y": 250+Math.random(), "name": name, "type": type, "id": uniqueID++, "size": 32, "expanded": 0, "markedForDeletion": 0 };
}

function findNodeByID(id)
{
    // Horrible search function that should be done with a hash
    for(var i=0;i<nodes.length;i++) {
	if(nodes[i].id == id) return nodes[i];
    }
    return null;
}

function getChildNodes(node)
{
    return [ Node(node.name+"childnode","object") ];
}

function expandOrContractNode(n) {
    var node = findNodeByID(n);
    console.log("Expand/contract "+n)
    if(node.expanded) {
	// Collapse it (remove all child linked nodes)
	newLinks = [];
	for(var i=0;i<links.length;i++) {
	    if(links[i].type != "childof" || links[i].source != node) {
		newLinks.push(links[i]);
	    } else {
		// Todo: At the moment, this doesn't mark subnodes of the deleted node for deletion...
		links[i].target.markedForDeletion = 1;
	    }
	}
	links = newLinks;
	newNodes = [];
	for(var i=0;i<nodes.length;i++) {
	    if(nodes[i].markedForDeletion == 0)
		newNodes.push(nodes[i]);
	}
	nodes = newNodes;
	node.size = 32;
	node.expanded = 0;
    } else {
	// Expand it
	var children = getChildNodes(node);
	for(var i=0;i<children.length;i++) {
	    nodes.push(children[i]);
	    links.push( { "source": node, "target": children[i], "type": "childof" } );
	}
	node.size = 64;
	node.expanded = 1;
    }
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
	.attr("r", function(d) { return d.size; });

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
	force.start();
    }
    circles.call(dragger);
    circles.on("dblclick", clickFn);
    force.start();
}

preinit();
init();
