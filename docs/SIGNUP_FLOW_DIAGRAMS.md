# Sign Up Flow - ASCII Diagrams & Flowcharts

## 📊 Complete Sign-Up Process Flow

```
START: User visits /auth/signup
│
├─→ [SignUpPage Component]
│   ├─ Displays benefits (left side)
│   └─ Embeds SignUpForm component (right side)
│
├─→ [User fills form]
│   ├─ Email: user@example.com
│   ├─ Password: SecurePass123!
│   ├─ Confirm: SecurePass123!
│   ├─ Full Name: John Doe
│   └─ Accepts terms: ✓
│
├─→ [SignUpForm validates]
│   ├─ Check: Terms accepted? ✓
│   ├─ Check: Password >= 8 chars? ✓
│   ├─ Check: Has uppercase? ✓
│   ├─ Check: Has lowercase? ✓
│   ├─ Check: Has number? ✓
│   ├─ Check: Passwords match? ✓
│   └─ Result: ✅ ALL VALID
│
├─→ [Call authClient.signUp()]
│   ├─ Create Supabase client
│   ├─ Send to: supabase.auth.signUp()
│   └─ Data sent:
│       ├─ email: user@example.com
│       ├─ password: SecurePass123!
│       └─ metadata: {full_name: "John Doe"}
│
├─→ [Supabase Backend Processing]
│   ├─ Validate email format: ✓
│   ├─ Check if email exists: ✗ (New user)
│   ├─ Validate password strength: ✓
│   ├─ Hash password: bcrypt(...)
│   ├─ Create auth.users row:
│   │  ├─ id: "550e8400-e29b-41d4-a716-446655440000"
│   │  ├─ email: "user@example.com"
│   │  ├─ encrypted_password: "$2a$..."
│   │  ├─ email_confirmed_at: null
│   │  └─ user_metadata: {full_name: "John Doe"}
│   ├─ Generate verification token: random_123abc...
│   ├─ Compose verification email:
│   │  ├─ Subject: "Verify your email"
│   │  ├─ Body: "Click link to confirm"
│   │  └─ Link: https://app.com/auth/callback?code=random_123abc...
│   ├─ Send email via SMTP
│   └─ Return response:
│       ├─ user: {id, email, email_confirmed_at: null, ...}
│       └─ session: null (NO SESSION YET!)
│
├─→ [Form catches success]
│   ├─ Set error: null
│   ├─ Set loading: false
│   └─ Redirect: router.push('/auth/verify-email?email=user@example.com')
│
├─→ [User sees verify-email page]
│   ├─ Mail icon displayed
│   ├─ Message: "Check your email"
│   ├─ Email shown: user@example.com
│   ├─ "Resend" button (60s cooldown)
│   └─ Spinner (polling active)
│
├─→ [VerifyEmail component mounts]
│   ├─ Query: supabase.auth.getUser()
│   ├─ Check: email_confirmed_at? null
│   ├─ Start: polling every 3 seconds
│   ├─ Subscribe: onAuthStateChange()
│   ├─ Setup: Cleanup on unmount
│   └─ Safety: Stop after 2 minutes
│
├─→ [Polling Loop - Every 3 seconds]
│   ├─ Query: SELECT * FROM auth.users WHERE id = user.id
│   ├─ Check: email_confirmed_at IS NULL
│   │   └─ Not verified yet, continue polling
│   │
│   └─ Check: email_confirmed_at IS NOT NULL
│       ├─ Email verified! ✅
│       ├─ Stop polling
│       ├─ Trigger redirect
│       └─ Navigate to /home
│
├─→ [Meanwhile: User checks email]
│   ├─ Opens inbox
│   ├─ Finds: "Verify your email"
│   └─ Clicks: verification link
│
├─→ [Browser navigates to callback]
│   └─ URL: https://app.com/auth/callback?code=random_123abc...
│
├─→ [Supabase processes verification link]
│   ├─ Extract: code = "random_123abc..."
│   ├─ Find: Token in database
│   ├─ Check: Token expired? NO
│   ├─ Update: auth.users SET email_confirmed_at = NOW()
│   ├─ Create: Session token (JWT)
│   ├─ Store: Session locally (browser)
│   ├─ Trigger: Auth state change event
│   └─ Redirect: /auth/callback (browser auto-redirects)
│
├─→ [VerifyEmail listener catches change]
│   ├─ Event: onAuthStateChange triggered
│   ├─ Get: session.user.email_confirmed_at
│   ├─ Check: NOT NULL
│   ├─ Set: verified = true
│   ├─ Stop: polling
│   └─ Navigate: /home
│
├─→ [AuthCallback page loads]
│   ├─ Check: URL error params? NO
│   ├─ Check: URL type='recovery'? NO
│   ├─ Query: getSession()
│   ├─ Result: Session exists ✓
│   ├─ Query: SELECT role FROM profiles WHERE id = user.id
│   ├─ Get: profile.role = "user"
│   ├─ Determine: Redirect destination
│   │  ├─ IF role = 'admin' → /admin
│   │  ├─ IF role = 'staff' → /staff
│   │  └─ ELSE → /home (default)
│   └─ Redirect: router.replace('/home')
│
├─→ [User sees home page]
│   ├─ Layout renders
│   ├─ Auth guard passes
│   ├─ Session exists ✓
│   ├─ Email verified ✓
│   ├─ Profile loaded ✓
│   └─ Dashboard displays
│
└─→ END: User logged in ✅
    └─ Email verified ✅
    └─ Account active ✅
```

