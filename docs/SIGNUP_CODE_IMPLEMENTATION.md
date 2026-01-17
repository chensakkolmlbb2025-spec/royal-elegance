# Sign Up Flow - Code Implementation Examples

## 📝 Complete Code Walkthrough with Execution Flow

### 1. USER ENTERS SIGNUP PAGE

**File:** `app/auth/signup/page.tsx`

```tsx
export default function SignUpPage() {
  const router = useRouter()
  
  return (
    <main className="min-h-screen w-full flex bg-gradient-to-br">
      {/* Left side: Benefits display */}
      <div className="hidden lg:flex flex-1">
        <h1>Join the Elite Circle</h1>
        {/* Benefits cards, etc */}
      </div>

      {/* Right side: Form */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <SignUpForm />  {/* ← This is the form component */}
      </div>
    </main>
  )
}
```

**What Happens:**
- Page renders beautiful signup UI
- Shows benefits on desktop
- Embeds `<SignUpForm />` component
- User sees email, password, name fields

---

### 2. USER FILLS FORM & SUBMITS

**File:** `components/auth/signup-form.tsx`

```tsx
export function SignUpForm({ onSwitchToLogin }: SignUpFormProps) {
  const router = useRouter()
  
  // State management
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Password validation function
  function validatePassword(password: string) {
    const errors: string[] = []
    
    if (password.length < 8) 
      errors.push('At least 8 characters')
    if (!/[A-Z]/.test(password)) 
      errors.push('One uppercase letter')
    if (!/[a-z]/.test(password)) 
      errors.push('One lowercase letter')
    if (!/[0-9]/.test(password)) 
      errors.push('One number')
    
    return { valid: errors.length === 0, errors }
  }

  // Get validation status
  const passwordValidation = validatePassword(password)
  const passwordsMatch = password === confirmPassword && password.length > 0

  // Main form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // VALIDATION STEP 1: Check terms accepted
    if (!acceptedTerms) {
      setError('Please accept the terms of service and privacy policy.')
      return  // ← Stop here if validation fails
    }

    // VALIDATION STEP 2: Check password strength
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors[0])
      return  // ← Stop here if validation fails
    }

    // VALIDATION STEP 3: Check passwords match
    if (!passwordsMatch) {
      setError('Passwords do not match.')
      return  // ← Stop here if validation fails
    }

    // All validation passed! Set loading state
    setLoading(true)

    try {
      // EXECUTION STEP 1: Call signup API
      await authClient.signUp({ 
        email, 
        password, 
        fullName 
      })
      
      // EXECUTION STEP 2: Clear any errors
      setError(null)
      
      // EXECUTION STEP 3: Redirect to email verification page
      router.push('/auth/verify-email?email=' + encodeURIComponent(email))
      
    } catch (err: any) {
      // Handle errors from signup
      setError(err.message || 'Failed to create account')
      
    } finally {
      // Always clear loading state
      setLoading(false)
    }
  }

  return (
    <Card className="glass-card w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-display">
          Create Account
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Show error if any */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name Field */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>

            {/* Show password validation errors/success */}
            {password.length > 0 && (
              <div className="space-y-1 text-xs">
                {passwordValidation.errors.map((error, index) => (
                  <div key={index} className="flex items-center gap-2 text-destructive">
                    <XCircle className="w-3 h-3" />
                    <span>{error}</span>
                  </div>
                ))}
                {passwordValidation.valid && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Password meets all requirements</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>

            {/* Show password match status */}
            {confirmPassword.length > 0 && (
              <div className="text-xs">
                {passwordsMatch ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Passwords match</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="w-3 h-3" />
                    <span>Passwords do not match</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => 
                setAcceptedTerms(checked === true)
              }
              disabled={loading}
            />
            <label htmlFor="terms" className="text-sm text-muted-foreground">
              I agree to the{' '}
              <a href="/terms" className="text-primary hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={
              loading ||
              !acceptedTerms ||
              !passwordValidation.valid ||
              !passwordsMatch
            }
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>

          {/* Link to signin */}
          {onSwitchToLogin && (
            <div className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <button 
                type="button" 
                onClick={onSwitchToLogin} 
                className="text-primary hover:underline"
              >
                Sign In
              </button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
```

**Execution Flow:**
1. User fills all fields
2. User clicks "Create Account"
3. Form submission triggered
4. All validations run
5. If all pass → API call
6. If any fail → Show error

---

### 3. CALL SUPABASE SIGNUP API

**File:** `lib/auth/helpers.ts`

```typescript
export interface SignUpData {
  email: string
  password: string
  fullName: string
}

export const authClient = {
  async signUp(data: SignUpData) {
    // Create Supabase client (client-side)
    const supabase = createClient()
    
    // Call Supabase auth.signUp() method
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      
      options: {
        // Store full name in user metadata
        data: {
          full_name: data.fullName,
        },
        
        // Redirect URL after email verification
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    // Check for errors
    if (error) {
      throw new Error(error.message)
    }

    // Return user data (but NO session yet)
    return authData
  },
  
  // ... other auth methods
}
```

**What Supabase Does (Backend):**

