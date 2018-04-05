#!/bin/bash
script=${1}
package=${2}
rest_args="${@:3}"

scripts/if_changed.sh ${package}

if [[ $? -eq 0 ]]; then
  ./scripts/${script} ${package} ${rest_args}
else
  echo "${package} is not chaged. Skipping"
fi
