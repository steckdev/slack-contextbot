import { SlackHandlers } from "../src/handlers/slackHandlers";
import { OpenAIService } from "../src/services/openaiService";
import { ContextService } from "../src/services/contextService";
import { SlackCommandMiddlewareArgs } from "@slack/bolt";
import dotenv from "dotenv";
import { RateLimitService } from "../src/services/rateLimitService";

// Load the environment variables from .env
dotenv.config();

// Ensure that real OpenAI API key is used
describe("Integration Test with OpenAI API", () => {
  let openaiService: OpenAIService;
  let contextService: ContextService;
  let rateLimitService: RateLimitService;
  let slackHandlers: SlackHandlers;

  beforeAll(() => {
    openaiService = new OpenAIService(process.env.OPENAI_API_KEY || "");
    contextService = new ContextService();
    rateLimitService = new RateLimitService();
    slackHandlers = new SlackHandlers(
      openaiService,
      contextService,
      rateLimitService,
    );
  });

  it("should get a response from OpenAI based on a context and a question", async () => {
    // Set up a real context and user data
    const userId = "U12345";
    contextService.saveContext(
      userId,
      "This is a test context with experience in AI and software development.",
    );

    // Mock Slack command for /experience
    const mockCommand: SlackCommandMiddlewareArgs["command"] = {
      user_id: userId,
      text: "How does my experience align with AI research?",
    } as any;

    // Mock ack and say
    const mockAck = jest.fn();
    const mockSay = jest.fn();

    // Call the experience handler to trigger OpenAI response
    await slackHandlers.handleQuestion({
      command: mockCommand,
      ack: mockAck,
      say: mockSay,
    } as any);

    // Ensure ack was called
    expect(mockAck).toHaveBeenCalled();

    // Check that the response from OpenAI is sent back via the say function
    expect(mockSay).toHaveBeenCalled();

    const sayCall = mockSay.mock.calls[0][0];
    expect(sayCall).toContain(
      "Here's how your context might answer this question:",
    );
  });
});