```
1. Validates email format
   ├─ Is valid email?
   └─ Already registered?

2. Validates password strength
   ├─ Meets requirements?
   └─ Not common password?

3. Creates user record in auth.users table
   ├─ Generate UUID for user.id
   ├─ Hash password
   ├─ Store email
   └─ Store user_metadata (full_name)

4. Generates email verification token
   ├─ Create random token
   ├─ Set expiration (24 hours)
   └─ Store in database

5. Sends verification email
   ├─ Format email with verification link
   ├─ Link: /auth/callback?code={token}
   └─ Send via SMTP

6. Returns response to client
   {
     user: {
       id: "uuid-string",
       email: "user@example.com",
       email_confirmed_at: null,  // ← Not verified yet
       user_metadata: {
         full_name: "John Doe"
       }
     },
     session: null  // ← No session until verified!
   }
```

---

### 4. REDIRECT TO EMAIL VERIFICATION PAGE

**File:** `components/auth/signup-form.tsx` (continued)

```typescript
// After successful signup call:
router.push('/auth/verify-email?email=' + encodeURIComponent(email))
```

**Result:**
- User navigated to: `/auth/verify-email?email=user@example.com`
- Page loads with email address displayed

---

### 5. VERIFY EMAIL PAGE LOADS

**File:** `app/auth/verify-email/page.tsx`

```tsx
function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || undefined  // Get from URL param
  
  return <VerifyEmail email={email} />  // Pass email to component
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
```

---

### 6. EMAIL VERIFICATION COMPONENT

**File:** `components/auth/verify-email.tsx`

```tsx
export function VerifyEmail({ email }: VerifyEmailProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [verified, setVerified] = useState(false)
  const [polling, setPolling] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    
    // Get current user (at this point, email not confirmed yet)
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data?.user ?? null
      setUser(u)
      
      // Check if email already confirmed
      if (u?.email_confirmed_at) {
        setVerified(true)
      } else if (!u && email) {
        // User not logged in yet, start polling
        startPolling()
      }
    })

    // Subscribe to real-time auth state changes
    const { data } = supabase.auth.onAuthStateChange(
      (_event: string, session: any) => {
        setUser(session?.user ?? null)
        
        // If email confirmed, stop polling
        if (session?.user?.email_confirmed_at) {
          setVerified(true)
          stopPolling()
        }
      }
    )

    const subscription = data?.subscription ?? data

    // Cleanup
    return () => {
      subscription?.unsubscribe?.()
      stopPolling()
    }
  }, [])

  // POLLING FUNCTION: Check every 3 seconds if email verified
  const startPolling = () => {
    if (pollRef.current) return  // Already polling
    
    setPolling(true)
    const supabase = createClient()
    
    // Set up polling interval
    pollRef.current = setInterval(async () => {
      const { data } = await supabase.auth.getUser()
      const u = data?.user ?? null
      
      // Check if email_confirmed_at is set
      if (u?.email_confirmed_at) {
        console.log('Email verified!')
        setUser(u)
        setVerified(true)
        stopPolling()
        
        // Redirect to home after verification
        setTimeout(() => router.push('/home'), 1000)
      }
    }, 3000)  // Poll every 3 seconds
    
    // Safety: Stop polling after 2 minutes
    setTimeout(() => stopPolling(), 120000)
  }

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setPolling(false)
  }

  // RESEND EMAIL FUNCTION
  const handleResendEmail = async () => {
    if (resendCooldown > 0) return  // Still on cooldown

    setIsResending(true)

    try {
      const supabase = createClient()
      const userEmailToUse = user?.email || email || ""
      
      if (!userEmailToUse) {
        throw new Error("No email found")
      }

      // Call Supabase resend endpoint
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: userEmailToUse,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      toast({
        title: "Verification Email Sent",
        description: "Check your inbox and spam folder.",
      })

      // Set cooldown to prevent spam (60 seconds)
      setResendCooldown(60)
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
    } catch (error: any) {
      toast({
        title: "Resend Failed",
        description: error?.message || "Could not resend.",
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  // CONTINUE BUTTON
  const handleContinue = () => {
    router.push("/home")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br">
      <Card className="glass-card w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            {verified ? (
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            ) : (
              <Mail className="w-8 h-8 text-primary" />
            )}
          </div>
          
          <CardTitle className="text-2xl font-display">
            {verified ? 'Email Verified!' : 'Verify Your Email'}
          </CardTitle>
          
          <CardDescription>
            {verified 
              ? 'Your email has been verified successfully.'
              : `We sent a verification link to ${email}`
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!verified && (
            <>
              <div className="text-center space-y-3">
                {polling && (
                  <>
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto" />
                    <p className="text-sm text-slate-600">
                      Checking for verification...
                    </p>
                  </>
                )}
                
                <p className="text-sm text-slate-600">
                  Didn't receive the email?
                </p>
                
                <Button
                  onClick={handleResendEmail}
                  disabled={isResending || resendCooldown > 0}
                  variant="outline"
                  className="w-full"
                >
                  {isResending
                    ? 'Sending...'
                    : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend Email'}
                </Button>
              </div>
            </>
          )}

          {verified && (
            <Button 
              onClick={handleContinue}
              className="w-full"
            >
              Continue to Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**What This Component Does:**

```
1. MOUNT:
   ├─ Get current user status
   ├─ Check if email_confirmed_at exists
   ├─ Subscribe to auth state changes
   └─ Start polling (every 3 seconds)

