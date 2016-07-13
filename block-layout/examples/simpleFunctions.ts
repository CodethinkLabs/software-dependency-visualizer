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

/// Counts the occurences of a given character in a string.
function countChars(s: string, c:string) : number
{
    var n:number =0;
    for(var i:number=0;i<s.length;i++) {
	if(s.charAt(i) == c) n++;
    }
    return n;
}

