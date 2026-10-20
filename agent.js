require('dotenv').config();

const nodemailer = require('nodemailer');
const cron = require('node-cron');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
const Anthropic = require('@anthropic-ai/sdk');
const { Client } = require('@notionhq/client');

const claude = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
const notion = new Client({ auth: process.env.NOTION_API_KEY });

const DAILY_LOGS_DB = process.env.DAILY_LOGS_DB;
const WEEKLY_SUMMARY_DB = process.env.WEEKLY_SUMMARY_DB;

async function checkIn(studyHours, energyLevel, tasksCompleted, goalsProgress) {
  const userMessage = `
    Study hours today: ${studyHours}
    Energy level: ${energyLevel}/10
    Tasks completed: ${tasksCompleted}
    Goals progress: ${goalsProgress}
  `;

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
3. Analyze his energy and hours - spot patterns, call out anything worth noting
4. Give one specific, actionable suggestion for tomorrow tied to his goals
5. End with a short sharp motivating line

Always be specific to his goals. Never give generic advice. Talk to him like a mentor who knows him well and wants him to win.

Daily check-in: ${userMessage}`
      }
    ]
  });

  const agentReply = response.content[0].text;
  console.log('\nProgressPilot:', agentReply);

  await notion.pages.create({
    parent: { database_id: DAILY_LOGS_DB },
    properties: {
      Name: {
        title: [{ text: { content: new Date().toLocaleDateString() } }]
      },
      Log: {
        rich_text: [{ text: { content: userMessage } }]
      },
      Response: {
        rich_text: [{ text: { content: agentReply } }]
      },
      'Study Hours': {
        number: parseFloat(studyHours)
      },
      'Energy Level': {
        number: parseInt(energyLevel)
      },
      'Tasks Completed': {
        rich_text: [{ text: { content: tasksCompleted } }]
      },
      'Goals Progress': {
        rich_text: [{ text: { content: goalsProgress } }]
      },
      Date: {
        date: { start: new Date().toISOString().split('T')[0] }
      }
    }
  });

  console.log('\n✅ Daily log saved to Notion');
}

async function weeklySummary() {
  console.log('\nFetching your week from Notion...');

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const response = await notion.databases.query({
    database_id: DAILY_LOGS_DB,
    filter: {
      property: 'Date',
      date: {
        after: sevenDaysAgo.toISOString().split('T')[0]
      }
    }
  });

  const entries = response.results;

  if (entries.length === 0) {
    console.log('No entries found for this week. Keep checking in daily!');
    return;
  }

  let totalStudyHours = 0;
  let totalEnergy = 0;
  let allTasks = [];
  let allGoals = [];

  entries.forEach(entry => {
    const props = entry.properties;
    totalStudyHours += props['Study Hours']?.number || 0;
    totalEnergy += props['Energy Level']?.number || 0;
    const task = props['Tasks Completed']?.rich_text[0]?.text?.content;
    const goal = props['Goals Progress']?.rich_text[0]?.text?.content;
    if (task) allTasks.push(task);
    if (goal) allGoals.push(goal);
  });

  const avgEnergy = (totalEnergy / entries.length).toFixed(1);
  const consistencyScore = Math.round((entries.length / 7) * 100);

  const weekData = `
    Days logged this week: ${entries.length}/7
    Total study hours: ${totalStudyHours}
    Average energy level: ${avgEnergy}/10
    Consistency score: ${consistencyScore}%
    Tasks completed: ${allTasks.join(', ')}
    Goals progress: ${allGoals.join(', ')}
  `;

  console.log('\nGenerating your weekly summary with Claude...');

  const summaryResponse = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `You are ProgressPilot, the personal mentor of Vasil, a 21 year old entrepreneur from Bulgaria building AI agents and learning programming.

Generate his weekly summary report based on this data:
${weekData}

Include:
1. Weekly overview — how was this week overall
2. Biggest win of the week
3. Pattern spotted — what do the numbers tell you
4. Consistency analysis — is he showing up enough
5. Focus recommendation for next week
6. One motivating closing statement

Be analytical, honest and motivating. Talk like his mentor who tracks his every move and wants him to win.`
      }
    ]
  });

  const summaryText = summaryResponse.content[0].text;
  console.log('\n📊 WEEKLY SUMMARY:\n', summaryText);

  await notion.pages.create({
    parent: { database_id: WEEKLY_SUMMARY_DB },
    properties: {
      Name: {
        title: [{ text: { content: `Week of ${new Date().toLocaleDateString()}` } }]
      },
      Week: {
        rich_text: [{ text: { content: `Week of ${new Date().toLocaleDateString()}` } }]
      },
      Summary: {
    rich_text: [{ text: { content: summaryText.substring(0, 1999) } }]
      },
      'Total Study Hours': {
        number: totalStudyHours
      },
      'Average Energy': {
        number: parseFloat(avgEnergy)
      },
      'Consistency Score': {
        number: consistencyScore
      }
    }
  });

  console.log('\n✅ Weekly summary saved to Notion');
  await sendWeeklySummaryEmail(summaryText);
}

const command = process.argv[2];

if (command === 'checkin') {
  const args = process.argv.slice(3);
  if (args.length < 4) {
    console.log('Usage: node agent.js checkin "study_hours" "energy_level" "tasks_completed" "goals_progress"');
  } else {
    checkIn(args[0], args[1], args[2], args[3]);
  }
} else if (command === 'weekly') {
  weeklySummary();
} else if (command === 'testemail') {
  sendWeeklySummaryEmail('This is a test email from ProgressPilot. Your agent is working!');
} else {
  console.log('Commands:');
  console.log('  node agent.js checkin "3" "8" "tasks" "goals"');
  console.log('  node agent.js weekly');
  console.log('  node agent.js testemail');
}

async function sendWeeklySummaryEmail(summaryText) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: process.env.MAIL_TO || process.env.SMTP_USER,
    subject: `ProgressPilot Weekly Summary — ${new Date().toLocaleDateString()}`,
    text: summaryText
  };

  await transporter.sendMail(mailOptions);
  console.log('\n📧 Weekly summary sent to your email!');
}

// Run every Sunday at 9:00 AM
cron.schedule('0 9 * * 0', () => {
  console.log('Running weekly summary...');
  weeklySummary();
});