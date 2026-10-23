const fs = require('node:fs');
const path = require('node:path');

// Ensure root .env is loaded as the single source of truth
const rootEnvPath = fs.existsSync(path.resolve(__dirname, '..', '.env'))
  ? path.resolve(__dirname, '..', '.env')
  : path.resolve(process.cwd(), '.env');

if (fs.existsSync(rootEnvPath)) {
  const content = fs.readFileSync(rootEnvPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  });
}

const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    ...(projectId ? { eas: { ...config.extra?.eas, projectId } } : {}),
  },
});
