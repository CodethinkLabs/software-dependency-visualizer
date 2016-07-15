all: check-tsc
	cd examples && $(MAKE)
	cd src && $(MAKE)

check-tsc:
	@which tsc || (echo "You need the TypeScript compiler (tsc) on your path."; /bin/false; )

