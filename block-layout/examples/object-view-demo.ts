var exampleJSON = [
    { "symbolName": "Sym1", "parent": "d3d.o", "sortIndex": 0, "_id": 0 },
    { "symbolName": "Sym2", "parent": "d3d.o", "sortIndex": 1, "_id": 1 },
    { "symbolName": "Sym3", "parent": "d3d.o", "sortIndex": 2, "_id": 2 },
    { "symbolName": "Sym4", "parent": "d3d.o", "sortIndex": 2, "_id": 3 },
    { "symbolName": "Sym1", "parent": "ttf.o", "sortIndex": 0, "_id": 4 },
    { "symbolName": "Sym2", "parent": "ttf.o", "sortIndex": 0, "_id": 5 },
    { "symbolName": "Sym3", "parent": "ttf.o", "sortIndex": 0, "_id": 6 },
    { "symbolName": "Sym1", "parent": "alx.o", "sortIndex": 0, "_id": 7 },
    { "symbolName": "Sym2", "parent": "alx.o", "sortIndex": 1, "_id": 8 },
    { "symbolName": "Sym3", "parent": "alx.o", "sortIndex": 2, "_id": 9 },
    { "symbolName": "Sym1", "parent": "klf.o", "sortIndex": 0, "_id": 10 },
    { "symbolName": "Sym2", "parent": "klf.o", "sortIndex": 1, "_id": 11 },
    { "symbolName": "Sym3", "parent": "klf.o", "sortIndex": 2, "_id": 12 },
    { "symbolName": "Sym4", "parent": "klf.o", "sortIndex": 2, "_id": 13 },
];

interface Call {
    highlight?: number;
}

class Call {
    source: number;
    target: number;
}

// Some optional properties in a D3Symbol. TypeScript doesn't yet support
// optional properties directly in the class, and we want to initialize
// without specifying these values.
interface D3Symbol {
    highlight?: number; // Default 0; -ve values indicate a caller and +ve a callee
    sortIndex?: number;
    shortName?: string;
}

// Symbols which D3 expects in an array.
class D3Symbol {
    constructor(symbolName: string, parentName: string, index: number) {
	this.highlight = 0;
	this._id = index;
	this.symbolName = symbolName;
	this.parent = parentName;
	this.sortIndex = 0;
    }
    symbolName: string;
    parent: string;
    _id: number;
}

// This is the contents of a 'contains' relationship.
class Container {
    nodes: GraphDBNode[]
    edges: GraphDBNode[]
}

// All nodes returned by the graph database fit this pattern.
class GraphDBNode {
    caption: string;
    parent: number;
    _id: number;
    contains: Container;
    _source: number;
    _target: number;
}

var exampleCalls : Call[] = [
    { source: 0, target: 4 },
    { source: 2, target: 5 },
    { source: 7, target: 7 },
    { source: 5, target: 10 },
    { source: 1, target: 2 },
    { source: 2, target: 5 },
    { source: 12, target: 1 },
    { source: 13, target: 13 },
    { source: 0, target: 12 },
];

var d3;
var $;
var packageName : string;

// Add the item to the set unless it's there already, and
// return the new set. The original is also modified, unless
// it's null or undefined.

function addToSet<T>(set : T[], item : T) : T[]
{
    if(set == null || set === undefined) {
	set = [];
    }
    for(var i:number=0;i<set.length;i++) {
	if(set[i] == item) return set;
    }
    set.push(item);
    return set;
}

function getPositionInSet<T>(set : T[], item : T) : number
{
    if(set == null || set === undefined) {
	return -1;
    }
    for(var i:number=0;i<set.length;i++) {
	if(set[i] == item) return i;
    }
    return -1;
}


var symbolArray : D3Symbol[] = [];
var callGraph : Call[] = [];
var objectCalls = [];

function countChars(s: string, c:string) : number
{
    var n:number =0;
    for(var i:number=0;i<s.length;i++) {
	if(s.charAt(i) == c) n++;
    }
    return n;
}

function abbreviateSymbol(s: string) : string
{
    var x : number = s.lastIndexOf("::")
    if(x>=0) s = s.substring(x+2);

    if(s.toUpperCase() != s && s.toLowerCase() != s) {
	// This looks like mixed case, maybe camelcase
	var initials : string = "";
	for(var i:number=0;i<s.length;i++) {
	    if(s[i].toUpperCase() == s[i]) initials += s[i];
	}
	s = initials;
    }
    else if(countChars(s, '_') > 2 && s.length>5) {
	// Looks like an underscore-separated name
	var initials : string = "";
	for(var i:number=1;i<s.length;i++) {
	    if(s[i] == '_' && s[i-1] != '_') initials += s[i-1];
	}
	s = initials;
    }
    return s;
}

