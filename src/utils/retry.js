async function withRetry(operation, { retries = 2, delayMs = 500 } = {}) {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      attempt += 1;
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
}

module.exports = { withRetry };
