# Tinkering Hub WhatsApp Bot 🤖

![Status](https://img.shields.io/badge/status-prototype-0969da?style=flat-square)

A free WhatsApp bot for your college's Tinkering Hub. Students message it and get an interactive menu of all clubs — tap a club to see what it does, when it meets, and how to join.

Built on the **official WhatsApp Cloud API** (free) + Node.js/Express.

## How it works

- Student sends anything ("hi", "menu", etc.) → gets an interactive **list menu** of all clubs
- Taps a club → gets details + a "⬅️ All Clubs" button
- Types a club name directly ("robotics") → jumps straight to that club
- "About the Hub" option explains the hub itself

## Step 1 — Edit `clubs.json`

Replace the placeholder clubs with your real 9 clubs: names, descriptions, leads, contacts, meeting times, join instructions. That's the only file you need to touch for content.

> WhatsApp limits: club name shown in the menu is max 24 chars, short description max 72 chars (the code truncates automatically, but keep them short).

## Step 2 — Set up Meta / WhatsApp Cloud API (free)

1. Go to https://developers.facebook.com → create an account → **Create App** → type "Business"
2. Add the **WhatsApp** product to the app
3. In **WhatsApp → API Setup** you get:
   - A free **test phone number** (works immediately, can message up to 5 verified numbers — perfect for building)
   - A temporary **access token** (later, generate a permanent one via a System User in Business Settings)
   - Your **Phone Number ID**
4. Add your own number as a test recipient and send the test message from the dashboard to confirm it works

## Step 3 — Deploy the server (free)

Push this folder to GitHub, then deploy on **Render** (render.com, free tier):

- New → Web Service → connect the repo
- Build command: `npm install` — Start command: `npm start`
- Add environment variables:
  - `WHATSAPP_TOKEN` = your Meta access token
  - `PHONE_NUMBER_ID` = from the API Setup page
  - `VERIFY_TOKEN` = any secret string you make up (e.g. `tinkering-hub-verify`)

Railway or Cloudflare Workers also work. Note: Render free tier sleeps after inactivity — first message after a while may take ~30s to wake it. Fine for a club bot; you can use a free uptime pinger (e.g. cron-job.org hitting `/`) to keep it warm.

## Step 4 — Connect the webhook

In Meta dashboard → **WhatsApp → Configuration**:

1. Callback URL: `https://your-app.onrender.com/webhook`
2. Verify token: the same `VERIFY_TOKEN` you set
3. Click Verify & Save (your server answers the challenge automatically)
4. Under **Webhook fields**, subscribe to `messages`

Now message the test number from your phone — you should get the club menu. 🎉

## Step 5 — Going live for all students

The test number only works with 5 registered testers. To open it to everyone:

1. Get a real phone number for the hub that is **not already on WhatsApp** (a cheap new SIM works)
2. In Meta dashboard, add it as a phone number and verify via OTP
3. Complete basic business verification if prompted (for a student club, the display name review is usually the main step)

Pricing note (as of my knowledge): **user-initiated conversations are free up to 1,000/month**, and students always message the bot first, so a club FAQ bot typically stays fully free. Check Meta's current WhatsApp pricing page before launch, as this changes.

## Local development

```bash
npm install
VERIFY_TOKEN=tinkering-hub-verify WHATSAPP_TOKEN=xxx PHONE_NUMBER_ID=yyy npm run dev
```

Use `ngrok http 3000` to expose localhost for webhook testing before deploying.

## Later upgrades

- **AI answers**: pipe unmatched text questions to the Anthropic API with `clubs.json` as context, so students can ask "which club does drones?" in natural language
- **Events**: add an `events` array in the JSON + a "📅 Upcoming Events" row in the menu
- **Admin updates**: let club leads update info via a Google Sheet the bot reads
