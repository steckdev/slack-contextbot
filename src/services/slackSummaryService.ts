/* eslint-disable max-lines */
import { SlackMessageDTO } from '../slackMessage.dto';
import { UserMap } from '../userMap.dto';
import { Metadata, OpenAIService } from './openaiService';
import { RateLimitService } from './rateLimitService';
import { ContextService } from './contextService';

const ONE_HOUR_SECONDS = 1 * 60 * 60;
const TWENTYFOUR_HOUR_SECONDS = 24 * ONE_HOUR_SECONDS;

export class SlackSummaryService {
  private userInfoCache: { [key: string]: any } = {};

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

  async handleSummarizeChannel(
    userId: string,
    channelId: string,
    days: number,
    focus: string,
    respond: any,
    client: any,
    rateLimitService: RateLimitService,
    openaiService: OpenAIService
  ): Promise<void> {
    if (days > 14) {
      await this.respondEphemeral(respond, 'You can only summarize messages from the past 14 days.');
      return;
    }

    if (!rateLimitService.canProceedWithRequest(userId)) {
      await this.respondWithRateLimitError(userId, rateLimitService, respond);
      return;
    }

    await this.processSummarizeData(client, openaiService, respond, channelId, undefined, days);
  }

  async handleSummarizeThread(
    userId: string,
    channelId: string,
    threadTs: string | undefined,
    respond: any,
    client: any,
    rateLimitService: RateLimitService,
    openaiService: OpenAIService
  ): Promise<void> {
    if (!threadTs) {
      await this.respondEphemeral(respond, 'This command must be used within a thread.');
      return;
    }

    if (!rateLimitService.canProceedWithRequest(userId)) {
      await this.respondWithRateLimitError(userId, rateLimitService, respond);
      return;
    }

    // Send initial "in progress" message
    await this.processSummarizeData(client, openaiService, respond, channelId, threadTs, 14);
  }

  async handleSummarizeThreadShortcut(
    userId: string,
    channelId: string,
    threadTs: string,
    respond: any,
    client: any,
    rateLimitService: RateLimitService,
    openaiService: OpenAIService
  ): Promise<void> {
    if (!threadTs) {
      await this.respondEphemeral(respond, 'This shortcut must be used within a thread.');
      return;
    }

    if (!rateLimitService.canProceedWithRequest(userId)) {
      await this.respondWithRateLimitError(userId, rateLimitService, respond);
      return;
    }

    await this.processSummarizeData(client, openaiService, respond, channelId, threadTs, 14);
  }

  async processSummarizeData(
    client: any,
    openaiService: any,
    respond: any,
    channelId: string,
    threadTs: string | undefined,
    days: number
  ): Promise<void> {
    const initialResponse = await client.chat.postMessage({
      channel: channelId,
      text: 'Processing your request, please wait...',
    });
    const initialResponseTs = initialResponse.ts as string;

    try {
      let slackMessages;
      let slackUserIds;
      let slackEnrichedContext;
      if (threadTs) {
        const { messages, userIds } = await this.fetchThreadMessagesWithEnrichment(client, channelId, threadTs, 14);
        slackMessages = messages;
        slackUserIds = userIds;
      } else {
        const { messages, enrichedContext, userIds } = await this.fetchThreadMessagesWithEnrichment(
          client,
          channelId,
          undefined,
          days
        );
        slackMessages = messages;
        slackEnrichedContext = enrichedContext;
        slackUserIds = userIds;
      }

      if (!slackMessages || slackMessages.length === 0) {
        await this.respondEphemeral(respond, 'No messages found in the thread.');
        return;
      }

      const userInfo = await this.fetchAndEnrichUserInfo(client, slackUserIds);
      const namedMessages = slackMessages.map((m) => `${userInfo[m.user] || m.user} - ${m.text}`).join('\n');

      const metadata = await openaiService.generateEnhancedMetadata(namedMessages, userInfo);
      const summary = await openaiService.generateSummary(namedMessages, {
        focus: 'information',
        length: 'short',
      });

      await client.chat.update({
        channel: channelId,
        ts: initialResponseTs,
        blocks: this.createSummaryBlocks(summary, metadata, threadTs),
      });
    } catch (error) {
      console.error(error);
      await client.chat.update({
        channel: channelId,
        ts: initialResponseTs,
        text: 'There was an error processing your request.',
      });
    }
  }

