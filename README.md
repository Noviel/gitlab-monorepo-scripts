# GitLab Monorepo Scripts

Scripts that will generate GitLab CI configuration for monorepo projects. 

Inspired by [awesome-inc/monorepo.gitlab](https://github.com/awesome-inc/monorepo.gitlab/tree/8db25c19388a1821a7d285eda93ab2bd5e3b6aef)

## Features

- Generate per-package CI jobs 
- Execute jobs only for changed packages
- Containerization with Docker
- Deploy Node.js applications to Heroku
- Deploy static to Firebase Hosting

These features are archived with `yarn workspaces`, shell scripts and by following few branch naming rules.

## Requirements

In order to execute scripts CI should be run with an image with following installed tools:

- bash
- curl
- git
- jq
- Node.js
- Yarn

By default will be used an suitable image based on Alpine Linux.

For `container` jobs will be used `docker` based image.

## Install

```sh
git clone git@github.com:Noviel/gitlab-monorepo-scripts.git <project-name>
cd <project-name>
yarn install
```

## Usage

Strategy is to generate `.gitlab-ci.yml` on precommit stage. In `package.json` in the root folder there is a defined `prepare-ci` script that will be executed on `precommit` hook.

### Add package

```sh
cd packages/<new-package>
yarn init
```

Answer to yarn's questions. Note that project must be `private` and with name started with `packagePrefix` defined in `monorepo.json`.

## How it works? TL;DR

- CI config generates per-package jobs based on the CI-config file of the package. 
- New branches should be named depending on the prefix of the package, the changes to which they are adding. Because of this to the pipeline will be added only related jobs.
- There are changes detection scripts thats will determine changed packages. This scripts are launched on `prepare` stage for all branches and will mark changed packages.
- CI keeps track of whole package-dependencies tree of a package. Any changes to the package-dependency will be reflected in its dependants (i.e. dependant CI jobs will be pushed to the pipeline for dependency package).

## CI Configuration

### monorepo.json

`monorepo.json` is required file that defines global CI options.

- `packagesPrefix` - `string`, required. Prefix used in `package.json` of every package for naming package.
- `packagesRoot` - `string`, required. Relative to root directory path to packages root folder. 
- `packageCIConfig` - `string`, required. Filename of the file with per-package CI configuration.
- `baseYAML` - `string`, required. Filename of the file with base CI global configuration.

### scripts/base.gitlab-ci.yml

Predefined base CI configuration. It can be tweaked for specific project's needs.

### Per-package configuration

Every package must have `{packageCIConfig}.json` file.

CI config is generated on precommit stage. Script will check `{packagesRoot}` folder for packages and depending on their `{packageCIConfig}.json` will add jobs for them to the config. Per-package changes detection and branches naming rules ensure that exactly necessary jobs will be executed for any branch.

### Options

- `name` - `string`, required.
- `branchPrefix` - `string`, required. Determine with what prefix should be named branch corresponding to this package.
- `ci` - `boolean`, default: `true`. if `false` CI will be skipped completely.
- `build` - `boolean|'separate'`, default: `false`. Define if a packages should be built. If 'separate' option is chosen CI will create separate build jobs for `staging` and `production`. Usefull for providing different environment variables for different targets.
- `pre` - `boolean`, default: `false`. Should `build` job be executed in `prebuild` stage. Usefull for libraries with build artifacts that are used by other packages
- `toolchain` - `string`, default: `nodejs`. Toolchain that will be used for `build`. Supported toolchains: `nodejs`, `rust`.
- `artifacts` - `[string]`, required for packages with `build` stage. Paths that will be added to artifacts of the job.
- `artifactsPath` - `'package'|'global'`, default: `package`. If `package` `artifacts` paths will be prefixed with `$PACKAGE_ROOT/`, if `global` paths will be used as is. 
- `heroku` - `object`, required for packages with `deploy` stage. Defines Heroku targets to deploy.
  - `staging` - `string`, required.
  - `production` - `string`, required.
- `deploy` - `boolean|'firebase'`, default: `false`. Produce image and deploy it if `true`. Deploy to Firebase Hosting if `firebase`.
- `test` - `boolean`, default: `false`.
- `pages` - `boolean`, default: `false`. If `true` this job will trigger GitLab Pages.

### Variables

Environmental variables can be provided to `{packageCIConfig}.json`. They are usefull with `separate` build flag.

```json
"variables": {
  "build": {
    "*": {
      "SHARED_VARIABLE": "shared_var"
    },
    "staging": {
      "TARGET_VAR": "staging_var"
    },
    "production": {
      "TARGET_VAR": "staging_var"
    }
  }
}
```

First we specify stage where variable should be provided, e.g. `build`. Then we define target. `*` means that variable will be included to both `staging` and `production`. If `build` is not in `separate` mod just specify variables in `*`:

```json
"variables": {
  "build": {
    "*": {
      "VARIABLE": "var"
    }
  }
}
```

## Branches

### Main Branches
- `master` - latest production branch
- `dev` - latest development branch
- `release-*` - the only type of branches which allowed to be merged into `master`

### Branch Rules
- Git branch may change **only one package** in the most cases
- Git branch must be conventionally named starting with a package's prefix defined in `<package>/{packageCIConfig}.json`. It will help CI add to the pipeline only related to this package jobs
- Words are separated by a `-`
- `root-` prefix for changes in multiple packages and global changes that affect potentially every package. **This branch will run OOC jobs for every package!**

## Details

### Stages

Every package can include following stages. Per-package stages can be empty if package has this stage disabled in `{packageCIConfig}.json`.

#### Prepare

Global required stage. Added for every pipeline. Adds to CI meta information about packages: package-dependencies list, changed packages list, ref of last green commit. This information will be used by other stages to decide which jobs should be executed.

#### Test

Per-package optional stage. Added for every branch if `test` in `{packageCIConfig}.json` is `true`. Running all tests in a signle job is faster than running a couple of tests each inside it's own job. So for main branches will be lauched tests for all packages inside a single job. 

#### Build

Per-package optional stage. Added for every branch if `build` in `{packageCIConfig}.json` is `true`. Will execute `yarn build` for specific package for `nodejs` toolchain, otherwise will execute `build.sh` script in the package's folder.

#### Container

Per-package optional stage. Added for `master`, `dev` and `release-` branches if `deploy` in `{packageCIConfig}.json` is `true`. Adds docker image for container to Gitlab registry. Production and staging images are tagged independently. On `master` branch will be produced production image, on `dev` and `release-` branches - staging image.

#### Deploy

There are two different kinds of jobs for deploy that depends on target branch.

##### Staging

Per-package optional stage. Added for `dev` and `release-` branches if `deploy` in `{packageCIConfig}.json` is `true`. Push staging image from container stage to the deploy target.

##### Production

Per-package optional stage. Added for `master` branch if `deploy` in `{packageCIConfig}.json` is `true`. Push production image from container stage to the deploy target.

#### Deploy to Firebase Hosting

Environmental variable `FIREBASE_TOKEN` is required to deploy to Firebase Hosting.

## Launch only needed jobs

Technique of last green commit is used to determine the origin point for deciding are there any changes to the package. Scripts on prepare stage will mark changed packages. Other jobs will use these marks to decide if real job is necessary. There are two type of branches that help CI to figure out what jobs should be launched: main branches and features branches.

### Main branches

- master
- dev
- release-*

Main branches trigger pipeline for every package. Even if package was not changed - corresponding jobs will be included to the pipeline. It is necessary because we can't tell changes to which package will be merged into these branches. It can be any package and CI should be able to run jobs for every package. Real job will be performed only if package was marked as changed. Still there are overhead for starting jobs, but there is no other way with GitLab for now.

### Feature branches

- {branchPrefix}-*

Newly created branches has no green commit and therefore every package is assummed as changed. Jobs with false-positive changes checks will be added to the pipeline. It is a exactly the same overhead as one for main branches. But this time it can be eliminated with branch naming rules. There is a contract that no other package has changed in the branch except that with which the branch was assosiated. Therefore only related to the package jobs can be included to the pipeline.

### Core files

There are some "core" files and directories that fundamentally affect every package. Changes to them will mark all packages as changed.

## Dependendencies

It is absolutely safe to modify package-dependency(PD) of a package. Scripts that mark changed packages will scan for changes not only in folder corresponding to package, but in all folders of its PD-tree. It is possible with help of prepare stage scripts that generate `.DEPENDENCIES` file with mapping between package and its PDs.
