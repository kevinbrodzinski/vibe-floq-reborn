# Add this to your .env file for Vibe Phase 1 MVP:
VITE_VIBE_DETECTION=on

# This enables the production vibe engine that:
# - Runs every 60 seconds on-device
# - No permissions required (graceful degradation)
# - Updates gradients automatically via setUserVibeHex()
# - Persists snapshots for learning system

# Set to "off" to use legacy detection fallback