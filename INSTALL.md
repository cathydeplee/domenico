# INSTALL

This is a Javascript based project and you will need Node.js v18 or higher to run it locally. First, clone this repository and then run:

```npm install```

Then, install the EditionCrafter CLI:

```npm install -g @cu-mkp/editioncrafter-cli```

Next, follow the initial setup instructions below.

## Initial Setup

To setup setup your project:

1) Edit the `astro.config` file, replacing BASE_DIR with your project base directory. For local installation, this is "."

2) Edit the `data/config.json` file. Fill in the DOCUMENT_NAME, BASE_DIR, and DOCUMENT_ID. You may also need to adjust the `transcriptionTypes` depending on your document. For more information, please see the ["Getting Started"](https://editioncrafter.org/getting-started/) section of the EditionCrafter website.

## Getting Started with EditionCrafter CLI

To learn how to use the EditionCrafter CLI to create your own project, please see the ["Getting Started"](https://editioncrafter.org/getting-started/) section of the EditionCrafter website. Note that the props passed into the components are configurable via the `data/config.json` file.

## Running this Project Locally

To run locally, set the BASE_DIR in the steps above to "." 

Then use the following command:

```npm run start```

## Upgrading EditionCrafter

This repository contains the latest version of EditionCrafter. To upgrade to a newer version in the future, run the following command:

```npm install @cu-mkp/editioncrafter@latest```

Then, upgrade the EditionCrafter CLI using this command:

```npm install @cu-mkp/editioncrafter-cli@latest```
