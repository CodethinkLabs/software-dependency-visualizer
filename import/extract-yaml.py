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
    dep = []
    if os.path.exists(os.path.join(metaDataDirectory, packageName + ".dep")):
        deps = readDeps(os.path.join(metaDataDirectory, packageName + ".dep"))
    # Now output the YAML
    package = { '@id': "id:"+packageName,
                '@type': "sw:Package",
                'name': packageName }
    if len(deps)>0: package['requires'] = map(lambda x: "id:"+x, deps)
    return package

def main():
    if len(sys.argv) > 1:
        scanDirectory = sys.argv[1]
    else:
        scanDirectory = "."
    dirs = os.listdir(scanDirectory)
    packages = []
    for d in dirs:
        if os.path.exists(os.path.join(scanDirectory, d, "package")):
            packages.append(processPackage(d, os.path.join(scanDirectory, d)))
    if len(packages) == 0:
        print("Nothing found!", file=sys.stderr)
    else:
        print(yaml.dump({ "@context": ["https://raw.githubusercontent.com/ssssam/software-integration-ontology/master/context.jsonld"],
                          "@graph": packages }))
if __name__=="__main__":
    main()

