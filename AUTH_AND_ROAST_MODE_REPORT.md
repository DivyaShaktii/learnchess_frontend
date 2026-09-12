# Authentication and Roast Mode Report

## Scope and branch policy

This work belongs to `raj/google-auth`. It must not be merged or pushed to `main` until the repository owner explicitly requests it.

The application continues to use Supabase Auth. Passwords and Google credentials are never stored by the FastAPI backend or committed to this repository. The backend accepts the Supabase access token from the browser and asks Supabase to verify it before serving paid-profile and payment operations.

## Authentication flows

### Email and password

1. A new user submits email, password, and birth year through `AuthForm`.
2. `supabase.auth.signUp` creates the identity. The birth year is stored as user metadata and the existing database trigger creates the matching `profiles` row.
3. When email confirmation is enabled, Supabase emails the user and returns them through `/auth/callback`.
4. An existing user signs in with `supabase.auth.signInWithPassword`.
5. `useSession` observes the authenticated session, obtains the Supabase JWT, and sends it to protected backend calls as `Authorization: Bearer <token>`.
6. The backend verifies the JWT with `supabase.auth.get_user`. It does not receive or store the user's password.

### Forgot password

1. The user selects **Forgot password?** and submits an email address.
2. `supabase.auth.resetPasswordForEmail` asks Supabase to send a recovery email. The UI intentionally shows the same success response whether or not the address exists, avoiding account enumeration.
3. The recovery link opens `/auth/reset-password`, where Supabase restores the short-lived recovery session.
4. The user enters and confirms a new password of at least eight characters.
5. `supabase.auth.updateUser` saves the new password, after which the recovery session is signed out.

### Google OAuth

1. **Continue with Google** calls `supabase.auth.signInWithOAuth` with the Google provider.
2. Supabase redirects to Google and then returns the browser to `/auth/callback`.
3. The callback supports both an OAuth authorization `code` and a session returned in the URL.
4. After Supabase creates the session, the user returns to the chess application. The existing profile trigger handles first-time Google users.

Google's client secret must never be added to Vercel as a `NEXT_PUBLIC_*` variable. Configure the Client ID and Client Secret in **Supabase Dashboard → Authentication → Providers → Google**.

## Required deployment configuration

### Google Cloud Console

- Authorized JavaScript origin: `https://www.learnchess.live`
- Authorized redirect URI: `https://cpjptqgrfjysebmhqide.supabase.co/auth/v1/callback`

### Supabase URL configuration

- Site URL: `https://www.learnchess.live`
- Allowed redirect URLs:
  - `https://www.learnchess.live/auth/callback`
  - `https://www.learnchess.live/auth/reset-password`
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/reset-password`

### Vercel public variables

- `NEXT_PUBLIC_SUPABASE_URL=https://cpjptqgrfjysebmhqide.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<the Supabase publishable/anon key>`
- `NEXT_PUBLIC_SITE_URL=https://www.learnchess.live`
- `NEXT_PUBLIC_API_BASE_URL=https://learnchessbackend-production-45ba.up.railway.app`

## How Roast Mode chooses commentary and audio

Roast Mode has two related decisions: which sentence is selected, and which voice speaks it.

### 1. Eligibility and activation

- The user must be signed in.
- The saved birth year must indicate age 18 or older.
- The adult-content gate must be accepted.
- Consent is stored per user in `localStorage` using `chess_roast_mode_verified_18_<user id>`.

### 2. Move classification from the backend

For the earliest opening plies, edge-pawn pushes receive `Opening Pawn Warning`, while recognised opening moves receive `Opening Principle`. For later moves, Stockfish compares the played move with its best move and calculates centipawn loss. The current backend labels are:

| Backend result | Current rule |
| --- | --- |
| Good | engine-best move or loss up to 40 cp |
| Inaccuracy | 41–90 cp |
| Mistake | 91–180 cp |
| Blunder | 181–350 cp |
| Worst Move | over 350 cp |

One hundred centipawns are approximately one pawn of evaluation.

### 3. Roast sentence category

The frontend maps the backend label and centipawn loss into a dialogue category:

| Roast category | Selection basis |
| --- | --- |
| Major blunder | label contains `Blunder`/`Worst`, or loss is at least 300 cp |
| Mistake | label contains `Mistake`, or loss is at least 100 cp |
| Inaccuracy | label contains `Inaccuracy`/`Could be better`, or loss is at least 25 cp |
| Brilliant | label contains `Brilliant` or `Best` |
| Good | every other solid move |

Context can replace the general category line with a more specific roast. The frontend examines the position, candidate move, best reply, and recent moves to detect a hung queen, another lost piece, a missed free piece, castling, an early king or queen move, a knight on the rim, a center or flank pawn opening, or repeated piece shuffling.

Each category has at least 12 sentences. A memory-only history buffer excludes the last five sentences used in that category, then randomly selects from the remaining lines. The history resets when the page reloads.

### 4. Event-based roast categories

- Learner Mode ON: a backend `is_box_tier` warning triggers a pre-move roast before the move is committed.
- Learner Mode OFF: the move commits immediately and the classified/contextual roast plays afterward.
- No move for 25 seconds: the slow-play category is used.
- Undo or cancel warning: the undo category is used.
- Checkmate, stalemate, or another draw: the corresponding outcome category is used.

### 5. What audio is actually played

Normal coach mode maps move labels to prerecorded MP3 files under `public/Chess_Project_Voices`.

Roast Mode currently does **not** select those MP3 files. It selects a text sentence and passes it to the browser's Web Speech API (`speechSynthesis`). The browser chooses a voice in this order:

1. English voice whose name suggests a male voice (`David`, `Mark`, `Matthew`, `Brian`, `George`, `Arthur`, `James`, and similar names).
2. English voice with `Natural` or `Google US English` in its name.
3. Any available English voice.
4. The browser's first available voice.

Because Web Speech voices depend on the user's browser and operating system, the same roast sentence can sound different on different devices. If coach voice is disabled or speech synthesis is unavailable, the selected sentence is still shown as a subtitle.

## Current implementation note

The backend contains a brilliant-sacrifice helper, but its current label-selection function does not call that helper and returns `Good` for engine-top moves. Consequently, genuine `Brilliant` labels are unlikely to originate from normal backend move classification until that separate classifier issue is addressed.
