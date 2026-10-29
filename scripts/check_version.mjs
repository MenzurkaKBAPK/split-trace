import { readFile } from 'node:fs/promises';
const {version} = JSON.parse(await readFile('package.json','utf8'));
if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== 'v' + version) throw Error('Tag must match package.json version');
