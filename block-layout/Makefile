all: check-tsc
	cd examples; make
	cd src; make

check-tsc:
	@which tsc || (echo "You need the TypeScript compiler (tsc) on your path."; /bin/false; )

