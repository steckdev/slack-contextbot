/* eslint-disable max-lines */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
import { AllMiddlewareArgs, SlackCommandMiddlewareArgs, SlackShortcutMiddlewareArgs } from '@slack/bolt';
import { OpenAIService } from '../services/openaiService';
import { ContextService } from '../services/contextService';
import { RateLimitService } from '../services/rateLimitService';
import { SlackService } from '../services/slackService';

export class SlackHandlers {
  private openaiService: OpenAIService;

  private contextService: ContextService;

  private rateLimitService: RateLimitService;

  private slackService: SlackService;

  constructor(
    openaiService: OpenAIService,
    contextService: ContextService,
    rateLimitService: RateLimitService,
    slackService: SlackService
  ) {
    this.openaiService = openaiService;
    this.contextService = contextService;
    this.rateLimitService = rateLimitService;
    this.slackService = slackService;
  }

  handleSetData = async ({ command, ack, respond }: SlackCommandMiddlewareArgs) => {
    await ack();

    const userId = command.user_id;
    const contextText = command.text.trim();

    if (!contextText) {
      await this.slackService.respondEphemeral(
        respond,
        'Please provide your context text in the message after `/context`.'
      );
      return;
    }

    this.contextService.saveContext(userId, contextText);

    await this.slackService.respondEphemeral(
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
      await this.slackService.respondEphemeral(respond, 'Please provide your context first using `/addhistory`.');
      return;
    }

    if (!context) {
      await this.slackService.respondEphemeral(respond, 'Please provide your context first using `/setcontext`.');
      return;
    }

    if (!this.rateLimitService.canProceedWithRequest(userId)) {
      await this.slackService.respondWithRateLimitError(userId, this.rateLimitService, respond);
      return;
    }

    // FIX NULL for handle question
    try {
      const metadata = await this.openaiService.generateEnhancedMetadata(context, null as any);
      const answer = await this.openaiService.generateResponseWithMetadata(context, metadata, question);
      await this.slackService.respondEphemeral(
        respond,
        `Here's how your context might answer this question:\n*${question}*\n\n${answer}`
      );
    } catch (_error) {
      console.error(_error);
      await this.slackService.respondEphemeral(respond, (_error as Error).message);
    }
  };

  handleAddToHistory = async ({ command, ack, respond }: SlackCommandMiddlewareArgs) => {
    await ack();

    const userId = command.user_id;
    const historyText = command.text.trim();

    if (!historyText) {
      await this.slackService.respondEphemeral(respond, 'Please provide text to add to history.');
      return;
    }

    this.contextService.addToHistory(userId, historyText);
    await this.slackService.respondEphemeral(respond, 'Your history has been updated.');
  };

  handleClearHistory = async ({ command, ack, respond }: SlackCommandMiddlewareArgs) => {
    await ack();

    const userId = command.user_id;
    this.contextService.clearHistory(userId);

    await this.slackService.respondEphemeral(respond, 'Your history has been cleared.');
  };

  // post chat
  handleSummarizeThread = async ({
    command,
    ack,
    respond,
    client,
    context,
  }: SlackCommandMiddlewareArgs & AllMiddlewareArgs) => {
    await ack();

    console.log('Thread Context:', { threadTs: command, messageTs: context });

    const userId = command.user_id;
    const threadTs = command.thread_ts || context.message_ts;
    const channelId = command.channel.id;

    if (!threadTs) {
      await this.slackService.respondEphemeral(respond, 'This command must be used within a thread.');
      return;
    }

    if (!this.rateLimitService.canProceedWithRequest(userId)) {
      await this.slackService.respondWithRateLimitError(userId, this.rateLimitService, respond);
      return;
    }

    const initialResponse = await client.chat.postMessage({
      channel: channelId,
      text: 'Processing your request, please wait...',
    });

    const initialResponseTs = initialResponse.ts as string; // Capture the timestamp of the initial response

    try {
      const { messages, userIds } = await this.slackService.fetchThreadMessagesWithEnrichment(
        client,
        command.channel_id,
        threadTs
      );

      if (!messages) {
        await this.slackService.respondEphemeral(respond, 'No messages found in the thread.');
        return;
      }

      const userInfo = await this.slackService.fetchAndEnrichUserInfo(client, userIds);
      const namedMessages = messages.map((message) => `${userInfo[message.user]} - ${message.text}`).join('\n');

      const metadata = await this.openaiService.generateEnhancedMetadata(namedMessages, userInfo);

      const summary = await this.openaiService.generateSummary(namedMessages, {
        focus: 'action items',
        length: 'short',
      });

      await this.slackService.respondWithSummary(respond, summary, metadata);

      console.log('Updating response to chat');
      await client.chat.update({
        channel: channelId,
        ts: initialResponseTs, // Use the correct timestamp
        blocks: this.slackService.createSummaryBlocks(summary, metadata),
      });
    } catch (_error) {
      console.error(_error);
      await client.chat.update({
        channel: channelId,
        ts: initialResponseTs, // Use the correct timestamp
        text: 'There was an error processing your request.',
      });
    }
  };

