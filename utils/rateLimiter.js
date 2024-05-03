const rateLimit = require("express-rate-limit");

const rateLimiter = (limit, timeFrameInMinutes, message) => {
  return rateLimit({
    max: limit,
    windowMs: timeFrameInMinutes * 60 * 1000,
    message: {
      error: {
        status: 429,
        message: message,
        expiry: timeFrameInMinutes,
      },
    },
  });
};

module.exports = rateLimiter;
