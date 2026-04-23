const axios = require('axios');

const ML_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5000';

/**
 * Calls Python ML service to get anomaly score for a transaction.
 * Values below -0.1 are considered anomalous.
 * Falls back to 0.0 if ML service is unavailable.
 */
const getAnomalyScore = async (amount, category, userHistory) => {
  try {
    const { data } = await axios.post(`${ML_URL}/predict`, {
      amount: parseFloat(amount),
      category,
      user_history: userHistory,
    });

    if (data) {
      return {
        anomalyScore: parseFloat(data.anomaly_score),
        isAnomaly: data.is_anomaly,
      };
    }
  } catch (err) {
    console.warn(`ML service unavailable for anomaly detection, skipping. Error: ${err.message}`);
  }

  // fallback
  return {
    anomalyScore: 0.0,
    isAnomaly: false,
  };
};

/**
 * Calls Python ML service to auto-categorise a transaction by merchant name.
 * Falls back to "Uncategorised" if ML service is unavailable.
 */
const getAutoCategory = async (merchantName) => {
  try {
    const { data } = await axios.post(`${ML_URL}/categorise`, {
      merchant: merchantName,
    });
    if (data && data.category) {
      return data.category;
    }
  } catch (err) {
    console.warn(`ML service unavailable for categorisation, skipping. Error: ${err.message}`);
  }
  return 'Uncategorised';
};

/**
 * Calls Python ML service to forecast end-of-month spending.
 * Falls back to 0.0 if ML service is unavailable.
 */
const getForecast = async (dayOfMonth, spentSoFar, historicalMonthlyAvg) => {
  try {
    const { data } = await axios.post(`${ML_URL}/forecast`, {
      day_of_month: dayOfMonth,
      spent_so_far: spentSoFar,
      historical_avg: historicalMonthlyAvg,
    });
    if (data && data.forecast !== undefined) {
      return parseFloat(data.forecast);
    }
  } catch (err) {
    console.warn(`ML service unavailable for forecast, skipping. Error: ${err.message}`);
  }
  return 0.0;
};

module.exports = { getAnomalyScore, getAutoCategory, getForecast };
