#!/usr/bin/env node
const { exec } = require("child_process");
const path = require("path");

const { getDirectories, getPackageCIConfig } = require("./helpers");

const { packagesRoot } = require("../monorepo.json");

const packagesWithLocations = getDirectories(packagesRoot).map(location => {
  return {
    package: getPackageCIConfig(location).name,
    location: path.relative(process.cwd(), location)
  };
});

// Write all packages locations to `scripts/.PACKAGES` relative to root directory
// in format: package-name=location
exec(`bash touch scripts/.PACKAGES`, (err, stdout, stderr) => {
  packagesWithLocations.forEach(data => {
    exec(
      `echo ${data.package}=${data.location}>>scripts/.PACKAGES`,
      (err, stdout, stderr) => {
        if (err) {
          console.log(stderr);
          throw err;
        }
      }
    );
  });
});
