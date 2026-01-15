# 🎨 Password Reset - Visual Flow Guide

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     🏨 ROYAL ELEGANCE                          │
│                   Luxury Hotel & Residences                     │
│                                                                 │
│                    ┌─────────────────┐                         │
│                    │   LOGIN PAGE    │                         │
│                    │                 │                         │
│                    │  Email: _____   │                         │
│                    │  Password: ___  │                         │
│                    │                 │                         │
│                    │  [Sign In]      │                         │
│                    │                 │                         │
│                    │  Forgot         │◄─── USER CLICKS HERE   │
│                    │  password?      │                         │
│                    └────────┬────────┘                         │
│                             │                                   │
│                             ▼                                   │
│                    ┌─────────────────┐                         │
│                    │ FORGOT PASSWORD │                         │
│                    │                 │                         │
│                    │  Enter your     │                         │
│                    │  email address  │                         │
│                    │                 │                         │
│                    │  📧 Email:      │                         │
│                    │  ____________   │                         │
│                    │                 │                         │
│                    │  [Send Reset]   │◄─── USER ENTERS EMAIL  │
│                    └────────┬────────┘                         │
│                             │                                   │
│                             ▼                                   │
│                    ┌─────────────────┐                         │
│                    │ ✓ CHECK EMAIL   │                         │
│                    │                 │                         │
│                    │  📬 We sent     │                         │
│                    │  instructions   │                         │
│                    │  to your email  │                         │
│                    │                 │                         │
│                    │  Didn't receive?│                         │
│                    │  • Check spam   │                         │
│                    │  • Wait 2 min   │                         │
│                    │                 │                         │
│                    │  [Try Again]    │                         │
│                    └─────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

                              ⬇️

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                      📧 EMAIL INBOX                             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ From: Royal Elegance <noreply@royalegance.com>      │     │
│  │ Subject: Reset Your Password                         │     │
│  │                                                       │     │
│  │ Hi there,                                            │     │
│  │                                                       │     │
│  │ You requested to reset your password.               │     │
│  │                                                       │     │
│  │ Click the link below to create a new password:      │     │
│  │                                                       │     │
│  │ ┌─────────────────────────────────────────┐        │     │
│  │ │    🔗 [Reset My Password]                │◄───────┼──── │
│  │ └─────────────────────────────────────────┘        │USER  │
│  │                                                      │CLICKS│
│  │ This link expires in 1 hour.                       │     │
│  │                                                       │     │
│  │ If you didn't request this, ignore this email.     │     │
│  │                                                       │     │
│  │ Thanks,                                              │     │
│  │ Royal Elegance Team                                  │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

                              ⬇️

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              🔄 VERIFYING RESET LINK...                        │
│                                                                 │
│                    ┌─────────────────┐                         │
│                    │                 │                         │
│                    │    ⏳ Loading   │                         │
│                    │                 │                         │
│                    │  Verifying your │                         │
│                    │  reset link...  │                         │
│                    │                 │                         │
│                    │      ⚙️          │                         │
│                    │   (spinner)     │                         │
│                    │                 │                         │
│                    └─────────────────┘                         │
│                                                                 │
│                    ⬇️ Token Valid? ⬇️                         │
│                                                                 │
│         ┌──────────────┬──────────────────┐                   │
│         │              │                  │                   │
│      ✅ YES          ❌ NO/EXPIRED                             │
│         │              │                  │                   │
│         ▼              ▼                  │                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│         ❌ INVALID/EXPIRED LINK                                │
│                                                                 │
│                    ┌─────────────────┐                         │
│                    │       ⚠️         │                         │
│                    │                 │                         │
│                    │  Invalid Reset  │                         │
│                    │      Link       │                         │
│                    │                 │                         │
│                    │  This link has  │                         │
│                    │  expired or is  │                         │
│                    │  invalid.       │                         │
│                    │                 │                         │
│                    │  Links expire   │                         │
│                    │  after 1 hour.  │                         │
│                    │                 │                         │
│                    │  [Request New]  │                         │
│                    │  [Back to Login]│                         │
│                    └─────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│         ✅ VALID TOKEN - CREATE NEW PASSWORD                   │
│                                                                 │
│                    ┌─────────────────┐                         │
│                    │ Reset Password  │                         │
│                    │                 │                         │
│                    │ New Password:   │                         │
│                    │ ____________ 👁  │                         │
│                    │                 │                         │
│                    │ Requirements:   │                         │
│                    │ ✓ 8+ chars      │                         │
│                    │ ✓ Uppercase     │                         │
│                    │ ✓ Lowercase     │                         │
│                    │ ✓ Number        │                         │
│                    │ ✓ Special char  │                         │
│                    │                 │                         │
│                    │ Confirm:        │                         │
│                    │ ____________ 👁  │                         │
│                    │ ✓ Passwords     │                         │
│                    │   match         │                         │
│                    │                 │                         │
│                    │ [Reset Password]│◄─── USER SUBMITS       │
│                    └────────┬────────┘                         │
│                             │                                   │
│                             ▼                                   │
│                    ┌─────────────────┐                         │
│                    │  ✅ SUCCESS!     │                         │
│                    │                 │                         │
│                    │  Password       │                         │
│                    │  updated!       │                         │
│                    │                 │                         │
│                    │  Redirecting... │                         │
│                    └────────┬────────┘                         │
│                             │                                   │
│                             ▼                                   │
│                    ┌─────────────────┐                         │
│                    │   LOGIN PAGE    │                         │
│                    │                 │                         │
│                    │  Use your new   │                         │
│                    │  password to    │                         │
│                    │  sign in        │                         │
│                    │                 │                         │
│                    │  Email: _____   │                         │
│                    │  Password: ___  │◄─── NEW PASSWORD       │
│                    │                 │                         │
│                    │  [Sign In] ✓    │                         │
│                    └─────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Password Strength Visual Indicator