---

## 🎯 Component Responsibility Map

```
┌─────────────────────────────────────────────────────────┐
│                    SIGN-UP ORCHESTRATION                │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ app/auth/signup/page.tsx                                │
│ "Signup Landing Page"                                  │
├──────────────────────────────────────────────────────────┤
│ Responsibility:                                        │
│ • Display beautiful signup UI                         │
│ • Show benefits on desktop (left side)               │
│ • Embed SignUpForm component                         │
│ • Handle routing                                      │
└──────────────────┬───────────────────────────────────────┘
                   │
                   │ imports & embeds
                   ▼
┌──────────────────────────────────────────────────────────┐
│ components/auth/signup-form.tsx                         │
│ "Form Submission & Validation"                         │
├──────────────────────────────────────────────────────────┤
│ Responsibility:                                        │
│ • Collect form inputs (email, password, name)        │
│ • Validate password strength                         │
│ • Validate form completeness                         │
│ • Call auth API                                       │
│ • Handle submission errors                           │
│ • Redirect on success                                │
└──────────────────┬───────────────────────────────────────┘
                   │
                   │ calls
                   ▼
┌──────────────────────────────────────────────────────────┐
│ lib/auth/helpers.ts (authClient.signUp())              │
│ "Auth API Wrapper"                                     │
├──────────────────────────────────────────────────────────┤
│ Responsibility:                                        │
│ • Create Supabase client                             │
│ • Call Supabase auth.signUp()                        │
│ • Handle API errors                                  │
│ • Return auth response                               │
└──────────────────┬───────────────────────────────────────┘
                   │
                   │ calls
                   ▼
        ┌──────────────────────────────┐
        │  SUPABASE AUTH (Backend)     │
        ├──────────────────────────────┤
        │ • Create user                │
        │ • Hash password              │
        │ • Generate email token       │
        │ • Send verification email    │
        │ • Return auth response       │
        └──────────────────────────────┘
                   │
                   │ on success
                   ▼
┌──────────────────────────────────────────────────────────┐
│ app/auth/verify-email/page.tsx                          │
│ "Email Verification Page"                              │
├──────────────────────────────────────────────────────────┤
│ Responsibility:                                        │
│ • Load VerifyEmail component                         │
│ • Pass email from URL param                          │
│ • Handle suspense/loading                            │
└──────────────────┬───────────────────────────────────────┘
                   │
                   │ embeds
                   ▼
┌──────────────────────────────────────────────────────────┐
│ components/auth/verify-email.tsx                        │
│ "Email Verification Handler"                           │
├──────────────────────────────────────────────────────────┤
│ Responsibility:                                        │
│ • Display "check email" UI                           │
│ • Start polling (every 3s)                           │
│ • Subscribe to auth state changes                    │
│ • Handle resend email                                │
│ • Stop polling on verification                       │
│ • Redirect on verification                           │
└──────────────────┬───────────────────────────────────────┘
         ┌─────────┴──────────┐
         │                    │
         │ checks             │ listens to
         │ every 3s           │ auth changes
         │                    │
         ▼                    ▼
    ┌─────────────────────────────────┐
    │  SUPABASE AUTH (Backend)        │
    ├─────────────────────────────────┤
    │ • User clicks email link        │
    │ • Code verification             │
    │ • Set email_confirmed_at        │
    │ • Create session                │
    │ • Emit auth state change        │
    └─────────────────────────────────┘
         │                    │
         │                    │ onAuthStateChange
         │                    ▼
         │            verify = true
         │            stopPolling()
         │            redirect()
         │
         └────────────┬───────────────┘
                      │
                      │ redirect
                      ▼
┌──────────────────────────────────────────────────────────┐
│ app/auth/callback/page.tsx                              │
│ "Auth Callback Handler"                                │
├──────────────────────────────────────────────────────────┤
│ Responsibility:                                        │
│ • Extract URL parameters                             │
│ • Check for errors                                   │
│ • Get user session                                   │
│ • Fetch user profile                                 │
│ • Get user role                                      │
│ • Redirect based on role                             │
└──────────────────┬───────────────────────────────────────┘
                   │
            ┌──────┼──────┐
            │      │      │
    role=   │      │      │
   'admin'  │      │      │  role='user'
            │      │      │
            ▼      ▼      ▼
         /admin  /staff  /home
```