function database()
{
    // This function fetches JSON from the graph database intermediate server (server.py)
    // and reformats the data into a form acceptable to D3.
    symbolArray = [];
    callGraph = [];
    objectCalls = [];
    var externalPackages : string[]= [];

    $.getJSON('/graph/present/' + nodeid, function (node_info) {

	var objectCallGraph : { [id: number]: number[] } = {};
	var nodeToObjectMap : { [id: number]: GraphDBNode } = {};
	console.log("Displaying node: ", node_info);
	var pack : GraphDBNode = node_info.nodes[0];
	console.log("Package returned: "+pack.caption);
	for(var o=0;o<pack.contains.nodes.length;o++) {
	    var object : GraphDBNode = pack.contains.nodes[o];
	    console.log("Recording object "+object.caption);
	    var localNodes : {[Identifier:number]:boolean} = {};
	    var externalSyms : {[Identifier:number]:number} = {};
	    for (var s=0;s<object.contains.nodes.length;s++) {
		var node : GraphDBNode = object.contains.nodes[s];
		if(node.caption == "") {
		    console.log("Loaded object with no caption! id: "+node._id);
		}
		if(node.parent) { // Nodes without parents are external symbols, which are ignored at the moment.
		    if(node.parent != object._id) {
			console.log("Symbol "+node._id+ " is in the wrong parent and will not be recorded (symbol parent "+node.parent+", object id "+object._id);
		    } else {
			symbolArray.push( { "symbolName": node.caption, "shortName": abbreviateSymbol(node.caption), "parent": object.caption, "sortIndex": 0, "_id": node._id});
			console.log("Recording map of symbol "+node._id+" to object "+object._id)
			if(nodeToObjectMap[node._id]) {
			    console.log("Warning: symbol "+node._id+" was already mapped to "+nodeToObjectMap[node._id]._id);
			}
			nodeToObjectMap[node._id] = object;
		    }
		    localNodes[node._id] = true;
		} else {
		    // Possible external package?
		    var externalPackage : string;
		    externalPackage = node.caption.substring(3);
		    var x: number = externalPackage.indexOf(":");
		    console.log("Possible external package: "+externalPackage);
		    externalPackage = externalPackage.substring(0,x);
		    if(externalPackage != "NULL" && externalPackage != packageName) {
			externalPackages = addToSet(externalPackages, externalPackage);
			externalSyms[node._id] = getPositionInSet(externalPackages, externalPackage);
		    }
		}
	    }
	}
	for(var o=0;o<pack.contains.nodes.length;o++) {
	    var object = pack.contains.nodes[o];
	    for (var e=0;e<object.contains.edges.length;e++) {
		var edge = object.contains.edges[e];
		if(localNodes[edge._source] == true && localNodes[edge._target] == true) {
		    callGraph.push( { source: edge._source, target: edge._target } );
		}
		else if(localNodes[edge._source] == true && externalSyms[edge._target]>=0) {
		    // That's a call outwards
		    console.log("Source symbol "+edge._source+" calls external symbol "+edge._target);
		    callGraph.push( { source: edge._source, target: -externalSyms[edge._target] } );
		}
	    }
	}

	// Convert the set-map thing into an array of pairs
	Object.keys(objectCallGraph).forEach(function (key) {
	    var callingObject = key;
	    var callers = objectCallGraph[key];
	    callers.forEach(function (value) {
		objectCalls.push([callingObject, value]);
	    });
	});

	graph = initGraph();
	graph.data(symbolArray, callGraph, objectCalls);

	var calloutNodes = d3.select(".callsOut").selectAll("rect").data(externalPackages);
	var group = calloutNodes.enter().append("g");
	setPackageLabelAttributes(group.append("rect"));
	setPackageLabelTextAttributes(group.append("text"));

	calloutNodes.data(externalPackages);
    });
    let title = <HTMLElement> document.querySelector('h1')
    title.innerHTML = packageName;
}

