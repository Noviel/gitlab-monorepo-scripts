const { writeFileSync, readFileSync } = require("fs");
const { resolve } = require("path");

const { getDirectories, getPackageCIConfig } = require("./helpers");

const createPackageCIConfig = require("./createPackageCIConfig");
const { packagesRoot, baseYAML } = require("../monorepo.json");

const baseConfig = readFileSync(resolve(__dirname, baseYAML), "utf8");
const packagesData = getDirectories(packagesRoot).map(getPackageCIConfig);

writeFileSync(
  "./.gitlab-ci.yml",
  packagesData.reduce(
    (acc, curr) => acc + createPackageCIConfig(curr),
    baseConfig
  )
);