---

## 🔄 Data Transformation at Each Stage

```
STAGE 1: Form Input
│
├─ email: "john@example.com"
├─ password: "SecurePass123!"
├─ confirmPassword: "SecurePass123!"
├─ fullName: "John Doe"
├─ showPassword: false
├─ acceptedTerms: true
├─ error: null
└─ loading: false

                    ▼ [Validation & Form Submit]

STAGE 2: API Call Object
│
└─ {
    email: "john@example.com",
    password: "SecurePass123!",
    fullName: "John Doe"
  }

                    ▼ [API: authClient.signUp()]

STAGE 3: Supabase Request
│
└─ {
    email: "john@example.com",
    password: "SecurePass123!",
    options: {
      data: {
        full_name: "John Doe"
      },
      emailRedirectTo: "https://app.com/auth/callback"
    }
  }

                    ▼ [Supabase Processing]

STAGE 4: Auth User Created in Database
│
└─ auth.users row {
    id: "550e8400-e29b-41d4-a716-446655440000",
    email: "john@example.com",
    encrypted_password: "$2a$10$...",
    email_confirmed_at: null,
    user_metadata: {
      full_name: "John Doe"
    },
    created_at: "2024-01-16T10:00:00Z"
  }

                    ▼ [Email Sent]

STAGE 5: Email Verification Link
│
└─ https://app.com/auth/callback?code=abc123def456

                    ▼ [User clicks link]

STAGE 6: Code Exchange
│
└─ Supabase {
    verifies code,
    sets email_confirmed_at = NOW(),
    creates session token
  }

                    ▼ [Auth State Change]

STAGE 7: Session Created
│
└─ {
    user: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "john@example.com",
      email_confirmed_at: "2024-01-16T10:05:00Z",
      user_metadata: {
        full_name: "John Doe"
      }
    },
    session: {
      access_token: "eyJ...",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: 1705423200
    }
  }

                    ▼ [Callback Processing]

STAGE 8: User Profile Queried
│
└─ SELECT role FROM profiles WHERE id = "550e8400..."
   Result: { role: "user" }

                    ▼ [Role-Based Redirect]

STAGE 9: Final State
│
└─ User {
    authenticated: true,
    email_verified: true,
    role: "user",
    session_active: true,
    location: "/home"
  }
```

