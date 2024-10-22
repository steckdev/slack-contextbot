import {
  handleSendContext,
  handleExperience,
  userContext,
  userRequestCounts,
} from "../src/app";
import { SlackCommandMiddlewareArgs } from "@slack/bolt";
import { OpenAI } from "openai";

// Mock the Slack `say` and `ack` functions
const mockSay = jest.fn();
const mockAck = jest.fn();

describe("ContextBot Command Handlers", () => {
  beforeEach(() => {
    mockSay.mockClear();
    mockAck.mockClear();
  });

  it("should store a context when /sendcontext is used", async () => {
    const mockCommand: SlackCommandMiddlewareArgs["command"] = {
      user_id: "U12345",
      text: "This is my context.",
    } as any;

    await handleSendContext({
      command: mockCommand,
      ack: mockAck,
      say: mockSay,
    } as any);

    expect(mockAck).toHaveBeenCalled();
    expect(userContext["U12345"]).toBe("This is my context.");
    expect(mockSay).toHaveBeenCalledWith(
      "Your context has been saved! You can now use `/experience` to ask questions based on your context."
    );
  });

  it("should call OpenAI when /experience is used", async () => {
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              { message: { content: "This is an AI-generated response." } },
            ],
          }),
        },
      },
    } as unknown as OpenAI;

    userContext["U12345"] = "This is my context.";

    const mockCommand: SlackCommandMiddlewareArgs["command"] = {
      user_id: "U12345",
      text: "Tell me about AI.",
    } as any;

    await handleExperience(
      { command: mockCommand, ack: mockAck, say: mockSay } as any,
      mockOpenAI
    );

    expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    expect(mockSay).toHaveBeenCalledWith(
      "Here's how your context might answer this question:\n*Tell me about AI.*\n\nThis is an AI-generated response."
    );
  });
});
