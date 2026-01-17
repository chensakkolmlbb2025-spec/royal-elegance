# Sign Up Flow - Quick Visual Reference

## 🚀 The Complete Journey

```
USER ACTION                  COMPONENT                    SUPABASE/SERVER            RESULT
───────────────────────────────────────────────────────────────────────────────────────────

[Visits /auth/signup]
                        ┌──────────────────┐
                        │  SignUpPage      │
                        │  (/auth/signup)  │
                        └────────┬─────────┘
                                 │
                        Renders SignUpForm
                        ✓ Email field
                        ✓ Password field
                        ✓ Confirm password
                        ✓ Full name field
                        ✓ Terms checkbox

[Fills form + clicks Submit]
                        ┌──────────────────────┐
                        │  SignUpForm          │
                        │  handleSubmit()      │
                        └────────┬─────────────┘
                                 │
                        ✓ Validates form
                        ✓ Checks password rules
                        ✓ Confirms passwords match
                        ✓ Confirms terms accepted

[Submission valid]
                        ┌──────────────────────┐
                        │  Auth Helpers        │
                        │  authClient.signUp() │
                        └────────┬─────────────┘
                                 │
                                 ├────────────────────────────────────────→ Supabase Auth API
                                 │
                                 │                        ┌──────────────────────┐
                                 │                        │ Create auth.users    │
                                 │                        │ - Hash password      │
                                 │                        │ - Gen email token    │
                                 │                        │ - Send email         │
                                 │                        └──────────┬───────────┘
                                 │                                   │
                                 │                    Response: user (no session)
                                 │←─────────────────────────────────────
                        
[On success]
                        ┌──────────────────────────────┐
                        │ router.push(                 │
                        │   '/verify-email?email=...'  │
                        │ )                            │
                        └────────┬─────────────────────┘
                                 │
                    Redirect to email verification page

[User sees verify page]
                        ┌──────────────────────┐
                        │  VerifyEmail         │
                        │  Component           │
                        └────────┬─────────────┘
                                 │
                        Shows: "Check your email"
                        - Display email address
                        - Resend button
                        - Waiting spinner

[Component mounts]
                        ┌──────────────────────┐
                        │  startPolling()      │
                        │  Queries auth status │
                        │  Every 3 seconds     │
                        │  Max 2 min timeout   │
                        └────────┬─────────────┘
                                 │
                    + Subscribes to auth state changes


[User opens email]
                    ┌─────────────────────────┐
                    │ Clicks verification     │
                    │ link in inbox           │
                    │ (Sent by Supabase)      │
                    └────────┬────────────────┘
                             │
                    Opens: /auth/callback?code=...
                    Navigates to callback page

[Callback page mounts]
                        ┌──────────────────────────┐
                        │  AuthCallback            │
                        │  (/auth/callback)        │
                        └────────┬─────────────────┘
                                 │
                        ✓ Extract code from URL
                        ✓ Exchange code for session
                        ✓ Supabase creates session
                        ✓ User is now logged in

[Query user profile]
                        ┌──────────────────────────┐
                        │  SELECT role FROM        │
                        │  profiles WHERE          │
                        │  id = session.user.id    │
                        └────────┬─────────────────┘
                                 │
                    ✓ Get user's role
                    ✓ Default: 'user'

[Role-based redirect]
                        ┌──────────────────────────┐
                        │  IF role == 'admin'      │
                        │    → /admin              │
                        │  IF role == 'staff'      │
                        │    → /staff              │
                        │  ELSE                    │
                        │    → /home               │
                        └────────┬─────────────────┘
                                 │
                    ✅ User signed up & signed in!
                    ✅ Email verified
                    ✅ Session active
                    ✅ Redirected to dashboard
```

---

## 🔑 Key Components

### 1️⃣ SignUpForm Component
- **File**: `components/auth/signup-form.tsx`
- **Responsibility**: Collect user data, validate, submit
- **Key Function**: `handleSubmit()`
- **Validation**: Password strength + matching

### 2️⃣ Auth Helpers
- **File**: `lib/auth/helpers.ts`
- **Responsibility**: Supabase API calls
- **Key Function**: `authClient.signUp()`
- **Actions**: Create auth user, send email

