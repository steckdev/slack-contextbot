import { SlackCommandMiddlewareArgs } from "@slack/bolt";
import { OpenAIService } from "../services/openaiService";
import { ContextService } from "../services/contextService";

export class SlackHandlers {
  private openaiService: OpenAIService;
  private contextService: ContextService;

  constructor(openaiService: OpenAIService, contextService: ContextService) {
    this.openaiService = openaiService;
    this.contextService = contextService;
  }

  handleSendContext = async ({
    command,
    ack,
    say,
  }: SlackCommandMiddlewareArgs) => {
    await ack();

    const userId = command.user_id;
    const contextText = command.text.trim();

    if (!contextText) {
      await say(
        "Please provide your context text in the message after `/context`.",
      );
      return;
    }

    this.contextService.saveContext(userId, contextText);
    await say(
      "Your context has been saved! You can now use `/prompt` to ask questions based on your context.",
    );
  };

  handleExperience = async ({
    command,
    ack,
    say,
  }: SlackCommandMiddlewareArgs) => {
    await ack();

    const userId = command.user_id;
    const question = command.text.trim();

    const context = this.contextService.getContext(userId);
    if (!context) {
      await say("Please provide your context first using `/context`.");
      return;
    }

    if (!this.contextService.canProceedWithRequest(userId)) {
      const remainingTime = this.contextService.getTimeUntilReset(userId);
      await say(
        `You have reached the limit of 20 requests per hour. Please try again in ${remainingTime} minutes.`,
      );
      return;
    }

    try {
      const answer = await this.openaiService.generateResponse(
        context,
        question,
      );
      await say(
        `Here's how your context might answer this question:\n*${question}*\n\n${answer}`,
      );
    } catch (error) {
      await say((error as Error).message);
    }
  };
}
