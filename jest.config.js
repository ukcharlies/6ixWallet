module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src/tests"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  setupFilesAfterEnv: [
    "<rootDir>/src/tests/setup.js",
    "<rootDir>/jest.setup.js",
  ],
  forceExit: true,
  detectOpenHandles: true,
  transformIgnorePatterns: ["node_modules/(?!(node-fetch)/)"],
};
