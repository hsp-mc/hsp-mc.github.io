# Shared classroom leaderboard setup

1. Create a Supabase project.
2. Open its SQL Editor and run `supabase_leaderboard_setup.sql`.
3. In **Project Settings -> API**, copy the project URL and publishable key.
4. Paste those two values into `leaderboard-config.js`.
5. Deploy the website normally.

The publishable key is designed for browser applications. Never use a secret or
Supabase service-role key in this project. The included database rules let
students read and submit scores, but do not let them edit or delete shared
scores.

The database retains its original columns for backward compatibility. The
website stores the group name in `student`; the legacy `team` field is no
longer collected or displayed.

If Supabase cannot be reached or has not been configured, the website falls
back to the browser-local leaderboard automatically.
