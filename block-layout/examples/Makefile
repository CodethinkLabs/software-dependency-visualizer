all:	object-view-demo package-view-demo packageindex

libs = exampleData.ts loadingAnimation.ts simpleFunctions.ts \
       nodePositioning.ts structures.ts

object-view-demo: object-view-demo.ts $(libs)
	tsc --outfile object-view-demo.js object-view-demo.ts

package-view-demo: package-view-demo.ts $(libs)
	tsc --outfile package-view-demo.js package-view-demo.ts

packageindex: packageindex.ts
	tsc packageindex.ts

