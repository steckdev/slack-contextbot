import { SlackMessageDTO } from '../slackMessage.dto';
import { UserMap } from '../userMap.dto';
import { Metadata } from './openaiService';

export class SlackService {
  private userInfoCache: { [key: string]: any } = {};

  async fetchThreadMessages(client: any, channelId: string, threadTs: string): Promise<string | null> {
    let messages: SlackMessageDTO[] = [];
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

      messages = messages.concat(result.messages?.filter((message: any) => !message.subtype) || []);

      hasMore = result.has_more;
      cursor = result.response_metadata?.next_cursor;
    }

    return messages.length > 0 ? messages.reverse().join('\n') : null;
  }

  async fetchThreadMessagesWithEnrichment(
    client: any,
    channelId: string,
    threadTs: string
  ): Promise<{ messages: SlackMessageDTO[]; userIds: string[] }> {
    let messages: SlackMessageDTO[] = [];
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

      messages = messages.concat(
        (result.messages as SlackMessageDTO[])?.filter((message: SlackMessageDTO) => !message.subtype) || []
      );

      hasMore = result.has_more;
      cursor = result.response_metadata?.next_cursor;
    }

    const userIds = messages.map((x) => x.user);

    return {
      messages,
      userIds: [...new Set(userIds)],
    };
  }

  async fetchRecentMessagesWithEnrichment(
    client: any,
    channelId: string,
    days: number
  ): Promise<{ enrichedContext: string; messages: string[]; userIds: string[] }> {
    const oldest = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
    let messages: any[] = [];
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

      messages = messages.concat(result.messages?.filter((message: any) => !message.subtype) || []);

      hasMore = result.has_more;
      cursor = result.response_metadata?.next_cursor;
    }

    const messageTexts = messages.map((message: any) => message.text as string);

    // Additional enrichment by extracting mentions and timestamps
    const enrichedContext = messages
      .map(
        (message: any) => `${message.user || 'Unknown'}: ${message.text} [${new Date(message.ts * 1000).toISOString()}]`
      )
      .join('\n');

    const userIds = Array.from(new Set(messages.map((message: any) => message.user)));

    return { messages: messageTexts, enrichedContext, userIds };
  }

  async respondEphemeral(respond: any, text: string): Promise<void> {
    await respond({
      response_type: 'ephemeral',
      text,
    });
  }

  async respondWithRateLimitError(userId: string, rateLimitService: any, respond: any): Promise<void> {
    const remainingTime = rateLimitService.getTimeUntilReset(userId);
    await this.respondEphemeral(
      respond,
      `You have reached the limit of requests per hour. Please try again in ${remainingTime} minutes.`
    );
  }

  createSummaryBlocks(summary: string | null, metadata: Metadata): any[] {
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

    const participantsText = metadata.participants.length > 0 ? metadata.participants.join(', ') : 'None';
    const actionsText =
      metadata.actions.length > 0
        ? metadata.actions.map((action) => `- ${action}`).join('\n')
        : 'No key actions identified.';

    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Summary of the Recent Conversation:*\n\n${summary.replace(/\*\*/g, '*')}`,
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
    ];
  }

  async respondWithSummary(respond: any, summary: string | null, metadata: Metadata): Promise<void> {
    if (!summary) {
      await respond({ text: 'No summary available.' });
      return;
    }

    // const dateText = metadata.date ? `*Date:* ${metadata.date}` : '*Date:* Not provided';
    const participantsText = metadata.participants.length > 0 ? metadata.participants.join(', ') : 'None';

    // Format actions as a simple list
    const actionsText =
      metadata.actions.length > 0
        ? metadata.actions.map((action) => `- ${action}`).join('\n')
        : 'No key actions identified.';

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Summary of the Recent Conversation:*\n\n${summary.replace(/\*\*/g, '*')}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Participants:* ${participantsText}\n*Key Actions:*\n${actionsText}`,
            // text: `${dateText}\n*Participants:* ${participantsText}\n*Key Actions:*\n${actionsText}`,
          },
        ],
      },
    ];

    await respond({ blocks });
  }

  async generateMetadata(messages: string[], usersInfo: UserMap): Promise<any> {
    // Example metadata generation logic
    const participants = Object.values(usersInfo); // Extract participants from userInfo

    return {
      date: new Date().toLocaleDateString(),
      participants,
    };
  }

  async fetchUserInfo(client: any, userIds: string[]): Promise<any[]> {
    const userInfo = await Promise.all(
      userIds.map(async (userId) => {
        if (this.userInfoCache[userId]) {
          return this.userInfoCache[userId];
        }
        const result = await client.users.info({ user: userId });
        this.userInfoCache[userId] = result.user;
        return result.user;
      })
    );
    return userInfo;
  }

  async fetchAndEnrichUserInfo(client: any, userIds: string[]): Promise<UserMap> {
    const uniqueUserIds = [...new Set(userIds)];

    const userInfo = await Promise.all(
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
    userInfo.forEach((user) => {
      if (user && user.id && user.name) {
        userMap[user.id] = user.name;
      }
    });

    return userMap;
  }
}
