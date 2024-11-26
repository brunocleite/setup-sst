/// <reference types="./.sst/platform/config.d.ts" />

// noinspection JSUnusedGlobalSymbols
export default $config({
  app() {
    return {
      name: 'test-sst-app-bun',
      removal: 'remove',
      home: 'aws'
    }
  },
  async run() {}
})