---

## 🛡️ Security Validation Layers

```
LAYER 1: CLIENT-SIDE FORM VALIDATION
┌─────────────────────────────────────────────────────────┐
│ Before API call, validate:                             │
│                                                         │
│ ✓ Email: Valid format (regex)                         │
│ ✓ Password:                                            │
│   ├─ Minimum 8 characters                             │
│   ├─ At least 1 uppercase letter                      │
│   ├─ At least 1 lowercase letter                      │
│   └─ At least 1 number                                │
│ ✓ Confirm Password: Matches password                 │
│ ✓ Full Name: Not empty                               │
│ ✓ Terms: Must be checked                             │
│                                                         │
│ If any fails → Show error → Stop submission           │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ [All pass]
                        
LAYER 2: API REQUEST VALIDATION
┌─────────────────────────────────────────────────────────┐
│ Supabase validates:                                    │
│                                                         │
│ ✓ Email valid RFC format                             │
│ ✓ Email not already registered                       │
│ ✓ Password meets minimum requirements                │
│ ✓ No SQL injection in inputs                         │
│ ✓ No XSS payloads in data                           │
│                                                         │
│ If any fails → API error → Show message              │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ [All pass]

LAYER 3: EMAIL VERIFICATION
┌─────────────────────────────────────────────────────────┐
│ Account not usable until:                             │
│                                                         │
│ ✓ Verification email sent                            │
│ ✓ User clicks email link                             │
│ ✓ Token valid (not expired)                          │
│ ✓ Email confirmed in database                        │
│ ✓ Session created                                    │
│                                                         │
│ Without this: No session, can't login                │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ [All pass]

LAYER 4: SESSION VALIDATION
┌─────────────────────────────────────────────────────────┐
│ On every request, validate:                           │
│                                                         │
│ ✓ Session token exists                               │
│ ✓ Token not expired                                  │
│ ✓ Token signature valid                              │
│ ✓ User exists in database                            │
│ ✓ User not banned/deleted                            │
│                                                         │
│ If any fails → Redirect to login                     │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ [All pass]

LAYER 5: ROLE-BASED ACCESS
┌─────────────────────────────────────────────────────────┐
│ Based on user role:                                   │
│                                                         │
│ Role 'admin'  → Can access /admin                   │
│ Role 'staff'  → Can access /staff                   │
│ Role 'user'   → Can access /home                    │
│                                                         │
│ Trying to access unauthorized page → Redirect       │
└─────────────────────────────────────────────────────────┘
```

---

## ⏰ Timing Diagram

