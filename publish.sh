#/bin/bash

export BRANCH=$(git rev-parse --abbrev-ref HEAD)

gh workflow run publish.yml --ref $BRANCH --field tag=$1