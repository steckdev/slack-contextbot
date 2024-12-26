import { App } from '@slack/bolt';
import dotenv from 'dotenv';
import { OpenAIService } from './services/openaiService';
import { ContextService } from './services/contextService';
import { SlackHandlers } from './handlers/slackHandlers';
import { RateLimitService } from './services/rateLimitService';

dotenv.config();

const openaiService = new OpenAIService(process.env.OPENAI_API_KEY || '');
const contextService = new ContextService();
const rateLimitService = new RateLimitService();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN || '',
  appToken: process.env.SLACK_APP_TOKEN || '',
  socketMode: true,
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
});

const slackHandlers = new SlackHandlers(openaiService, contextService, rateLimitService);

app.command('/addhistory', slackHandlers.handleAddToHistory);
app.command('/clearhistory', slackHandlers.handleClearHistory);
app.command('/setcontext', slackHandlers.handleSetData);
app.command('/question', slackHandlers.handleQuestion);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
(async () => {
  await app.start();
  // eslint-disable-next-line no-console
  console.log('⚡️ Slack Context Bot is running!');
})();
