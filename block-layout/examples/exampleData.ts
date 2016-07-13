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

