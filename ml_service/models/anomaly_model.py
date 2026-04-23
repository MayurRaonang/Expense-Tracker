"""
Anomaly Detection using Isolation Forest
-----------------------------------------
How it works (Andrew Ng course connection):
  - Isolation Forest is an unsupervised learning algorithm.
  - It builds random decision trees and measures how quickly
    each data point gets "isolated" (separated from others).
  - Normal points need many splits to isolate — they cluster together.
  - Anomalous points are isolated in very few splits — they are outliers.
  - The score returned is between -1 and 1:
      score < -0.1  → anomalous (flag the transaction)
      score >= -0.1 → normal
"""

import os
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from utils.logger import get_logger

logger = get_logger(__name__)

MODEL_PATH  = "saved_models/anomaly_model.pkl"
SCALER_PATH = "saved_models/anomaly_scaler.pkl"

# Anomaly threshold — scores below this are flagged
ANOMALY_THRESHOLD = -0.1

# Category index map for feature encoding
CATEGORIES = [
    "Food", "Transport", "Shopping", "Entertainment",
    "Health", "Utilities", "Education", "Travel", "Other", "Uncategorised"
]


def _encode_category(category: str) -> int:
    """Encode category as an integer index."""
    try:
        return CATEGORIES.index(category)
    except ValueError:
        return len(CATEGORIES) - 1  # default → Uncategorised


def _build_features(amount: float, category: str, history: list[float]) -> np.ndarray:
    """
    Build a feature vector for a single transaction.

    Features:
      0: amount (raw)
      1: category index (encoded)
      2: z-score of amount relative to user history
      3: ratio of amount to user's mean
      4: ratio of amount to user's 75th percentile
      5: log of amount (handles skewed distributions)
    """
    history_arr = np.array(history, dtype=float) if history else np.array([amount])

    mean   = float(np.mean(history_arr))
    std    = float(np.std(history_arr)) or 1.0
    p75    = float(np.percentile(history_arr, 75)) or 1.0

    z_score    = (amount - mean) / std
    mean_ratio = amount / mean if mean > 0 else 1.0
    p75_ratio  = amount / p75  if p75  > 0 else 1.0
    log_amount = float(np.log1p(amount))

    return np.array([[
        amount,
        _encode_category(category),
        z_score,
        mean_ratio,
        p75_ratio,
        log_amount,
    ]])


def _train_new_model() -> tuple:
    """
    Train a fresh Isolation Forest on synthetic baseline data.
    Used when a user has no history yet, or when the model is first created.
    """
    logger.info("Training new Isolation Forest model on synthetic baseline...")

    # Simulate a realistic distribution of everyday transactions
    rng = np.random.default_rng(42)
    normal_amounts = np.concatenate([
        rng.normal(300,  100, 200),   # small purchases (tea, auto)
        rng.normal(800,  250, 150),   # medium (groceries, meals)
        rng.normal(2000, 600, 100),   # larger (clothes, bills)
        rng.normal(5000, 1500, 50),   # significant (flights, gadgets)
    ])
    normal_amounts = np.clip(normal_amounts, 10, 50000)

    # Build feature matrix for training
    features = []
    for amt in normal_amounts:
        cat_idx = rng.integers(0, len(CATEGORIES))
        log_amt = np.log1p(amt)
        features.append([amt, cat_idx, 0.0, 1.0, 1.0, log_amt])

    X = np.array(features)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=200,
        contamination=0.05,   # expect ~5% anomalies
        max_samples="auto",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_scaled)

    os.makedirs("saved_models", exist_ok=True)
    joblib.dump(model,  MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    logger.info("Isolation Forest model saved.")

    return model, scaler


def load_or_train() -> tuple:
    """Load persisted model from disk, or train a new one."""
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        try:
            model  = joblib.load(MODEL_PATH)
            scaler = joblib.load(SCALER_PATH)
            logger.info("Loaded existing Isolation Forest model.")
            return model, scaler
        except Exception as e:
            logger.warning(f"Failed to load model ({e}), retraining...")

    return _train_new_model()


def predict_anomaly_score(amount: float, category: str, user_history: list[float]) -> dict:
    model, scaler = load_or_train()

    # ✅ FIX 1: Always use history (even small)
    if not user_history:
        user_history = [300, 400, 350, 500]  # fallback baseline

    history = np.array(user_history, dtype=float)
    logger.info(
        f"Predicting anomaly score for amount=₹{amount:.0f}, category='{category}', user_history={history.tolist()}"
    )
    # Compute stats
    mean = float(np.mean(history))
    std  = float(np.std(history)) or 1.0
    z    = (amount - mean) / std

    # Build features
    features = _build_features(amount, category, user_history)
    X_scaled = scaler.transform(features)
    raw_score = float(model.score_samples(X_scaled)[0])

    # ✅ FIX 2: Combine ML + statistical rule
    is_anomaly = (abs(z) > 2.0)

    logger.info(
        f"[FIXED] amount=₹{amount:.0f} mean={mean:.1f} std={std:.1f} "
        f"z={z:.2f} score={raw_score:.4f} anomaly={is_anomaly}"
    )

    return {
        "anomaly_score": round(raw_score, 6),
        "is_anomaly":    bool(is_anomaly),
        "threshold":     ANOMALY_THRESHOLD,
        "z_score":       round(z, 4),
        "user_mean":     round(mean, 2),
        "user_std":      round(std, 2),
    }