PORT ?= 8080
DOMENICO_XML ?= data/domenico.xml
TEI_SCHEMA ?= https://www.tei-c.org/release/xml/tei/custom/schema/relaxng/tei_all.rng
SCHEMA_FILE ?= /tmp/tei_all.rng

.PHONY: all build generate validate clean distclean install run

all: build

install: node_modules

node_modules: package.json package-lock.json
	npm install
	@touch node_modules

validate:
	@if [ ! -f $(SCHEMA_FILE) ]; then \
		echo "Downloading TEI XML schema from $(TEI_SCHEMA)..."; \
		curl -s -f $(TEI_SCHEMA) -o $(SCHEMA_FILE); \
	fi
	xmllint --noout --relaxng $(SCHEMA_FILE) $(DOMENICO_XML)

generate: node_modules
	npx --yes @cu-mkp/editioncrafter-cli process -i $(DOMENICO_XML) -o public -u http://localhost:$(PORT)
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

