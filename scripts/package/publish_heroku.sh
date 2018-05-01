#!/bin/bash
package=${1}
tag=${2}
heroku_image=${3}

echo "Publishing '${package}' to Heroku."
heroku_container=registry.heroku.com/${heroku_image}
docker login --username=snov.contact@gmail.com --password=$HEROKU_API_KEY registry.heroku.com
docker build -t ${heroku_container} -f packages/${package}/Dockerfile .
docker push ${heroku_container}
