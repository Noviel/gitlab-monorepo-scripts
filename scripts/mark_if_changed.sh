#!/bin/bash
folder=packages/${1}
command=${@:2}

DIRNAME="$(dirname $(readlink -f "$0"))"
DEPS=

${DIRNAME}/changes.sh ${folder}
if [[ $? -eq 0 ]]; then
  echo "'${1}' package is marked as changed."
  echo ${1} >> scripts/.DIRTY
  exit 0
fi

while read -r line; do
  if [[ ${line%%=*} == ${1} ]]; then
    DEPS=${line#*=};
    break;
  fi
done < "scripts/.DEPENDENCIES"

if [[ $DEPS ]]; then
  IFS=' ' read -r -a DEPARRAY <<< $DEPS
  for element in "${DEPARRAY[@]}"
  do
    ${DIRNAME}/changes.sh packages/${element}
    if [[ $? -eq 0 ]]; then
      echo "'${element}' dependency of ${1} package was changed. ${1} is marked as changed."
      echo ${1} >> scripts/.DIRTY
      exit 0
    fi
  done
fi