2. USER SEES:
   ├─ Email address displayed
   ├─ "Check your email" message
   ├─ Resend button
   └─ Spinner (polling active)

3. IN BACKGROUND:
   ├─ Every 3 seconds: Check if email verified
   ├─ Also listening: For auth state changes
   └─ Whichever happens first: Stop polling + verify

4. POLLING INTERVAL:
   ├─ Max 2 minutes
   ├─ Every 3 seconds: Query Supabase
   └─ If email_confirmed_at set: Email verified ✓

5. USER CLICKS LINK:
   ├─ Link: /auth/callback?code=verification_code
   ├─ Supabase sees code
   ├─ Verifies email
   ├─ Creates session
   ├─ Auth state changes
   ├─ Listener triggered
   ├─ setVerified(true)
   └─ Redirect to /home
```

---

### 7. USER CLICKS EMAIL LINK

**What Supabase Does:**

```
User clicks: https://app.com/auth/callback?code=xxxxx

1. Supabase receives request
2. Validates verification code
3. Checks code expiration (24 hours)
4. If valid:
   ├─ UPDATE auth.users SET email_confirmed_at = NOW()
   ├─ Create session token
   ├─ Return session to browser
   └─ Browser auto-logged in
5. Supabase redirects to: /auth/callback
```

---

### 8. CALLBACK PAGE PROCESSES

**File:** `app/auth/callback/page.tsx`

```tsx
function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<AuthStatus>('processing')
  const [message, setMessage] = useState('Completing authentication...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient()
        
        // Check for errors in URL
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          setStatus('error')
          setMessage(errorDescription || 'Authentication failed')
          setTimeout(() => router.replace('/login'), 3000)
          return
        }

        // Check for recovery type (password reset)
        const type = searchParams.get('type')
        if (type === 'recovery') {
          setStatus('success')
          setMessage('Password reset link verified')
          setTimeout(() => router.replace('/auth/reset-password'), 2000)
          return
        }

        // Get the session
        setMessage('Verifying authentication...')
        const { data: { session }, error: sessionError } = 
          await supabase.auth.getSession()

        if (sessionError || !session) {
          setStatus('error')
          setMessage('Failed to create session')
          setTimeout(() => router.replace('/login'), 3000)
          return
        }

        // Fetch user's profile to get role
        setMessage('Loading your profile...')
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        const userRole = profile?.role || 'user'  // Default: user
        setStatus('success')
        setMessage('Authentication successful!')

        // Role-based redirect
        setTimeout(() => {
          switch(userRole) {
            case 'admin':
              router.replace('/admin')
              break
            case 'staff':
              router.replace('/staff')
              break
            default:
              router.replace('/home')
          }
        }, 1500)
        
      } catch (err: any) {
        console.error('Auth callback error:', err)
        setStatus('error')
        setMessage('An unexpected error occurred')
        setTimeout(() => router.replace('/login'), 3000)
      }
    }

    // Small delay before processing (Supabase needs time to save)
    const timer = setTimeout(handleCallback, 100)
    
    return () => clearTimeout(timer)
  }, [router, searchParams])

  // UI Rendering
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="glass-card w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          {status === 'processing' && (
            <>
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
              <CardTitle>{message}</CardTitle>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
              <CardTitle>Success</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-600 mx-auto" />
              <CardTitle>Error</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}
        </CardHeader>
      </Card>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthCallbackContent />
    </Suspense>
  )
}
```

**Execution Steps:**

```
1. Check URL for errors
   ├─ error param?
   └─ error_description param?

2. Get session from Supabase
   ├─ Supabase client auto-exchanges code
   ├─ Session created by Supabase
   └─ User is now logged in

3. Query user's profile
   ├─ SELECT role FROM profiles WHERE id = user.id
   └─ Get user's role (admin, staff, user)

4. Determine redirect destination
   ├─ IF role = 'admin' → /admin
   ├─ IF role = 'staff' → /staff
   └─ ELSE → /home

5. Redirect user
   ├─ router.replace(destination)
   └─ User sees dashboard
```

---

## 📊 Summary Flowchart

```
Sign Up Form
    ↓
Validate locally
    ↓ Success
API Call: authClient.signUp()
    ↓
Supabase: Create user
    ↓
Supabase: Send email
    ↓
Redirect: /verify-email
    ↓
VerifyEmail: Start polling
    ↓
User clicks email link
    ↓
Redirect: /auth/callback?code=...
    ↓
Callback: Process code
    ↓
Callback: Get session
    ↓
Callback: Query user role
    ↓
Callback: Role-based redirect
    ↓
Dashboard (/home, /admin, or /staff)
    ↓
✅ User logged in & email verified!
```

---

**Status**: ✅ Complete Code Implementation  
**Version**: 1.0
