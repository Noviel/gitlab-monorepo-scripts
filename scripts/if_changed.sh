#!/bin/bash
package=${1}

if grep -q $package "scripts/.DIRTY"; then
  exit 0
fi

exit 1
