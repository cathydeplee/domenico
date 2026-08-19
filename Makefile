PORT ?= 8080

.PHONY: all build generate clean distclean install run

all: build

install: node_modules

node_modules: package.json package-lock.json
	npm install
	@touch node_modules

generate: node_modules
	npx --yes @cu-mkp/editioncrafter-cli process -i data/domenico.xml -o public -u http://localhost:$(PORT)
	cp data/glossary.json public/glossary.json


build: generate
	BASE_PATH=/ npm run build

run: build
	@echo "Starting local web server on port $(PORT) at http://localhost:$(PORT)/ ..."
	@(sleep 1 && (xdg-open http://localhost:$(PORT)/ || open http://localhost:$(PORT)/ || true)) &
	npx http-server ./dist -p $(PORT)

clean:
	rm -rf dist .astro public/domenico public/glossary.json

distclean: clean
	rm -rf node_modules
