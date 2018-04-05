#!/bin/bash
package=${1}
PACKAGESPREFIX=@dqnt

yarn workspace ${PACKAGESPREFIX}/${package} test
