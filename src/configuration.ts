import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

const YAML_CONFIG_FILENAME = 'config.yml';
// const filePath = `${__dirname}/../../config/${YAML_CONFIG_FILENAME}`;
const filePath = join(__dirname, '../config', YAML_CONFIG_FILENAME);

const configFile = readFileSync(filePath, 'utf8');
const config = yaml.load(configFile) as Record<string, any>;

export default () => {
  return config;
};
