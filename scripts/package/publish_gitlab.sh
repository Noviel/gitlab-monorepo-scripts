#!/bin/bash
package=${1}
tag=${2}

echo "Containerize '${package}'."
container=registry.gitlab.com/snov/dqnt-v2/${package}:${tag}
docker login -u gitlab-ci-token -p $CI_BUILD_TOKEN registry.gitlab.com
docker build -t ${container} -f packages/${package}/Dockerfile .
docker push ${container}
docker build -t ${container} -f packages/${package}/Dockerfile .
docker push ${container}
