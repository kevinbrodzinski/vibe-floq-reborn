
#!/bin/bash

# cleanup_unused_types_and_sql.sh
# 🚮 Scan and print unused types, SQL RPCs, and shared functions

ROOT="$(git rev-parse --show-toplevel)"

# 1. 🧹 UNUSED TYPE DEFINITIONS

echo "\n🔍 Checking unused exported types in /types..."
find "$ROOT/types" -type f -name "*.ts" 2>/dev/null | while read -r file; do
  if [ -f "$file" ]; then
    grep -E "^export (type|interface) " "$file" 2>/dev/null | while read -r line; do
      name=$(echo "$line" | awk '{print $3}' | sed 's/;//')
      usage=$(grep -r "\b$name\b" "$ROOT/src" "$ROOT/packages" 2>/dev/null | wc -l)
      if [ "$usage" -le 1 ]; then
        echo "🗑 Likely unused: $name in $file"
      fi
    done
  fi
done

# 2. 🧹 UNUSED SQL RPC DEFINITIONS

echo "\n🔍 Checking unused SQL RPCs in /sql/rpc..."
if [ -d "$ROOT/sql/rpc" ]; then
  find "$ROOT/sql/rpc" -type f -name "*.sql" 2>/dev/null | while read -r file; do
    rpc_name=$(basename "$file" .sql)
    usage=$(grep -r "$rpc_name" "$ROOT/supabase/functions" "$ROOT/src" 2>/dev/null | wc -l)
    if [ "$usage" -eq 0 ]; then
      echo "🗑 Unused RPC: $rpc_name ($file)"
    fi
  done
fi

# 3. 🧹 UNUSED FUNCTIONS/HELPERS IN _shared

echo "\n🔍 Checking unused _shared edge helpers..."
if [ -d "$ROOT/supabase/functions/_shared" ]; then
  find "$ROOT/supabase/functions/_shared" -type f -name "*.ts" 2>/dev/null | while read -r file; do
    base=$(basename "$file" .ts)
    usage=$(grep -r "$base" "$ROOT/supabase/functions" 2>/dev/null | wc -l)
    if [ "$usage" -le 1 ]; then
      echo "🗑 Possibly unused: $base in $file"
    fi
  done
fi

# ✅ Done
echo "\n✅ Cleanup scan complete!"
