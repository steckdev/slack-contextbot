/* eslint-disable max-lines */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
import { AllMiddlewareArgs, SlackCommandMiddlewareArgs, SlackShortcutMiddlewareArgs } from '@slack/bolt';
import { OpenAIService } from '../services/openaiService';
import { ContextService } from '../services/contextService';
import { RateLimitService } from '../services/rateLimitService';
import { SlackSummaryService } from '../services/slackSummaryService';
import { SlackQuestionService } from '../services/slackQuestionService';

export class SlackHandlers {
  private openaiService: OpenAIService;

  private contextService: ContextService;

  private rateLimitService: RateLimitService;

  private slackSummaryService: SlackSummaryService;

  private slackQuestionService: SlackQuestionService;

  constructor(
    openaiService: OpenAIService,
    contextService: ContextService,
    rateLimitService: RateLimitService,
    slackSummaryService: SlackSummaryService,
    slackQuestionService: SlackQuestionService
  ) {
    this.openaiService = openaiService;
    this.contextService = contextService;
    this.rateLimitService = rateLimitService;
    this.slackSummaryService = slackSummaryService;
    this.slackQuestionService = slackQuestionService;
  }

  handleSetData = async ({ command, ack, respond }: SlackCommandMiddlewareArgs) => {
    await ack();
    const userId = command.user_id;
    const contextText = command.text.trim();

    await this.slackQuestionService.handleSetData(userId, contextText, respond, this.contextService);
  };

  handleQuestion = async ({ command, ack, respond }: SlackCommandMiddlewareArgs) => {
    await ack();
    const userId = command.user_id;
    const question = command.text.trim();

    await this.slackQuestionService.handleQuestion(
      userId,
      question,
      respond,
      this.contextService,
      this.rateLimitService,
      this.openaiService
    );
  };

  handleAddToHistory = async ({ command, ack, respond }: SlackCommandMiddlewareArgs) => {
    await ack();
    const userId = command.user_id;
    const historyText = command.text.trim();

    await this.slackQuestionService.handleAddToHistory(userId, historyText, respond, this.contextService);
  };

  handleClearHistory = async ({ command, ack, respond }: SlackCommandMiddlewareArgs) => {
    await ack();
    const userId = command.user_id;

    await this.slackQuestionService.handleClearHistory(userId, respond, this.contextService);
  };

  handleSummarizeThread = async ({
    command,
    ack,
    respond,
    client,
    context,
  }: SlackCommandMiddlewareArgs & AllMiddlewareArgs) => {
    await ack();

    const userId = command.user_id;
    const channelId = command.channel_id;
    const threadTs = command.thread_ts || (context as any).message_ts;

    await this.slackSummaryService.handleSummarizeThread(
      userId,
      channelId,
      threadTs,
      respond,
      client,
      this.rateLimitService,
      this.openaiService
    );
  };

  handleSummarizeChannel = async ({
    command,
    ack,
    respond,
    client,
  }: SlackCommandMiddlewareArgs & AllMiddlewareArgs) => {
    await ack();

    const userId = command.user_id;
    const channelId = command.channel_id;
    const args = command.text.trim().split(' ');
    const days = parseInt(args[0], 10) || 14;
    const focus = args[1] || 'general';

    await this.slackSummaryService.handleSummarizeChannel(
      userId,
      channelId,
      days,
      focus,
      respond,
      client,
      this.rateLimitService,
      this.openaiService
    );
  };

  handleSummarizeThreadShortcut = async (args: SlackShortcutMiddlewareArgs & any) => {
    const { shortcut, ack, respond, client } = args;
    await ack();

    const userId = shortcut.user.id;
    const threadTs = (shortcut as any).message_ts;
    const channelId = (shortcut as any).channel.id;

    await this.slackSummaryService.handleSummarizeThreadShortcut(
      userId,
      channelId,
      threadTs,
      respond,
      client,
      this.rateLimitService,
      this.openaiService
    );
  };

  handleButtonActions = async ({ body, ack, respond, client }: any) => {
    await ack();

    const actionId = body.actions[0].action_id;
    const channelId = body.channel.id;
    const messageTs = body.message.ts;

    await this.slackSummaryService.handleButtonActions(actionId, channelId, messageTs, respond, client);
  };
}
