/// <reference path="../src/index.ts" />
/// <reference path="exampleData.ts" />
/// <reference path="nodePositioning.ts" />
/// <reference path="loadingAnimation.ts" />
/// <reference path="simpleFunctions.ts" />
/// <reference path="structures.ts" />

const objectsColWidth = 400;
const packagesColWidth = 0;
const packagesHeight = 0;

var d3;
var $;
var packageName : string;
var symbolArray : D3Symbol[] = [];
var callGraph : Call[] = [];
var objectCalls = [];
var externalPackages : string[]= [];
var calledPackages : string[]= [];
var callingPackages : string[]= [];
var graph;

function loadPackagesFromDatabase()
{
    // This function fetches JSON from the graph database intermediate server (server.py)
    // and reformats the data into a form acceptable to D3.
    symbolArray = [];
    callGraph = [];
    objectCalls = [];
    externalPackages = [];

    let title = <HTMLElement> document.querySelector('h1')
    title.innerHTML = "Loading package index";

    startLoadingAnimation();
    console.log("Requesting package list from server");
    $.get('/annotatedpackagelist', function (package_call_list) {
	var packages: string[] = [];
	console.log("Got package list");
	title.innerHTML = "Package List";
	continueAnimating = false;
	var package_calls : string[] = package_call_list.split(',')
	for(var i:number=0;i<package_calls.length;i++) {
	    var fields : string [] = package_calls[i].split(':');
	    var caller : string = fields[0];
	    var called : string = fields[1];
	    addToSet(packages, caller);
	    addToSet(packages, called);
	    //callGraph.push ( { source: getPositionInSet(packages, caller), target: getPositionInSet(packages, called) } )
	    }
	for(var i:number=0;i<packages.length;i++) {
	    symbolArray.push(new D3Symbol(packages[i], 'universe', i));
	}

        update();
    });
}

function update()
{
    graph = initGraph();
    graph.data(symbolArray, callGraph, objectCalls);
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

function symbolClickCallback(n)
{
    console.log("Click",n);
    location.href = 'showpackage.html?package='+n.symbolName;
}

function initGraph()
{
    return d3.select('#graph').relationshipGraph({
        'showTooltips': true,
        'maxChildCount': 9,
	'showKeys': false,
	'blockSize': 48,
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

loadPackagesFromDatabase()
