var exampleJSON = [
    { "Object": "Sym1", "parent": "d3d.o", "value": 0, "_id": 0 },
    { "Object": "Sym2", "parent": "d3d.o", "value": 1, "_id": 1 },
    { "Object": "Sym3", "parent": "d3d.o", "value": 2, "_id": 2 },
    { "Object": "Sym4", "parent": "d3d.o", "value": 2, "_id": 3 },
    { "Object": "Sym1", "parent": "ttf.o", "value": 0, "_id": 4 },
    { "Object": "Sym2", "parent": "ttf.o", "value": 0, "_id": 5 },
    { "Object": "Sym3", "parent": "ttf.o", "value": 0, "_id": 6 },
    { "Object": "Sym1", "parent": "alx.o", "value": 0, "_id": 7 },
    { "Object": "Sym2", "parent": "alx.o", "value": 1, "_id": 8 },
    { "Object": "Sym3", "parent": "alx.o", "value": 2, "_id": 9 },
    { "Object": "Sym1", "parent": "klf.o", "value": 0, "_id": 10 },
    { "Object": "Sym2", "parent": "klf.o", "value": 1, "_id": 11 },
    { "Object": "Sym3", "parent": "klf.o", "value": 2, "_id": 12 },
    { "Object": "Sym4", "parent": "klf.o", "value": 2, "_id": 13 },
];

var exampleCalls = [
    { source: [0,"",""], target: [4, "",""] },
    { source: [2,"",""], target: [5, "",""] },
    { source: [7,"",""], target: [7, "",""] },
    { source: [5,"",""], target: [10, "",""] },
    { source: [1,"",""], target: [2, "",""] },
    { source: [2,"",""], target: [5, "",""] },
    { source: [12,"",""], target: [1, "",""] },
    { source: [13,"",""], target: [13, "",""] },
    { source: [0,"",""], target: [12, "",""] },
];

var d3;
var $;
var packageName : string = "libhfr";
var nodeid = "id:calls."+packageName;


function database()
{
    $.getJSON('/graph/present/' + nodeid, function (node_info) {
	var json1 = [];
	var callGraph = [];
	console.log("Displaying node: ", node_info);
	var pack = node_info.nodes[0];
	console.log("Package returned: "+pack.caption);
	for(var o=0;o<pack.contains.nodes.length;o++) {
	    var object = pack.contains.nodes[o];
	    console.log("Recording object "+object.caption);
	    var allNodes = {}
	    for (var s=0;s<object.contains.nodes.length;s++) {
		var node = object.contains.nodes[s];
		if(node.caption == "") {
		    console.log("Loaded object with no caption! id: "+node._id);
		}
		json1.push( { "Object": node.caption.substr(0,4), "parent": node.caption.substr(0,4), "value": 0, "_id": node._id});
		allNodes[node._id] = true;
	    }
	    for (var e=0;e<object.contains.edges.length;e++) {
		var edge = object.contains.edges[e];
		if(allNodes[edge._source] == true && allNodes[edge._target] == true) {
		    callGraph.push( { source: [edge._source, "", ""], target: [edge._target, "", ""] } );
		}
	    }
	}
	graph.data(json1, callGraph);
    });
}

var blockSize : number = 64;

function nodeXFunction (obj) {
    if(obj==null) return 0;
    if(obj.index)
    {
	return 32 + ((obj.index - 1) * blockSize);
    } else {
	console.log("Object: '"+obj.Object+"' has no index");
	return 0;
    }
}

function nodeYFunction (obj) {
    if(obj===null) {
	return 0;
    }
    if(obj.row) {
	var y = (obj.row - 1) * blockSize + (16*obj.objectNo)-12;
	return y;
    } else {
	console.log("Object has no row");
	return 0;
    }
}

function nodeTranslationFunction (obj) { var x = nodeXFunction(obj);
					 var y = nodeYFunction(obj);
					 return "translate ("+x+" "+y+")"; }

function noop() : void
{
}

function nodeDrawCallback(_this, thing)
{
    group = thing.append('g');
    group.attr( "transform", nodeTranslationFunction );
    group.append('rect').attr('x', 0)
        .attr('y', 0)
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('width', _this.config.blockSize)
        .attr('height', _this.config.blockSize)
        .style('fill', function(obj) {
            return _this.config.colors[obj.color % _this.config.colors.length] || _this.config.colors[0];
        })
        .attr('class', 'relationshipGraph-block')
        .on('mouseover', _this.tip ? _this.tip.show : noop)
        .on('mouseout', _this.tip ? _this.tip.hide : noop)
        .on('click', function(obj) {
            _this.tip.hide();
            _this.config.onClick(obj);
        });
    group.append('text').attr('x', 0).attr('y', (_this.config.blockSize)/2).attr("fill", "#000").text(function(obj) { return obj.Object; });
    group.attr('class', 'relationshipGraph-node');


}

function initGraph()
{
    return d3.select('#graph').relationshipGraph({
        'showTooltips': true,
        'maxChildCount': 3,
	'showKeys': false,
	'blockSize': 32,
	'nodeDrawCallback': nodeDrawCallback,
	'thresholds': [1, 2, 3], // This is the threshold used for each colour
	onClick: function(obj) { // This is called when a symbol is clicked
	},
	colors: ['red', 'green', 'blue'],
    });
}

var graph = initGraph();

var interval = null;

document.querySelector('h1').innerHTML = packageName;

// Thing to add all the callers
var data = [ "A", "B", "C", "D" ];

function setPackageLabelAttributes(selection)
{
    selection.attr("height", function(d) { return 32; })
	.attr("x", 0).attr("rx", 4).attr("ry", 4)
	.attr("y", function(d, index) { return index*40; })
	.style("fill", "#000000")
	.attr("width", 100);
}

function setPackageLabelTextAttributes(selection)
{
    selection.attr("x", 10)
	.attr("y", function(d, index) { return index*40+20; })
	.style("fill", "#ffffff")
	.text(function(d) { return "Package "+d });
}


var group = d3.select(".callsIn").selectAll("rect").data(data).enter().append("g");

setPackageLabelAttributes(group.append("rect"));

setPackageLabelTextAttributes(group.append("text"));

// And the same for calls out
var data = [ "E", "F", "G", "H" ];

var group = d3.select(".callsOut").selectAll("rect").data(data).enter().append("g");

setPackageLabelAttributes(group.append("rect"));
setPackageLabelTextAttributes(group.append("text"));

function example() {
    graph = initGraph();
    graph.data(exampleJSON, exampleCalls);
}
