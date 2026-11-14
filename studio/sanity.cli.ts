import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  deployment: {
    appId: 'u71xj1ebhzvr45z6lam5ioq3',
  },
  // `npm run deploy` publishes the Studio to https://nadrix.sanity.studio
  studioHost: 'nadrix',
})