```
┌─────────────────────────────────────────────────────────────┐
│  Password Requirements                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  WEAK PASSWORD: "pass"                                      │
│  ❌ At least 8 characters                                   │
│  ❌ Lowercase letter                                        │
│  ❌ Uppercase letter                                        │
│  ❌ Number                                                  │
│  ❌ Special character                                       │
│                                                             │
│  ─────────────────────────────────────────                 │
│                                                             │
│  MEDIUM PASSWORD: "Password"                                │
│  ✓ At least 8 characters                                   │
│  ✓ Lowercase letter                                        │
│  ✓ Uppercase letter                                        │
│  ❌ Number                                                  │
│  ❌ Special character                                       │
│                                                             │
│  ─────────────────────────────────────────                 │
│                                                             │
│  STRONG PASSWORD: "Password123!"                            │
│  ✓ At least 8 characters                                   │
│  ✓ Lowercase letter                                        │
│  ✓ Uppercase letter                                        │
│  ✓ Number                                                  │
│  ✓ Special character                                       │
│                                                             │
│  [Reset Password] ← ENABLED                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Mobile View

```
┌───────────────────┐
│   📱 MOBILE       │
├───────────────────┤
│                   │
│  🏨 ROYAL         │
│  ELEGANCE         │
│                   │
│  ───────────────  │
│                   │
│  Forgot Password? │
│                   │
│  Enter your email │
│  address below    │
│                   │
│  ┌─────────────┐  │
│  │📧 Email     │  │
│  │____________ │  │
│  └─────────────┘  │
│                   │
│  ┌─────────────┐  │
│  │Send Reset   │  │
│  │Link         │  │
│  └─────────────┘  │
│                   │
│  ← Back to Login  │
│                   │
└───────────────────┘
```

---

## Error States

```
┌─────────────────────────────────────────────────────────────┐
│  ERROR: Passwords Don't Match                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  New Password:                                              │
│  ┌─────────────────────────────┐                           │
│  │ Password123!                │ 👁                        │
│  └─────────────────────────────┘                           │
│  ✓ All requirements met                                     │
│                                                             │
│  Confirm Password:                                          │
│  ┌─────────────────────────────┐                           │
│  │ Password456!                │ 👁                        │
│  └─────────────────────────────┘                           │
│  ❌ Passwords do not match                                  │
│                                                             │
│  [Reset Password] ← DISABLED                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SUCCESS: Passwords Match                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  New Password:                                              │
│  ┌─────────────────────────────┐                           │
│  │ Password123!                │ 👁                        │
│  └─────────────────────────────┘                           │
│  ✓ All requirements met                                     │
│                                                             │
│  Confirm Password:                                          │
│  ┌─────────────────────────────┐                           │
│  │ Password123!                │ 👁                        │
│  └─────────────────────────────┘                           │
│  ✓ Passwords match                                          │
│                                                             │
│  [Reset Password] ← ENABLED                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Timeline

```
0 min     Request reset
          ↓
0-2 min   Receive email
          ↓
2 min     Click link
          ↓
2 min     Verify token (2 sec)
          ↓
3 min     Enter new password
          ↓
3 min     Submit & redirect
          ↓
3 min     Login with new password
          ↓
✅ COMPLETE (Total: ~3-5 minutes)
```

---

## Security Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                         │
└─────────────────────────────────────────────────────────────┘

Layer 1: Email Verification
┌─────────────────────────────────────────────────────────────┐
│  User must have access to email account                    │
│  Prevents unauthorized resets                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
Layer 2: Token Validation
┌─────────────────────────────────────────────────────────────┐
│  Cryptographically signed token                             │
│  One-time use only                                          │
│  Expires in 1 hour                                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
Layer 3: Password Requirements
┌─────────────────────────────────────────────────────────────┐
│  Minimum 8 characters                                       │
│  Mixed case required                                        │
│  Numbers required                                           │
│  Special characters required                                │
└─────────────────────────────────────────────────────────────┘
                           ↓
Layer 4: Session Management
┌─────────────────────────────────────────────────────────────┐
│  Temporary session for reset only                           │
│  Cleared after password update                              │
│  Requires fresh login                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Color Coding

```
🟢 GREEN  = Success, Valid, Enabled
🔴 RED    = Error, Invalid, Required
🟡 YELLOW = Warning, Pending
🔵 BLUE   = Information, Loading
⚫ GRAY   = Disabled, Inactive
```

---

## Icons Used

```
📧  Email
🔒  Security
✓   Success
✅  Completed
❌  Error
⚠️  Warning
⏳  Loading
👁  Show/Hide Password
🏨  Hotel Logo
⚙️  Processing
```

---

**Visual Guide Version:** 1.0.0  
**Last Updated:** January 15, 2026
