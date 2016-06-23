#!/usr/bin/env python3

import os
import re
import subprocess
import sys
import yaml

index = {}

# demangles SunPro mangled names - partially. Arguments aren't parsed yet.
def demangle(mangled):
    if mangled.startswith("__1c"):
        # Looks like a SunPro compiler name
        ptr = 4;
        names = [];
        while True:
            if ptr > len(mangled)-1: break
            lengthCharacter = mangled[ptr]
            if ord(lengthCharacter) > ord("A") and ord(lengthCharacter) <= ord("Z"):
                symlen = ord(lengthCharacter) - ord('A') + 1;
                names.append(mangled[ptr+1:ptr+symlen])
                ptr += symlen
            else:
                break
        if len(names)==0:
            print("Zero-length name after demangling "+mangled)
            return mangled
        return "::".join(names)
    else:
        return mangled

def scanFile(directory, filename):
    global index
    print("Scanning file "+os.path.join(directory, filename))
    parser = os.environ['PARSE_LIB']
    packageName = filename
    if packageName.startswith("calls."): packageName = packageName[6:]
    if packageName.endswith(".a.cache"): packageName = packageName[:-8]
    yamlFile = open(packageName+".yaml", "wt")

    parserResult = subprocess.check_output([parser, os.path.join(directory, filename)], stdin=None).decode("utf-8")
    print("Parser returned %d bytes"%len(parserResult))
    symbolType = None
    symbolCalls = {}
    objectSymbols = {}
    dataSymbols = {}
    for l in parserResult.splitlines():
        m = re.match('^(defs|local defs|undefs|weak defs|local undefs):\s*$',l)
        if(m):
            symbolType = m.group(1)
            continue
        m = re.match('^\s+(\S+).o\s*$',l) # Object name
        if m:
            currentObject = m.group(1)
            if currentObject not in objectSymbols: objectSymbols[currentObject] = []
            continue
        m = re.match('^\s+(\S+) (\S+)$',l) # Plain symbol with no call
        if m and symbolType != "local defs":
            symbol = m.group(1)
            defType = m.group(2)
            if defType[0].lower() == 't':
                if symbolType == "defs" or symbolType == "local defs":
                    if symbol not in symbolCalls:
                        symbolCalls[symbol] = []
                        sys.stderr.write("Updating calls for %s\n"%symbol)
                    objectSymbols[currentObject].append(symbol)
            elif defType[0].lower() == 'd': # Data symbol, should be ignored
                dataSymbols[symbol] = 1
        m = re.match('^\s+(\S+) (\S+), caller: (\S+)$',l) # A call from a symbol in our object
        if m:
            calledSymbol = m.group(1)
            callingSymbol = m.group(3)
            if calledSymbol in dataSymbols: continue

            if callingSymbol not in symbolCalls: symbolCalls[callingSymbol] = []

            if calledSymbol not in index:
                callDest = "NULL:"+demangle(calledSymbol)
            else:
                calledPackageName = index[calledSymbol]
                callDest = "id:"+calledPackageName+":"+demangle(calledSymbol)

            sys.stderr.write("Updating calls for %s\n"%callingSymbol)
            symbolCalls[callingSymbol].append(callDest)
            objectSymbols[currentObject].append(callingSymbol)

    package = {'contains': [], '@id': "id:"+packageName, '@type':'sw:Package', 'name': packageName }
    yamlRoot = { '@context': ['http://localhost:8000/context.jsonld'], '@graph': package }

    for (objectName,objectContents) in objectSymbols.items():
        obj = { '@id:': "id:"+packageName+":"+objectName, '@type': 'sw:Object', 'name': objectName, 'contains': [] }
        for symbol in objectContents:
            if symbol=="":
                print("Zero-length symbol found in objectContents for "+objectName)
                exit(1)
            sys.stderr.write("Looking up calls for %s\n"%demangle(symbol))
            symbolYaml = { '@id': "id:"+packageName+":"+objectName+":"+demangle(symbol), 'name': demangle(symbol), '@type':'sw:Symbol', 'calls': symbolCalls[symbol] }
            obj['contains'].append(symbolYaml)
        yamlRoot['@graph']['contains'].append(obj)

    yamlFile.write(yaml.dump(yamlRoot))
    yamlFile.close()

def scanDirectory(directory):
    print("Scanning %s"%directory, file=sys.stderr)

    files = os.listdir(directory)
    for f in files:
        if f.endswith(".a.cache"):
            scanFile(directory, f)

def main():
    global index
    # Load the symbol directory

    if 'PARSE_LIB' not in os.environ or not os.path.exists(os.environ['PARSE_LIB']):
        print("PARSE_LIB must be set to a valid cache file parser.")
        exit(1)

    indexfile = open("alldefs_sorted_uniq")
    index = {}

    while True:
        l = indexfile.readline()
        if l == "": break
        (symbol, objectName, libraryName) = l.split(":")
        index[symbol]= "%s:%s"%(libraryName.strip(),objectName.strip())

    if len(sys.argv) > 1:
        if os.path.isdir(sys.argv[1]):
            scanDirectory(sys.argv[1])
        else:
            scanFile(".",sys.argv[1])
    else:
        scanDirectory(".")

if __name__=="__main__":
    main()

