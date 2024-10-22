import {
  createOpenAIInstance,
  handleExperience,
  userContext,
} from "../src/app";
import { SlackCommandMiddlewareArgs } from "@slack/bolt";
import dotenv from "dotenv";
import { OpenAI } from "openai";

// Load the environment variables from .env
dotenv.config();

// Ensure that real OpenAI API key is used
describe("Integration Test with OpenAI API", () => {
  let openai: OpenAI;

  beforeAll(() => {
    openai = createOpenAIInstance();
  });

  it("should get a response from OpenAI based on a context and a question", async () => {
    // Set up a real context and user data
    const userId = "U12345";
    userContext[userId] =
      "This is a test context with experience in AI and software development.";

    // Mock Slack command for /experience
    const mockCommand: SlackCommandMiddlewareArgs["command"] = {
      user_id: userId,
      text: "How does my experience align with AI research?",
    } as any;

    // Mock ack and say
    const mockAck = jest.fn();
    const mockSay = jest.fn();

    // Call the experience handler to trigger OpenAI response
    await handleExperience(
      { command: mockCommand, ack: mockAck, say: mockSay } as any,
      openai
    );

    // Ensure ack was called
    expect(mockAck).toHaveBeenCalled();

    // Check that the response from OpenAI is sent back via the say function
    expect(mockSay).toHaveBeenCalled();

    const sayCall = mockSay.mock.calls[0][0];
    expect(sayCall).toContain(
      "Here's how your context might answer this question:"
    );
  });
});