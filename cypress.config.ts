import { defineConfig } from "cypress";

export default defineConfig({

  // E2E Configs here
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    viewportWidth: 1920,
    viewportHeight: 1080
  },

  // Component Testing here
  component: {
    devServer: {
      framework: "angular",
      bundler: "webpack",
    },
    specPattern: "**/*.cy.ts",
    viewportWidth: 1920,
    viewportHeight: 1080
  },
});