  // post chat
  handleSummarizeChannel = async ({
    command,
    ack,
    respond,
    client,
  }: SlackCommandMiddlewareArgs & AllMiddlewareArgs) => {
    await ack();

    const userId = command.user_id;
    const args = command.text.trim().split(' ');
    const days = parseInt(args[0], 10) || 14;
    const focus = args[1] || 'general';

    if (days > 14) {
      await this.slackService.respondEphemeral(respond, 'You can only summarize messages from the past 14 days.');
      return;
    }

    if (!this.rateLimitService.canProceedWithRequest(userId)) {
      await this.slackService.respondWithRateLimitError(userId, this.rateLimitService, respond);
      return;
    }

    try {
      const { messages, enrichedContext, userIds } = await this.slackService.fetchRecentMessagesWithEnrichment(
        client,
        command.channel_id,
        days
      );

      if (!messages) {
        await this.slackService.respondEphemeral(respond, 'No messages found in the channel.');
        return;
      }

      const userInfo = await this.slackService.fetchAndEnrichUserInfo(client, userIds);

      const summary = await this.openaiService.generateSummary(messages.join('\n'), { focus, length: 'short' });

      const metadata = await this.openaiService.generateEnhancedMetadata(enrichedContext, userInfo);

      await this.slackService.respondWithSummary(respond, summary, metadata);
    } catch (_error) {
      await this.slackService.respondEphemeral(respond, 'There was an error processing your request.');
    }
  };

  // post chat
  handleSummarizeThreadShortcut = async (args: any) => {
    const { shortcut, ack, respond, client, context } = args;
    await ack();

    const userId = shortcut.user.id;
    const threadTs = (shortcut as any).message_ts;
    const channelId = (shortcut as any).channel.id;

    if (!threadTs) {
      await this.slackService.respondEphemeral(respond, 'This shortcut must be used within a thread.');
      return;
    }

    if (!this.rateLimitService.canProceedWithRequest(userId)) {
      await this.slackService.respondWithRateLimitError(userId, this.rateLimitService, respond);
      return;
    }

    console.log(`Processing request to summarize for ${userId} and ${threadTs}`);

    // Initial response using chat.postMessage
    const initialResponse = await client.chat.postMessage({
      channel: channelId,
      thread_ts: threadTs,
      text: 'Processing your request, please wait...',
    });

    const initialResponseTs = initialResponse.ts as string; // Capture the timestamp of the initial response

    try {
      const { messages, userIds } = await this.slackService.fetchThreadMessagesWithEnrichment(
        client,
        channelId,
        threadTs
      );

      if (!messages) {
        await this.slackService.respondEphemeral(respond, 'No messages found in the thread.');
        return;
      }

      const userInfo = await this.slackService.fetchAndEnrichUserInfo(client, userIds);

      const namedMessages = messages.map((message) => `${userInfo[message.user]} - ${message.text}`).join('\n');
      console.log('Leveraging AI to generate metadata and summary for chat');

      const metadata = await this.openaiService.generateEnhancedMetadata(namedMessages, userInfo);

      const summary = await this.openaiService.generateSummary(namedMessages, {
        focus: 'action items',
        length: 'short',
      });

      // Update the initial response with the final summary
      console.log('Updating response to chat');
      await client.chat.update({
        channel: channelId,
        ts: initialResponseTs, // Use the correct timestamp
        blocks: this.slackService.createSummaryBlocks(summary, metadata),
      });
    } catch (_error) {
      console.error(_error);
      await client.chat.update({
        channel: channelId,
        ts: initialResponseTs, // Use the correct timestamp
        text: 'There was an error processing your request.',
      });
    }
  };

  handleButtonActions = async ({ body, ack, respond, client }: any) => {
    await ack();

    const actionId = body.actions[0].action_id;
    const channelId = body.channel.id;
    const messageTs = body.message.ts;

    if (actionId === 'share_to_channel') {
      await client.chat.postMessage({
        channel: channelId,
        text: 'Summary shared with the channel!',
        thread_ts: messageTs, // Optional: share as a threaded message
      });
    } else if (actionId === 'dismiss') {
      await client.chat.delete({
        channel: channelId,
        ts: messageTs,
      });
    }
  };
}
