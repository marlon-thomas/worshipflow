const { expo } = require('./app.json');

module.exports = {
  expo: {
    ...expo,
    experiments: {
      ...expo.experiments,
      // Deploy under a subpath (e.g. GitHub Pages project page) by setting
      // EXPO_PUBLIC_BASE_URL=/worshipflow at export time. Empty when unset,
      // so native apps and local web dev are unaffected.
      baseUrl: process.env.EXPO_PUBLIC_BASE_URL || '',
    },
  },
};