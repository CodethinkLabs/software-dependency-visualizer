all: check-tsc
	cd examples; make

check-tsc:
	@which tsc || (echo "You need the TypeScript compiler (tsc) on your path."; /bin/false; )

