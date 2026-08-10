# Environment Files Design

## Goal

Use dotenv files for local, development, and production database settings without loading `config.yml`.

## Files

- `.env` provides the default local configuration and keeps the user's existing values.
- `.env.dev` provides development defaults.
- `.env.prod` provides production placeholders that must be replaced during deployment.

All three files remain ignored by Git because they may contain credentials.

## Loading

`ConfigModule.forRoot()` selects the file from `NODE_ENV`:

- `NODE_ENV=development` loads `.env.dev` first, then falls back to `.env`.
- `NODE_ENV=production` loads only `.env.prod`, preventing local credentials from being used in production.
- Any other value loads `.env`.

The existing YAML loader is removed from `AppModule`. Database environment variables are validated with Joi.

## Verification

Run the Nest build to verify that the configuration compiles. No database connection is added in this change.
