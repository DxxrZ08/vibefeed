# VibeFeed Backend Deployment on Railway

## What to deploy
- Deploy the `server` folder as a separate Railway service.
- Keep the frontend on Firebase Hosting.

## Railway setup
1. Create a new Railway project.
2. Choose `Deploy from GitHub` and select this repository.
3. Set the service root to `server` if Railway asks for a root directory.
4. Railway should detect Node automatically and run `npm start`.

## Required Railway variables
Add these in Railway service variables:

```env
PORT=5000
ADMIN_EMAILS=zaladaxrajsinh07@gmail.com
CLIENT_ORIGIN=https://vibefeed01.web.app,https://vibefeed01.firebaseapp.com
GNEWS_API_KEY=your_real_gnews_key
NEWS_API_KEY=your_real_newsapi_key
```

Notes:
- `GNEWS_API_KEY` is the best first choice for live production news.
- `NEWS_API_KEY` is optional backup.
- If both keys are missing, the backend falls back to RSS/local fallback stories.

## Backend endpoints after deploy
- `/health`
- `/api/news/live-feed`
- `/api/news/discover`
- `/api/news/vibe-scope`

## Update the frontend
After Railway gives you a backend URL like:

```text
https://your-vibefeed-backend.up.railway.app
```

set your frontend environment variable to:

```env
VITE_API_URL=https://your-vibefeed-backend.up.railway.app/api
```

Then rebuild and redeploy the frontend to Firebase Hosting:

```powershell
cd C:\Users\ASUS\.gemini\antigravity\scratch\vibefeed
npm.cmd run build
firebase deploy --only hosting
```

## Final production check
1. Open the Railway backend health URL.
2. Open the Firebase-hosted frontend.
3. Confirm the network calls go to Railway instead of `127.0.0.1`.
4. Test live feed, search, Vibe Scope, login, and admin.
