const fs = require('fs');
const path = require('path');

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function getOutputPath(fileName, outputDir = path.resolve(process.cwd(), 'output')) {
  ensureDirectory(outputDir);
  return path.join(outputDir, fileName);
}

function getTimestampedFileName(prefix, extension) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}-${timestamp}.${extension}`;
}

module.exports = { ensureDirectory, getOutputPath, getTimestampedFileName };
