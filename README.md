# Slack Context Bot

Slack Context Bot is a Slack bot that leverages OpenAI's API to answer job-related questions based on user-submitted resumes. It uses TypeScript, Jest for testing, and ESLint for linting.

## Features

- **/sendresume**: Upload your resume via a Slack command to store it.
- **/experience**: Ask how your resume would answer a job-related question, with the bot responding based on the submitted resume.
- **OpenAI Integration**: Uses OpenAI's API (GPT) to generate responses.
- **Rate Limiting**: Limits users to 20 requests per hour.
- **TypeScript**: TypeScript is used to enforce type safety and maintain cleaner code.
- **CSpell**: Spell-checking for your code to catch typos in comments and variables.
- **ESLint**: Linting with ESLint and TypeScript support to ensure code quality.
- **Jest**: Unit and integration tests are handled via Jest.

## Requirements

- Node.js `>=22.0.0`
- Slack workspace
- OpenAI API key

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-repo/slack-context-bot.git
   ```

2. Navigate into the project directory:

   ```bash
   cd slack-context-bot
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Set up the environment variables by creating a `.env` file in the root:

   ```bash
   OPENAI_API_KEY=your-openai-api-key
   SLACK_BOT_TOKEN=your-slack-bot-token
   SLACK_APP_TOKEN=your-slack-app-token
   PORT=3000
   ```

5. Build the project:

   ```bash
   npm run build
   ```

6. Start the bot:

   ```bash
   npm start
   ```

## Usage

1. **Send Resume:**

   ```bash
   /sendresume <your resume text>
   ```

   Stores the resume in memory for later use.

2. **Ask for Experience:**

   ```bash
   /experience <your question>
   ```

   Ask how your resume aligns with a job description or specific question.

## Running Tests

To run unit tests:

```bash
npm test
```

To run integration tests:

```bash
npm run test:integration
```

## Linting

To check code for linting errors:

```bash
npm run lint
```

To automatically fix linting issues:

```bash
npm run lint:fix
```

## Spell-Check

To run a spell check on the codebase:

```bash
npm run cspell
```

To automatically fix spelling errors:

```bash
npm run cspell:fix
```

## VSCode Configuration

This project comes with **VSCode** configurations:

- **Launch App**: Launch and debug the app from within VSCode.
- **Jest Tests**: Run tests and see feedback within the editor.

### Recommended VSCode Extensions:

1. **ESLint**: Linting support for TypeScript and JavaScript.
2. **Prettier**: Code formatting.
3. **TypeScript Language Features**: TypeScript support.
4. **Jest**: Testing support.
5. **CSpell**: Spell-checker for code comments and documentation.

## Contribution

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Submit a pull request, and ensure it passes all tests and linting checks.

## License

MIT
