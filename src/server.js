// Tinkering Hub WhatsApp Bot — WhatsApp Cloud API webhook server
// Free stack: Meta Cloud API + Render/Railway free tier

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// ====== CONFIG (set these as environment variables) ======
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "tinkering-hub-verify";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; // from Meta dashboard
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID; // from Meta dashboard
const GRAPH_URL = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;

// ====== LOAD CLUB DATA ======
const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "clubs.json"), "utf8")
);
const clubs = data.clubs;
const clubById = Object.fromEntries(clubs.map((c) => [c.id, c]));

// ====== WHATSAPP SEND HELPERS ======
async function sendMessage(payload) {
  const res = await fetch(GRAPH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error("Send failed:", res.status, await res.text());
  }
}

function sendText(to, body) {
  return sendMessage({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  });
}

// Interactive list: WhatsApp allows max 10 rows per section — perfect for 9 clubs + "About the Hub"
function sendClubMenu(to) {
  const rows = clubs.slice(0, 9).map((c) => ({
    id: c.id,
    title: c.name.slice(0, 24), // WhatsApp limit: 24 chars
    description: c.shortDesc.slice(0, 72),
  }));
  rows.push({
    id: "about_hub",
    title: "About the Hub",
    description: "What is the Tinkering Hub?",
  });

  return sendMessage({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: data.hubName },
      body: {
        text: "Hey! 👋 Pick a club to know more — what they do, when they meet, and how to join.",
      },
      footer: { text: "Reply 'menu' anytime to see this again" },
      action: {
        button: "View Clubs",
        sections: [{ title: "Our Clubs", rows }],
      },
    },
  });
}

function sendClubDetails(to, club) {
  const body =
    `*${club.name}* 🔹\n\n` +
    `${club.description}\n\n` +
    `👤 *Lead:* ${club.lead}\n` +
    `📞 *Contact:* ${club.contact}\n` +
    `🗓 *Meetings:* ${club.meetings}\n` +
    `✅ *How to join:* ${club.howToJoin}`;

  return sendMessage({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body },
      action: {
        buttons: [
          { type: "reply", reply: { id: "back_menu", title: "⬅️ All Clubs" } },
        ],
      },
    },
  });
}

function sendAboutHub(to) {
  return sendText(
    to,
    `*${data.hubName}* is the student innovation space of our college — home to ${clubs.length}+ clubs across robotics, coding, AI, design, aero and more.\n\nReply *menu* to explore the clubs!`
  );
}

// ====== WEBHOOK VERIFICATION (Meta calls this once during setup) ======
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// ====== INCOMING MESSAGES ======
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // ack immediately — Meta retries otherwise

  try {
    const change = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    if (!message) return;

    const from = message.from;

    // 1. User tapped a list item or button
    if (message.type === "interactive") {
      const replyId =
        message.interactive?.list_reply?.id ||
        message.interactive?.button_reply?.id;

      if (replyId === "about_hub") return sendAboutHub(from);
      if (replyId === "back_menu") return sendClubMenu(from);
      if (clubById[replyId]) return sendClubDetails(from, clubById[replyId]);
      return sendClubMenu(from);
    }

    // 2. Plain text
    if (message.type === "text") {
      const text = message.text.body.trim().toLowerCase();

      // Try matching a club name mentioned in the text
      const matched = clubs.find((c) =>
        text.includes(c.name.toLowerCase().replace(" club", ""))
      );
      if (matched) return sendClubDetails(from, matched);

      // Default: show the menu (covers "hi", "hello", "menu", anything else)
      return sendClubMenu(from);
    }

    // Any other message type → menu
    return sendClubMenu(from);
  } catch (err) {
    console.error("Webhook error:", err);
  }
});

app.get("/", (_req, res) => res.send("Tinkering Hub bot is running ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot listening on ${PORT}`));
