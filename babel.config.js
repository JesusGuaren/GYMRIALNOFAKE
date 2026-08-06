module.exports = function (api) {
  api.cache(true);
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      "react-native-reanimated/plugin",
      // Strip console.log/debug/info/warn from release builds; console.error
      // stays so real failures are still visible via adb logcat / crash tools.
      isProduction && ["transform-remove-console", { exclude: ["error"] }],
    ].filter(Boolean),
  };
};

