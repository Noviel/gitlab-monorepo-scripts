const { exec } = require("child_process");

const { getDirectories, getPackageCIConfig } = require("./helpers");

const { packagesRoot } = require("../monorepo.json");

const packagesData = getDirectories(packagesRoot).map(getPackageCIConfig);

exec(`bash touch scripts/.DIRTY`, (err, stdout, stderr) => {
  packagesData.forEach(pkg => {
    exec(`scripts/mark_if_changed.sh ${pkg.name}`, (err, stdout, stderr) => {
      if (err) {
        console.log(stderr);
      }
      console.log(stdout);
    });
  });
});
