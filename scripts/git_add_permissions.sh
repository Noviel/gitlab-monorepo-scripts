#!/bin/bash
git update-index --chmod=+x scripts/changes.sh
git update-index --chmod=+x scripts/if_changed.sh
git update-index --chmod=+x scripts/last_green_commit.sh
git update-index --chmod=+x scripts/mark_if_changed.sh
git update-index --chmod=+x scripts/run_if_changed.sh
git update-index --chmod=+x scripts/package/build.sh
git update-index --chmod=+x scripts/package/cp_gitlab.sh
git update-index --chmod=+x scripts/package/cp_heroku.sh
git update-index --chmod=+x scripts/package/deploy_firebase.sh
git update-index --chmod=+x scripts/package/publish_gitlab.sh
git update-index --chmod=+x scripts/package/publish_heroku.sh
git update-index --chmod=+x scripts/package/test.sh