function update()
{
    graph = initGraph();
    graph.data(symbolArray, callGraph);
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

function linkXFunction (obj) {
    return nodeXFunction (obj) + 200 + obj.col * 350;
}

function linkYFunction (obj) {
    return nodeYFunction (obj);
}

function targetLinkXFunction(colsNumber) {
    return  350 * colsNumber + 200;
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
        .style('fill', function(obj : D3Symbol) {
	    if(obj.highlight > 10) {
		return "#00ff00";
	    } else if(obj.highlight > 0) {
		// Construct a yellow colour for callees
		var intensityString : string = Math.floor(127+obj.highlight*128/10.0).toString(16);
		if(intensityString.length <2) intensityString = "0"+intensityString;
		return "#"+intensityString+intensityString+"00";
	    } else if(obj.highlight < 0) {
		// Construct a cyan colour for callers
		var intensityString : string = Math.floor(127-obj.highlight*128/10.0).toString(16);
		if(intensityString.length <2) intensityString = "0"+intensityString;
		return "#00"+intensityString+intensityString;
	    } else {
		return "#7f7f7f";
	    }
        })
        .attr('class', 'relationshipGraph-block')
        .on('mouseover', _this.tip ? _this.tip.show : noop)
        .on('mouseout', _this.tip ? _this.tip.hide : noop)
        .on('click', function(obj) {
            _this.tip.hide();
            _this.config.onClick(obj);
        });
    group.append('text').attr('x', 0).attr('y', (_this.config.blockSize)/2).attr("fill", "#000").text(function(obj) { return obj.shortName || obj.symbolName; });
    group.attr('class', 'relationshipGraph-node');
}

function findSymbolByID(id: number) : D3Symbol
{
    for(var s : number = 0; s < symbolArray.length; s++) {
	if(symbolArray[s]._id == id) return symbolArray[s];
    }
    return null;
}


function clearAllHighlights(): void
{
    for(var c:number=0;c<callGraph.length;c++) {
	callGraph[c].highlight = 0;
    }
    for(var s:number=0;s<symbolArray.length;s++) {
	symbolArray[s].highlight = 0;
    }
}

// Recursively highlight all called symbols. The risk of infinite recursion
// is limited by the intensity reduction.

function highlightAllCalledSymbols(symbol : D3Symbol, intensity : number) : void
{
    if(intensity <= 0) return;
    for(var c:number=0;c<callGraph.length;c++) {
	if(callGraph[c].source == symbol._id) {
	    var target : D3Symbol = findSymbolByID(callGraph[c].target);
	    callGraph[c].highlight = 1;
	    if(target == null) {
		console.log("Called symbol is null - possible call-in");
	    } else {
		if (target.highlight < intensity) target.highlight = intensity;
		highlightAllCalledSymbols(target, intensity-2);
	    }
	}
    }
}

// This should be called with a negative intensity; that will increase towards
// zero as we proceed up the call chain.
function highlightAllCallingSymbols(symbol : D3Symbol, intensity : number) : void
{
    if(intensity >= 0) return;
    for(var c:number=0;c<callGraph.length;c++) {
	if(callGraph[c].target == symbol._id) {
	    var source : D3Symbol = findSymbolByID(callGraph[c].source);
	    callGraph[c].highlight = 1;
	    if(source == null) {
		console.log("Calling symbol is null - possible call-in");
	    } else {
		if (source.highlight > intensity) source.highlight = intensity;
		highlightAllCallingSymbols(source, intensity+2);
	    }
	}
    }
}


function symbolClickCallback(n)
{
    console.log("Click",n);


    clearAllHighlights();

    var symbol : D3Symbol = findSymbolByID(n._id);
    symbol.highlight = 12;
    highlightAllCalledSymbols(symbol, 10)
    highlightAllCallingSymbols(symbol, -10)

    update();
}

function initGraph()
{
    return d3.select('#graph').relationshipGraph({
        'showTooltips': true,
        'maxChildCount': 3,
	'showKeys': false,
	'blockSize': 32,
	'nodeDrawCallback': nodeDrawCallback,
	'onClick': symbolClickCallback
    });
}

var graph = initGraph();

var interval = null;

// Thing to add all the callers
var data = [ "A", "B", "C", "D" ];

function setPackageLabelAttributes(selection)
{
    selection.attr("height", function(d) { return 32; })
	.attr("x", 0).attr("rx", 4).attr("ry", 4)
	.attr("y", function(d, index) { return index*40; })
	.style("fill", "#000000")
	.attr("width", 150)
	.attr("onclick",function(d) { return "window.location = 'index.html?package="+d+"';" });
}

function setPackageLabelTextAttributes(selection)
{
    selection.attr("x", 10)
	.attr("y", function(d, index) { return index*40+20; })
	.style("fill", "#ffffff")
	.text(function(d) { return d });
}


// Read a page's GET URL variables and return them as an associative array.
// From http://jquery-howto.blogspot.co.uk/2009/09/get-url-parameters-values-with-jquery.html
function getUrlVars()
{
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
	hash = hashes[i].split('=');
	vars.push(hash[0]);
	vars[hash[0]] = hash[1];
    }
    return vars;
}

function example() {
    graph = initGraph();
    symbolArray = exampleJSON;
    callGraph = exampleCalls;
    graph.data(symbolArray, callGraph);
    let title = <HTMLElement> document.querySelector('h1')
    title.innerHTML = "Example data";
}

var group = d3.select(".callsIn").selectAll("rect").data(data).enter().append("g");
setPackageLabelAttributes(group.append("rect"));
setPackageLabelTextAttributes(group.append("text"));

var vars = getUrlVars();
packageName = vars['package'] || "libhfr"
var nodeid = "id:"+packageName;
