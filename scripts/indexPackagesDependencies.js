const { writeFileSync } = require('fs');

const {
  getDirectories,
  getPackageCIConfig,
  getDependencyPackages,
} = require('./helpers');

const { packagesRoot } = require('../monorepo.json');

const packagesData = getDirectories(packagesRoot).map(getPackageCIConfig);

// write dependencies of a packages
writeFileSync(
  './scripts/.DEPENDENCIES',
  packagesData
    .map(
      pd =>
        `${pd.name}=${getDependencyPackages(pd.name)
          .map(d => d.prefix)
          .join(' ')}`
    )
    .join('\n') + '\n'
);
