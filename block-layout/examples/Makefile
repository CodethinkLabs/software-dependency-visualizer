all:	object-view-demo packageindex

libs = exampleData.ts

object-view-demo: object-view-demo.ts $(libs)
	tsc --outfile object-view-demo.js object-view-demo.ts || /bin/true

packageindex: packageindex.ts
	tsc packageindex.ts || /bin/true

