# 🚀 Floq Local Development Setup

## Quick Start (TL;DR)
```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Configure your Supabase credentials (see below)
# Edit .env.local with your Supabase project details

# 4. Start development server
npm run dev

# 🎉 App will be available at: http://localhost:8080
```

---

## 📋 Detailed Setup Instructions

### **1. Environment Setup**

Your app requires several environment variables. Create a `.env.local` file:

```bash
# Copy the example file
cp .env.example .env.local
```

Then edit `.env.local` with your configuration:

```bash
# === SUPABASE CONFIGURATION ===
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Server-side only (never expose to client)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# === API KEYS ===
GOOGLE_PLACES_API_KEY=your_google_places_key
FOURSQUARE_API_KEY=your_foursquare_key

# === SECURITY SECRETS ===
SYNC_VENUES_SECRET=generate_32_char_random_string
TRAIN_USER_MODEL_SECRET=generate_32_char_random_string

# === OPTIONAL AI FEATURES ===
OPENAI_API_KEY=sk-your_openai_key_here
```

### **2. Install Dependencies**

The project uses npm with specific optimizations:

```bash
# Install all dependencies
npm install

# If you encounter issues, try:
npm ci  # Clean install from package-lock.json
```

### **3. Start Development Server**

```bash
# Start the development server
npm run dev

# Alternative commands:
npm run lovable:dev    # Same as npm run dev
```

**🎉 Your app will be available at:** `http://localhost:8080`

---

## 🔧 **Development Configuration**

### **Port Configuration**
- **Default Port**: 8080 (configured in `vite.config.ts`)
- **Host**: 0.0.0.0 (allows external access)
- **HMR**: Enabled for hot reloading

### **Available Scripts**
```bash
npm run dev              # Start development server (port 8080)
npm run build            # Build for production
npm run preview          # Preview production build
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint code linting
npm test                 # Run tests with coverage
```

### **Development Features Enabled**
- ✅ Hot Module Replacement (HMR)
- ✅ TypeScript support
- ✅ React Fast Refresh
- ✅ Tailwind CSS with live reload
- ✅ shadcn/ui components
- ✅ Real-time Supabase integration
- ✅ Mapbox GL JS for maps
- ✅ Component tagging for development

---

## 🗄️ **Database Setup**

### **Supabase Configuration**

1. **Create a Supabase project** at https://supabase.com
2. **Get your credentials** from Project Settings > API
3. **Set up your database** using the migrations in `/supabase/migrations/`

### **Running Migrations (Optional)**
If you have Supabase CLI installed:

```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Link to your project
supabase link --project-ref your-project-id

# Apply migrations
supabase db push
```

---

## 🎯 **Troubleshooting**

### **Common Issues**

**Port 8080 already in use:**
```bash
# Kill process on port 8080
lsof -ti:8080 | xargs kill -9

# Or use a different port
VITE_PORT=3000 npm run dev
```

**Environment variables not loading:**
```bash
# Ensure .env.local exists and has correct format
cat .env.local

# Restart development server after changes
```

**Supabase connection issues:**
```bash
# Verify your Supabase URL and keys
curl -H "apikey: YOUR_ANON_KEY" "YOUR_SUPABASE_URL/rest/v1/"
```

**TypeScript errors:**
```bash
# Run type checking
npm run typecheck

# Clear TypeScript cache
rm -rf node_modules/.cache
```

### **Performance Optimization**

The app includes several performance optimizations:
- **Code splitting**: Automatic chunk splitting for faster loading
- **Bundle analysis**: Manual chunks for vendor libraries
- **Tree shaking**: Dead code elimination
- **CSS optimization**: Tailwind purging unused styles

---

## 🏗️ **Architecture Overview**

### **Tech Stack**
- **Frontend**: React 18 + Vite + TypeScript
- **UI**: Tailwind CSS + shadcn/ui + Radix UI
- **State**: TanStack Query + Zustand
- **Database**: Supabase (PostgreSQL + Realtime)
- **Maps**: Mapbox GL JS
- **Build**: Vite with optimized chunking

### **Key Features**
- 🗺️ **Real-time location sharing**
- 💬 **Messaging system** with reactions
- 📅 **Collaborative planning** with drag-and-drop
- 🎯 **AI-powered recommendations**
- 📱 **Mobile-first responsive design**
- ⚡ **Real-time updates** via Supabase

---

## 📱 **Mobile Development**

For mobile development with Capacitor:

```bash
# Build for mobile
npm run build

# iOS development
npx cap add ios
npx cap run ios

# Android development  
npx cap add android
npx cap run android
```

---

## 🚀 **Ready to Develop!**

Once you've completed the setup:

1. **Visit**: `http://localhost:8080`
2. **Sign up/Login** with your Supabase auth
3. **Start exploring** the real-time features
4. **Check the console** for any configuration issues

**Happy coding! 🎉**

---

*For questions or issues, check the project documentation in `/docs/` or the troubleshooting section above.*