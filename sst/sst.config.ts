/// <reference types="./.sst/platform/config.d.ts" />

// noinspection JSUnusedGlobalSymbols
export default $config({
  app() {
    return {
      name: 'testapp',
      removal: 'remove',
      home: 'aws'
    }
  },
  async run() {}
})
