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

function linkXFunction (obj, objectsColWidth) {
    return nodeXFunction (obj) + packagesColWidth + obj.col * objectsColWidth;
}

function linkYFunction (obj) {
    return nodeYFunction (obj);
}

function targetLinkXFunction(colsNumber, objectsColWidth) {
    return  objectsColWidth * colsNumber + packagesColWidth;
}

function sourceLinkXFunction(colsNumber) {
    return 150;
}

function nodeTranslationFunction (obj) { var x = nodeXFunction(obj);
					 var y = nodeYFunction(obj);
					 return "translate ("+x+" "+y+")"; }
