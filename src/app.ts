import { App, SlackCommandMiddlewareArgs } from "@slack/bolt";
import { ClientOptions, OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

interface UserContext {
  [key: string]: string;
}

interface UserRequestCounts {
  count: number;
  resetTime: number;
}

export const userContext: UserContext = {};
export const userRequestCounts: { [key: string]: UserRequestCounts } = {};

// Rate limit: 20 requests per hour
const RATE_LIMIT = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Initialize OpenAI API
export const createOpenAIInstance = (): OpenAI => {
  const configuration: ClientOptions = {
    apiKey: process.env.OPENAI_API_KEY || "",
  };
  return new OpenAI(configuration);
};

// Initialize the Slack app
export const createAppInstance = (): App => {
  return new App({
    token: process.env.SLACK_BOT_TOKEN || "",
    appToken: process.env.SLACK_APP_TOKEN || "",
    socketMode: true,
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  });
};

// Command handlers
export const handleSendContext = async ({
  command,
  ack,
  say,
}: SlackCommandMiddlewareArgs) => {
  await ack();

  const userId = command.user_id;
  const contextText = command.text.trim();

  if (!contextText) {
    await say(
      "Please provide your context text in the message after `/context`."
    );
    return;
  }

  // Store the context text for this user
  userContext[userId] = contextText;
  userRequestCounts[userId] = {
    count: 0,
    resetTime: Date.now() + RATE_LIMIT_WINDOW_MS,
  };
  await say(
    "Your context has been saved! You can now use `/prompt` to ask questions based on your context."
  );
};

export const handleExperience = async (
  { command, ack, say }: SlackCommandMiddlewareArgs,
  openai: OpenAI
) => {
  await ack();

  const userId = command.user_id;
  const question = command.text.trim();

  if (!userContext[userId]) {
    await say("Please provide your context first using `/sendcontext`.");
    return;
  }

  const currentTime = Date.now();
  const userCountInfo = userRequestCounts[userId];

  // Initialize request counts if they don't exist for the user
  if (!userCountInfo) {
    userRequestCounts[userId] = {
      count: 0,
      resetTime: currentTime + RATE_LIMIT_WINDOW_MS,
    };
  }

  // Check if the user is within the rate limit
  if (userRequestCounts[userId].count >= RATE_LIMIT) {
    if (currentTime < userRequestCounts[userId].resetTime) {
      const remainingTime = Math.ceil(
        (userRequestCounts[userId].resetTime - currentTime) / 60000
      );
      await say(
        `You have reached the limit of 20 requests per hour. Please try again in ${remainingTime} minutes.`
      );
      return;
    } else {
      // Reset the count and time after the rate limit window has passed
      userRequestCounts[userId].count = 0;
      userRequestCounts[userId].resetTime = currentTime + RATE_LIMIT_WINDOW_MS;
    }
  }

  // Increment the count for this user
  userRequestCounts[userId].count += 1;

  const context = userContext[userId];

  try {
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `The following is a context:\n${context}\n\nBased on this context, how would the person answer the following job-related question?\n\nQuestion: ${question}\n\nAnswer:`,
        },
      ],
      max_tokens: 300,
    });

    const answer = aiResponse.choices[0].message.content;

    const response = `Here's how your context might answer this question:\n*${question}*\n\n${answer}`;
    await say(response);
  } catch (error) {
    console.error("Error with OpenAI API:", error);
    await say(
      "There was an error processing your request. Please try again later."
    );
  }
};

// Export the command handlers for testing
export const registerCommands = (app: App, openai: OpenAI) => {
  app.command("/sendcontext", async (args) => handleSendContext(args));
  app.command("/experience", async (args) => handleExperience(args, openai));
};
