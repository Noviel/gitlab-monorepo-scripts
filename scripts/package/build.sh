#!/bin/bash
# DIRNAME="$(dirname $(readlink -f "$0"))"

PACKAGESROOT=$(jq -r '.packagesRoot' monorepo.json)
PACKAGESPREFIX=$(jq -r '.packagesPrefix' monorepo.json)
package=${1}
toolchain=${2}

if [[ "$toolchain" == "nodejs" ]]; then
  echo "Building with NodeJS ${1}..."
  echo Target branch: ${CI_BUILD_REF_NAME}
  yarn workspace ${PACKAGESPREFIX}/${package} install
  yarn workspace ${PACKAGESPREFIX}/${package} build
else
  location=${PACKAGESROOT}${package}
  echo "Building with custom build script ${package} located in $location..."
  cd "$location"
  ./build.sh ${package}
fi