  async handleButtonActions(
    actionId: string,
    channelId: string,
    messageTs: string,
    respond: any,
    client: any
  ): Promise<void> {
    if (actionId === 'share_to_channel') {
      await client.chat.postMessage({
        channel: channelId,
        text: 'Summary shared with the channel!',
        thread_ts: messageTs,
      });
    } else if (actionId === 'dismiss') {
      await client.chat.delete({
        channel: channelId,
        ts: messageTs,
      });
    }
  }

  async fetchThreadMessagesWithEnrichment(
    client: any,
    channelId: string,
    threadTs: string | undefined,
    days?: number
  ): Promise<{
    // Unique user IDs extracted from messages
    enrichedContext?: string;
    messages: SlackMessageDTO[];
    // The array of Slack messages
    userIds: string[]; // Optionally store additional context (for channel fetches)
  }> {
    let messages: SlackMessageDTO[] = [];
    let userIds: string[] = [];
    let enrichedContext: string | undefined;

    // If threadTs is provided, fetch a thread
    if (threadTs) {
      let hasMore = true;
      let cursor: string | undefined;

      while (hasMore) {
        // eslint-disable-next-line no-await-in-loop
        const result = await client.conversations.replies({
          channel: channelId,
          ts: threadTs,
          limit: 100,
          cursor,
        });

        // Filter out messages with subtypes (like 'bot_message')
        const validMessages = (result.messages as SlackMessageDTO[]).filter(
          (message) => !message.subtype && !message.bot_profile
        );

        messages = messages.concat(validMessages);
        hasMore = result.has_more;
        cursor = result.response_metadata?.next_cursor;
      }

      userIds = [...new Set(messages.map((m) => m.user))];
    } else {
      if (!days) {
        throw Error('Expected days when summarizing channel!');
      }
      const oldest = Math.floor(Date.now() / 1000) - days * TWENTYFOUR_HOUR_SECONDS;

      let hasMore = true;
      let cursor: string | undefined;

      while (hasMore) {
        // eslint-disable-next-line no-await-in-loop
        const result = await client.conversations.history({
          channel: channelId,
          oldest,
          limit: 100,
          cursor,
        });

        const validMessages = (result.messages as SlackMessageDTO[]).filter((msg) => !msg.subtype);

        messages = messages.concat(validMessages);
        hasMore = result.has_more;
        cursor = result.response_metadata?.next_cursor;
      }

      userIds = [...new Set(messages.map((m) => m.user))];

      enrichedContext = messages
        .map((msg) => `${msg.user || 'Unknown'}: ${msg.text} [${new Date(parseFloat(msg.ts) * 1000).toISOString()}]`)
        .join('\n');
    }

    return {
      messages,
      userIds,
      enrichedContext,
    };
  }

  async fetchAndEnrichUserInfo(client: any, userIds: string[]): Promise<UserMap> {
    const uniqueUserIds = [...new Set(userIds)];
    const userInfoList = await Promise.all(
      uniqueUserIds.map(async (userId) => {
        if (this.userInfoCache[userId]) {
          return this.userInfoCache[userId];
        }
        const result = await client.users.info({ user: userId });
        this.userInfoCache[userId] = result.user;
        return result.user;
      })
    );

    const userMap: UserMap = {};
    userInfoList.forEach((user) => {
      if (user && user.id && user.name) {
        userMap[user.id] = user.name;
      }
    });
    return userMap;
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

  createSummaryBlocks(summary: string | null, metadata: Metadata, threadTs?: string): any[] {
    if (!summary) {
      return [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'No summary available.',
          },
        },
      ];
    }

    const participantsText = metadata.participants.length ? metadata.participants.join(', ') : 'None';
    const actionsText = metadata.actions.length
      ? metadata.actions.map((action) => `- ${action}`).join('\n')
      : 'No key actions identified.';

    // Optionally vary the headline if this is a thread vs. channel
    const summaryTitle = threadTs ? '*Summary of the Thread:*' : '*Summary of the Channel Conversation:*';

    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${summaryTitle}\n\n${summary.replace(/\*\*/g, '*')}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Participants:* ${participantsText}\n*Key Actions:*\n${actionsText}`,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '_*Summary generated by AI. Please review the conversations to confirm the details._',
          },
        ],
      },
      // If you want interactive buttons, you can keep them here or remove:
      // {
      //   type: 'actions',
      //   elements: [
      //     {
      //       type: 'button',
      //       text: { type: 'plain_text', text: 'Share to Channel' },
      //       action_id: 'share_to_channel',
      //     },
      //     {
      //       type: 'button',
      //       text: { type: 'plain_text', text: 'Dismiss' },
      //       action_id: 'dismiss',
      //     },
      //   ],
      // },
    ];
  }
}
