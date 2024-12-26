/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
import { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { OpenAIService } from '../services/openaiService';
import { ContextService } from '../services/contextService';
import { RateLimitService } from '../services/rateLimitService';

export class SlackHandlers {
  private openaiService: OpenAIService;

  private contextService: ContextService;

  private rateLimitService: RateLimitService;

  constructor(openaiService: OpenAIService, contextService: ContextService, rateLimitService: RateLimitService) {
    this.openaiService = openaiService;
    this.contextService = contextService;
    this.rateLimitService = rateLimitService;
  }

  handleSetData = async ({ command, ack, respond }: SlackCommandMiddlewareArgs) => {
    await ack();

    const userId = command.user_id;
    const contextText = command.text.trim();

    if (!contextText) {
      await this.respondEphemeral(respond, 'Please provide your context text in the message after `/context`.');
      return;
    }

    this.contextService.saveContext(userId, contextText);

    await this.respondEphemeral(
      respond,
      'Your context has been saved! You can now use `/question` to get an answer based on your context.'
    );
  };

  handleQuestion = async ({ command, ack, respond }: SlackCommandMiddlewareArgs) => {
    await ack();

    const userId = command.user_id;
    const question = command.text.trim();

    const context = this.contextService.getContext(userId);
    const history = this.contextService.getHistory(userId);

    if (!history) {
      await this.respondEphemeral(respond, 'Please provide your context first using `/addhistory`.');
      return;
    }

    if (!context) {
      await this.respondEphemeral(respond, 'Please provide your context first using `/setcontext`.');
      return;
    }

    if (!this.rateLimitService.canProceedWithRequest(userId)) {
      await this.respondWithRateLimitError(userId, respond);
      return;
    }

    try {
      const answer = await this.openaiService.generateResponse(context, history, question);
      await this.respondEphemeral(
        respond,
        `Here's how your context might answer this question:\n*${question}*\n\n${answer}`
      );
    } catch (_error) {
      await this.respondEphemeral(respond, (_error as Error).message);
    }
  };

  handleAddToHistory = async ({ command, ack, respond }: SlackCommandMiddlewareArgs) => {
    await ack();

    const userId = command.user_id;
    const historyText = command.text.trim();

    if (!historyText) {
      await this.respondEphemeral(respond, 'Please provide text to add to history.');
      return;
    }

    this.contextService.addToHistory(userId, historyText);
    await this.respondEphemeral(respond, 'Your history has been updated.');
  };

  handleClearHistory = async ({ command, ack, respond }: SlackCommandMiddlewareArgs) => {
    await ack();

    const userId = command.user_id;
    this.contextService.clearHistory(userId);

    await this.respondEphemeral(respond, 'Your history has been cleared.');
  };

  handleSummarize = async ({ command, ack, respond, client }: SlackCommandMiddlewareArgs & AllMiddlewareArgs) => {
    await ack();

    const userId = command.user_id;

    if (!this.rateLimitService.canProceedWithRequest(userId)) {
      await this.respondWithRateLimitError(userId, respond);
      return;
    }

    try {
      const messages = await this.fetchRecentMessages(client, command.channel_id);

      if (!messages) {
        await this.respondEphemeral(respond, 'No messages found in the channel.');
        return;
      }

      const summary = await this.openaiService.generateSummary(messages);

      await respond({
        response_type: 'in_channel',
        text: `Summary of the recent conversation:\n${summary}`,
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      await this.respondEphemeral(respond, 'There was an error processing your request.');
    }
  };

  private async respondEphemeral(respond: any, text: string) {
    await respond({
      response_type: 'ephemeral',
      text,
    });
  }

  private async respondWithRateLimitError(userId: string, respond: any) {
    const remainingTime = this.rateLimitService.getTimeUntilReset(userId);
    await this.respondEphemeral(
      respond,
      `You have reached the limit of requests per hour. Please try again in ${remainingTime} minutes.`
    );
  }

  private async fetchRecentMessages(client: any, channelId: string): Promise<string | null> {
    const result = await client.conversations.history({
      channel: channelId,
      limit: 20,
    });

    const messages = result.messages
      ?.filter((message: any) => !message.subtype)
      .map((message: any) => message.text)
      .reverse()
      .join('\n');

    return messages || null;
  }
}
