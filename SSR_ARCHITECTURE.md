# VibeFeed SSR Architecture Guide (Firebase Cloud Functions)

The VibeFeed application requires Server-Side Rendering (SSR) primarily for SEO purposes (e.g. rich social sharing cards when someone links to a specific story). Because the frontend is a Vanilla JS / Vite Single Page Application, the standard approach is to use a **Firebase Cloud Function** to intercept requests to specific routes, inject dynamic `<meta>` tags into the `index.html` shell, and return the populated HTML.

This document outlines the exact architectural steps to implement this.

---

## Prerequisites

Implementing Cloud Functions requires your Firebase project to be on the **Blaze (pay-as-you-go) plan**.
You need the Firebase CLI installed globally:
```bash
npm install -g firebase-tools
```

---

## 1. Initialize Firebase Functions

In the root of the `vibefeed` workspace, initialize the functions directory:

```bash
firebase init functions
```

Select the following options:
- **Language**: JavaScript
- **ESLint**: Yes
- **Install dependencies**: Yes

This will create a `functions/` directory in your project.

---

## 2. Install Required Dependencies

Navigate into the `functions` directory and install the necessary packages for fetching data and parsing HTML. We'll use `node-fetch` and `cheerio`.

```bash
cd functions
npm install node-fetch cheerio
```

---

## 3. Implement the SSR Function

Update the `functions/index.js` file with the following logic. This function intercepts requests, fetches the news data from the backend, reads the Vite build output (`dist/index.html`), injects the dynamic meta tags, and sends the final HTML to the client.

```javascript
const functions = require('firebase-functions');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// The VibeFeed Backend URL
const BACKEND_URL = 'https://vibefeed-production-779c.up.railway.app/api';

/**
 * Cloud Function to serve the VibeFeed app with dynamic SEO meta tags.
 */
exports.ssr = functions.https.onRequest(async (req, res) => {
  const urlPath = req.path;
  
  // 1. Read the production index.html shell
  const htmlPath = path.resolve(__dirname, '../dist/index.html');
  let indexHtml;
  try {
    indexHtml = fs.readFileSync(htmlPath, 'utf8');
  } catch (err) {
    console.error('Could not read index.html:', err);
    return res.status(500).send('Internal Server Error');
  }

  const $ = cheerio.load(indexHtml);

  // Default SEO Values
  let title = 'VibeFeed | Live Intelligence Feed';
  let description = 'Read the signal, not the noise. Tracking the most important stories across every beat.';
  let imageUrl = 'https://vibefeed.firebaseapp.com/og-image.png'; // Make sure this default image exists

  // 2. Determine if the route requires dynamic SEO
  // Example: Intercepting a specific story route: /story/:id
  const storyMatch = urlPath.match(/^\/story\/([a-zA-Z0-9_-]+)$/);
  
  if (storyMatch) {
    const storyId = storyMatch[1];
    try {
      // Fetch the specific story details from your backend API
      const response = await fetch(`${BACKEND_URL}/news/article/${storyId}`);
      if (response.ok) {
        const article = await response.json();
        title = `${article.title} | VibeFeed`;
        description = article.summary || description;
        imageUrl = article.image || imageUrl;
      }
    } catch (error) {
      console.error(`Error fetching SEO data for story ${storyId}:`, error);
      // Fallback to defaults silently on error
    }
  } else {
      // Add logic here for category routes (e.g., /technology, /business) 
      // if you want category-specific SEO titles
  }

  // 3. Inject Dynamic SEO Tags into the <head>
  $('title').text(title);
  
  // Primary Meta Tags
  $('meta[name="title"]').attr('content', title);
  $('meta[name="description"]').attr('content', description);

  // Open Graph / Facebook
  $('meta[property="og:type"]').attr('content', 'website');
  $('meta[property="og:url"]').attr('content', `https://vibefeed.firebaseapp.com${urlPath}`);
  $('meta[property="og:title"]').attr('content', title);
  $('meta[property="og:description"]').attr('content', description);
  $('meta[property="og:image"]').attr('content', imageUrl);

  // Twitter
  $('meta[property="twitter:card"]').attr('content', 'summary_large_image');
  $('meta[property="twitter:url"]').attr('content', `https://vibefeed.firebaseapp.com${urlPath}`);
  $('meta[property="twitter:title"]').attr('content', title);
  $('meta[property="twitter:description"]').attr('content', description);
  $('meta[property="twitter:image"]').attr('content', imageUrl);

  // 4. Send the populated HTML to the client
  res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
  res.status(200).send($.html());
});
```

> **Note**: This assumes a hypothetical `/api/news/article/:id` endpoint on your backend for fetching single article data. You will need to ensure your backend supports this route.

---

## 4. Configure Firebase Hosting Rewrites

You must tell Firebase Hosting to route navigation requests to your new Cloud Function instead of just serving the static `index.html`.

Modify your `firebase.json` in the project root:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "function": "ssr"
      }
    ]
  },
  "functions": {
    "source": "functions"
  }
}
```

By changing `"destination": "/index.html"` to `"function": "ssr"`, you instruct Firebase to pass all non-static file requests to your Cloud Function.

---

## 5. Deployment

To deploy both your compiled frontend (make sure you've run `npm run build` first) and the new SSR Cloud Function, run:

```bash
firebase deploy --only functions,hosting
```

Once deployed, tools like Facebook Debugger, Twitter Card Validator, and Googlebot will hit your Cloud Function, receive the HTML with populated meta tags, and correctly index your dynamic page content.
