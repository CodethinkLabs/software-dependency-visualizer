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

    copy() : SoftwareNode {
	var n = new SoftwareNode(this.name, this.type);
	n.x = this.x; n.y = this.y; n.id = this.id;
	n.size = this.size; n.expanded = this.expanded;
	n.markedForDeletion = this.markedForDeletion;
	return n;
    }
}

class Link {
    source: SoftwareNode;
    target: SoftwareNode;
    type: string;
    markedForDeletion: boolean;

    constructor(source: SoftwareNode, target: SoftwareNode, type: string) {
	this.source = source;
	this.target = target;
	this.type = type;
	this.markedForDeletion = false;
    }
}

interface Markable {
    markedForDeletion: boolean;
}

function recursiveMarkForDeletion(target: SoftwareNode) {
    target.markedForDeletion = true;
    for(var i=0;i<links.length;i++) {
	if(links[i].type == "childof" && links[i].source == target) {
	    links[i].markedForDeletion = true;
	    recursiveMarkForDeletion(links[i].target);
	}
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

function purge<T extends Markable>(list : T[]): T[]
{
    var newList : T[] = [];
    for(var i=0;i<list.length;i++) if(!list[i].markedForDeletion) newList.push(list[i]);
    return newList;
}

function findNodeByID(id : number, nodelist : SoftwareNode[]) : SoftwareNode
{
    // Horrible search function that should be done with a hash
    for(var i=0;i<nodelist.length;i++) {
	if(nodelist[i].id == id) return nodelist[i];
    }
    console.log("No id "+id+" in nodelist");
    return null;
}

function getChildNodes(node: SoftwareNode) : SoftwareNode[]
{
    return [ new SoftwareNode(node.name+"child",node.type+"-derivative") ];
}

function expandOrContractNode(n: number) {
    var node = findNodeByID(n, nodes);
    console.log("Expand/contract "+n)
    if(node.expanded) {
	// Collapse it (remove all child linked nodes)
	for(var i=0;i<links.length;i++) {
	    if(links[i].type == "childof" && links[i].source == node) {
		recursiveMarkForDeletion(links[i].target)
		links[i].markedForDeletion = true;
	    }
	}
	links = purge(links);
	nodes = purge(nodes);
	node.size = 32;
	node.expanded = false;
    } else {
	// Expand it
	var children = getChildNodes(node);
	for(var i=0;i<children.length;i++) {
	    nodes.push(children[i]);
	    links.push( new Link(node, children[i], "childof"));
	}
	node.size = 40;
	node.expanded = true;
    }
}

function duplicateNodes(nodelist : SoftwareNode[]) : SoftwareNode[]
{
    var targetNodes = []
    for(var i=0;i<nodelist.length;i++) {
        var source = nodelist[i];
	targetNodes.push(source.copy());
    }
    return targetNodes;
}

function duplicateLinks(linklist : Link[], nodelist: SoftwareNode[]) : Link[]
{
    // This has to locate nodes that are actually in the nodelist; duplicating
    // the pointer as is will still have them pointing to the old list
    var targetLinks = []
    for(var i=0;i<linklist.length;i++)
    {
    	var source = linklist[i];
	targetLinks.push( new Link(findNodeByID(source.source.id, nodelist), findNodeByID(source.target.id, nodelist), source.type));
	console.log("Duplicating link: "+source.source.id+" to "+source.target.id);
    }
    return targetLinks;
}

function init() {
    var svg = d3.select('body').select('svg');
    svg.selectAll("*").remove();

    // Duplicate all the nodes and links, because d3 changes them in a way we can't yet predict
    // which breaks our model
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
    force.linkDistance(200).gravity(0.1).friction(0.5);

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
