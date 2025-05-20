// src/config/config.js
export const API_BASE =
  process.env.VUE_APP_API_URL || "http://localhost:10103/api";

// h5 and web are interchangeable
export const APP_PLATFORM = process.env.VUE_APP_PLATFORM || "h5";

export const FEATURE_FLAGS = {
  enableAnalytics: false,
};

export const TIMEOUT = 15000;
