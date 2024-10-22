import { App } from "@slack/bolt";
import { OpenAIService } from "./services/openaiService";
import { ContextService } from "./services/contextService";
import { SlackHandlers } from "./handlers/slackHandlers";
import dotenv from "dotenv";
import { RateLimitService } from "./services/rateLimitService";

dotenv.config();

const openaiService = new OpenAIService(process.env.OPENAI_API_KEY || "");
const contextService = new ContextService();
const rateLimitService = new RateLimitService();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN || "",
  appToken: process.env.SLACK_APP_TOKEN || "",
  socketMode: true,
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
});

const slackHandlers = new SlackHandlers(
  openaiService,
  contextService,
  rateLimitService,
);

app.command("/addhistory", slackHandlers.handleAddToHistory);
app.command("/clearhistory", slackHandlers.handleClearHistory);
app.command("/setcontext", slackHandlers.handleSetData);
app.command("/question", slackHandlers.handleQuestion);

(async () => {
  await app.start();
  console.log("⚡️ Slack Context Bot is running!");
})();
