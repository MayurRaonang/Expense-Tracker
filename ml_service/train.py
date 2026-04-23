"""
Pre-training script
====================
Run this ONCE before starting the Flask server to train and save
all three models to disk. This avoids training on the first request.

Usage:
    python train.py

After this runs, you'll see three .pkl files in saved_models/:
    anomaly_model.pkl
    anomaly_scaler.pkl
    category_pipeline.pkl
    category_encoder.pkl
    forecast_model.pkl
    forecast_scaler.pkl
"""

import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))

from utils.logger import get_logger

logger = get_logger("train")


def train_all():
    logger.info("=" * 55)
    logger.info("  SpendSense ML Service — Pre-training all models")
    logger.info("=" * 55)

    # ── 1. Anomaly model ─────────────────────────────────────
    logger.info("\n[1/3] Training Isolation Forest (anomaly detection)...")
    t0 = time.time()
    from models.anomaly_model import _train_new_model as train_anomaly
    train_anomaly()
    logger.info(f"      Done in {time.time() - t0:.1f}s")

    # ── 2. Categorisation model ───────────────────────────────
    logger.info("\n[2/3] Training Naive Bayes (merchant categorisation)...")
    t0 = time.time()
    from models.category_model import _train_new_model as train_category
    train_category()
    logger.info(f"      Done in {time.time() - t0:.1f}s")

    # ── 3. Forecast model ─────────────────────────────────────
    logger.info("\n[3/3] Training Ridge Regression (budget forecast)...")
    t0 = time.time()
    from models.forecast_model import _train_new_model as train_forecast
    train_forecast()
    logger.info(f"      Done in {time.time() - t0:.1f}s")

    # ── Summary ───────────────────────────────────────────────
    logger.info("\n" + "=" * 55)
    logger.info("  All models trained and saved to saved_models/")
    logger.info("  Files created:")
    for f in sorted(os.listdir("saved_models")):
        size = os.path.getsize(f"saved_models/{f}") / 1024
        logger.info(f"    {f:<40} {size:.1f} KB")
    logger.info("=" * 55)
    logger.info("\n  You can now start the Flask server:")
    logger.info("  python app.py\n")


if __name__ == "__main__":
    os.makedirs("saved_models", exist_ok=True)
    train_all()
