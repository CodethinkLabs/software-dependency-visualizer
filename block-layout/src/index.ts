/// <reference path="../examples/object-view-demo.ts"/>
/**
 * The MIT License (MIT).
 *
 * Copyright (c) 2016 Harrison Kelly.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * D3-relationshipgraph - 1.4.2
 */

/**
 * Determine if AMD or CommonJS are being used.
 *
 * @param {object} root The window object.
 * @param {object} factory The factory object.
 */

var define, exports, require, module;

(function(root, factory) {  // jshint ignore:line
    'use strict';

    /* jshint ignore:start */
    if (typeof define === 'function' && define.amd) {
        define('d3.relationshipGraph', ['d3'], factory);
    } else if (typeof exports === 'object' && typeof module === 'object') {
        module.exports = factory(require('d3'));
    } else if (typeof exports === 'object') {
        exports.d3.relationshipGraph = factory(require('d3'));
    } else {
        root.d3.relationshipGraph = factory(root.d3);
    }
    /* jshint ignore:end */
})(this, function(d3) {
    'use strict';

    /**
     * Add a relationshipGraph function to d3 that returns a RelationshipGraph object.
     */
    d3.relationshipGraph = function() {
        return RelationshipGraph.apply(RelationshipGraph, arguments);
    };

    /**
     * Add relationshipGraph to selection.
     *
     * @param {Object} userConfig Configuration for graph.
     * @return {Object} Returns a new RelationshipGraph object.
     */
    d3.selection.prototype.relationshipGraph = function(userConfig) {
        return new RelationshipGraph(this, userConfig);
    };

    /**
     * Add relationshipGraph to enter.
     *
     * @returns {RelationshipGraph} RelationshipGraph object.
     */
    d3.selection.enter.prototype.relationshipGraph = function() {
        return this.graph;
    };

    /**
     *
     * @param {d3.selection} selection The ID of the element containing the graph.
     * @param {Object} userConfig Configuration for graph.
     * @constructor
     */
    var RelationshipGraph = function(selection, userConfig) {
        if (userConfig === undefined) {
            userConfig = {
                showTooltips: true,
                maxChildCount: 0,
                onClick: noop,
                thresholds: []
            };
        } else {
            // Verify that the user config contains the thresholds.
            if (userConfig.thresholds === undefined) {
                userConfig.thresholds = [];
            } else if (typeof userConfig.thresholds !== 'object') {
                throw 'Thresholds must be an Object.';
            }
        }

        /**
         * Contains the configuration for the graph.
         * @type {{blockSize: number, maxWidth: number, maxHeight: number, selection: d3.selection, showTooltips: (*|boolean),
         * maxChildCount: (*|number), onClick: (*|noop), showKeys: (*|boolean), thresholds: (*|Array), colors: (*|Array|string[]),
         * transitionTime: (*|number)}}
         */
        this.config = {
            blockSize: 64,  // The block size for each child.
            selection: selection,  // The ID for the graph.
            showTooltips: userConfig.showTooltips,  // Whether or not to show the tooltips on hover.
            maxChildCount: userConfig.maxChildCount || 0,  // The maximum amount of children to show per row before wrapping.
            onClick: userConfig.onClick || noop,  // The callback function to call when a child is clicked. This function gets passed the JSON for the child.
            showKeys: userConfig.showKeys,  // Whether or not to show the keys in the tooltip.
            nodeDrawCallback: userConfig.nodeDrawCallback || null,  // Whether or not to show the keys in the tooltip.
            thresholds: userConfig.thresholds,  // Thresholds to determine the colors of the child blocks with.
            colors: userConfig.colors || ['#c4f1be', '#a2c3a4', '#869d96', '#525b76', '#201e50',
					  '#485447', '#5b7f77', '#6474ad', '#b9c6cb', '#c0d6c1',
					  '#754668', '#587d71', '#4daa57', '#b5dda4', '#f9eccc',
					  '#0e7c7b', '#17bebb', '#d4f4dd', '#d62246', '#4b1d3f',
					  '#cf4799', '#c42583', '#731451', '#f3d1bf', '#c77745'
					 ],  // Colors to use for blocks.
            transitionTime: userConfig.transitionTime || 1500,  // Time for a transition to start and complete (in milliseconds).
            truncate: userConfig.truncate || 25,  // Maximum length of a parent label before it gets truncated. Use 0 to turn off truncation.
            columns: userConfig.columns || 2 // Number of columns for the layout
        };

        this.config.objectsColWidth=this.config.maxChildCount*this.config.blockSize+200

        if (this.config.showTooltips === undefined) {
            this.config.showTooltips = true;
        }

        if (this.config.showKeys === undefined) {
            this.config.showKeys = true;
        }

        // If the threshold array is made up of numbers, make sure that it is sorted.
        if (this.config.thresholds.length > 0 && (typeof this.config.thresholds[0]) == 'number') {
            this.config.thresholds.sort();
        }

        // Create a canvas to measure the pixel width of the parent labels.
        this.ctx = document.createElement('canvas').getContext('2d');
        this.ctx.font = '13px Helvetica';

        /**
         * Function to create the tooltip.
         *
         * @param {RelationshipGraph} self The RelationshipGraph instance.
         * @returns {d3.tip} the tip object.
         */
        var createTooltip = function(self) {
            var shownKeys = ['SYMBOLNAME'],
                showKeys = self.config.showKeys;

            return d3.tip().attr('class', 'relationshipGraph-tip')
                .offset([-8, -10])
                .html(function(obj) {
                    var keys = Object.keys(obj),
                        table = document.createElement('table'),
                        count = keys.length,
                        rows = [];

                    // Loop through the keys in the object and only show values self are not in the hiddenKeys array.
                    while (count--) {
                        var element = keys[count],
                            upperCaseKey = element.toUpperCase();

                        if (contains(shownKeys, upperCaseKey)) {
                            var row = document.createElement('tr'),
                                key = showKeys ? document.createElement('td') : null,
                                value = document.createElement('td');

                            if (showKeys) {
                                key.innerHTML = element.charAt(0).toUpperCase() + element.substring(1).toLowerCase();
                                row.appendChild(key);
                            }

                            value.innerHTML = obj[element];
                            value.style.fontWeight = 'normal';

                            row.appendChild(value);
                            rows.push(row);
                        }

                    }

                    var rowCount = rows.length;

                    while (rowCount--) {
                        table.appendChild(rows[rowCount]);
                    }

                    self.tip.direction('n');
                    return table.outerHTML;
                });
        };

        if (this.config.showTooltips) {
            this.tip = createTooltip(this);
        } else {
            this.tip = null;
        }

        // Remove the previous SVG
	this.config.selection.select('svg').remove();

        // Create the svg element that will contain the graph.
        this.svg = this.config.selection
            .append('svg')
            .attr('width', this.config.columns*this.config.objectsColWidth + packagesColWidth*2)
            .attr('height', '500')
            .attr('style', 'display: block');


        var markers_data = [
            { id: 0, name: 'arrow', path: 'M 0,0 m -5,-5 L 5,0 L -5,5 Z', viewbox: '-5 -5 10 10', refX: '5', color: '#303030'},
            { id: 1, name: 'circle', path: 'M 0, 0  m -5, 0  a 5,5 0 1,0 10,0  a 5,5 0 1,0 -10,0', viewbox: '-6 -6 12 12' },
        ]

        var defs = this.svg.append('defs')
        var markers = defs.selectAll('marker')
        .data(markers_data)
        .enter()
        .append('svg:marker')
          .attr('id', function(d){ return 'marker_' + d.name})
          .attr('markerHeight', 7)
          .attr('markerWidth', 7)
          .attr('markerUnits', 'strokeWidth')
          .attr('orient', 'auto')
          .attr('refX', function(d){ return d.refX })
          .attr('refY', function(d){ return d.refY })
          .attr('viewBox', function(d){ return d.viewbox })
          .append('svg:path')
            .attr('d', function(d){ return d.path })
            .attr('fill', function(d) { return d.color });

        // Create central columns for Objects
        this.cols = [];
        for ( var i = 0; i < this.config.columns; i++ ) {
            this.cols.push(this.svg
                .append('g')
                .attr('transform', 'translate(' + (packagesColWidth + i * this.config.objectsColWidth) +', 0)'));
        }

        // Create Packages group for called
        this.called = this.svg
            .append('g')
            .attr('class', 'callsOut')
            .attr('transform', 'translate(' + (packagesColWidth + this.config.columns * this.config.objectsColWidth) +', 0)');

	this.called.append('text').text("Calls to other packages").attr('x','0').attr('y','16');

        // Create Packages group for callers
        this.callers = this.svg
            .append('g')
            .attr('class', 'callsIn')
            .attr('transform', 'translate(0, 0)');

	this.callers.append('text').text("Calls from other packages").attr('x','0').attr('y','16');

        // Create group for Links
        this.links = this.svg
            .append('g')
            .attr('transform', 'translate(0, 0)');

        this.graph = this;
    };

    /**
     * Checks if the object contains the key.
     *
     * @param {object} obj The object to check in.
     * @param {string} key They key to check for.
     * @returns {boolean} Whether or not the object contains the key.
     */
    var containsKey = function(obj, key) {
        return Object.keys(obj).indexOf(key) > -1;
    };

    /**
     * Checks whether or not the key is in the array.
     *
     * @param {*[]} arr The array to check in.
     * @param {string} key The key to check for.
     * @returns {boolean} Whether or not the key exists in the array.
     */
    var contains = function(arr, key) {
        return arr.indexOf(key) > -1;
    };

    /**
     * Truncate a string to 25 characters plus an ellipses.
     *
     * @param {string} str The string to truncate.
     * @param {number} cap The number to cap the string at before it gets truncated.
     * @returns {string} The string truncated (if necessary).
     */
    var truncate = function(str, cap) {
        if (cap === 0) {
            return str;
        }

        return (str.length > cap) ? str.substring(0, cap) + '...' : str;
    };

    /**
     * Determines if the array passed in is an Array object.
     *
     * @param arr {Array} The array object to check.
     * @returns {boolean} Whether or not the array is actually an array object.
     */
    var isArray = function(arr) {
        return Object.prototype.toString.call(arr) == '[object Array]';
    };

    /**
     * Noop function.
     */
    var noop = function() {
    };

    /**
     * Returns a sorted Array.
     *
     * @param json {Array} The Array to be sorted.
     */
    var sortJson = function(json) {
        json.sort(function(child1, child2) {
            var parent1 = child1.parent.toLowerCase(),
                parent2 = child2.parent.toLowerCase();
	    var name1 = child1.symbolName.toLowerCase(),
		name2 = child2.symbolName.toLowerCase();
            return (parent1 > parent2) ? 1 : (parent1 < parent2) ? -1 :
		(name1 > name2) ? 1: (name1 < name2) ? -1: 0
        });
    };

    /**
     * Assign the index and row to each of the children in the Array of Objects.
     *
     * @param that {RelationshipGraph} The relationship graph object.
     * @param json {Array} The array of Objects to loop through.
     * @param parentSizes {Object} The parent sizes determined.
     * @param parents {Array} The parent label names.
     * @returns {Object} Object containing the longest width, the calculated max children per row, and the maximum amount
     *  of rows.
     */
    var assignIndexAndRow = function(that, json, parentSizes, parents) {
        // Determine the longest parent name to calculate how far from the left the child blocks should start.
        var longest = '',
            parentNames = Object.keys(parentSizes),
            i,
            index = 0,
            previousParent = '',
            objectNo : number[] = [],
            jsonPerCol = [],
            parentsPerCol = [],
            currentCol = 0,
            rowsPerCol = [];

        // TODO (pedro): this is a hack, understand arrays better!
        for (i = 0; i < that.config.columns; i++ ) {
            parentsPerCol.push([]);
            jsonPerCol.push([]);
            objectNo.push(0);
            rowsPerCol.push(0)
        }

        for (i = 0; i < parents.length; i++) {
            var current = parents[i] + ' ( ' + parentSizes[parentNames[i]] + ') ';

            if (current.length > longest.length) {
                longest = current;
            }
        }

        // Calculate the row and column for each child block.
        var longestWidth = that.ctx.measureText(longest).width,
            parentDiv = that.config.selection[0][0],
            calculatedMaxChildren = (that.config.maxChildCount === 0) ?
                Math.floor((parentDiv.parentElement.clientWidth - 15 - longestWidth) / that.config.blockSize) :
                that.config.maxChildCount;

        var getIndexOfSmaller = function (rowsPerCol) {
            var min = 0;
            for (var j = 0; j < rowsPerCol.length; j++) {
                if (rowsPerCol[j] < rowsPerCol[min]) {
                    min = j;
                }
            }
            return min;
        };
        var calculateMaxRows = function (rowsPerCol) {
            var max = 0;
            for (var j = 0; j < rowsPerCol.length; j++) {
                if (rowsPerCol[j] > max) {
                    max = rowsPerCol[j]
                }
            }
            return max;
        };
        for (i = 0; i < json.length; i++) {
            var element = json[i],
                parent = element.parent;

            if (previousParent !== null && previousParent !== parent) {
                currentCol = getIndexOfSmaller(rowsPerCol);

                element.col = currentCol;
                rowsPerCol[currentCol]++;

                element.row = rowsPerCol[currentCol]
                element.objectNo = objectNo[currentCol] + 1;
                element.index = 1;

                parentsPerCol[currentCol].push(parent)

                index = 2;
                objectNo[currentCol]++;
            } else {
                if (index === calculatedMaxChildren + 1) {
                    index = 1;
                    rowsPerCol[currentCol]++;
                }

                element.objectNo = objectNo[currentCol];
                element.col = currentCol;
                element.row = rowsPerCol[currentCol];
                element.index = index;

                index++;
            }

            jsonPerCol[currentCol].push(json[i]);

            previousParent = parent;

            if (that.config.thresholds.length === 0) {
                element.color = 0;
            } else {
                // Figure out the color based on the threshold.
                var value,
                    compare;

                if (typeof that.config.thresholds[0] === 'string') {
                    value = element.sortIndex;

                    /**
                     * Compare the values to see if they're equal.
                     *
                     * @param value {String} The value from the JSON.
                     * @param threshold {String} The threshold from the JSON.
                     * @returns {boolean} Whether or not the two are equal.
                     */
                    compare = function (value, threshold) {
                        if (typeof value !== 'string') {
                            throw 'Cannot make value comparison between a string and a ' + (typeof value) + '.';
                        }

                        return value.toLowerCase() == threshold.toLowerCase();
                    };
                } else {
                    value = (typeof element.sortIndex == 'number') ? element.sortIndex : parseInt(element.sortIndex.replace(/\D/g, ''));

                    /**
                     * Compare the values to see if the value is less than the threshold.
                     *
                     * @param value {number} The value from the JSON.
                     * @param threshold {number} The threshold from the JSON.
                     * @returns {boolean} Whether or not the value is less than the threshold.
                     */
                    compare = function (value, threshold) {
                        if (typeof value !== 'number') {
                            throw 'Cannot make value comparison between a number and a ' + (typeof value) + '.';
                        }

                        return value < threshold;
                    };
                }

                for (var thresholdIndex = 0; thresholdIndex < that.config.thresholds.length; thresholdIndex++) {
                    if (compare(value, that.config.thresholds[thresholdIndex])) {
                        element.color = thresholdIndex;
                        break;
                    }
                }
            }
        }

        return {
            longestWidth: longestWidth,
            calculatedMaxChildren: calculatedMaxChildren,
            maxRow: calculateMaxRows(rowsPerCol),
            parentsPerCol: parentsPerCol,
            jsonPerCol: jsonPerCol
        };
    };

    /**
     * Verify that the JSON passed in is correct.
     *
     * @param json {Array} The array of JSON objects to verify.
     */
    RelationshipGraph.prototype.verifyJson = function(json) {
        if (!(isArray(json)) || (json.length < 0) || (typeof json[0] !== 'object')) {
            throw 'JSON has to be an Array of JavaScript objects that is not empty.';
        }

        var length = json.length;

        while (length--) {
            var element = json[length],
                keys = Object.keys(element),
                keyLength = keys.length;

            if (element.parent === undefined) {
                throw 'Child does not have a parent.';
            } else if (element.parentColor !== undefined && (element.parentColor > 4 || element.parentColor < 0)) {
                throw 'Parent color is unsupported.';
            }

            while (keyLength--) {
                if (keys[keyLength].toUpperCase() == 'VALUE') {
                    if (keys[keyLength] != 'value') {
                        json[length].value = json[length][keys[keyLength]];
                        delete json[length][keys[keyLength]];
                    }
                    break;
                }
            }
        }

        return true;
    };

    /**
     * Generate the graph.
     *
     * @param json {Array} The array of JSON to feed to the graph.
     * @return {RelationshipGraph} The RelationshipGraph object to keep d3's chaining functionality.
     */
    RelationshipGraph.prototype.data = function(json, callGraph : Call[], objectCallGraph) {
        if (this.verifyJson(json)) {
            var row,
                parents = [],
                parentSizes = {},
                previousParentSizes = 0,
                _this = this,
                parent,
                i,
                maxWidth,
                maxHeight,
                calculatedMaxChildren,
                longestWidth;

            // Ensure that the JSON is sorted by parent.
            sortJson(json);

            // Loop through all of the childrenNodes in the JSON array and determine the amount of childrenNodes per parent. This will also
            // calculate the row and index for each block and truncate the parent names to 25 characters.
            for (i = 0; i < json.length; i++) {
                parent = json[i].parent;

                if (containsKey(parentSizes, parent)) {
                    parentSizes[parent]++;
                } else {
                    parentSizes[parent] = 1;
                    parents.push(truncate(parent, this.config.truncate));
                }
            }

            // Assign the indexes and rows to each child. This method also calculates the maximum amount of children per row, the longest
            // row width, and how many rows there are.
            var calculatedResults = assignIndexAndRow(this, json, parentSizes, parents);

            calculatedMaxChildren = calculatedResults.calculatedMaxChildren;
            longestWidth = calculatedResults.longestWidth;
            row = calculatedResults.maxRow;
            var parentsPerCol = calculatedResults.parentsPerCol;
            var jsonPerCol = calculatedResults.jsonPerCol;

            // Set the max width and height.
            maxHeight = row * this.config.blockSize + parents.length*16;
            maxWidth = longestWidth + (calculatedMaxChildren * this.config.blockSize);

            // Select all of the parent nodes.
            var parentNodes = [];
            for (i = 0; i < this.cols.length; i++ ) {
                parentNodes[i] = this.cols[i].selectAll('.relationshipGraph-Text')
                    .data(parentsPerCol[i]);
            }
            var previousParents = []; // helper to calculate parentBoxY
	    function parentBoxYFunction(obj, index) {
		var objectSpacing:number = 16;
		if (index == 0 || index === "undefined") {
                    previousParents.push(obj);
		    return 0;
                }
                // Determine the Y coordinate by determining the Y coordinate of all of the parents before. This has to be calculated completely
                // because it is an update and can occur anywhere.
                var previousParentSize = 0,
                    i = index - 1;
                while (i > -1) {
		    var key = previousParents[i];
		    if(key) {
                        previousParentSize += Math.ceil(parentSizes[key] / calculatedMaxChildren);
		    }
                    i--;
                }
                previousParents.push(obj);

		var y =  Math.ceil(previousParentSize) * _this.config.blockSize + (index * objectSpacing);
		return y;
	    }

	    function parentTextYFunction(obj, index) {
		var y : number = parentBoxYFunction(obj,index) + parentBoxHeightFunction(obj,index)/2 + parentTextFunction(obj,index).length*2;
		return y;
	    }

	    function parentBoxHeightFunction(obj, index) {
                var children = Math.ceil(parentSizes[obj] / calculatedMaxChildren) * calculatedMaxChildren;
                return 8 + Math.ceil(children / calculatedMaxChildren) * _this.config.blockSize;
	    }

	    function parentTextFunction(obj, index) {
                return obj + ' (' + parentSizes[obj] + ')';
	    }

	    // Add new parent nodes.
            var parentGroups = [];
            for (i = 0; i < parentNodes.length; i++) {
                parentGroups[i] = parentNodes[i].enter().append('g');
                parentGroups[i].append('text')
                    .text(parentTextFunction)
                    .attr('x', 0)
                    .attr('y', parentTextYFunction)
                    .style('text-anchor', 'start')
                    .style('fill', function(obj) {
                       return (obj.parentColor !== undefined) ? _this.config.colors[obj.parentColor] : '#000000';
                    })
                    .attr('class', 'relationshipGraph-Text')
            }

	    // Add a rectangle which should enclose all objects
            for (i = 0; i < parentGroups.length; i++) {
                previousParents = []; // helper to calculate parentBoxY
                parentGroups[i].append('rect')
                    .attr('x', 0)
                    .attr('y', parentBoxYFunction)
                    .attr('width', 80 + (_this.config.blockSize*_this.config.maxChildCount))
                    .attr('height', parentBoxHeightFunction)
                    .attr('class', 'relationshipGraph-ParentBox')
                    .attr('fill', 'none')
                    .attr('stroke', '#000000');
            }

            // Update existing parent nodes.
            for (i = 0; i < parentNodes.length; i++) {
                previousParents = []; // helper to calculate parentBoxY
                parentNodes[i].select('text')
                    .text(parentTextFunction)
                    .attr('x', 0)
                    .attr('y', 0)
                    .style('fill', function(obj) {
                        return (obj.parentColor !== undefined) ? _this.config.colors[obj.parentColor] : '#000000';
                    })
		    .attr("transform", function(obj, index) { return "translate(16,"+parentTextYFunction(obj,index)+") rotate (-90)"; });
            }

            // Remove deleted parent nodes.
            for (i = 0; i < parentNodes.length; i++) {
                parentNodes[i].exit().remove();
            }

	    // Find a node with a given name and parent
	    function lookUpNode(objectName, symbolName)
	    {
		for (var i=0;i<json.length;i++) {
		    var node = json[i];
		    if(node.Object == symbolName && node.parent == objectName)
			return node;
		}
		console.log("No object found called "+objectName+"/"+symbolName);
		return null;
	    }

	    // Find a node with a given name and parent
	    function lookUpNodeById(id)
	    {
		for (var i=0;i<json.length;i++) {
		    var node = json[i];
		    if(node._id == id) {
			return node;
		    }
		}
		return null;
	    }

            var childrenNodes = [];
            for (i = 0; i < jsonPerCol.length; i++) {
                // Select all of the children nodes.
                childrenNodes[i] = this.cols[i].selectAll('.relationshipGraph-node')
                    .data(jsonPerCol[i]);

                // Add new child nodes.
                _this.config.nodeDrawCallback(_this, childrenNodes[i].enter());
            }

	    function configureLinePositions(selection)
	    {
		selection
		    .attr('d', function(obj) {

			var source = lookUpNodeById(obj.source);
			var target = lookUpNodeById(obj.target);
			var package1OffsetY = -80;
			var x1_control_dx : number = 256;
			var lineXOffset : number = 32;
			var lineYOffset : number = 48;

			if (obj.source >= 0 && source == null) {
			    console.log("Source "+obj.source+" not in the index!");
			    return "";
			}
			if (obj.target >= 0 && target == null) {
			    console.log("Target "+obj.target+" not in the index!");
			    return "";
			}
			if(obj.target < 0) {
			    var x1 : number = linkXFunction(source, _this.config.objectsColWidth);
                            // TODO: Real fix would be to set lineXOffset to 0, but that will change
                            // the offset of the starting point.
			    var x2 : number = targetLinkXFunction(_this.config.columns, _this.config.objectsColWidth) - lineXOffset;
			    var y1 : number = linkYFunction(source);
			    var y2 : number = 24+package1OffsetY + obj.target*-packagesHeight;
			    var x2_control_dx : number = -128;
			} else if(obj.source < 0) {
			    var x1 : number = sourceLinkXFunction(_this.config.columns) - lineXOffset;
			    var x2 : number = linkXFunction(target, _this.config.objectsColWidth);
			    var y1 : number = 24+package1OffsetY + obj.source*-packagesHeight;
			    var y2 : number = linkYFunction(target);
			    var x2_control_dx : number = -128;
			} else {
			    var x1 : number = linkXFunction(source, _this.config.objectsColWidth);
			    var x2 : number = linkXFunction(target, _this.config.objectsColWidth);
			    var y1 : number = linkYFunction(source);
			    var y2 : number = linkYFunction(target);
			    var x2_control_dx : number = 256;
			}


			var path: string = "";
                        path += " M"+(x1 + lineXOffset) + ","+(y1+lineYOffset);
			if (y1 == y2) {
			    if (x1 == x2) {
                                path += " C"+(x1 + lineXOffset + 10) + ","+(y1+lineYOffset + 20);
                                path += " "+(x1 + lineXOffset + 20) + ","+(y1+lineYOffset + 10);
                                path += " "+(x1 + lineXOffset + 20) + ","+(y1+lineYOffset);
                                path += " C "+(x1 + lineXOffset + 20) + ","+(y1+lineYOffset - 10);
                                path += " "+(x1 + lineXOffset + 10) + ","+(y1+lineYOffset - 20);
                                path += " "+(x1 + lineXOffset) + ","+(y1+lineYOffset);
                                return path;
			    } else {
				path += " C "+(x1 + lineXOffset) + ","+(y1+128);
				path += " "+(x2 + lineXOffset) + ","+(y2+128);
				path += " "+(x2 + lineXOffset) + ","+(y2+lineYOffset);
			    }
			} else {
			    path += " C "+(x1 + lineXOffset+x1_control_dx) + ","+(y1+lineYOffset);
			    path += " "+(x2 + lineXOffset+x2_control_dx) + ","+(y2+lineYOffset);
			    path += " "+(x2 + lineXOffset) + ","+(y2+lineYOffset);
			}
			return path;
		    })
                    .attr("marker-start", "url(#marker_circle)")
                    .attr("marker-end", "url(#marker_arrow)")
                    .attr('stroke', function(obj) {
			if (obj.highlight == null) return "#444";
			return "#000";
		    })
		    .attr('stroke-opacity', function(obj) {
			if (obj.highlight == null) return "0.5";
			if (obj.highlight == 0) return "0.1";
			return "1.0";
		    })
		    .style("fill", "none");
	    }

	    /* Links */
            var linkNodes = this.links.selectAll('.relationshipGraph-call').data(callGraph);

            // Add new child nodes.
	    var links = linkNodes.enter().append("path");
	    configureLinePositions(links);

            // Update existing child nodes.
            for (i = 0; i < childrenNodes.length; i++) {
                childrenNodes[i].transition(_this.config.transitionTime)
                    .attr( "transform", function(obj) { var x = 32 + ((obj.index - 1) * _this.config.blockSize);
                                                        var y = nodeYFunction(obj);
                                                        return "translate ("+x+" "+y+")"; })
                    .style('fill', function(obj) {
                        return _this.config.colors[obj.color % _this.config.colors.length] || _this.config.colors[0];
                    });
            }

	    var linkTransitions = linkNodes.transition(_this.config.transitionTime);
	    configureLinePositions(linkTransitions);

            // Delete removed child nodes.
            for (i = 0; i < childrenNodes.length; i++) {
                childrenNodes[i].exit().transition(_this.config.transitionTime).remove();
            }
            linkNodes.exit().transition(_this.config.transitionTime).remove();

            if (this.config.showTooltips) {
                d3.select('.d3-tip').remove();
                this.links.call(this.tip);
            }

            this.config.selection.select('svg')
                .attr('height', maxHeight + 15);
        }

        return this;
    };

    return RelationshipGraph;
});
