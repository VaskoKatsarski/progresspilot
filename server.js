require('dotenv').config();

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DAILY_LOGS_DB = process.env.DAILY_LOGS_DB;
const WEEKLY_SUMMARY_DB = process.env.WEEKLY_SUMMARY_DB;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { Client } = require('@notionhq/client');
const { ElevenLabsClient } = require('elevenlabs');

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.get('/health', (req, res) => res.send('OK'));

app.get('/voice', (req, res) => {
  res.sendFile(__dirname + '/public/voice.html');
});

const claude = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function getRecentHistory() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    
    const response = await notion.databases.query({
      database_id: DAILY_LOGS_DB,
      filter: {
        property: 'Date',
        date: {
          after: sevenDaysAgo.toISOString().split('T')[0]
        }
      },
      sorts: [{ property: 'Date', direction: 'ascending' }]
    });

    if (response.results.length === 0) {
      return 'No recent check-ins found.';
    }

    const history = response.results.map(entry => {
      const props = entry.properties;
      const date = props.Date?.date?.start || 'Unknown date';
      const hours = props['Study Hours']?.number || 0;
      const energy = props['Energy Level']?.number || 0;
      const log = props.Log?.rich_text[0]?.text?.content || '';
      return `${date}: ${hours}h study, energy ${energy}/10 — ${log}`;
    });

    return history.join('\n');
  } catch (err) {
    return 'Could not fetch history.';
  }
}

app.post('/checkin', async (req, res) => {
  const { checkin, hours, energy } = req.body;

  try {
    const recentHistory = await getRecentHistory();
    const response = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `You are ProgressPilot, the personal mentor and progress tracking assistant of Vasil Katsarski, a 21 year old entrepreneur from Vrachesh, Bulgaria.

WHO VASIL IS:
- 21 years old, building his future from scratch
- Currently learning JavaScript, HTML, CSS and Git
- Building ProgressPilot as his first AI agent
- Ultimate goal: master AI agents and start an AI automation business
- Ideal day: 2 hours work, 2 hours video editing, rest on AI, studying and skill development

HIS RECENT ACTIVITY (last 7 days):
${recentHistory}

YOUR ROLE:
- Be his mentor, not just a tracker
- Be motivating, analytical and direct
- Guide him toward becoming successful by developing his skills consistently
- Spot patterns in his data and call them out honestly
- Push him when his energy or hours are low
- Celebrate wins genuinely when he deserves it

WHEN ANALYZING HIS CHECK-IN:
1. Acknowledge specifically what he did today
2. Highlight his main win of the day
3. Analyze his energy and hours
4. Give one specific actionable suggestion for tomorrow
5. End with a short sharp motivating line

Daily check-in:
Study hours: ${hours}
Energy level: ${energy}/10
What I did: ${checkin}`
        }
      ]
    });

    const agentReply = response.content[0].text;

    await notion.pages.create({
      parent: { database_id: DAILY_LOGS_DB },
      properties: {
        Name: {
          title: [{ text: { content: new Date().toLocaleDateString() } }]
        },
        Log: {
          rich_text: [{ text: { content: checkin } }]
        },
        Response: {
          rich_text: [{ text: { content: agentReply.substring(0, 1999) } }]
        },
        'Study Hours': {
          number: parseFloat(hours)
        },
        'Energy Level': {
          number: parseInt(energy)
        },
        Date: {
          date: { start: new Date().toISOString().split('T')[0] }
        }
      }
    });

    res.json({ response: agentReply });

  } catch (err) {
    res.json({ response: 'Error: ' + err.message });
  }
});

app.post('/chat', async (req, res) => {
  const { message, history } = req.body;
  try {
    const recentHistory = await getRecentHistory();

    const messages = [
      ...(Array.isArray(history) ? history : []),
      { role: 'user', content: message }
    ];

    const response = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: `You are ProgressPilot, the personal AI companion and mentor of Vasil Katsarski, a 21 year old entrepreneur from Vrachesh, Bulgaria learning JavaScript and building AI agents with the goal of starting an AI automation business.

You are building toward becoming his Jarvis — a superhuman AI companion that knows everything about him and helps him become the best version of himself.

WHO VASIL IS:
- 21 years old, building his future from scratch
- Currently learning JavaScript, HTML, CSS and Git
- Building ProgressPilot as his first AI agent
- Ultimate goal: master AI agents and start an AI automation business
- Wants to build a Jarvis-like personal AI companion
- Ideal day: 2 hours work, 2 hours video editing, rest on AI and skill development

HIS RECENT ACTIVITY (last 7 days):
${recentHistory}

YOUR PERSONALITY:
- Direct, honest, motivating
- Like a genius friend who knows everything and wants him to win
- Remember everything he tells you in this conversation
- Reference earlier parts of the conversation naturally
- Reference his recent activity when relevant
- Push him when he needs pushing, celebrate when he deserves it
- Keep responses concise and conversational — 2-4 sentences maximum unless he asks for detail.`,
      messages: messages
    });

    const agentReply = response.content[0].text;
    res.json({ response: agentReply });

  } catch (err) {
    res.json({ response: 'Error: ' + err.message });
  }
});
app.post('/voice', async (req, res) => {
  const { message, history } = req.body;

  try {
    const recentHistory = await getRecentHistory();

    const messages = [
      ...(Array.isArray(history) ? history : []),
      { role: 'user', content: message }
    ];

    const response = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 150,
      system: `You are ProgressPilot, the personal AI companion of Vasil Katsarski, a 21 year old entrepreneur from Vrachesh, Bulgaria building AI agents and an AI automation business.

You are his Jarvis — a voice assistant. He is speaking to you out loud.

HIS RECENT ACTIVITY (last 7 days):
${recentHistory}

VOICE RESPONSE RULES:
- Maximum 2-3 sentences. You are being read aloud.
- No markdown, no bullet points, no headers
- Speak naturally like a real conversation
- Be direct, smart and motivating
- Reference his recent activity when relevant`,
      messages: messages
    });

    res.json({ response: response.content[0].text });

  } catch (err) {
    res.json({ response: 'Error: ' + err.message });
  }
});
app.post('/speak', async (req, res) => {
  const { text } = req.body;

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/TX3LPaxmHKxFdv7VOQHJ', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs error:', response.status, error);
      return res.status(500).json({ error: 'ElevenLabs failed' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (err) {
    console.error('Speak error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
console.log('PORT env variable:', process.env.PORT);
console.log('Listening on port:', port);
app.listen(port, () => {
  console.log('ProgressPilot running on port', port);
});