const React = require('react');
const { Text } = require('react-native');

const RenderHtml = ({ source }) =>
  React.createElement(Text, { testID: 'render-html' }, source?.html || '');

module.exports = {
  __esModule: true,
  default: RenderHtml,
  RenderHtml,
};
