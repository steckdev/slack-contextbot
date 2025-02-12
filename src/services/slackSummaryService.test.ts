import { SlackSummaryService } from './slackSummaryService';
import { ContextService } from './contextService';
import { RateLimitService } from './rateLimitService';
import { OpenAIService } from './openaiService';

jest.mock('./contextService');
jest.mock('./rateLimitService');
jest.mock('./openaiService');

describe('SlackSummaryService', () => {
  let slackService: SlackSummaryService;
  let contextService: jest.Mocked<ContextService>;
  let rateLimitService: jest.Mocked<RateLimitService>;
  let openaiService: jest.Mocked<OpenAIService>;
  let respond: jest.Mock;
  let client: any;

  beforeEach(() => {
    slackService = new SlackSummaryService();
    contextService = new ContextService() as jest.Mocked<ContextService>;
    rateLimitService = new RateLimitService() as jest.Mocked<RateLimitService>;
    openaiService = new OpenAIService('fake-api-key') as jest.Mocked<OpenAIService>;
    respond = jest.fn();
    client = {
      conversations: {
        history: jest.fn(),
        replies: jest.fn(),
      },
      chat: {
        postMessage: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      users: {
        info: jest.fn(),
      },
    };
  });

  describe('handleQuestion', () => {
    it('should respond with an error if history is missing', async () => {
      contextService.getContext.mockReturnValue('context');
      contextService.getHistory.mockReturnValue(null as any);

      await slackService.handleQuestion('U123', 'question', respond, contextService, rateLimitService, openaiService);

      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Please provide your context first using `/addhistory`.',
      });
    });

    it('should respond with an error if context is missing', async () => {
      contextService.getContext.mockReturnValue(null);
      contextService.getHistory.mockReturnValue(['history']);

      await slackService.handleQuestion('U123', 'question', respond, contextService, rateLimitService, openaiService);

      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Please provide your context first using `/setcontext`.',
      });
    });

    it('should respond with a rate limit error if rate limit is exceeded', async () => {
      contextService.getContext.mockReturnValue('context');
      contextService.getHistory.mockReturnValue(['history']);
      rateLimitService.canProceedWithRequest.mockReturnValue(false);
      rateLimitService.getTimeUntilReset.mockReturnValue(10);

      await slackService.handleQuestion('U123', 'question', respond, contextService, rateLimitService, openaiService);

      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'You have reached the limit of requests per hour. Please try again in 10 minutes.',
      });
    });

    it('should call OpenAIService and respond with an answer', async () => {
      contextService.getContext.mockReturnValue('context');
      contextService.getHistory.mockReturnValue(['history']);
      rateLimitService.canProceedWithRequest.mockReturnValue(true);
      openaiService.generateEnhancedMetadata.mockResolvedValue({} as any);
      openaiService.generateResponseWithMetadata.mockResolvedValue('answer');

      await slackService.handleQuestion('U123', 'question', respond, contextService, rateLimitService, openaiService);

      expect(openaiService.generateEnhancedMetadata).toHaveBeenCalledWith('context', null);
      expect(openaiService.generateResponseWithMetadata).toHaveBeenCalledWith('context', {}, 'question');
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: "Here's how your context might answer this question:\n*question*\n\nanswer",
      });
    });
  });

  describe('handleAddToHistory', () => {
    it('should respond with an error if history text is empty', async () => {
      await slackService.handleAddToHistory('U123', '', respond, contextService);

      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Please provide text to add to history.',
      });
    });

    it('should add history and respond with success message', async () => {
      await slackService.handleAddToHistory('U123', 'history text', respond, contextService);

      expect(contextService.addToHistory).toHaveBeenCalledWith('U123', 'history text');
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Your history has been updated.',
      });
    });
  });

  describe('handleSetData', () => {
    it('should respond with an error if context text is empty', async () => {
      await slackService.handleSetData('U123', '', respond, contextService);

      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Please provide your context text in the message after `/context`.',
      });
    });

    it('should save context and respond with success message', async () => {
      await slackService.handleSetData('U123', 'context text', respond, contextService);

      expect(contextService.saveContext).toHaveBeenCalledWith('U123', 'context text');
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Your context has been saved! You can now use `/question` to get an answer based on your context.',
      });
    });
  });

  describe('handleClearHistory', () => {
    it('should clear history and respond with success message', async () => {
      await slackService.handleClearHistory('U123', respond, contextService);

      expect(contextService.clearHistory).toHaveBeenCalledWith('U123');
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Your history has been cleared.',
      });
    });
  });

  describe('handleSummarizeChannel', () => {
    it('should respond with an error if days exceed 14', async () => {
      await slackService.handleSummarizeChannel(
        'U123',
        'C123',
        15,
        'focus',
        respond,
        client,
        rateLimitService,
        openaiService
      );

      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'You can only summarize messages from the past 14 days.',
      });
    });

    it('should respond with a rate limit error if rate limit is exceeded', async () => {
      rateLimitService.canProceedWithRequest.mockReturnValue(false);
      rateLimitService.getTimeUntilReset.mockReturnValue(10);

      await slackService.handleSummarizeChannel(
        'U123',
        'C123',
        7,
        'focus',
        respond,
        client,
        rateLimitService,
        openaiService
      );

      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'You have reached the limit of requests per hour. Please try again in 10 minutes.',
      });
    });

    it('should process summarize data', async () => {
      rateLimitService.canProceedWithRequest.mockReturnValue(true);
      jest.spyOn(slackService, 'processSummarizeData').mockResolvedValue();

      await slackService.handleSummarizeChannel(
        'U123',
        'C123',
        7,
        'focus',
        respond,
        client,
        rateLimitService,
        openaiService
      );

      expect(slackService.processSummarizeData).toHaveBeenCalledWith(
        client,
        openaiService,
        respond,
        'C123',
        undefined,
        7
      );
    });
  });

  describe('handleSummarizeThread', () => {
    it('should respond with an error if not used in a thread', async () => {
      await slackService.handleSummarizeThread(
        'U123',
        'C123',
        undefined,
        respond,
        client,
        rateLimitService,
        openaiService
      );

      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'This command must be used within a thread.',
      });
    });

    it('should respond with a rate limit error if rate limit is exceeded', async () => {
      rateLimitService.canProceedWithRequest.mockReturnValue(false);
      rateLimitService.getTimeUntilReset.mockReturnValue(10);

      await slackService.handleSummarizeThread(
        'U123',
        'C123',
        'thread_ts',
        respond,
        client,
        rateLimitService,
        openaiService
      );

      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'You have reached the limit of requests per hour. Please try again in 10 minutes.',
      });
    });

    it('should process summarize data when used in a thread', async () => {
      rateLimitService.canProceedWithRequest.mockReturnValue(true);
      jest.spyOn(slackService, 'processSummarizeData').mockResolvedValue();

      await slackService.handleSummarizeThread(
        'U123',
        'C123',
        'thread_ts',
        respond,
        client,
        rateLimitService,
        openaiService
      );

      expect(slackService.processSummarizeData).toHaveBeenCalledWith(
        client,
        openaiService,
        respond,
        'C123',
        'thread_ts',
        14
      );
    });
  });

  describe('handleSummarizeThreadShortcut', () => {
    it('should respond with an error if not used in a thread', async () => {
      await slackService.handleSummarizeThreadShortcut(
        'U123',
        'C123',
        undefined as any,
        respond,
        client,
        rateLimitService,
        openaiService
      );

      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'This shortcut must be used within a thread.',
      });
    });

    it('should respond with a rate limit error if rate limit is exceeded', async () => {
      rateLimitService.canProceedWithRequest.mockReturnValue(false);
      rateLimitService.getTimeUntilReset.mockReturnValue(10);

      await slackService.handleSummarizeThreadShortcut(
        'U123',
        'C123',
        'thread_ts',
        respond,
        client,
        rateLimitService,
        openaiService
      );

      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'You have reached the limit of requests per hour. Please try again in 10 minutes.',
      });
    });

    it('should process summarize data when used with a shortcut', async () => {
      rateLimitService.canProceedWithRequest.mockReturnValue(true);
      jest.spyOn(slackService, 'processSummarizeData').mockResolvedValue();

      await slackService.handleSummarizeThreadShortcut(
        'U123',
        'C123',
        'thread_ts',
        respond,
        client,
        rateLimitService,
        openaiService
      );

      expect(slackService.processSummarizeData).toHaveBeenCalledWith(
        client,
        openaiService,
        respond,
        'C123',
        'thread_ts',
        14
      );
    });
  });

  describe('handleButtonActions', () => {
    it('should post a message to the channel when action is "share_to_channel"', async () => {
      await slackService.handleButtonActions('share_to_channel', 'C123', 'message_ts', respond, client);

      expect(client.chat.postMessage).toHaveBeenCalledWith({
        channel: 'C123',
        text: 'Summary shared with the channel!',
        thread_ts: 'message_ts',
      });
    });

    it('should delete the message when action is "dismiss"', async () => {
      await slackService.handleButtonActions('dismiss', 'C123', 'message_ts', respond, client);

      expect(client.chat.delete).toHaveBeenCalledWith({
        channel: 'C123',
        ts: 'message_ts',
      });
    });
  });
});
