#!/usr/bin/env python3

# This is meant to scan a directory for files called 'calls.*' which
# are in a proprietary text format showing the calls between objects.
# One call file represents one 'package' which may contain several
# sections representing object files (.o files in the build). Those
# sections contain symbol information and the calls between them.
#
# The script also requires an index file called "alldefs_sorted_uniq"
# which maps symbol names to packages. Both this file and the calls
# file are generated from proprietary data, so we can't describe here
# how to create them.

from __future__ import print_function
import os
import re
import sys
import yaml


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
        return "::".join(names)
    else:
        return mangled

# Process a single package (call.* file) and create a package object.
def processPackage(filename, directory):
    global index
    packageName = filename
    if packageName.startswith("calls."): packageName = packageName[6:]
    package = { '@id': "id:"+packageName,
                '@type': "sw:Package",
                'name': packageName }
    print("Processing module "+packageName, file=sys.stderr)
    f = open(filename, "rt")
    objectName = "unknown object"
    objectSymbols = None
    objectYaml = None
    package['contains'] = []
    while True:
        l = f.readline()
        if l == "": break

        m = re.match('^(\w+).o$',l) # A new object
        if(m):
            objectName = m.group(1)
            # New object
            objectYaml = { '@id': "id:"+packageName+":"+objectName,
                           '@type': "sw:Object",
                           'name': objectName,
                           'contains': []
            }
            objectSymbols = {}
            package['contains'].append(objectYaml)

        m = re.match('^(\w+) ([uU]),(\w+)$',l) # A symbol call
        if(m):
            called = m.group(1)
            symbolType = m.group(2)
            caller = demangle(m.group(3))

            # Look up an existing symbol object for the caller, or create one.
            if caller in objectSymbols:
                symbolYaml = objectSymbols[caller]
            else:
                symbolYaml = { '@id': "id:"+packageName+":"+objectName+":"+caller,
                               '@type': "sw:Symbol",
                               'name': caller,
                               'calls': [] }
                objectYaml['contains'].append(symbolYaml)
                objectSymbols[caller] = symbolYaml

            # A lowercase 'u' means locally undefined. This symbol is defined inside this
            # object, so we have no problem specifying the call destination.
            if symbolType == "u":
                callDest = packageName+":"+objectName+":"+demangle(called)
            else:
                # Otherwise, it's generally undefined, so this would normally be up to the
                # linker to find the called object. We'll need to look it up in our index.
                if called not in index:
                    callDest = "NULL:"+demangle(called)
                else:
                    packageObjectName = index[called]
                    callDest = packageObjectName+":"+demangle(called)
            symbolYaml['calls'].append("id:"+callDest)

    # Empty 'contains' fields cause problems, so delete them
    if package['contains'] == []: del package['contains']
    return package

def scanFile(directory, filename):
    package = processPackage(filename, os.path.join(directory, filename))
    of = open(filename+".yaml", "wt")
    of.write(yaml.dump({ "@context": ["http://localhost:8000/context.jsonld"],
                         "@graph": package }))
    of.close()

def scanDirectory(directory):
    print("Scanning %s"%directory, file=sys.stderr)

    files = os.listdir(directory)
    for f in files:
        if f.startswith("calls.") and not f.endswith(".yaml"):
            scanFile(directory, f)


def main():
    global index
    # Load the symbol directory
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

