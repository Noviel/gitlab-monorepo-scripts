#!/bin/bash

package=${1}
target=${2}

./node_modules/.bin/firebase use ${target}
yarn workspace @dqnt/${package} deploy
