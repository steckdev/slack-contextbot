import { SlackHandlers } from "../../src/handlers/slackHandlers";
import { OpenAIService } from "../../src/services/openaiService";
import { ContextService } from "../../src/services/contextService";
import { SlackCommandMiddlewareArgs } from "@slack/bolt";

const mockSay = jest.fn();
const mockAck = jest.fn();

describe("SlackHandlers", () => {
  let slackHandlers: SlackHandlers;
  let mockOpenAIService: OpenAIService;
  let contextService: ContextService;

  beforeEach(() => {
    mockSay.mockClear();
    mockAck.mockClear();

    mockOpenAIService = {
      generateResponse: jest.fn().mockResolvedValue("AI-generated response"),
    } as unknown as OpenAIService;

    contextService = new ContextService();
    slackHandlers = new SlackHandlers(mockOpenAIService, contextService);
  });

  it("should handle /sendcontext correctly", async () => {
    const mockCommand: SlackCommandMiddlewareArgs["command"] = {
      user_id: "U12345",
      text: "This is my context.",
    } as any;

    await slackHandlers.handleSendContext({
      command: mockCommand,
      ack: mockAck,
      say: mockSay,
    } as any);

    expect(mockAck).toHaveBeenCalled();
    expect(contextService.getContext("U12345")).toBe("This is my context.");
    expect(mockSay).toHaveBeenCalledWith(
      "Your context has been saved! You can now use `/prompt` to ask questions based on your context.",
    );
  });

  it("should handle /experience correctly with OpenAI", async () => {
    contextService.saveContext("U12345", "This is my context.");

    const mockCommand: SlackCommandMiddlewareArgs["command"] = {
      user_id: "U12345",
      text: "Tell me about AI.",
    } as any;

    await slackHandlers.handleExperience({
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
});
