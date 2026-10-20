// Quick manual check that the Notion integration can write to the Weekly Summary database.
// Usage: node test.js   (requires NOTION_API_KEY and WEEKLY_SUMMARY_DB in .env)
require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function test() {
  try {
    const response = await notion.pages.create({
      parent: { database_id: process.env.WEEKLY_SUMMARY_DB },
      properties: {
        Name: {
          title: [{ text: { content: 'Test' } }]
        }
      }
    });
    const page = await notion.pages.retrieve({ page_id: response.id });
    console.log('Weekly Summary properties:');
    console.log(Object.keys(page.properties));
  } catch (err) {
    console.log('Error:', err.message);
  }
}

test();
