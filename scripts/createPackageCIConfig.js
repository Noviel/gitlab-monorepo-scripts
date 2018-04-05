#!/usr/bin/env node
// Auto generation of CI config for a package
// Should be executed on precommit to generate CI file

const { getDependencyPackages } = require('./helpers');

function getEnvironmentUrl(config, stage) {
  if (config.heroku) {
    return `${config.heroku[stage]}.herokuapp.com`;
  }

  return 'example.com';
}

function getTag(stage) {
  switch (stage) {
    case 'production':
      return 'prod';
    default:
      return stage;
  }
}

/*
  Decides which branch names is related to the package, i.e. which branches
  will trigger CI for the package. In combination with `yarn up` for a dependency
  this will guarantee that CI jobs will be launched for every dependant package.

  If we push new `auth-some-changes` branch - any packages that depends on `auth`
  should run corresponding CI jobs.
*/
function createOnlyYAML({ name, branchPrefix }, { stage = '' }) {
  const deps = getDependencyPackages(name)
    .map(d => `    - /^${d.prefix}-.*$/`)
    .join('\n');

  let result = '';

  const stagingBranches =
    `    - dev\n` +
    `    - /^root-.*$/\n` +
    `    - /^${branchPrefix}-.*$/\n` +
    `    - /^release-.*$/\n`;

  const prodBranch = '    - master\n';

  if (stage === '') {
    result += `.only-${name}-ci: &only-${name}-ci\n`;
    result += '  only:\n';
    result += prodBranch + stagingBranches;
  } else if (stage === 'staging') {
    result += `.only-${name}-${stage}-ci: &only-${name}-${stage}-ci\n`;
    result += '  only:\n';
    result += stagingBranches;
  }
  result += deps;
  if (deps) {
    result += '\n';
  }
  return result;
}

function createTestYAML({ name, branchPrefix }) {
  const deps = getDependencyPackages(name)
    .map(d => `    - /^${d.prefix}-.*$/`)
    .join('\n');

  return `test ${name}:
  stage:
    test
  script:
    - scripts/run_if_changed.sh package/test.sh ${name}
  only:
    - /^${branchPrefix}-.*$/
${deps ? deps + '\n' : ''}`;
}

const getVariablesStringForJobStage = (vars, job, stage) => {
  let result = '';
  if (vars[job][stage]) {
    Object.keys(vars[job][stage]).forEach(key => {
      result += `    ${key}: ${vars[job][stage][key]}\n`;
    });
  }
  return result;
};

function createBuildYAML(
  {
    name,
    toolchain = 'nodejs',
    artifacts = [],
    artifactsPath = 'package',
    pre = false,
    pages = false,
    variables = {},
  },
  { stage = 'staging' }
) {
  const artifactsPrefix = artifactsPath === 'package' ? '$PROJECT_ROOT/' : '';

  let stageVars = '';
  if (variables.build) {
    stageVars += getVariablesStringForJobStage(variables, 'build', '*');
    // include * variables for every stage except *, because
    // them was already included in the line above
    if (stage !== '*') {
      stageVars += getVariablesStringForJobStage(variables, 'build', stage);
    }
  }

  const only =
    stage === '*'
      ? `  <<: *only-${name}-ci\n`
      : stage === 'production'
        ? `  <<: *only-production-ci\n`
        : `  <<: *only-${name}-${stage}-ci\n`;

  return (
    `build ${stage !== '*' ? `${stage} ` : ''}${name}:\n` +
    (toolchain === 'rust' ? '  <<: *rust\n' : '') +
    only +
    `  variables:\n` +
    `    PROJECT_ROOT: packages/${name}\n` +
    stageVars +
    (pages && pages[stage] ? `    STATIC_URL: ${pages[stage]}\n` : '') +
    `  stage:\n` +
    `    ${pre ? 'pre' : ''}build\n` +
    `  script:\n` +
    `    - scripts/run_if_changed.sh package/build.sh ${name} ${toolchain}\n` +
    `  artifacts:\n` +
    `    paths:\n` +
    artifacts.map(a => `      - ${artifactsPrefix}${a}`).join('\n') +
    '\n'
  );
}

function createContainerYAML({ name, build }, { stage = 'staging' }) {
  return `container ${stage} ${name}:
  <<: *docker-${stage === 'production' ? 'prod' : 'dev'}
  stage:
    container
  script:
    - scripts/run_if_changed.sh package/cp_gitlab.sh ${name} ${getTag(stage)}
  dependencies:
    - prepare
    - build ${build === 'separate' ? `${stage} ` : ''}${name}
`;
}

function createDeployYAML(config, { stage = 'staging' }) {
  const { name, build, deploy } = config;
  const url = getEnvironmentUrl(config, stage);

  if (stage === '*') {
    throw new Error(
      'Universal stage is not allowed in `deploy` job. Use `staging` or `production` stage.'
    );
  }

  let script = '';
  if (deploy === true) {
    script += `    - scripts/run_if_changed.sh package/cp_heroku.sh ${name} ${getTag(
      stage
    )} ${config.heroku[stage]}/web\n`;
  } else if (deploy === 'firebase') {
    script += `    - scripts/run_if_changed.sh package/deploy_firebase.sh ${name} ${stage}\n`;
  }

  const includes =
    deploy === true
      ? `  <<: *docker-${stage === 'production' ? 'prod' : 'dev'}\n`
      : `  <<: *only-${stage}-ci\n`;

  return (
    `${stage} ${name}:\n` +
    includes +
    `  stage:\n` +
    `    ${stage}\n` +
    `  environment:\n` +
    `    name: ${stage}${url ? `\n    url: ${url}` : ''}\n` +
    `  script:\n` +
    script +
    `  dependencies:\n` +
    `    - prepare\n` +
    `    - build ${build === 'separate' ? `${stage} ` : ''}${name}\n`
  );
}

function createPagesYAML(config, { stage = 'staging' }) {
  const { name, build } = config;
  return `pages:
  stage:
    ${stage}
  variables:
    PROJECT_ROOT: packages/${name}
  script:
    - echo 'Creating Gitlab Pages...'
  dependencies:
    - prepare
    - build ${build === 'separate' ? `${stage} ` : ''}${name}
  artifacts:
    paths:
      - public
  only:
    - dev
    - master
`;
}

function createPackageCIConfig(data) {
  const { deploy, build, ci = true, test, pages } = data;

  if (!ci) {
    console.log(`CI is disabled for ${data.name} package.`);
    return '';
  }

  let buildData = [];

  if (build) {
    if (build === 'separate') {
      buildData = []
        .concat(createBuildYAML(data, { stage: 'staging' }))
        .concat(createBuildYAML(data, { stage: 'production' }));
    } else {
      buildData = [createBuildYAML(data, { stage: '*' })];
    }
  }

  const container = deploy === true;

  const result = [
    `\n${'#'.repeat(32)}\n# ${data.name} package\n`,
    createOnlyYAML(data, { stage: 'staging' }),
    createOnlyYAML(data, { stage: '' }),
  ]
    .concat(test ? createTestYAML(data) : [])
    .concat(buildData)
    .concat(container ? createContainerYAML(data, { stage: 'staging' }) : [])
    .concat(container ? createContainerYAML(data, { stage: 'production' }) : [])
    .concat(deploy ? createDeployYAML(data, { stage: 'staging' }) : [])
    .concat(deploy ? createDeployYAML(data, { stage: 'production' }) : [])
    .concat(pages ? createPagesYAML(data, { stage: 'staging' }) : []);

  return result.join('\n');
}

module.exports = createPackageCIConfig;
