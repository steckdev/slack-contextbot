import { SlackCommandMiddlewareArgs } from "@slack/bolt";
import { OpenAIService } from "../services/openaiService";
import { ContextService } from "../services/contextService";
import { RateLimitService } from "../services/rateLimitService";

export class SlackHandlers {
  private openaiService: OpenAIService;
  private contextService: ContextService;
  private rateLimitService: RateLimitService;

  constructor(
    openaiService: OpenAIService,
    contextService: ContextService,
    rateLimitService: RateLimitService,
  ) {
    this.openaiService = openaiService;
    this.contextService = contextService;
    this.rateLimitService = rateLimitService;
  }

  handleSetData = async ({
    command,
    ack,
    respond,
  }: SlackCommandMiddlewareArgs) => {
    await ack();

    const userId = command.user_id;
    const contextText = command.text.trim();

    if (!contextText) {
      await respond({
        response_type: "ephemeral",
        text: "Please provide your context text in the message after `/context`.",
      });
      return;
    }

    this.contextService.saveContext(userId, contextText);

    await respond({
      response_type: "ephemeral",
      text: "Your context has been saved! You can now use `/question` to get an answer based on your context.",
    });
  };

  handleQuestion = async ({
    command,
    ack,
    respond,
  }: SlackCommandMiddlewareArgs) => {
    await ack();

    const userId = command.user_id;
    const question = command.text.trim();

    const context = this.contextService.getContext(userId);
    const history = this.contextService.getHistory(userId);
    if (!history) {
      await respond({
        response_type: "ephemeral",
        text: "Please provide your context first using `/addhistory`.",
      });
      return;
    }
    if (!context) {
      await respond({
        response_type: "ephemeral",
        text: "Please provide your context first using `/setcontext`.",
      });
      return;
    }

    if (!this.rateLimitService.canProceedWithRequest(userId)) {
      const remainingTime = this.rateLimitService.getTimeUntilReset(userId);
      await respond({
        response_type: "ephemeral",
        text: `You have reached the limit of 100 requests per hour. Please try again in ${remainingTime} minutes.`,
      });
      return;
    }

    try {
      const answer = await this.openaiService.generateResponse(
        context,
        history,
        question,
      );
      await respond({
        response_type: "ephemeral",
        text: `Here's how your context might answer this question:\n*${question}*\n\n${answer}`,
      });
    } catch (error) {
      await respond({
        response_type: "ephemeral",
        text: (error as Error).message,
      });
    }
  };

  handleAddToHistory = async ({
    command,
    ack,
    respond,
  }: SlackCommandMiddlewareArgs) => {
    await ack();

    const userId = command.user_id;
    const historyText = command.text.trim();

    if (!historyText) {
      await respond({
        response_type: "ephemeral",
        text: "Please provide text to add to history.",
      });
      return;
    }

    this.contextService.addToHistory(userId, historyText);
    await respond({
      response_type: "ephemeral",
      text: "Your history has been updated.",
    });
  };

  handleClearHistory = async ({
    command,
    ack,
    respond,
  }: SlackCommandMiddlewareArgs) => {
    await ack();

    const userId = command.user_id;
    this.contextService.clearHistory(userId);

    await respond({
      response_type: "ephemeral",
      text: "Your history has been cleared.",
    });
  };
}
