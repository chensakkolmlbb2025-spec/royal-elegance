# Homepage Loading Inconsistency Fixes

## Issues Identified and Resolved

### 1. **Landing Page (`app/page.tsx`) - Auth Check Race Condition**

**Problem:**
- The `authChecked` state was included in the dependency array, causing the effect to run multiple times
- Component would flash loading screen even during redirect
- No clear distinction between "loading auth" and "redirecting" states

**Solution:**
- Changed from `useState` to `useRef` for `authCheckDone` to prevent re-renders
- Added `shouldShowLanding` state to explicitly control when to show landing page
- Updated loading screen to use `variant="fullpage"` for consistent UX
- Added separate loading state for redirect scenario

**Before:**
```tsx
const [authChecked, setAuthChecked] = useState(false)
useEffect(() => {
  if (authChecked) return
  // ... auth check
  setAuthChecked(true)
}, [router, authChecked]) // ❌ authChecked in deps causes issues
```

**After:**
```tsx
const authCheckDone = useRef(false)
const [shouldShowLanding, setShouldShowLanding] = useState(false)

useEffect(() => {
  if (authCheckDone.current) return
  authCheckDone.current = true
  // ... auth check
  setShouldShowLanding(true) // Only set if user should see landing
}, [router]) // ✅ Clean dependency array
```

---

### 2. **User Home Page (`app/home/page.tsx`) - Multiple Loading States**

**Problem:**
- `loadingData` started as `true`, causing immediate data fetch attempt before user is set
- Redundant role check in separate useEffect caused unnecessary complexity
- Three separate effects managing auth and redirects

**Solution:**
- Changed `loadingData` initial state to `false`
- Explicitly set `loadingData = true` when starting data fetch
- Moved role validation into auth check effect (before setting user)
- Used `useRef` for `authCheckDone` to prevent duplicate auth checks
- Consolidated loading logic into cleaner conditions
- Used `variant="fullpage"` for consistent loading UX

**Before:**
```tsx
const [loadingData, setLoadingData] = useState(true) // ❌ Starts true

useEffect(() => {
  const checkAuth = async () => {
    // ... set user without role check
    setUser(userData)
  }
}, [router])

useEffect(() => {
  // ❌ Separate role check
  if (user && user.role !== "user") {
    router.push("/")
  }
}, [user, loading, router])
```

**After:**
```tsx
const [loadingData, setLoadingData] = useState(false) // ✅ Starts false
const authCheckDone = useRef(false)

useEffect(() => {
  if (authCheckDone.current) return
  authCheckDone.current = true
  
  const checkAuth = async () => {
    // ... 
    // ✅ Role check before setting user
    if (userData.role !== 'user') {
      router.replace('/')
      return
    }
    setUser(userData)
  }
}, [router])

useEffect(() => {
  if (!user) return
  setLoadingData(true) // ✅ Explicitly set when fetching
  // ... fetch data
}, [user])
```

---

## Loading State Flow (Fixed)

### Landing Page Flow:
1. **Initial Load** → `loading: true, shouldShowLanding: false`
2. **Auth Check Starts** → Check session
3. **If Authenticated** → Redirect (stay in loading state)
4. **If Not Authenticated** → `shouldShowLanding: true, loading: false` → Show landing page
5. **During Redirect** → Show "Redirecting..." message

### User Home Page Flow:
1. **Initial Load** → `loading: true, loadingData: false, mounted: false`
2. **Mount** → `mounted: true`
3. **Auth Check Starts** → Verify session and role
4. **If Valid User** → Set user → `loading: false`
5. **Data Fetch Starts** → `loadingData: true`
6. **Data Loaded** → `loadingData: false` → Show home page
7. **If Invalid** → Redirect (stay in loading state)

---

## Key Improvements

### ✅ Prevents Race Conditions
- Using `useRef` instead of `useState` for auth check flags prevents unnecessary re-renders
- Auth checks run exactly once per mount

### ✅ Clearer Loading States
- Separate states for auth loading vs data loading
- Explicit "redirecting" state prevents flash of content
- Consistent use of `variant="fullpage"` for loading screens

### ✅ Better User Experience
- No flash of landing page when redirecting authenticated users
- No flash of loading when data is already loaded
- Smooth transitions between states

### ✅ Cleaner Code
- Removed redundant effects
- Single source of truth for auth state
- Consolidated role validation logic

---

## Testing Checklist

- [ ] Landing page doesn't flash when authenticated user visits `/`
- [ ] Landing page shows immediately for unauthenticated users
- [ ] User home page doesn't flash loading when data is cached
- [ ] Redirects happen smoothly without content flash
- [ ] Loading spinners show appropriate messages
- [ ] No console errors during navigation
- [ ] Auth state updates properly on login/logout

---

## Files Modified

1. `/app/page.tsx` - Landing page auth and loading logic
2. `/app/home/page.tsx` - User home page auth and data loading logic

---

## Performance Impact

**Before:**
- Multiple re-renders due to state in dependency arrays
- Redundant auth checks
- Data fetching attempted before user data available

**After:**
- Minimal re-renders using refs
- Single auth check per mount
- Data fetching only when user is confirmed
- Faster perceived load time with clearer loading states
