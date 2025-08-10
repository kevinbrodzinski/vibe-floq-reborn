#!/usr/bin/env node

/**
 * Quick onboarding testing helper
 * Run with: node scripts/test-onboarding.js
 */

console.log('🧪 Floq Onboarding Testing Helper\n');

console.log('📋 Testing Options:');
console.log('');
console.log('1. 🌐 Manual Testing:');
console.log('   npm run dev');
console.log('   → Open http://localhost:8080');
console.log('   → Use incognito mode for clean tests');
console.log('');
console.log('2. 🔧 Built-in Test Suite:');
console.log('   npm run dev');
console.log('   → Open http://localhost:8080/test/onboarding');
console.log('   → Click "Run All Tests" button');
console.log('');
console.log('3. 🧪 Unit Tests:');
console.log('   npm test');
console.log('');
console.log('4. 🔄 Reset User State (browser console):');
console.log('   await supabase.from("user_onboarding_progress").delete().eq("user_id", user.id);');
console.log('   await supabase.from("user_preferences").update({onboarding_version: null}).eq("profile_id", user.id);');
console.log('   localStorage.clear(); location.reload();');
console.log('');
console.log('5. 📊 Check State (browser console):');
console.log('   console.log("User:", user);');
console.log('   console.log("Onboarding:", await supabase.from("user_onboarding_progress").select("*").eq("user_id", user.id));');
console.log('');
console.log('📖 Full testing guide: ./test-onboarding.md');
console.log('');
console.log('🎯 Quick Test Checklist:');
console.log('   ✓ Signup/signin works');
console.log('   ✓ Onboarding shows for new users');
console.log('   ✓ Progress persists on refresh');
console.log('   ✓ Username validation works');
console.log('   ✓ Completion marks in database');
console.log('   ✓ Never shows again after completion');