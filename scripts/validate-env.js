#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * Validates all required environment variables for the Floq Social App
 */

const fs = require('fs');
const path = require('path');

// Required environment variables for different environments
const REQUIRED_VARS = {
  // Core Supabase Configuration
  SUPABASE_URL: {
    required: true,
    description: 'Supabase project URL',
    pattern: /^https:\/\/[a-z0-9-]+\.supabase\.co$/,
    example: 'https://your-project.supabase.co'
  },
  SUPABASE_ANON_KEY: {
    required: true,
    description: 'Supabase anonymous key for client-side',
    pattern: /^eyJ[A-Za-z0-9-_]+\./,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    required: true,
    description: 'Supabase service role key for server-side operations',
    pattern: /^eyJ[A-Za-z0-9-_]+\./,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    serverOnly: true
  },

  // Security Secrets
  SYNC_VENUES_SECRET: {
    required: true,
    description: 'Secret for sync_venues function access',
    minLength: 32,
    example: 'generate_32_char_random_string'
  },
  TRAIN_USER_MODEL_SECRET: {
    required: true,
    description: 'Secret for train_user_model function access',
    minLength: 32,
    example: 'generate_32_char_random_string'
  },

  // External API Keys
  GOOGLE_PLACES_API_KEY: {
    required: true,
    description: 'Google Places API key',
    pattern: /^AIza[A-Za-z0-9_-]+$/,
    example: 'AIzaSyBvOkBw...'
  },
  FOURSQUARE_API_KEY: {
    required: true,
    description: 'Foursquare API key',
    pattern: /^fsq_[A-Za-z0-9_-]+$/,
    example: 'fsq_abc123...'
  },

  // Optional AI Configuration
  OPENAI_API_KEY: {
    required: false,
    description: 'OpenAI API key for LLM features',
    pattern: /^sk-[A-Za-z0-9]+$/,
    example: 'sk-abc123...'
  },

  // Client-side Environment Variables
  VITE_SUPABASE_URL: {
    required: true,
    description: 'Client-side Supabase URL (should match SUPABASE_URL)',
    clientOnly: true
  },
  VITE_SUPABASE_ANON_KEY: {
    required: true,
    description: 'Client-side Supabase anon key (should match SUPABASE_ANON_KEY)',
    clientOnly: true
  },

  // Lovable-specific Environment Variables
  LOVABLE: {
    required: false,
    description: 'Lovable environment flag',
    example: 'true'
  },
  NEXT_PUBLIC_HOSTED_PREVIEW: {
    required: false,
    description: 'Lovable hosted preview flag',
    example: 'true'
  }
};

function validateEnvironment() {
  console.log('🔍 Validating Environment Variables...\n');
  
  const missing = [];
  const invalid = [];
  const warnings = [];
  
  // Check if we're in Lovable environment
  const isLovable = process.env.LOVABLE === 'true' || 
                   process.env.NEXT_PUBLIC_HOSTED_PREVIEW === 'true' ||
                   process.env.HOST?.includes('lovableproject.com');
  
  // Check if we're in a client-side context
  const isClientSide = process.env.NODE_ENV === 'development' || 
                      process.argv.includes('--client') ||
                      process.env.VITE_SUPABASE_URL ||
                      isLovable;

  for (const [varName, config] of Object.entries(REQUIRED_VARS)) {
    const value = process.env[varName];
    
    // Skip server-only vars in client context (including Lovable)
    if (isClientSide && config.serverOnly) {
      continue;
    }
    
    // Skip client-only vars in server context
    if (!isClientSide && config.clientOnly) {
      continue;
    }
    
    // Skip optional vars in Lovable environment
    if (isLovable && !config.required && !value) {
      continue;
    }
    
    if (config.required && !value) {
      missing.push({ name: varName, config });
      continue;
    }
    
    if (value) {
      // Validate pattern if specified
      if (config.pattern && !config.pattern.test(value)) {
        invalid.push({ name: varName, value, config });
        continue;
      }
      
      // Validate minimum length if specified
      if (config.minLength && value.length < config.minLength) {
        invalid.push({ 
          name: varName, 
          value: `${value.substring(0, 10)}...`, 
          config,
          issue: `Too short (minimum ${config.minLength} characters)`
        });
        continue;
      }
      
      console.log(`✅ ${varName} is set`);
    } else if (!config.required) {
      warnings.push({ name: varName, config });
    }
  }
  
  // Check for client/server consistency
  if (!isClientSide) {
    if (process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
      if (process.env.SUPABASE_URL !== process.env.VITE_SUPABASE_URL) {
        warnings.push({
          name: 'SUPABASE_URL_MISMATCH',
          config: { description: 'SUPABASE_URL and VITE_SUPABASE_URL should match' }
        });
      }
    }
    
    if (process.env.SUPABASE_ANON_KEY && process.env.VITE_SUPABASE_ANON_KEY) {
      if (process.env.SUPABASE_ANON_KEY !== process.env.VITE_SUPABASE_ANON_KEY) {
        warnings.push({
          name: 'SUPABASE_ANON_KEY_MISMATCH',
          config: { description: 'SUPABASE_ANON_KEY and VITE_SUPABASE_ANON_KEY should match' }
        });
      }
    }
  }
  
  // Report results
  console.log('');
  
  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:');
    missing.forEach(({ name, config }) => {
      console.log(`   - ${name}: ${config.description}`);
      if (config.example) {
        console.log(`     Example: ${config.example}`);
      }
    });
    console.log('');
  }
  
  if (invalid.length > 0) {
    console.log('⚠️  Invalid environment variables:');
    invalid.forEach(({ name, value, config, issue }) => {
      console.log(`   - ${name}: ${issue || 'Invalid format'}`);
      console.log(`     Current: ${value}`);
      if (config.example) {
        console.log(`     Expected: ${config.example}`);
      }
    });
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(({ name, config }) => {
      console.log(`   - ${name}: ${config.description}`);
    });
    console.log('');
  }
  
  if (missing.length === 0 && invalid.length === 0) {
    console.log('🎉 All required environment variables are valid!');
    console.log('');
    
    // Show quick health check commands
    console.log('Quick health check commands:');
    if (!isClientSide) {
      console.log('curl -sS $SUPABASE_URL/functions/v1/sync_venues -X POST -d \'{}\' | jq');
      console.log('curl -sS $SUPABASE_URL/functions/v1/recommend -X POST -d \'{}\' | jq');
    } else {
      console.log('npm run dev');
      console.log('npm run build');
    }
    
    return true;
  }
  
  return false;
}

// Generate .env.example file
function generateEnvExample() {
  const exampleContent = Object.entries(REQUIRED_VARS)
    .map(([name, config]) => {
      let line = `# ${config.description}`;
      if (config.example) {
        line += `\n# Example: ${config.example}`;
      }
      if (!config.required) {
        line += '\n# Optional';
      }
      line += `\n${name}=`;
      return line;
    })
    .join('\n\n');
  
  fs.writeFileSync('.env.example', exampleContent);
  console.log('📝 Generated .env.example file');
}

// Main execution
if (require.main === module) {
  const isValid = validateEnvironment();
  
  if (process.argv.includes('--generate-example')) {
    generateEnvExample();
  }
  
  if (!isValid) {
    console.log('💡 Tips:');
    console.log('   - Copy .env.example to .env.local and fill in your values');
    console.log('   - Run with --generate-example to create .env.example');
    console.log('   - Run with --client to validate client-side variables only');
    process.exit(1);
  }
}

module.exports = { validateEnvironment, generateEnvExample, REQUIRED_VARS };
