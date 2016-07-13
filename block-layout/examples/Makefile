all:	object-view-demo packageindex

libs = exampleData.ts loadingAnimation.ts simpleFunctions.ts \
       nodePositioning.ts structures.ts

object-view-demo: object-view-demo.ts $(libs)
	tsc --outfile object-view-demo.js object-view-demo.ts

packageindex: packageindex.ts
	tsc packageindex.ts

