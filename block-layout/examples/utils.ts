interface Call {
    highlight?: number;
}

class Call {
    source: number;
    target: number;
}

const objectsColWidth = 400;
const packagesColWidth = 200;
const packagesHeight = 40;
const blockSize : number = 64;

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
    return nodeXFunction (obj) + packagesColWidth + obj.col * objectsColWidth;
}

function linkYFunction (obj) {
    return nodeYFunction (obj);
}

function targetLinkXFunction(colsNumber) {
    return  objectsColWidth * colsNumber + packagesColWidth;

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
