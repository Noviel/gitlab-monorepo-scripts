#!/bin/bash
package=${1}
tag=${2}
heroku_image=${3}

echo "Publishing '${package}' to Heroku."
container=registry.gitlab.com/snov/dqnt-v2/${package}:${tag}
heroku_container=registry.heroku.com/${heroku_image}
docker login -u gitlab-ci-token -p $CI_BUILD_TOKEN registry.gitlab.com
docker pull ${container}
docker login --username=snov.contact@gmail.com --password=$HEROKU_API_KEY registry.heroku.com
docker tag ${container} ${heroku_container}
docker push ${heroku_container}
