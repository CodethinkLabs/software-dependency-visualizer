#!/usr/bin/env python3

# Convenience importer for .a.cache files.



# "importer.py libyak" is equivalent to:
# import/lib-importer.py libyak.a.cache
# import/neo4j libyak.yaml

import os.path
import re
import subprocess
import sys

def main():
    if len(sys.argv) < 2:
       print("Usage: importer.py <cache file>")
    library_filename = sys.argv[1]
    library_basename = re.sub('.a.cache$', '', library_filename)

    this_directory = os.path.dirname(__file__)
    lib_importer_filename = os.path.join(this_directory, "import/lib-importer.py")
    print("Attempting to use %s as the lib importer"%lib_importer_filename)
    neo4j_importer_filename = os.path.join(this_directory, "import/neo4j")
    subprocess.check_call([lib_importer_filename, library_filename])
    subprocess.check_call([neo4j_importer_filename, library_basename + ".yaml"])

if __name__=="__main__":
    main()
