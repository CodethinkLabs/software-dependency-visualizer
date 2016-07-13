/// <reference path="exampleData.ts" />
/// <reference path="nodePositioning.ts" />

const objectsColWidth = 400;
const packagesColWidth = 200;
const packagesHeight = 40;

var d3;
var $;
var packageName : string;
var symbolArray : D3Symbol[] = [];
var callGraph : Call[] = [];
var objectCalls = [];
var externalPackages : string[]= [];
var calledPackages : string[]= [];
var callingPackages : string[]= [];
var animationProgress : number = 0;
var continueAnimating : boolean = false;
var circle;
var graph;

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
    parent: number;
    _id: number;
    contains: Container;
    _source: number;
    _target: number;
    uri: string;
}

function makeCaption(node : GraphDBNode) : string
{
    var uriParts : string[] = node.uri.split(':');
    return uriParts[uriParts.length-1];
}

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
    // Strip off any C++ namespaces and class names.
    var x : number = s.lastIndexOf("::")
    if(x>=0) s = s.substring(x+2);

    if(s.length <= 8) return s;

    if(s.toUpperCase() != s && s.toLowerCase() != s) {
	// This looks like mixed case, maybe camelcase, so replace this with
	// the initial characters.
	var initials : string = "";
	for(var i:number=0;i<s.length;i++) {
	    if(s[i].toUpperCase() == s[i]) initials += s[i];
	}
	s = initials;
    }
    else if(countChars(s, '_') > 0) {
	// Looks like an underscore-separated name; replace this with lower-case
	// initialse, so "wiz_rumor_check" becomes "wrc", for example.
	var initials : string = "";
	if(s[0] != '_') initials += s[0];
	for(var i:number=0;i<s.length-1;i++) {
	    if(s[i] == '_') {
		if(s[i+1] != '_') initials += s[i+1];
	    }
	}
	s = initials;
    }
    if(s.length > 9) s = s.substring(0,9);

    console.log("Abbreviated to "+s);
    return s;
}

function startLoadingAnimation()
{
    var svg = <HTMLElement> document.querySelector('svg');
    var svgNS = svg.namespaceURI;
    circle = document.createElementNS(svgNS,'circle');
    circle.setAttribute('cx','320');
    circle.setAttribute('cy','240');
    circle.setAttribute('r','16');
    circle.setAttribute('fill','#95B3D7');
    svg.appendChild(circle);
    continueAnimating = true;
    setTimeout(function() { loadingAnimationTick(); }, 40);
}

function loadingAnimationTick()
{
    animationProgress += 1;
    console.log("Loading animation");
    circle.setAttribute('cx', 320+64*Math.cos(animationProgress / 25 * Math.PI));
    circle.setAttribute('cy', 240+64*Math.sin(animationProgress / 25 * Math.PI));
    if(continueAnimating) {
	setTimeout(function() {loadingAnimationTick();}, 40);
    }
}


