import { SlackService } from './slackService';

describe('SlackService', () => {
  let slackService: SlackService;
  let client: any;

  beforeEach(() => {
    slackService = new SlackService();
    client = {
      conversations: {
        history: jest.fn(),
        replies: jest.fn(),
      },
    };
  });

  describe('fetchThreadMessages', () => {
    it('should fetch messages from a thread', async () => {
      client.conversations.replies.mockResolvedValue({
        messages: [{ text: 'message1' }, { text: 'message2' }],
        has_more: false,
      });

      const messages = await slackService.fetchThreadMessages(client, 'C123', 'thread_ts');

      expect(client.conversations.replies).toHaveBeenCalledWith({
        channel: 'C123',
        ts: 'thread_ts',
        limit: 100,
        cursor: undefined,
      });
      expect(messages).toBe('message2\nmessage1');
    });

    it('should handle pagination', async () => {
      client.conversations.replies
        .mockResolvedValueOnce({
          messages: [{ text: 'message1' }],
          has_more: true,
          response_metadata: { next_cursor: 'cursor1' },
        })
        .mockResolvedValueOnce({
          messages: [{ text: 'message2' }],
          has_more: false,
        });

      const messages = await slackService.fetchThreadMessages(client, 'C123', 'thread_ts');

      expect(client.conversations.replies).toHaveBeenCalledTimes(2);
      expect(messages).toBe('message2\nmessage1');
    });

    it('should return null if no messages are found', async () => {
      client.conversations.replies.mockResolvedValue({
        messages: [],
        has_more: false,
      });

      const messages = await slackService.fetchThreadMessages(client, 'C123', 'thread_ts');

      expect(messages).toBeNull();
    });
  });

  describe('fetchRecentMessages', () => {
    it('should fetch recent messages from a channel', async () => {
      client.conversations.history.mockResolvedValue({
        messages: [{ text: 'message1' }, { text: 'message2' }],
        has_more: false,
      });

      const messages = await slackService.fetchRecentMessagesWithEnrichment(client, 'C123', 7);

      expect(client.conversations.history).toHaveBeenCalledWith({
        channel: 'C123',
        oldest: expect.any(Number),
        limit: 100,
        cursor: undefined,
      });
      expect(messages).toBe('message2\nmessage1');
    });

    it('should handle pagination', async () => {
      client.conversations.history
        .mockResolvedValueOnce({
          messages: [{ text: 'message1' }],
          has_more: true,
          response_metadata: { next_cursor: 'cursor1' },
        })
        .mockResolvedValueOnce({
          messages: [{ text: 'message2' }],
          has_more: false,
        });

      const messages = await slackService.fetchRecentMessagesWithEnrichment(client, 'C123', 7);

      expect(client.conversations.history).toHaveBeenCalledTimes(2);
      expect(messages).toBe('message2\nmessage1');
    });

    it('should return null if no messages are found', async () => {
      client.conversations.history.mockResolvedValue({
        messages: [],
        has_more: false,
      });

      const messages = await slackService.fetchRecentMessagesWithEnrichment(client, 'C123', 7);

      expect(messages).toBeNull();
    });
  });

  describe('respondEphemeral', () => {
    it('should send an ephemeral response', async () => {
      const respond = jest.fn();

      await slackService.respondEphemeral(respond, 'Test message');

      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Test message',
      });
    });
  });

  describe('respondWithRateLimitError', () => {
    it('should send a rate limit error response', async () => {
      const respond = jest.fn();
      const rateLimitService = {
        getTimeUntilReset: jest.fn().mockReturnValue(10),
      };

      await slackService.respondWithRateLimitError('U123', rateLimitService, respond);

      expect(rateLimitService.getTimeUntilReset).toHaveBeenCalledWith('U123');
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'You have reached the limit of requests per hour. Please try again in 10 minutes.',
      });
    });
  });
});
