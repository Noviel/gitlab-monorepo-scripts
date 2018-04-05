#!/bin/bash
folder=${1}
DIRNAME="$(dirname $(readlink -f "$0"))"
ref=$(cat "${DIRNAME}/.LAST_GREEN_COMMIT") 

if [[ ! ${ref:+1} ]]; then 
  echo 'No LAST_GREEN_COMMIT. Assuming changes.'
  exit 0
fi

diff=$(git diff ${ref} --name-only)
set -- junk $diff
shift
for word; do
  if [[ $word == scripts/* ]];
  then
    echo "Scripts file (${word}) was modified. Assuming changes."
    exit 0
  fi
done

echo "Checking for changes of folder '${folder}' from ref '${ref}'..."

git diff ${ref} --name-only | grep -qw "^${folder}"
changes=$?
if [[ ${changes} -eq 0 ]]; then
  echo "Folder '${folder}' has changed."
else
  echo "Folder '${folder}' has not changed."
fi
exit ${changes}
