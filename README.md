# ProgressPilot

A personal AI mentor that tracks my daily learning progress. I log how many hours I studied, my energy level and what I worked on. The agent reads my last 7 days from Notion, gives me specific feedback, and saves everything back to Notion. Every Sunday it generates a weekly summary and emails it to me.

It is a personal project: the prompts are written for me, but the structure is easy to adapt.

## Features

- **Daily check-in:** a web form and a command-line command. Claude analyses the day against the last 7 days and the result is saved to a Notion database.
- **Chat:** a conversational mentor that knows my recent activity.
- **Voice mode:** talk to the mentor and hear the replies, using ElevenLabs text-to-speech.
- **Weekly summary:** totals, average energy and a consistency score for the week, written up by Claude, saved to Notion and sent by email. A cron job runs it every Sunday at 9:00.

## Stack

Node.js, Express, the Anthropic SDK (Claude), the Notion API as the database, ElevenLabs text-to-speech, Nodemailer, node-cron, and a plain HTML, CSS and JavaScript front end in `public/`.

## Project structure

| File | What it does |
| --- | --- |
| `server.js` | Express server: check-in, chat, voice and text-to-speech endpoints, plus the web UI |
| `agent.js` | Command-line agent: `checkin`, `weekly`, `testemail`, plus the Sunday cron job |
| `public/` | Front end: check-in/chat page and voice page |
| `test.js` | Small script to check that the Notion integration can write to the Weekly Summary database |

## Setup

Requires Node.js 18 or newer.

```bash
npm install
cp .env.example .env
```

1. Fill in `.env`. Every variable is explained in `.env.example`.
2. Create a Notion integration at notion.so/my-integrations and copy its token into `NOTION_API_KEY`.
3. Create two Notion databases and share both with the integration. Put their IDs in `DAILY_LOGS_DB` and `WEEKLY_SUMMARY_DB`.
   - **Daily Logs** properties: `Name` (title), `Date` (date), `Study Hours` (number), `Energy Level` (number), `Log` (text), `Response` (text), `Tasks Completed` (text), `Goals Progress` (text).
   - **Weekly Summary** properties: `Name` (title), `Week` (text), `Summary` (text), `Total Study Hours` (number), `Average Energy` (number), `Consistency Score` (number).
4. For the weekly email, create a Google app password for the Gmail account and put it in `SMTP_PASS`.

## Run

Web app (check-in and chat at `/`, voice mode at `/voice`):

```bash
npm start
```

Command line:

```bash
node agent.js checkin "3" "8" "what I did" "progress on my goals"
node agent.js weekly
node agent.js testemail
```

## Notes

- The server has no login, so run it locally or put authentication in front of it before exposing it to the internet.
- Secrets live only in `.env`, which is git-ignored.