function database()
{
    // This function fetches JSON from the graph database intermediate server (server.py)
    // and reformats the data into a form acceptable to D3.
    symbolArray = [];
    callGraph = [];
    objectCalls = [];
    externalPackages = [];

    let title = <HTMLElement> document.querySelector('h1')
    title.innerHTML = "Loading "+packageName;

    startLoadingAnimation();

    $.getJSON('/graph/present/' + nodeid, function (node_info : Container) {

	title.innerHTML = "Loaded "+packageName;
	var objectCallGraph : { [id: number]: number[] } = {};
	var nodeToObjectMap : { [id: number]: GraphDBNode } = {};
	console.log("Displaying node: ", node_info);
	var packageNode : GraphDBNode = node_info.nodes[0];
	console.log("Package returned: "+makeCaption(packageNode));
	var objectsInPackage : { [id: number]: boolean } = {};
	for(var o=0;o<packageNode.contains.nodes.length;o++) {
	    var object : GraphDBNode = packageNode.contains.nodes[o];
	    objectsInPackage[object._id] = true;
	}
	var localNodes : {[Identifier:number]:boolean} = {}; // Is this node ID inside this package?
	var externalSyms : {[Identifier:number]:number} = {};
	var nodeToPackageMap : { [id: number]: string } = {};
	for(var o=0;o<packageNode.contains.nodes.length;o++) {
	    var object : GraphDBNode = packageNode.contains.nodes[o];
	    console.log("Recording object "+makeCaption(object));
	    for (var s=0;s<object.contains.nodes.length;s++) {
		var node : GraphDBNode = object.contains.nodes[s];
		if(makeCaption(node) == "") {
		    console.log("Loaded object with no caption! id: "+node._id);
		}
		if(node.parent) { // Nodes without parents are external symbols
		    if(node.parent != object._id) {
			console.log("Symbol "+makeCaption(node)+ "/"+node._id+" is misparented and should be treated as external (symbol parent "+node.parent+", object id "+object._id);
		    } else {
			symbolArray.push( { "symbolName": makeCaption(node), "shortName": abbreviateSymbol(makeCaption(node)), "parent": makeCaption(object), "sortIndex": 0, "_id": node._id});
			console.log("Recording map of symbol "+node._id+" to object "+object._id)
			if(nodeToObjectMap[node._id]) {
			    console.log("Warning: symbol "+node._id+" was already mapped to "+nodeToObjectMap[node._id]._id);
			}
			nodeToObjectMap[node._id] = object;
		    }
		    if(objectsInPackage[node.parent] == true) {
			localNodes[node._id] = true;
		    }
		}
		if(localNodes[node._id] != true) {
		    // The general format of URIs is id:<package>:<object>:<symbol>
		    // Some however will be EXTERNAL:<symbol>
		    var externalPackage : string;
		    var uriParts : string[] = node.uri.split(':');
		    if(uriParts.length < 2) {
			console.log("Unparseable URI: "+node.uri);
		    } else {
			externalPackage = uriParts[1];
			nodeToPackageMap[node._id] = externalPackage;
			console.log("Possible external package: "+externalPackage);
			if(uriParts[0] != "NULL" && uriParts[0] != "EXTERNAL" && externalPackage != packageName) { // "EXTERNAL" is a silly name; here it means external to the whole package-universe, not external to this package :(
			    externalPackages = addToSet(externalPackages, externalPackage);
			    var pos : number = getPositionInSet(externalPackages, externalPackage);
			    externalSyms[node._id] = pos+1;
			    console.log(externalPackage + "/"+node._id+" is recorded as external package "+pos);
			}
		    }
		}
	    }
	}
	for(var o=0;o<packageNode.contains.nodes.length;o++) {
	    var object = packageNode.contains.nodes[o];
	    for (var e=0;e<object.contains.edges.length;e++) {
		var edge = object.contains.edges[e];
		if(localNodes[edge._source] == true && localNodes[edge._target] == true) {
		    callGraph.push( { source: edge._source, target: edge._target } );
		}
		else if(localNodes[edge._source] == true && externalSyms[edge._target]>=0) {
		    // That's a call outwards

		    var calledPackage : string = nodeToPackageMap[edge._target];
		    calledPackages = addToSet(calledPackages, calledPackage);
		    var pos : number = getPositionInSet(calledPackages, calledPackage);

		    console.log("Source symbol "+edge._source+" calls external symbol "+edge._target);
		    callGraph.push( { source: edge._source, target: -pos-1 } );
		}
		else if(externalSyms[edge._source] >= 0 && localNodes[edge._target]==true) {
		    // That's a call inwards

		    var callingPackage : string = nodeToPackageMap[edge._source];
		    callingPackages = addToSet(callingPackages, callingPackage);
		    var pos : number = getPositionInSet(callingPackages, callingPackage);

		    console.log("External symbol "+edge._source+" calls local symbol "+edge._target);
		    callGraph.push( { source: -pos-1, target: edge._target } );
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
	continueAnimating = false;
	title.innerHTML = "Package "+packageName;

        update();
    });
}

function update()
{
    graph = initGraph();
    graph.data(symbolArray, callGraph, objectCalls);

    var calloutNodes = d3.select(".callsOut").selectAll("rect").data(calledPackages);
    var group = calloutNodes.enter().append("g");
    setPackageLabelAttributes(group.append("rect"));
    setPackageLabelTextAttributes(group.append("text"));

    var callinNodes = d3.select(".callsIn").selectAll("rect").data(callingPackages);
    var group = callinNodes.enter().append("g");
    setPackageLabelAttributes(group.append("rect"));
    setPackageLabelTextAttributes(group.append("text"));
}

var blockSize : number = 64;


function noop() : void
{
}

function nodeDrawCallback(_this, thing)
{
    var group = thing.append('g');
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
    group.append('text').attr('x', 0).attr('y', (_this.config.blockSize)/2).attr("fill", "#000").text(function(obj) {     console.log("Drawing symbol: shortname "+obj.shortName+", long "+obj.symbolName);
															  return obj.shortName || obj.symbolName; });
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

function setPackageLabelAttributes(selection)
{
    selection.attr("height", function(d) { return packagesHeight - 6; })
	.attr("x", 0).attr("rx", 4).attr("ry", 4)
	.attr("y", function(d, index) { return 24+index*packagesHeight; })
	.style("fill", "#000000")
	.attr("width", 150)
	.attr("onclick",function(d) { return "window.location = 'showpackage.html?package="+d+"';" });
}

function setPackageLabelTextAttributes(selection)
{
    selection.attr("x", 10)
	.attr("y", function(d, index) { return 24+index*packagesHeight+packagesHeight/2; })
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

// Start everything moving

var vars = getUrlVars();
var packageName : string = vars['package'] || "a"
var nodeid : string = "id:"+packageName;
if(packageName == "example") {
    example()
} else {
    database()
}
