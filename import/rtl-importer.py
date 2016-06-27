#!/usr/bin/env python3

import os
import re
import subprocess
import sys
import yaml

index = {}

perFileMode = False

#TODO: C++ demangling. This doens't do anything at the moment.
def demangle(mangled):
    return mangled

def removeEnd(string, ending):
    if string.endswith(ending): return string[:-len(ending)]
    return string

class RTLParser(object):
    def __init__(self, index):
        self.objects = {}
        self.index = index
        self.packages = {}
    def newPackage(self, packageName):
        self.packageName = packageName
        if packageName not in self.packages: self.packages[packageName] = {}
    def newObject(self, objectName):
        self.currentObject = objectName
        self.packages[self.packageName][objectName] = {}
    def parse(self, text):
        objectList = self.packages[self.packageName][self.currentObject]
        functionName = None
        for l in text.splitlines():
            m = re.match("^;; Function (\S+)\s*$", l)
            if m:
                functionName = m.group(1)
                objectList[functionName] = []
                self.index[functionName] = self.packageName+":"+self.currentObject
            m = re.match('^;; Function (.*)\s+\((\S+)(,.*)?\).*$', l)
            if m:
                functionName = m.group(1)
                objectList[functionName] = []
                self.index[functionName] = self.packageName+":"+self.currentObject
            m = re.match('^.*\(call.*"(.*)".*$', l)
            if m:
                callee = m.group(1)
                if callee not in objectList[functionName]:
                    objectList[functionName].append(callee)

    def getYaml(self):
        yamlRoot = { '@context': ['http://localhost:8000/context.jsonld'],
                     '@graph': [] }

        for (packageName, objectList) in self.packages.items():
            package = {'contains': [], '@id': "id:"+packageName,
                       '@type':'sw:Package', 'name': packageName }
            yamlRoot['@graph'].append(package)

            for (objectName,objectContents) in objectList.items():
                objectIdentifier = "id:"+packageName+":"+objectName
                obj = { '@id:': objectIdentifier, '@type': 'sw:Object',
                        'name': objectName, 'contains': [] }
                package['contains'].append(obj)
                for symbol in objectContents:
                    symbolIdentifier = objectIdentifier+":"+demangle(symbol)
                    symbolYaml = { '@id': symbolIdentifier,
                                   'name': demangle(symbol),
                                   '@type':'sw:Symbol',
                                   'calls': [] }
                    for calledSymbol in objectList[objectName][symbol]:
                        if calledSymbol in self.index:
                            symbolYaml['calls'].append("id:%s:%s" %
                                                       (self.index[calledSymbol],calledSymbol))
                        else:
                            symbolYaml['calls'].append("EXTERNAL:%s"%(calledSymbol))
                    obj['contains'].append(symbolYaml)

        return yaml.dump(yamlRoot)

def scanFile(directory, filename, rtlParser):
    global index
    print("Scanning file "+os.path.join(directory, filename))
    parser = 'cat'
    parserResult = subprocess.check_output([parser,
                                            os.path.join(directory, filename)]).decode("utf-8")
    print("Parser returned %d bytes"%len(parserResult))

    if perFileMode:
        rtlParser = RTLParser(index)

    filename = removeEnd(filename, ".c.170r.expand")
    rtlParser.newPackage(filename[0])
    rtlParser.newObject(filename)
    rtlParser.parse(parserResult)

    yaml = rtlParser.getYaml()
    if perFileMode:
        yamlFile = open(filename+".yaml", "wt")
        yamlFile.write(yaml)
        yamlFile.close()

def scanDirectory(directory, rtlParser):
    print("Scanning %s"%directory, file=sys.stderr)

    files = os.listdir(directory)
    for f in files:
        if f.endswith(".c.170r.expand"):
            scanFile(directory, f, rtlParser)

def main():
    global index
    # Load the symbol directory

    index = {}

    rtlParser = RTLParser(index)

    # Load the index
    if os.path.exists("index"):
        indexfile = open("index")
        while True:
            l = indexfile.readline()
            if l == "": break
            (symbol, objectName, libraryName) = l.split(":")
            index[symbol]= "%s:%s"%(libraryName.strip(),objectName.strip())
        indexfile.close()

    if len(sys.argv) > 1:
        if os.path.isdir(sys.argv[1]):
            scanDirectory(sys.argv[1], rtlParser)
        else:
            for i in sys.argv[1:]:
                scanFile(".", i, rtlParser)
    else:
        scanDirectory(".", rtlParser)

    if not perFileMode:
        yamlFile = open("output.yaml", "wt")
        yamlFile.write(rtlParser.getYaml())
        yamlFile.close()

    # Dump the updated index
    indexfile = open("index", "wt")
    for (symbol, packageObject) in index.items():
        indexfile.write("%s:%s\n"%(symbol,packageObject))
    indexfile.close()

if __name__=="__main__":
    main()

