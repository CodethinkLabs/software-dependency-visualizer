#!/usr/bin/env python3

import os
import re
import subprocess
import sys
import yaml

index = {}

# Improved 'libcache' data importer. Turns .a.cache files into YAML by
# invoking the proprietary parser directly.

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

class ParseLibParser(object):
    def __init__(self, packageName):
        # The section we're currently processing (defs, undefs etc)
        self.symbolType = None

        #For each symbol, an array of the symbols it calls
        self.symbolCalls = {}

        # For each object, an array of the symbols it contains
        self.objectSymbols = {}

        # dataSymbols is a set of all the symbols which
        # are data rather than code (value is meaningless)
        self.dataSymbols = {}

        self.currentObjectName = None
        self.packageName = packageName

    def processPlainSymbol(self, symbol, defType):
        if defType[0].lower() == 't' and self.symbolType == "defs":
            if symbol not in self.symbolCalls:
                self.symbolCalls[symbol] = []
                self.objectSymbols[self.currentObjectName].append(symbol)
        elif defType[0].lower() == 'd': # Data symbol, should be ignored
            self.dataSymbols[symbol] = 1

    def processCallSymbols(self, calledSymbol, callType, callingSymbol):
        global index
        if callingSymbol in self.dataSymbols or calledSymbol in self.dataSymbols: return
        if callingSymbol not in self.symbolCalls: self.symbolCalls[callingSymbol] = []

        if callType == "u":
            callDest = self.packageName+":"+self.currentObjectName+":"+demangle(calledSymbol)
        elif calledSymbol not in index:
            callDest = "NULL:"+demangle(calledSymbol)
            print("%s not found in index"%calledSymbol)
        else:
            calledPackageName = index[calledSymbol] # calledPackageName includes the object!
            callDest = "id:"+calledPackageName+":"+demangle(calledSymbol)
        self.symbolCalls[callingSymbol].append(callDest)
        if callingSymbol not in self.objectSymbols[self.currentObjectName]:
            self.objectSymbols[self.currentObjectName].append(callingSymbol)

    def parse(self, text):
        for l in text.splitlines():
            m = re.match('^(defs|local defs|undefs|weak defs|local undefs):\s*$',l)
            if(m):
                self.symbolType = m.group(1)
                continue
            m = re.match('^\s+(\S+).o\s*$',l) # Object name
            if m:
                self.currentObjectName = m.group(1)
                if self.currentObjectName not in self.objectSymbols: self.objectSymbols[self.currentObjectName] = []
                continue
            m = re.match('^\s+(\S+) (\S+)$',l) # Plain symbol with no call
            if m:
                self.processPlainSymbol(symbol = m.group(1), defType = m.group(2))
                continue
            m = re.match('^\s+(\S+) (\S+), caller: (\S+)$',l) # A call from a symbol in our object
            if m:
                self.processCallSymbols(calledSymbol = m.group(1),
                                        callType = m.group(2),
                                        callingSymbol = m.group(3))

    def getYaml(self):
        package = {'contains': [], '@id': "id:"+self.packageName,
                   '@type':'sw:Package', 'name': self.packageName }
        yamlRoot = { '@context': ['http://localhost:8000/context.jsonld'],
                     '@graph': package }

        for (objectName,objectContents) in self.objectSymbols.items():
            objectIdentifier = "id:"+self.packageName+":"+objectName
            obj = { '@id:': objectIdentifier, '@type': 'sw:Object',
                    'name': objectName, 'contains': [] }
            for symbol in objectContents:
                if symbol=="":
                    print("Zero-length symbol found in objectContents for "+objectName)
                    exit(1)
                symbolIdentifier = objectIdentifier+":"+demangle(symbol)
                symbolYaml = { '@id': symbolIdentifier,
                               'name': demangle(symbol),
                               '@type':'sw:Symbol',
                               'calls': list(map(demangle, self.symbolCalls[symbol])) }
                obj['contains'].append(symbolYaml)
            package['contains'].append(obj)
        return yaml.dump(yamlRoot)

def scanFile(directory, filename):
    global index
    print("Scanning file "+os.path.join(directory, filename))
    parser = os.environ['PARSE_LIB']
    packageName = filename
    if packageName.startswith("calls."): packageName = packageName[6:]
    if packageName.endswith(".a.cache"): packageName = packageName[:-8]

    parserResult = subprocess.check_output([parser, os.path.join(directory, filename)], stdin=None).decode("utf-8")
    print("Parser returned %d bytes"%len(parserResult))
    parser = ParseLibParser(packageName)
    parser.parse(parserResult)
    yaml = parser.getYaml()

    yamlFile = open(packageName+".yaml", "wt")
    yamlFile.write(yaml)
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

    # Load the index
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

