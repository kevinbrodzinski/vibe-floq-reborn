# Floq - Real-time Location-based Social App

## Environment Variables Setup

### Required Environment Variables

The following environment variables must be set for the AI recommendation system to function properly:

#### Core Supabase Configuration
```bash
# Supabase Configuration (Required)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Server-side only
SUPABASE_ANON_KEY=your_anon_key                  # Client-side

# Security Secrets (Required - Rotate Quarterly)
SYNC_VENUES_SECRET=your_secure_random_string     # Gates sync_venues function
TRAIN_USER_MODEL_SECRET=your_secure_random_string # Gates train_user_model + on_interaction

# External API Keys (Required)
GOOGLE_PLACES_API_KEY=your_google_places_key
FOURSQUARE_API_KEY=your_foursquare_api_key

# AI/LLM Configuration (Optional)
OPENAI_API_KEY=your_openai_key                   # For LLM re-ranking and embeddings
```

#### Setting Environment Variables

**For Supabase Edge Functions:**
```bash
supabase secrets set \
  SYNC_VENUES_SECRET='generate_32_char_random_string' \
  TRAIN_USER_MODEL_SECRET='generate_32_char_random_string' \
  SUPABASE_URL='https://your-project.supabase.co' \
  SUPABASE_SERVICE_ROLE_KEY='eyJ...' \
  SUPABASE_ANON_KEY='eyJ...' \
  GOOGLE_PLACES_API_KEY='AIza...' \
  FOURSQUARE_API_KEY='fsq_...' \
  OPENAI_API_KEY='sk-...'
```

**For Local Development (.env.local):**
```bash
# Client-side
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Server-side (never expose to client)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SYNC_VENUES_SECRET=your_secure_secret
TRAIN_USER_MODEL_SECRET=your_secure_secret
GOOGLE_PLACES_API_KEY=AIza...
FOURSQUARE_API_KEY=fsq_...
OPENAI_API_KEY=sk-...
```

### Environment Variable Validation

Add this validation script to check your environment setup:

```bash
#!/bin/bash
# validate-env.sh - Run this to validate your environment setup

echo "🔍 Validating Environment Variables..."

# Required variables
REQUIRED_VARS=(
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY" 
  "SUPABASE_ANON_KEY"
  "SYNC_VENUES_SECRET"
  "TRAIN_USER_MODEL_SECRET"
  "GOOGLE_PLACES_API_KEY"
  "FOURSQUARE_API_KEY"
)

# Optional variables
OPTIONAL_VARS=(
  "OPENAI_API_KEY"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var}" ]]; then
    MISSING_VARS+=("$var")
  else
    echo "✅ $var is set"
  fi
done

for var in "${OPTIONAL_VARS[@]}"; do
  if [[ -z "${!var}" ]]; then
    echo "⚠️  $var is not set (optional - LLM features disabled)"
  else
    echo "✅ $var is set"
  fi
done

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
  echo "❌ Missing required environment variables:"
  printf '   - %s\n' "${MISSING_VARS[@]}"
  echo ""
  echo "Please set these variables before running the application."
  exit 1
else
  echo ""
  echo "🎉 All required environment variables are set!"
  echo ""
  echo "Quick health check commands:"
  echo "curl -sS \$SUPABASE_URL/functions/v1/sync_venues -X POST -d '{}' | jq"
  echo "curl -sS \$SUPABASE_URL/functions/v1/recommend -X POST -d '{}' | jq"
fi
```

### Security Best Practices

1. **Secret Rotation**: Rotate `SYNC_VENUES_SECRET` and `TRAIN_USER_MODEL_SECRET` quarterly or on security incidents
2. **Key Separation**: Never expose service role keys or secrets to client-side code
3. **API Quotas**: Monitor API usage for Google Places, Foursquare, and OpenAI to avoid unexpected charges
4. **Access Control**: Use Supabase RLS policies to ensure data access is properly restricted

### Health Checks

After setting environment variables, run these commands to verify everything is working:

```bash
# Test Edge Function deployment
curl -sS $SUPABASE_URL/functions/v1/sync_venues -X POST -d '{}' | jq
# Expected: 401 Unauthorized (proves function is deployed and secret-gated)

# Test dry-run sync
curl -sS $SUPABASE_URL/functions/v1/sync_venues \
  -H "x-sync-secret: $SYNC_VENUES_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"lat":34.0522,"lng":-118.2437,"radius_m":2500,"limit":20,"dry_run":true,"density":"urban"}' \
  | jq '.counts,.run_id'

# Test recommendation endpoint
curl -sS $SUPABASE_URL/functions/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"profile_id":"test","lat":34.0522,"lng":-118.2437}' \
  | jq
```

## Installation

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

## Production Deployment

Ensure all environment variables are properly configured in your production environment before deploying.

# Supabase CLI

