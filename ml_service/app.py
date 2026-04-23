"""
SpendSense ML Service
======================
Flask microservice exposing three ML endpoints:

  POST /predict     — Isolation Forest anomaly detection
  POST /categorise  — Naive Bayes merchant categorisation
  POST /forecast    — Ridge Regression budget forecast
  GET  /health      — Health check
  POST /retrain     — Force retrain all models

The Java Spring Boot backend calls these endpoints via RestTemplate.
All responses are JSON. All endpoints are stateless — models are
loaded from disk once on first call, then cached in memory.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS

from models.anomaly_model  import predict_anomaly_score
from models.category_model import predict_category
from models.forecast_model import predict_forecast
from utils.logger          import get_logger

import os
import joblib

logger = get_logger("app")

app = Flask(__name__)
CORS(app)   # allow requests from Spring Boot backend


# ─── Health check ────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":  "ok",
        "service": "SpendSense ML Service",
        "models": {
            "anomaly":      os.path.exists("saved_models/anomaly_model.pkl"),
            "categoriser":  os.path.exists("saved_models/category_pipeline.pkl"),
            "forecast":     os.path.exists("saved_models/forecast_model.pkl"),
        }
    })


# ─── Anomaly detection ───────────────────────────────────────────────────────

@app.route("/predict", methods=["POST"])
def predict():
    """
    Request body:
        {
          "amount":       float,          # transaction amount (required)
          "category":     str,            # category label (optional)
          "user_history": [float, ...]    # list of past amounts (optional)
        }

    Response:
        {
          "anomaly_score": float,   # raw IF score (lower = more anomalous)
          "is_anomaly":    bool,
          "threshold":     float,
          "z_score":       float,
          "user_mean":     float,
          "user_std":      float
        }
    """
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    amount = data.get("amount")
    if amount is None:
        return jsonify({"error": "Field 'amount' is required"}), 400

    try:
        amount       = float(amount)
        category     = str(data.get("category", "Other"))
        user_history = [float(x) for x in data.get("user_history", [])]
    except (TypeError, ValueError) as e:
        return jsonify({"error": f"Invalid input: {e}"}), 400

    try:
        logger.info(f"Received /predict request: amount={amount}, category='{category}', user_history={user_history}")
        result = predict_anomaly_score(amount, category, user_history)
        return jsonify(result)
    except Exception as e:
        logger.error(f"/predict error: {e}")
        return jsonify({"error": "Prediction failed", "detail": str(e)}), 500


# ─── Auto-categorisation ─────────────────────────────────────────────────────

@app.route("/categorise", methods=["POST"])
def categorise():
    """
    Request body:
        { "merchant": str }

    Response:
        {
          "category":   str,
          "confidence": float,
          "all_probs":  { category: float, ... }
        }
    """
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    merchant = data.get("merchant", "").strip()
    if not merchant:
        return jsonify({"error": "Field 'merchant' is required"}), 400

    try:
        result = predict_category(merchant)
        return jsonify(result)
    except Exception as e:
        logger.error(f"/categorise error: {e}")
        return jsonify({"error": "Categorisation failed", "detail": str(e)}), 500


# ─── Budget forecast ─────────────────────────────────────────────────────────

@app.route("/forecast", methods=["POST"])
def forecast():
    """
    Request body:
        {
          "day_of_month":  int,    # current day (1–31)
          "spent_so_far":  float,  # total spend this month so far
          "historical_avg":float   # user's average monthly spend from history
        }

    Response:
        {
          "forecast":          float,
          "simple_projection": float,
          "daily_rate":        float,
          "days_remaining":    int,
          "budget_remaining":  float
        }
    """
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    try:
        day_of_month   = int(data.get("day_of_month", 1))
        spent_so_far   = float(data.get("spent_so_far", 0))
        historical_avg = float(data.get("historical_avg", 10000))
    except (TypeError, ValueError) as e:
        return jsonify({"error": f"Invalid input: {e}"}), 400

    try:
        result = predict_forecast(day_of_month, spent_so_far, historical_avg)
        return jsonify(result)
    except Exception as e:
        logger.error(f"/forecast error: {e}")
        return jsonify({"error": "Forecast failed", "detail": str(e)}), 500


# ─── Force retrain ───────────────────────────────────────────────────────────

@app.route("/retrain", methods=["POST"])
def retrain():
    """
    Deletes saved model files and retrains all models from scratch.
    Useful when you update merchant_labels.csv with new training data.
    """
    import glob
    deleted = []
    for f in glob.glob("saved_models/*.pkl"):
        os.remove(f)
        deleted.append(f)
        logger.info(f"Deleted {f}")

    # Trigger retrain by calling each model once
    try:
        predict_anomaly_score(1000, "Food", [])
        predict_category("Swiggy")
        predict_forecast(15, 5000, 15000)
        return jsonify({
            "status":  "retrained",
            "deleted": deleted,
            "message": "All models retrained successfully"
        })
    except Exception as e:
        logger.error(f"/retrain error: {e}")
        return jsonify({"error": "Retrain failed", "detail": str(e)}), 500


# ─── Error handlers ───────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed"}), 405

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "Internal server error"}), 500


# ─── Startup ──────────────────────────────────────────────────────────────────

def warm_up():
    """
    Pre-load all models at startup so the first real request
    doesn't have to wait for training.
    """
    logger.info("Warming up models...")
    try:
        predict_anomaly_score(500, "Food", [200, 300, 400])
        logger.info("  ✓ Anomaly model ready")
    except Exception as e:
        logger.warning(f"  ✗ Anomaly model warmup failed: {e}")

    try:
        predict_category("Swiggy")
        logger.info("  ✓ Categorisation model ready")
    except Exception as e:
        logger.warning(f"  ✗ Categorisation model warmup failed: {e}")

    try:
        predict_forecast(15, 8000, 20000)
        logger.info("  ✓ Forecast model ready")
    except Exception as e:
        logger.warning(f"  ✗ Forecast model warmup failed: {e}")

    logger.info("All models warmed up. ML service ready.")


if __name__ == "__main__":
    warm_up()
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting SpendSense ML Service on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
