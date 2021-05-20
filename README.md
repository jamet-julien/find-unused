# find-unused

Find all componend never used and list them on `unusedreport.txt`

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/find-unused.svg)](https://npmjs.org/package/find-unused)
[![Downloads/week](https://img.shields.io/npm/dw/find-unused.svg)](https://npmjs.org/package/find-unused)
[![License](https://img.shields.io/npm/l/find-unused.svg)](https://github.com/jamet-julien/find-unused/blob/master/package.json)

<!-- toc -->
* [find-unused](#find-unused)
* [Usage](#usage)
* [File config](#file-config)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g find-unused
$ find-unused COMMAND
running command...
$ find-unused (-v|--version|version)
find-unused/0.0.11 darwin-x64 node-v14.15.4
$ find-unused --help [COMMAND]
USAGE
  $ find-unused COMMAND
...
```
<!-- usagestop -->

# File config

you can use `.findunusedrc` to define alias used on project

### Sample

```
{
    "alias": {
        "@Atoms/": "./components/atoms/",
        "@Context/": "./components/context/",
        "@Hooks/": "./components/hooks/",
        "@Molecules/": "./components/molecules/",
        "@Organisms/": "./components/organisms/",
        "@Pages/": "./pages/",
        "@Queries/": "./components/queries/",
        "@Helpers/": "./helpers/",

        "@Client": "./client.ts",
        "@Query": "./query.ts",
        "@Types": "./types.ts",

        "@Services/": "./services/",
        "@Constants/": "./constants/",
        "@Lang/": "./lang/"
    }
}
# Commands

<!-- commands -->

<!-- commandsstop -->
```
