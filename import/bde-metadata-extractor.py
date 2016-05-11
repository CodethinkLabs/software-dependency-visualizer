#!/usr/bin/env python3

from __future__ import print_function
import os
import sys
import yaml

# Scan the local directory (or one provided as the first command line argument)
# for directories that contain 'package' directories. Extract BDE metadata from
# these and print a YAML document.

def readDeps(filename):
    f = open(filename, "rt")
    deps = []
    while True:
        l = f.readline()
        if l == "": return deps
        if len(l)>0 and l[0] != '#':
            deps.append(l.strip())

def processPackage(packageName, directory):
    metaDataDirectory = os.path.join(directory, "package")
    # Find the packages we depend on
    dep = []
    if os.path.exists(os.path.join(metaDataDirectory, packageName + ".dep")):
        deps = readDeps(os.path.join(metaDataDirectory, packageName + ".dep"))

    package = { '@id': "id:"+packageName,
                '@type': "sw:Package",
                'name': packageName }

    # Now output the YAML
    if len(deps)>0: package['requires'] = map(lambda x: "id:"+x, deps)
    return package


def findSourceFiles(packagename, directory):
    sourceFiles = []
    # Scan for files. By default, our build tool only considers .c, .cpp and .f files
    # in the top level directory, so there's no need to search subdirectories.
    print("Scanning %s for source files"%directory, file=sys.stderr)

    files = os.listdir(directory)
    for f in files:
        (root,ext) = os.path.splitext(f)
        if ext in [ ".f", ".c", ".cpp" ]:
            print("Source file %s found"%f, file=sys.stderr)
            fileYaml = { '@id': "id:"+f,
                         '@type': "sw:SourceFile",
                         'name': f }
            sourceFiles.append(fileYaml)
    print("Returning %d entries in sourceFiles"%len(sourceFiles), file=sys.stderr)
    return sourceFiles

def main():
    if len(sys.argv) > 1:
        scanDirectory = sys.argv[1]
    else:
        scanDirectory = "."
    dirs = os.listdir(scanDirectory)
    nodes = []
    for d in dirs:
        if os.path.exists(os.path.join(scanDirectory, d, "package")):
            package = processPackage(d, os.path.join(scanDirectory, d))
            sourceFiles = findSourceFiles(d,  os.path.join(scanDirectory, d))
            if len(sourceFiles)>0: package['contains'] = map(lambda x: "id:"+x, sourceFiles)
            nodes.append(package)
            nodes.extend(sourceFiles)

    if len(nodes) == 0:
        print("Nothing found!", file=sys.stderr)
    else:
        print(yaml.dump({ "@context": ["https://raw.githubusercontent.com/ssssam/software-integration-ontology/master/context.jsonld"],
                          "@graph": nodes }))
if __name__=="__main__":
    main()