[![Coverage Status](https://coveralls.io/repos/github/supabase/cli/badge.svg?branch=main)](https://coveralls.io/github/supabase/cli?branch=main) [![Bitbucket Pipelines](https://img.shields.io/bitbucket/pipelines/supabase-cli/setup-cli/master?style=flat-square&label=Bitbucket%20Canary)](https://bitbucket.org/supabase-cli/setup-cli/pipelines) [![Gitlab Pipeline Status](https://img.shields.io/gitlab/pipeline-status/sweatybridge%2Fsetup-cli?label=Gitlab%20Canary)
](https://gitlab.com/sweatybridge/setup-cli/-/pipelines)

[Supabase](https://supabase.io) is an open source Firebase alternative. We're building the features of Firebase using enterprise-grade open source tools.

This repository contains all the functionality for Supabase CLI.

- [x] Running Supabase locally
- [x] Managing database migrations
- [x] Creating and deploying Supabase Functions
- [x] Generating types directly from your database schema
- [x] Making authenticated HTTP requests to [Management API](https://supabase.com/docs/reference/api/introduction)

## Getting started

### Install the CLI

Available via [NPM](https://www.npmjs.com) as dev dependency. To install:

```bash
npm i supabase --save-dev
```

To install the beta release channel:

```bash
npm i supabase@beta --save-dev
```

When installing with yarn 4, you need to disable experimental fetch with the following nodejs config.

```
NODE_OPTIONS=--no-experimental-fetch yarn add supabase
```

> **Note**
For Bun versions below v1.0.17, you must add `supabase` as a [trusted dependency](https://bun.sh/guides/install/trusted) before running `bun add -D supabase`.

<details>
  <summary><b>macOS</b></summary>

  Available via [Homebrew](https://brew.sh). To install:

  ```sh
  brew install supabase/tap/supabase
  ```

  To install the beta release channel:
  
  ```sh
  brew install supabase/tap/supabase-beta
  brew link --overwrite supabase-beta
  ```
  
  To upgrade:

  ```sh
  brew upgrade supabase
  ```
</details>

<details>
  <summary><b>Windows</b></summary>

  Available via [Scoop](https://scoop.sh). To install:

  ```powershell
  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
  scoop install supabase
  ```

  To upgrade:

  ```powershell
  scoop update supabase
  ```
</details>

<details>
  <summary><b>Linux</b></summary>

  Available via [Homebrew](https://brew.sh) and Linux packages.

  #### via Homebrew

  To install:

  ```sh
  brew install supabase/tap/supabase
  ```

  To upgrade:

  ```sh
  brew upgrade supabase
  ```

  #### via Linux packages

  Linux packages are provided in [Releases](https://github.com/supabase/cli/releases). To install, download the `.apk`/`.deb`/`.rpm`/`.pkg.tar.zst` file depending on your package manager and run the respective commands.

  ```sh
  sudo apk add --allow-untrusted <...>.apk
  ```

  ```sh
  sudo dpkg -i <...>.deb
  ```

  ```sh
  sudo rpm -i <...>.rpm
  ```

  ```sh
  sudo pacman -U <...>.pkg.tar.zst
  ```
</details>

<details>
  <summary><b>Other Platforms</b></summary>

  You can also install the CLI via [go modules](https://go.dev/ref/mod#go-install) without the help of package managers.

  ```sh
  go install github.com/supabase/cli@latest
  ```

  Add a symlink to the binary in `$PATH` for easier access:

  ```sh
  ln -s "$(go env GOPATH)/bin/cli" /usr/bin/supabase
  ```

  This works on other non-standard Linux distros.
</details>

<details>
  <summary><b>Community Maintained Packages</b></summary>

  Available via [pkgx](https://pkgx.sh/). Package script [here](https://github.com/pkgxdev/pantry/blob/main/projects/supabase.com/cli/package.yml).
  To install in your working directory:

  ```bash
  pkgx install supabase
  ```

  Available via [Nixpkgs](https://nixos.org/). Package script [here](https://github.com/NixOS/nixpkgs/blob/master/pkgs/development/tools/supabase-cli/default.nix).
</details>

### Run the CLI

```bash
supabase bootstrap
```

Or using npx:

```bash
npx supabase bootstrap
```

The bootstrap command will guide you through the process of setting up a Supabase project using one of the [starter](https://github.com/supabase-community/supabase-samples/blob/main/samples.json) templates.

## Docs

Command & config reference can be found [here](https://supabase.com/docs/reference/cli/about).

## Breaking changes

We follow semantic versioning for changes that directly impact CLI commands, flags, and configurations.

However, due to dependencies on other service images, we cannot guarantee that schema migrations, seed.sql, and generated types will always work for the same CLI major version. If you need such guarantees, we encourage you to pin a specific version of CLI in package.json.

## Developing

To run from source:

```sh
# Go >= 1.22
go run . help
```
