all:	object-view-demo.js package-route-demo.js package-view-demo.js packageindex.js

libs = exampleData.ts loadingAnimation.ts simpleFunctions.ts \
       nodePositioning.ts structures.ts

object-view-demo.js: object-view-demo.ts $(libs)
	tsc --outfile object-view-demo.js object-view-demo.ts

package-route-demo.js: package-route-demo.ts $(libs)
	tsc --outfile package-route-demo.js package-route-demo.ts

package-view-demo.js: package-view-demo.ts $(libs)
	tsc --outfile package-view-demo.js package-view-demo.ts

packageindex.js: packageindex.ts
	tsc packageindex.ts
