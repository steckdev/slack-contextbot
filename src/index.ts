import { App } from "@slack/bolt";
import { OpenAIService } from "./services/openaiService";
import { ContextService } from "./services/contextService";
import { SlackHandlers } from "./handlers/slackHandlers";
import dotenv from "dotenv";

dotenv.config();

const openaiService = new OpenAIService(process.env.OPENAI_API_KEY || "");
const contextService = new ContextService();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN || "",
  appToken: process.env.SLACK_APP_TOKEN || "",
  socketMode: true,
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
});

const slackHandlers = new SlackHandlers(openaiService, contextService);

app.command("/sendcontext", slackHandlers.handleSendContext);
app.command("/experience", slackHandlers.handleExperience);

(async () => {
  await app.start();
  console.log("⚡️ Slack Context Bot is running!");
})();
