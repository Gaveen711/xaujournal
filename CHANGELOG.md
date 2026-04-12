# Trading Journal Changes

## Remove Headless UI
- Uninstalled `@headlessui/react` (not used in codebase)
- No code changes needed (search found 0 references)

## Firebase Auth Fix (src/auth.ts)
- Added proper async/await, try/catch error handling
- Email verification, profile update on sign-up
- Auto-create Firestore user docs on first login
- Google provider config (`prompt: 'select_account'`)
- Better error messages (email in use, popup closed, etc.)

## Login Page Background Fix
- Changed login page background from `bg-background` to `bg-black` in `src/Login.tsx`

## LightningCSS/Tailwind Fix
- Added PostCSS config, Tailwind v3 stable
- Fixed @tailwind/@apply errors
- Added shadcn CSS vars to tailwind.config.js
- Build now succeeds