### 3️⃣ Verify Email Component
- **File**: `components/auth/verify-email.tsx`
- **Responsibility**: Poll for email verification
- **Key Functions**: `startPolling()`, `handleResendEmail()`
- **Timeout**: 2 minutes max polling

### 4️⃣ Callback Page
- **File**: `app/auth/callback/page.tsx`
- **Responsibility**: Process verification, fetch profile, redirect
- **Key Function**: `handleCallback()`
- **Outcome**: Role-based routing

---

## ⏱️ Timeline

| Time | Action | Component |
|------|--------|-----------|
| 0s | User submits form | SignUpForm |
| 0-1s | Form validation | SignUpForm |
| 1s | API call to Supabase | authClient |
| 2s | Email sent by Supabase | Supabase |
| 3s | Redirect to verify page | SignUpForm |
| 5-60s | User opens email | User's Email |
| 61s | User clicks link | Email Link |
| 62s | Navigate to callback | Browser |
| 63s | Process callback | AuthCallback |
| 64s | Redirect to dashboard | AuthCallback |
| **65s** | **User logged in ✅** | **Dashboard** |

---

## 🔄 Data Flow

```
Frontend Input
    ↓
Local Validation
    ↓
API Call (Supabase Auth)
    ↓
User Created in Database
    ↓
Email Verification Sent
    ↓
Polling/Listener Waiting
    ↓
User Clicks Email Link
    ↓
Session Created
    ↓
Callback Page Processing
    ↓
Role Lookup
    ↓
Role-Based Redirect
    ↓
Dashboard (Authenticated) ✅
```

---

## 🛡️ Security Checkpoints

```
1. PASSWORD VALIDATION
   ✓ 8+ chars
   ✓ Uppercase
   ✓ Lowercase
   ✓ Numbers

2. EMAIL VERIFICATION REQUIRED
   ✓ Email confirmation token
   ✓ Link expires
   ✓ Session not created until verified

3. SESSION CREATION
   ✓ Only after email verified
   ✓ No session on initial signup

4. ROLE-BASED ACCESS
   ✓ Admin users → /admin
   ✓ Staff users → /staff
   ✓ Regular users → /home
```

---

## ❌ Error Scenarios

```
FORM VALIDATION FAILS
→ Show error alert
→ Stay on signup page
→ User can retry

SIGNUP API FAILS
→ "Email already registered" OR
→ "Password too weak" OR
→ "Network error"
→ Show error alert
→ Stay on signup page

EMAIL VERIFICATION FAILS
→ "Could not send email"
→ Show "Resend" button
→ User can retry

CALLBACK FAILS
→ "Authentication failed"
→ Redirect to /login
→ User must try again
```

---

## 📋 Checklist for User Sign-Up

- [ ] User fills email field
- [ ] User fills password field
- [ ] Password meets requirements (8+, upper, lower, number)
- [ ] User confirms password
- [ ] Passwords match
- [ ] User fills full name
- [ ] User accepts terms
- [ ] User clicks "Create Account"
- [ ] Form validates (all checks)
- [ ] API call successful (Supabase)
- [ ] User redirected to verify-email page
- [ ] User opens verification email
- [ ] User clicks email link
- [ ] Callback page processes
- [ ] User redirected to dashboard
- [ ] ✅ Sign-up complete!

---

## 🎯 What Happens Behind the Scenes

### Client-Side (Browser)
```javascript
// 1. Form submission
handleSubmit() {
  validate() → errors?
  authClient.signUp({email, password, fullName})
}

// 2. Email verification page
startPolling() → every 3s check auth status
onAuthStateChange() → listen for email_confirmed_at

// 3. Callback handling
exchange code → session
getUser() → session.user
query profiles → get role
redirect(path based on role)
```

### Server-Side (Supabase)
```sql
-- Create user in auth
INSERT INTO auth.users (email, encrypted_password, ...)
VALUES (...)

-- Store metadata
UPDATE auth.users 
SET user_metadata = jsonb_set(user_metadata, '{full_name}', ...)

-- Send email with link containing verification code
SEND EMAIL with link to /auth/callback?code=...

-- When user clicks link
SELECT * FROM auth.users WHERE verification_token = code
UPDATE auth.users SET email_confirmed_at = NOW()
```

---

**Status**: ✅ Quick Reference Complete  
**Last Updated**: 2024
