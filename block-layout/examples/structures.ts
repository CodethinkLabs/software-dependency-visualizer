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

