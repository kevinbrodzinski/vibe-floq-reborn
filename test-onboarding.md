# 🧪 Onboarding Flow Testing Guide

## **Quick Test Access**

### **Option 1: Built-in Test Suite (Development)**
1. Start the dev server: `npm run dev`
2. Navigate to: `http://localhost:8080/test/onboarding`
3. Run automated tests with the "Run All Tests" button

### **Option 2: Manual Testing**
Follow the scenarios below to test the complete flow.

---

## **🎯 Critical Test Scenarios**

### **1. New User Complete Flow**
```bash
# Goal: Test the full signup → onboarding → app flow

Steps:
1. Clear browser data (or use incognito)
2. Visit http://localhost:8080
3. See splash screen → dismiss
4. See AuthScreen → click "Sign Up"
5. Enter email/password → submit
6. Check email for verification link → click
7. Return to app → should start onboarding
8. Complete all 6 steps:
   - Welcome → Next
   - Vibe Selection → Pick a vibe → Next
   - Profile Setup → Enter username/display name → Next
   - Avatar Selection → Choose/upload avatar → Next
   - Features Overview → Next
   - Completion → Done

Expected: Land on main app, onboarding never shows again
```

### **2. Onboarding Dropout & Recovery**
```bash
# Goal: Test progress persistence and recovery

Steps:
1. Start onboarding (get to step 3-4)
2. Close browser/tab
3. Return to app
4. Should resume at the same step with data intact

Expected: Progress preserved, can continue from where left off
```

### **3. Username Enforcement**
```bash
# Goal: Test username requirement

Steps:
1. Get to Profile Setup step
2. Try to proceed without entering username
3. Try invalid usernames (spaces, special chars)
4. Enter valid username

Expected: Cannot proceed without valid username
```

### **4. Database Consistency**
```bash
# Goal: Test single source of truth

Steps:
1. Complete onboarding
2. Check database tables:
   - user_onboarding_progress.completed_at should be set
   - user_preferences.onboarding_version should be 'v2'
3. Refresh page multiple times

Expected: Never shows onboarding again, consistent state
```

---

## **🔧 Testing Commands**

### **Reset User State (for testing)**
```javascript
// Run in browser console to reset onboarding
await supabase.from('user_onboarding_progress').delete().eq('profile_id', user.id);
await supabase.from('user_preferences').update({onboarding_version: null}).eq('profile_id', user.id);
localStorage.clear();
location.reload();
```

### **Check Current State**
```javascript
// Run in browser console to check state
console.log('User:', user);
console.log('Onboarding Status:', await supabase.from('user_onboarding_progress').select('*').eq('profile_id', user.id));
console.log('Preferences:', await supabase.from('user_preferences').select('*').eq('profile_id', user.id));
```

---

## **⚡ Quick Validation Checklist**

- [ ] **Auth Flow**: Signup/signin works
- [ ] **Splash Screen**: Shows once for new users
- [ ] **Onboarding Trigger**: Shows for new authenticated users
- [ ] **Step Navigation**: Can go forward/backward
- [ ] **Progress Persistence**: Survives page refresh
- [ ] **Username Validation**: Enforces valid usernames
- [ ] **Completion**: Marks complete in database
- [ ] **No Repeat**: Never shows onboarding again
- [ ] **Shared Routes**: Bypasses auth/onboarding for `/share/` URLs
- [ ] **Error Handling**: Graceful failure recovery

---

## **🐛 Common Issues to Watch For**

1. **Version Mismatch**: Check console for version conflicts
2. **Multiple Completions**: Onboarding showing after completion
3. **Progress Loss**: Steps resetting unexpectedly
4. **Database Errors**: Check network tab for failed requests
5. **Route Conflicts**: Shared plan access issues

---

## **💡 Pro Tips**

- **Use incognito mode** for clean new user testing
- **Check browser console** for debug logs
- **Monitor network tab** for database calls
- **Test on mobile** for responsive behavior
- **Try slow connections** to test loading states