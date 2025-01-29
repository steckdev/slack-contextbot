/* eslint-disable max-lines */
import { OpenAIService } from './openaiService';
import { RateLimitService } from './rateLimitService';
import { ContextService } from './contextService';

export class SlackQuestionService {
  async handleQuestion(
    userId: string,
    question: string,
    respond: any,
    contextService: ContextService,
    rateLimitService: RateLimitService,
    openaiService: OpenAIService
  ): Promise<void> {
    const context = contextService.getContext(userId);
    const history = contextService.getHistory(userId);

    if (!history) {
      await this.respondEphemeral(respond, 'Please provide your context first using `/addhistory`.');
      return;
    }

    if (!context) {
      await this.respondEphemeral(respond, 'Please provide your context first using `/setcontext`.');
      return;
    }

    if (!rateLimitService.canProceedWithRequest(userId)) {
      await this.respondWithRateLimitError(userId, rateLimitService, respond);
      return;
    }

    try {
      const metadata = await openaiService.generateEnhancedMetadata(context, null as any);
      const answer = await openaiService.generateResponseWithMetadata(context, metadata, question);

      await this.respondEphemeral(
        respond,
        `Here's how your context might answer this question:\n*${question}*\n\n${answer}`
      );
    } catch (error) {
      console.error(error);
      await this.respondEphemeral(respond, (error as Error).message);
    }
  }

  async handleAddToHistory(
    userId: string,
    historyText: string,
    respond: any,
    contextService: ContextService
  ): Promise<void> {
    if (!historyText) {
      await this.respondEphemeral(respond, 'Please provide text to add to history.');
      return;
    }

    contextService.addToHistory(userId, historyText);
    await this.respondEphemeral(respond, 'Your history has been updated.');
  }

  async handleSetData(
    userId: string,
    contextText: string,
    respond: any,
    contextService: ContextService
  ): Promise<void> {
    if (!contextText) {
      await this.respondEphemeral(respond, 'Please provide your context text in the message after `/context`.');
      return;
    }

    contextService.saveContext(userId, contextText);
    await this.respondEphemeral(
      respond,
      'Your context has been saved! You can now use `/question` to get an answer based on your context.'
    );
  }

  async handleClearHistory(userId: string, respond: any, contextService: ContextService): Promise<void> {
    contextService.clearHistory(userId);
    await this.respondEphemeral(respond, 'Your history has been cleared.');
  }

  async respondEphemeral(respond: any, text: string): Promise<void> {
    await respond({
      response_type: 'ephemeral',
      text,
    });
  }

  async respondWithRateLimitError(userId: string, rateLimitService: RateLimitService, respond: any): Promise<void> {
    const remainingTime = rateLimitService.getTimeUntilReset(userId);
    await this.respondEphemeral(
      respond,
      `You have reached the limit of requests per hour. Please try again in ${remainingTime} minutes.`
    );
  }
}
