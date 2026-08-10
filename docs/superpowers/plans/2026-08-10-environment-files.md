# Environment Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add default, development, and production dotenv files and make Nest select the correct file without loading `config.yml`.

**Architecture:** Keep the existing `.env` values untouched. Add local-only `.env.dev` and `.env.prod` files, ignore both in Git, and configure `ConfigModule` to select them from `NODE_ENV`. Development may fall back to `.env`; production must not fall back to local credentials.

**Tech Stack:** NestJS 11, `@nestjs/config`, Joi, dotenv files

---

### Task 1: Create local environment files

**Files:**
- Preserve: `.env`
- Create: `.env.dev`
- Create: `.env.prod`
- Modify: `.gitignore`

- [ ] **Step 1: Create `.env.dev`**

```dotenv
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_DATABASE=nestjs_demo
```

- [ ] **Step 2: Create `.env.prod`**

```dotenv
NODE_ENV=production
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_DATABASE=
```

- [ ] **Step 3: Ignore the new credential files**

Add these entries to `.gitignore`:

```gitignore
.env.dev
.env.prod
```

- [ ] **Step 4: Verify the files exist and remain untracked**

Run:

```powershell
Get-ChildItem -Force .env* | Select-Object -ExpandProperty Name
git check-ignore .env .env.dev .env.prod
```

Expected: all three files are listed by both commands.

### Task 2: Load the environment-specific file

**Files:**
- Modify: `src/app.module.ts`

- [ ] **Step 1: Replace YAML loading with dotenv selection**

Use this `ConfigModule` configuration:

```ts
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath:
    process.env.NODE_ENV === 'production'
      ? '.env.prod'
      : process.env.NODE_ENV === 'development'
        ? ['.env.dev', '.env']
        : '.env',
  validationSchema: Joi.object({
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().default(3306),
    DB_USER: Joi.string().required(),
    DB_PASSWORD: Joi.string().allow('').required(),
    DB_DATABASE: Joi.string().required(),
  }),
})
```

Remove the `configuration` import and `load: [configuration]` option. Keep `UserModule` and `RangeModule` unchanged.

- [ ] **Step 2: Run the compile check**

Run:

```powershell
pnpm build
```

Expected: Nest completes the TypeScript build with exit code 0.

- [ ] **Step 3: Commit tracked configuration changes**

```powershell
git add .gitignore src/app.module.ts
git commit -m "chore: configure environment files"
```

The ignored `.env`, `.env.dev`, and `.env.prod` files intentionally remain outside Git.
