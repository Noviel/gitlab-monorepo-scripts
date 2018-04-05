#!/bin/bash

target=${2}

./node_modules/.bin/firebase use ${target}
./node_modules/.bin/firebase deploy --only hosting
