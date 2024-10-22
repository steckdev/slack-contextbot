import {
  createAppInstance,
  createOpenAIInstance,
  registerCommands,
} from './app';

const openAi = createOpenAIInstance();

const app = createAppInstance();

registerCommands(app, openAi);

// Start the app
(async () => {
  await app.start();
  console.log('⚡️ ContextBot is running!');
})();
