import { App, ExpressReceiver, LogLevel } from '@slack/bolt';
import dotenv from 'dotenv';
import { OpenAIService } from './services/openaiService';
import { ContextService } from './services/contextService';
import { SlackHandlers } from './handlers/slackHandlers';
import { RateLimitService } from './services/rateLimitService';
import { SlackService } from './services/slackService';

dotenv.config();

const openaiService = new OpenAIService(process.env.OPENAI_API_KEY || '');
const contextService = new ContextService();
const rateLimitService = new RateLimitService();
const slackService = new SlackService();

// const receiver = new ExpressReceiver({
//   signingSecret: process.env.SLACK_SIGNING_SECRET || '',
//   endpoints: '/slack/events',
// });

const app = new App({
  token: process.env.SLACK_BOT_TOKEN || '',
  appToken: process.env.SLACK_APP_TOKEN || '',
  socketMode: true,
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  // receiver,
  logLevel: LogLevel.INFO, // Enable debugging
});

const slackHandlers = new SlackHandlers(openaiService, contextService, rateLimitService, slackService);

// COMMANDS
app.command('/addhistory', slackHandlers.handleAddToHistory);
app.command('/clearhistory', slackHandlers.handleClearHistory);
app.command('/setcontext', slackHandlers.handleSetData);
app.command('/question', slackHandlers.handleQuestion);
app.command('/summarize_thread', slackHandlers.handleSummarizeThread);
app.command('/summarize_channel', slackHandlers.handleSummarizeChannel);

// SHORTCUTS
app.shortcut('summarize_thread_shortcut', slackHandlers.handleSummarizeThreadShortcut);

// Add a basic event listener to verify the app is receiving events
app.event('app_mention', async ({ event, say }) => {
  await say(`Hello <@${event.user}>!`);
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  // eslint-disable-next-line no-console

  console.log(`⚡️ Slack Context Bot is running ⚡️`);
  // console.log(`⚡️ Slack Context Bot is running Port: http://localhost:${process.env.PORT || 3000} ⚡️`);
})();
