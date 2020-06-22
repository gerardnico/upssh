# UpSsh - Deploy remotely via SSH

## About

`upssh` is a command line that deploys remotely via SSH with the following steps:
  
  * [Optional] move the target directory to a backup location with the name of the target directory, and a timestamp
  * Upload the current directory

## Features

  * Ignore files defined in `.ignore` and `.upssh-ignore`

## Getting Started

  * Install `upssh` globally

```bash
yarn add -g upssh 
```

  * Copy the [.env.dist](.env.dist) file to `.env` 
  * Set the env values correctly
  * Add your env file in an `ignore` file
  * Execute `upssh`

```bash
upssh
```

## Dev

See [Dev](./doc/cli.md)