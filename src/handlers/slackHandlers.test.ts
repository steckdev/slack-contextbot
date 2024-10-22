import { SlackHandlers } from "../../src/handlers/slackHandlers";
import { OpenAIService } from "../../src/services/openaiService";
import { ContextService } from "../../src/services/contextService";
import { RateLimitService } from "../../src/services/rateLimitService";
import { SlackCommandMiddlewareArgs } from "@slack/bolt";

const mockSay = jest.fn();
const mockAck = jest.fn();

describe("SlackHandlers", () => {
  let slackHandlers: SlackHandlers;
  let mockOpenAIService: OpenAIService;
  let mockContextService: ContextService;
  let mockRateLimitService: RateLimitService;

  beforeEach(() => {
    mockSay.mockClear();
    mockAck.mockClear();

    mockOpenAIService = {
      generateResponse: jest.fn().mockResolvedValue("AI-generated response"),
    } as unknown as OpenAIService;

    mockContextService = {
      getContext: jest.fn(),
      saveContext: jest.fn(),
      addToHistory: jest.fn(),
      clearHistory: jest.fn(),
      getHistory: jest.fn(),
    } as unknown as ContextService;

    mockRateLimitService = {
      canProceedWithRequest: jest.fn().mockReturnValue(true),
      getTimeUntilReset: jest.fn().mockReturnValue(5),
    } as unknown as RateLimitService;

    slackHandlers = new SlackHandlers(
      mockOpenAIService,
      mockContextService,
      mockRateLimitService,
    );
  });

  it("should handle /sendcontext correctly", async () => {
    const mockCommand: SlackCommandMiddlewareArgs["command"] = {
      user_id: "U12345",
      text: "This is my context.",
    } as any;

    await slackHandlers.handleSetData({
      command: mockCommand,
      ack: mockAck,
      say: mockSay,
    } as any);

    expect(mockAck).toHaveBeenCalled();
    expect(mockContextService.saveContext).toHaveBeenCalledWith(
      "U12345",
      "This is my context.",
    );
    expect(mockSay).toHaveBeenCalledWith(
      "Your context has been saved! You can now use `/question` to get an answer based on your context.",
    );
  });

  it("should handle /experience correctly with OpenAI", async () => {
    (mockContextService.getContext as jest.Mock).mockReturnValue(
      "This is my context.",
    );

    const mockCommand: SlackCommandMiddlewareArgs["command"] = {
      user_id: "U12345",
      text: "Tell me about AI.",
    } as any;

    await slackHandlers.handleQuestion({
      command: mockCommand,
      ack: mockAck,
      say: mockSay,
    } as any);

    expect(mockOpenAIService.generateResponse).toHaveBeenCalledWith(
      "This is my context.",
      "Tell me about AI.",
    );
    expect(mockSay).toHaveBeenCalledWith(
      "Here's how your context might answer this question:\n*Tell me about AI.*\n\nAI-generated response",
    );
  });

  it("should handle rate limiting when the user reaches the limit", async () => {
    (mockRateLimitService.canProceedWithRequest as jest.Mock).mockReturnValue(
      false,
    );
    const mockCommand: SlackCommandMiddlewareArgs["command"] = {
      user_id: "U12345",
      text: "Tell me about AI.",
    } as any;

    await slackHandlers.handleQuestion({
      command: mockCommand,
      ack: mockAck,
      say: mockSay,
    } as any);

    expect(mockRateLimitService.canProceedWithRequest).toHaveBeenCalledWith(
      "U12345",
    );
    expect(mockSay).toHaveBeenCalledWith(
      "You have reached the limit of 100 requests per hour. Please try again in 5 minutes.",
    );
  });
});
