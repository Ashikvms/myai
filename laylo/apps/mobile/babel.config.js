/**
 * Babel config for the BillBee mobile app.
 *
 * `babel-preset-expo` covers RN + Expo + Flow stripping + TS — it's
 * the same preset Metro uses at runtime, so build + tests share one
 * transform pipeline.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
