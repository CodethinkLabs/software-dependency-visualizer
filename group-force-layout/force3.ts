// External libraries
declare var d3:any;

// Global variables
var uniqueID = 100;
var nodes;
var links;
var packageColours;

class SoftwareNode {
    x: number;
    y: number;
    name: string;
    type: string;
    id: number;
    size: number;
    expanded: boolean;
    markedForDeletion: boolean;

    constructor(name: string, type:string) {
	var id = uniqueID++;
	console.log("New node, ID "+id);
	this.x = 350 + Math.random()*300;
	this.y = 250+Math.random()*300;
	this.name = name;
	this.type = type;
	this.id = id;
	this.size = 32;
	this.expanded = false;
	this.markedForDeletion = false;
    }
}

function preinit() {
    nodes = [ new SoftwareNode("gtk", "package") ];
    links = [ ];

    // Go through links and replace the numeric indices with pointers to the actual node object
    // D3's force will do this anyway and it just confuses things to have the numeric IDs in there

    for(var i=0;i<links.length;i++) {
	links[i].source = nodes[links[i].source];
	links[i].target = nodes[links[i].target];
    }

    packageColours = { "package": "#f00", "object": "#0f0", "symbol": "#00f" };
}


function CopyNode(source:SoftwareNode) : SoftwareNode
{
    return { "x": source.x, "y": source.y, "name": source.name, "type": source.type, "id": source.id, "size": 32, "expanded": source.expanded, "markedForDeletion": false };
}

function findNodeByID(id : number, nodelist :SoftwareNode[])
{
    // Horrible search function that should be done with a hash
    for(var i=0;i<nodelist.length;i++) {
	if(nodelist[i].id == id) return nodelist[i];
    }
    console.log("No id "+id+" in nodelist");
    return null;
}

function getChildNodes(node)
{
    return [ new SoftwareNode(node.name+"child",node.type+"-derivative") ];
}

function expandOrContractNode(n) {
    var node = findNodeByID(n, nodes);
    console.log("Expand/contract "+n)
    if(node.expanded) {
	// Collapse it (remove all child linked nodes)
	var newLinks = [];
	for(var i=0;i<links.length;i++) {
	    if(links[i].type != "childof" || links[i].source != node) {
		newLinks.push(links[i]);
	    } else {
		// Todo: At the moment, this doesn't mark subnodes of the deleted node for deletion...
		links[i].target.markedForDeletion = 1;
	    }
	}
	links = newLinks;
	var newNodes = [];
	for(var i=0;i<nodes.length;i++) {
	    if(nodes[i].markedForDeletion == 0)
		newNodes.push(nodes[i]);
	}
	nodes = newNodes;
	node.size = 32;
	node.expanded = false;
    } else {
	// Expand it
	var children = getChildNodes(node);
	for(var i=0;i<children.length;i++) {
	    nodes.push(children[i]);
	    links.push( { "source": node, "target": children[i], "type": "childof" } );
	}
	node.size = 40;
	node.expanded = true;
    }
}

function duplicateNodes(nodelist)
{
    var targetNodes = []
    for(var i=0;i<nodelist.length;i++) {
        var source = nodelist[i];
	targetNodes.push(CopyNode(source));
    }
    return targetNodes;
}

function duplicateLinks(linklist, nodelist)
{
    // This has to locate nodes that are actually in the nodelist
    var targetLinks = []
    for(var i=0;i<linklist.length;i++)
    {
    	var source = linklist[i];
	targetLinks.push( { "source": findNodeByID(source.source.id, nodelist), "target": findNodeByID(source.target.id, nodelist), "type": source.type} );
    }
    return targetLinks;
}

function init() {
    var svg = d3.select('body').select('svg');
    svg.selectAll("*").remove();

    var d3nodes = duplicateNodes(nodes);
    var d3links = duplicateLinks(links, d3nodes);

    var lines = svg.selectAll("line").data(d3links).enter().append("line")
	.attr("x1", function (d) { return d.source.x; })
	.attr("y1", function (d) { return d.source.y; })
	.attr("x2", function (d) { return d.target.x; })
	.attr("y2", function (d) { return d.target.y; })
	.attr("style", "stroke: #000; stroke-width: 1px");

    var circles = svg.selectAll("circle")
	.data(d3nodes).enter().append("circle")
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

    var force = d3.layout.force().size([700,500]).nodes(d3nodes).links(d3links);
    force.linkDistance(200).gravity(1.0).friction(0.5);

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
