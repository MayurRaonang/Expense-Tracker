"""
Budget Forecasting using Linear Regression
-------------------------------------------
How it works (Andrew Ng course connection):
  - This is univariate/multivariate linear regression — Week 1–2 of the course.
  - Features:
      x1 = day_of_month        (1–31)
      x2 = spent_so_far        (₹ total up to today)
      x3 = historical_avg      (user's average monthly spend from past months)
  - Target: projected end-of-month total spend.
  - The model learns: "if you've spent ₹8,000 by day 15, you'll likely
    spend ₹16,000 by month end" — a linear extrapolation enriched by history.
  - We also expose a simple rule-based projection as a fallback/comparison.
"""

import os
import numpy as np
import joblib
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from utils.logger import get_logger

logger = get_logger(__name__)

MODEL_PATH  = "saved_models/forecast_model.pkl"
SCALER_PATH = "saved_models/forecast_scaler.pkl"

DAYS_IN_MONTH = 30  # approximate


def _build_features(day_of_month: int, spent_so_far: float, historical_avg: float) -> np.ndarray:
    """
    Build feature vector for forecasting.

    Features:
      0: day_of_month        — how far through the month we are
      1: spent_so_far        — cumulative spend up to today
      2: historical_avg      — user's past monthly average
      3: daily_rate          — spent_so_far / day_of_month
      4: pct_month_elapsed   — day_of_month / 30
      5: projected_simple    — daily_rate × 30  (rule-based baseline)
    """
    day        = max(day_of_month, 1)
    daily_rate = spent_so_far / day
    pct_elapsed = day / DAYS_IN_MONTH
    projected_simple = daily_rate * DAYS_IN_MONTH

    return np.array([[
        day,
        spent_so_far,
        historical_avg,
        daily_rate,
        pct_elapsed,
        projected_simple,
    ]])


def _train_new_model() -> tuple:
    """
    Train Ridge Regression on synthetic monthly spending data.
    Ridge is linear regression with L2 regularisation —
    prevents overfitting when features are correlated.
    """
    logger.info("Training Ridge Regression forecast model on synthetic data...")

    rng = np.random.default_rng(42)
    n_samples = 2000
    rows = []

    for _ in range(n_samples):
        monthly_avg   = rng.uniform(5000, 50000)          # user's typical monthly spend
        day           = rng.integers(1, 31)                # random day in month
        noise_factor  = rng.uniform(0.7, 1.4)             # spending varies month to month
        actual_total  = monthly_avg * noise_factor

        # Spend so far = proportion of actual total up to this day, with noise
        spend_fraction = (day / DAYS_IN_MONTH) * rng.uniform(0.6, 1.4)
        spent_so_far   = actual_total * min(spend_fraction, 1.0)

        features = _build_features(day, spent_so_far, monthly_avg)[0]
        rows.append((*features, actual_total))

    data       = np.array(rows)
    X, y       = data[:, :-1], data[:, -1]

    scaler  = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = Ridge(alpha=1.0)
    model.fit(X_scaled, y)

    # Quick evaluation on training data
    predictions = model.predict(X_scaled)
    mae = float(np.mean(np.abs(predictions - y)))
    logger.info(f"Forecast model MAE on training data: ₹{mae:.0f}")

    os.makedirs("saved_models", exist_ok=True)
    joblib.dump(model,  MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    logger.info("Forecast model saved.")

    return model, scaler


def load_or_train() -> tuple:
    """Load persisted model from disk, or train a new one."""
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        try:
            model  = joblib.load(MODEL_PATH)
            scaler = joblib.load(SCALER_PATH)
            logger.info("Loaded existing forecast model.")
            return model, scaler
        except Exception as e:
            logger.warning(f"Failed to load forecast model ({e}), retraining...")

    return _train_new_model()


def predict_forecast(day_of_month: int, spent_so_far: float, historical_avg: float) -> dict:
    """
    Main function called by Flask endpoint /forecast.

    Returns:
        {
          "forecast":         float,  # ML predicted end-of-month spend
          "simple_projection":float,  # rule-based: daily_rate × 30
          "daily_rate":       float,  # avg spend per day so far
          "days_remaining":   int,
          "budget_remaining": float,  # historical_avg − spent_so_far
        }
    """
    model, scaler = load_or_train()

    day        = max(int(day_of_month), 1)
    features   = _build_features(day, spent_so_far, historical_avg)
    X_scaled   = scaler.transform(features)

    ml_forecast      = float(model.predict(X_scaled)[0])
    daily_rate       = spent_so_far / day
    simple_proj      = daily_rate * DAYS_IN_MONTH
    days_remaining   = max(DAYS_IN_MONTH - day, 0)
    budget_remaining = max(historical_avg - spent_so_far, 0)

    # Sanity clamp — forecast shouldn't be negative or wildly unrealistic
    ml_forecast = max(ml_forecast, spent_so_far)
    ml_forecast = min(ml_forecast, spent_so_far * 10)

    logger.info(
        f"Forecast: day={day} spent=₹{spent_so_far:.0f} "
        f"hist_avg=₹{historical_avg:.0f} → ₹{ml_forecast:.0f}"
    )

    return {
        "forecast":          round(ml_forecast, 2),
        "simple_projection": round(simple_proj, 2),
        "daily_rate":        round(daily_rate, 2),
        "days_remaining":    days_remaining,
        "budget_remaining":  round(budget_remaining, 2),
    }
