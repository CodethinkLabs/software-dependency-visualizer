/// <reference path="utils.ts"/>
var exampleJSON = [
    { "symbolName": "Pkg1", "parent": "Packages", "sortIndex": 0, "_id": 0 },
    { "symbolName": "Pkg2", "parent": "Packages", "sortIndex": 1, "_id": 1 },
    { "symbolName": "Pkg3", "parent": "Packages", "sortIndex": 2, "_id": 2 },
    { "symbolName": "Pkg4", "parent": "Packages", "sortIndex": 2, "_id": 3 },
    { "symbolName": "Pkg5", "parent": "Packages", "sortIndex": 0, "_id": 4 },
    { "symbolName": "Pkg6", "parent": "Packages", "sortIndex": 0, "_id": 5 },
    { "symbolName": "Pkg7", "parent": "Packages", "sortIndex": 0, "_id": 6 },
    { "symbolName": "Pkg8", "parent": "Packages", "sortIndex": 0, "_id": 7 },
    { "symbolName": "Pkg9", "parent": "Packages", "sortIndex": 1, "_id": 8 },
    { "symbolName": "Pkg10", "parent": "Packages", "sortIndex": 2, "_id": 9 },
    { "symbolName": "Pkg11", "parent": "Packages", "sortIndex": 0, "_id": 10 },
    { "symbolName": "Pkg12", "parent": "Packages", "sortIndex": 1, "_id": 11 },
    { "symbolName": "Pkg13", "parent": "Packages", "sortIndex": 2, "_id": 12 },
    { "symbolName": "Pkg14", "parent": "Packages", "sortIndex": 2, "_id": 13 },
];

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
const packageBlockSize : number = 80;

var fromSelect = $("#from_select");
var toSelect = $("#to_select");

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
var externalPackages : string[]= [];

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
    console.log("  abbr1: " + s );
    s = s.replace(/_+/, '_');
    console.log("  abbr2: " + s );
    var x : number = s.lastIndexOf("::")
    if(x>=0) s = s.substring(x+2);
    console.log("  abbr3: " + s );

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

function loadpackages(){
    $.getJSON('/nodes/type/Package', function (package_nodes) {
        fromSelect.empty()
        toSelect.empty()
        $.each(package_nodes, function() {
            fromSelect.append($("<option />").val(this._id).text(this.caption));
            toSelect.append($("<option />").val(this._id).text(this.caption));
        });
    });
}


function database()
{
    // This function fetches JSON from the graph database intermediate server (server.py)
    // and reformats the data into a form acceptable to D3.
    symbolArray = [];
    callGraph = [];
    objectCalls = [];
    externalPackages = [];

    var fromPackageId = fromSelect.val();
    var toPackageId = toSelect.val();
    var fromPackageText = $( "#from_select option:selected" ).text();
    var toPackageText = $( "#to_select option:selected" ).text();

    console.log('Loading routes from '+fromPackageId+' to '+ toPackageId);

    $.getJSON('/graph/packages/route/'+fromPackageId+'/'+toPackageId, function (node_info) {

        console.log(node_info)
        // TODO: Need to update callGraph, symbolArray objectCalls
	var objectCallGraph : { [id: number]: number[] } = {};
	var nodeToObjectMap : { [id: number]: GraphDBNode } = {};

	//console.log("Displaying node: ", node_info);
	//var pack : GraphDBNode = node_info.nodes[0];
	//console.log("Package returned: "+pack.caption);

        for(var p=0;p<node_info.nodes.length;p++) {
            var node : GraphDBNode = node_info.nodes[p];
	    symbolArray.push( { "symbolName": node.caption, "shortName": abbreviateSymbol(node.caption), "parent": "Packages", "sortIndex": 0, "_id": node._id});
        }
        console.log("symbolArray");
        console.log(symbolArray);
        for(var e=0;e<node_info.edges.length;e++) {
            callGraph.push( { source: node_info.edges[e]._source, target: node_info.edges[e]._target } );
        }
        console.log("callGraph");
        console.log(callGraph);

        update();
    });
    let title = <HTMLElement> document.querySelector('h1')
    title.innerHTML = "Routes: ("+fromPackageText+") -> ("+ toPackageText+")";
}

function update()
{
    graph = initGraph();
    graph.data(symbolArray, callGraph, objectCalls);

    var calloutNodes = d3.select(".callsOut").selectAll("rect").data(externalPackages);
    var group = calloutNodes.enter().append("g");
    setPackageLabelAttributes(group.append("rect"));
    setPackageLabelTextAttributes(group.append("text"));

    calloutNodes.data(externalPackages);
}

function nodeTranslationFunction (obj) { var x = nodeXFunction(obj, packageBlockSize);
					 var y = nodeYFunction(obj, packageBlockSize);
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
        'maxChildCount': 8,
        'columns': 1,
	'showKeys': false,
	'blockSize': packageBlockSize,
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
    selection.attr("height", function(d) { return packagesHeight - 6; })
	.attr("x", 0).attr("rx", 4).attr("ry", 4)
	.attr("y", function(d, index) { return index*packagesHeight; })
	.style("fill", "#000000")
	.attr("width", 150)
	.attr("onclick",function(d) { return "window.location = 'index.html?package="+d+"';" });
}

function setPackageLabelTextAttributes(selection)
{
    selection.attr("x", 10)
	.attr("y", function(d, index) { return index*packagesHeight+packagesHeight/2; })
	.style("fill", "#ffffff")
	.text(function(d) { return d });
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