```
0ms   User opens /auth/signup
      │
50ms  SignUpPage renders
      │
100ms SignUpForm renders
      │
      ┌─────────────────────────────────────┐
      │ User fills form                     │
      │ (variable time, typically 30-60s)   │
      │                                     │
      │ - Enters email                      │
      │ - Enters password                   │
      │ - Confirms password                 │
      │ - Enters full name                  │
      │ - Accepts terms                     │
      └─────────────────────────────────────┘
      │
1000ms User clicks "Create Account"
      │
1050ms Form validation starts
      │
1100ms ├─ Email validated
      ├─ Password checked
      ├─ Passwords match
      ├─ Terms accepted
      └─ All valid ✓
      │
1150ms API call: authClient.signUp()
      │
      ┌──────────────────────────────────────────┐
      │ Network request to Supabase (50-200ms)   │
      │                                          │
      │ - Create auth.users row                 │
      │ - Hash password                         │
      │ - Generate token                        │
      │ - Send email                            │
      └──────────────────────────────────────────┘
      │
1350ms API response received
      │
1400ms ├─ Redirect triggered
      └─ router.push('/verify-email?email=...')
      │
1450ms Verify email page loads
      │
1500ms ├─ Query current user
      ├─ Check email_confirmed_at
      ├─ Setup polling (every 3s)
      ├─ Subscribe to auth changes
      └─ Display "Check your email"
      │
      ┌──────────────────────────────────────────┐
      │ Meanwhile: User checks email             │
      │ (variable time, typically 30-300s)       │
      │                                          │
      │ - Opens email client                    │
      │ - Finds verification email              │
      │ - Clicks verification link              │
      └──────────────────────────────────────────┘
      │
1500ms [Polling starts]
      ├─ 3000ms: Check email_confirmed_at → null
      ├─ 6000ms: Check email_confirmed_at → null
      ├─ 9000ms: Check email_confirmed_at → null
      │
      ┌──────────────────────────────────────────┐
      │ [User clicks email link at ~35 seconds]  │
      │                                          │
      │ Navigate to: /auth/callback?code=...    │
      │                                          │
      │ Supabase processes:                      │
      │ - Verify code                           │
      │ - Set email_confirmed_at                │
      │ - Create session                        │
      │ - Emit auth state change                │
      └──────────────────────────────────────────┘
      │
36000ms Auth state change event
      │
36050ms ├─ Listener triggered
      ├─ email_confirmed_at: NOT NULL
      ├─ setVerified(true)
      ├─ stopPolling()
      └─ Navigate to /home
      │
36100ms AuthCallback page loads
      │
36150ms ├─ Check URL params
      ├─ Get session ✓
      ├─ Query user role
      ├─ Determine redirect (/home)
      └─ router.replace('/home')
      │
36200ms Home page loads
      │
36250ms ├─ Check auth guard ✓
      ├─ Load user data ✓
      ├─ Render dashboard
      └─ USER LOGGED IN ✅

TOTAL TIME: ~36 seconds (from start to fully logged in)
```

---

## 🔗 State Flow Diagram

```
Initial State
│
├─ user: null
├─ session: null
├─ email_confirmed_at: null
├─ verified: false
└─ authenticated: false

                    │
                    ▼ [Form Submit]

After Auth API Call
│
├─ user: {id, email, email_confirmed_at: null}
├─ session: null
├─ email_confirmed_at: null
├─ verified: false
├─ authenticated: false ← Still NOT authenticated!
└─ location: /verify-email

                    │
                    ▼ [Polling Starts]

Polling Every 3 Seconds
│
├─ Query user status
│
└─ IF email_confirmed_at is null
   └─ Continue polling
   
   IF email_confirmed_at is set
   └─ CONDITION MET! Proceed below

                    │
                    ▼ [Email Verified]

After Email Verification
│
├─ user: {id, email, email_confirmed_at: "2024-01-16T..."}
├─ session: {access_token, ...}
├─ email_confirmed_at: "2024-01-16T..."
├─ verified: true
├─ authenticated: true ✓
└─ location: /auth/callback

                    │
                    ▼ [Callback Processing]

After Callback & Redirect
│
├─ user: {id, email, email_confirmed_at: "2024-01-16T...", role: "user"}
├─ session: {access_token, ...}
├─ email_confirmed_at: "2024-01-16T..."
├─ verified: true
├─ authenticated: true ✓
└─ location: /home (Dashboard)

                    │
                    ▼

Final State: User Logged In ✅
│
├─ user: VALID
├─ session: ACTIVE
├─ email_confirmed_at: SET
├─ verified: true
├─ authenticated: true
├─ role: "user"
└─ access: Dashboard Features
```

---

**Status**: ✅ Complete Visual Documentation  
**Diagrams**: 8+ comprehensive flowcharts  
**Readability**: ASCII art for terminal viewing
