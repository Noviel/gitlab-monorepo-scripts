const { resolve, basename } = require('path');
const { appendFileSync, writeFileSync, lstatSync, readdirSync } = require('fs');

const {
  packagesRoot,
  packagesPrefix,
  packageCIConfig,
} = require('../monorepo.json');

const isObjectContain = (object, key) => object && object[key];

const isDirectory = source => lstatSync(source).isDirectory();

const rootDir = process.cwd();

const getDirectories = source =>
  readdirSync(resolve(rootDir, source))
    .map(name => resolve(rootDir, source, name))
    .filter(isDirectory);

const getPackageJSONPath = pkg =>
  resolve(rootDir, packagesRoot, pkg, 'package.json');

const getPackageJSONContent = pkg => require(getPackageJSONPath(pkg));

const getPackageCIConfig = pkg => {
  const CIConfig = require(resolve(
    rootDir,
    packagesRoot,
    pkg,
    packageCIConfig
  ));

  CIConfig.name = basename(pkg);

  return CIConfig;
};

const getDependencyPackages = pkg => {
  const json = getPackageJSONContent(pkg);
  const deps = [];
  if (json.dependencies) {
    for (const dep in json.dependencies) {
      deps.push(dep);
    }
  }
  if (json.devDependencies) {
    for (const dep in json.devDependencies) {
      deps.push(dep);
    }
  }

  return deps
    .filter(d => d.match(packagesPrefix))
    .map(d => d.replace(packagesPrefix + '/', ''))
    .reduce((acc, curr) => {
      const newDep = {
        package: curr,
        prefix: getPackageCIConfig(curr).branchPrefix,
      };
      // do not add duplicate dependencies
      for (const item of acc) {
        if (item['package'] === curr) {
          return acc;
        }
      }
      acc = acc.concat(newDep).concat(getDependencyPackages(curr));
      return acc;
    }, []);
};

const getDependantPackagesInfo = pkg =>
  getDirectories(packagesRoot)
    .map(getPackageJSONContent)
    .map(data => ({
      package: data.name.replace(packagesPrefix, ''),
      data,
      location: isObjectContain(data.dependencies, packagesPrefix + '/' + pkg)
        ? 'dependencies'
        : isObjectContain(data.devPependencies, packagesPrefix + '/' + pkg)
          ? 'devDependencies'
          : false,
    }))
    .filter(({ location }) => location);

const writeJSON = (filename, json) => {
  writeFileSync(filename, JSON.stringify(json, null, 2));
  appendFileSync(filename, '\n');
};

module.exports = {
  isDirectory,
  getDirectories,
  getPackageJSONPath,
  getPackageJSONContent,
  getPackageCIConfig,
  getDependantPackagesInfo,
  isObjectContain,
  writeJSON,
  getDependencyPackages,
};
