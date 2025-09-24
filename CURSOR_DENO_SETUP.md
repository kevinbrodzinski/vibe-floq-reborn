# Setting up Deno with Cursor IDE 🦕

## Quick Fix for "Could not resolve deno executable" Error

The error occurs because Deno is not installed or not in your PATH. Here's how to fix it:

## Option 1: Install Deno (Recommended)

### On macOS/Linux:
```bash
curl -fsSL https://deno.land/install.sh | sh
```

### On Windows (PowerShell):
```powershell
irm https://deno.land/install.ps1 | iex
```

### Using package managers:
```bash
# macOS with Homebrew
brew install deno

# Windows with Chocolatey
choco install deno

# Using npm (cross-platform)
npm install -g deno
```

### Add to PATH:
After installation, add Deno to your PATH:

**macOS/Linux:**
```bash
echo 'export PATH="$HOME/.deno/bin:$PATH"' >> ~/.bashrc
echo 'export PATH="$HOME/.deno/bin:$PATH"' >> ~/.zshrc
source ~/.bashrc  # or ~/.zshrc
```

**Windows:**
Add `%USERPROFILE%\.deno\bin` to your PATH environment variable.

## Option 2: Use pnpm Script (Quick Install)

```bash
pnpm deno:install
```

This will automatically install Deno for your platform.

## Option 3: Disable Deno in Cursor (Development Only)

If you only want to work on the frontend and don't need Deno features:

1. Open `.vscode/settings.json`
2. Set `"deno.enable": false`
3. Restart Cursor

## Verify Installation

```bash
deno --version
```

You should see output like:
```
deno 1.40.0 (release, x86_64-apple-darwin)
v8 12.0.267.8
typescript 5.3.3
```

## Cursor IDE Configuration

The project is configured to:
- **Enable Deno only for Supabase functions** (`./supabase/functions`)
- **Use TypeScript for the main app** (Node.js/Vite)
- **Provide cross-runtime compatibility** via `src/lib/deno-compat.ts`

## Development Workflow

### For Supabase Edge Functions (Deno):
```bash
pnpm deno:check    # Type check edge functions
pnpm deno:lint     # Lint edge functions
pnpm deno:fmt      # Format edge functions
```

### For Main App (Node.js/Vite):
```bash
pnpm dev           # Development server
pnpm build         # Production build
pnpm test          # Run tests
pnpm typecheck     # TypeScript check
```

### For Lovable.dev:
```bash
pnpm lovable:dev      # Development mode
pnpm lovable:build    # Production build
pnpm lovable:preview  # Preview build
```

## Why This Setup?

1. **Hybrid approach**: Use the best of both worlds
   - Node.js/Vite for frontend development (faster, better tooling)
   - Deno for edge functions (modern runtime, better security)

2. **Lovable.dev compatibility**: Works seamlessly in the preview environment

3. **iOS deployment ready**: Capacitor integration works with both runtimes

4. **Production scalability**: Edge functions run on Deno's global edge network

## Troubleshooting

### "deno command not found"
- Ensure Deno is installed and in your PATH
- Restart your terminal/Cursor after installation
- Try the pnpm script: `pnpm deno:install`

### Cursor still shows Deno errors
- Install the Deno extension: `denoland.vscode-deno`
- Restart Cursor after installing Deno
- Check `.vscode/settings.json` configuration

### TypeScript conflicts
- The project uses separate configurations for different parts
- Main app uses `tsconfig.json` (Node.js)
- Edge functions use `supabase/functions/deno.json` (Deno)

## Status: Ready for Development

Once Deno is installed, you'll have:
- ✅ Full Cursor IDE integration
- ✅ Proper TypeScript support for edge functions
- ✅ Lovable.dev compatibility
- ✅ iOS deployment readiness

**Your app is ready for development and iOS launch! 🚀**