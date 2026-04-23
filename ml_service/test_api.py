"""
API Test Script
================
Run this after starting app.py to verify all endpoints are working.

Usage:
    python test_api.py

All tests should print OK. If any fail, check the Flask server logs.
"""

import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:5000"
PASS = "\033[92m  ✓ PASS\033[0m"
FAIL = "\033[91m  ✗ FAIL\033[0m"


def post(path: str, body: dict) -> dict:
    data    = json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    req     = urllib.request.Request(f"{BASE_URL}{path}", data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


def get(path: str) -> dict:
    with urllib.request.urlopen(f"{BASE_URL}{path}", timeout=10) as resp:
        return json.loads(resp.read())


def run_tests():
    print("\n" + "=" * 50)
    print("  SpendSense ML Service — API Tests")
    print("=" * 50)

    # ── Health check ─────────────────────────────────────────
    print("\n[1] GET /health")
    try:
        r = get("/health")
        assert r["status"] == "ok", f"Expected 'ok', got {r['status']}"
        print(f"    Status: {r['status']}")
        print(f"    Models: {r['models']}")
        print(PASS)
    except Exception as e:
        print(f"{FAIL}: {e}")

    # ── Normal transaction ────────────────────────────────────
    print("\n[2] POST /predict — normal transaction (₹450, Food)")
    try:
        r = post("/predict", {
            "amount":       450,
            "category":     "Food",
            "user_history": [300, 400, 350, 500, 420, 380, 410, 460, 330, 490],
        })
        assert "anomaly_score" in r
        assert "is_anomaly"    in r
        print(f"    Score:      {r['anomaly_score']}")
        print(f"    Is anomaly: {r['is_anomaly']}")
        print(f"    Z-score:    {r['z_score']}")
        print(PASS)
    except Exception as e:
        print(f"{FAIL}: {e}")

    # ── Anomalous transaction ─────────────────────────────────
    print("\n[3] POST /predict — anomalous transaction (₹85,000, Food)")
    try:
        r = post("/predict", {
            "amount":       85000,
            "category":     "Food",
            "user_history": [300, 400, 350, 500, 420, 380, 410, 460, 330, 490],
        })
        print(f"    Score:      {r['anomaly_score']}")
        print(f"    Is anomaly: {r['is_anomaly']}")
        print(f"    Z-score:    {r['z_score']}")
        print(PASS)
    except Exception as e:
        print(f"{FAIL}: {e}")

    # ── Categorisation: known merchant ────────────────────────
    print("\n[4] POST /categorise — 'Swiggy'")
    try:
        r = post("/categorise", {"merchant": "Swiggy"})
        assert "category"   in r
        assert "confidence" in r
        print(f"    Category:   {r['category']}")
        print(f"    Confidence: {r['confidence']:.2%}")
        print(f"    Top probs:  {r['all_probs']}")
        print(PASS)
    except Exception as e:
        print(f"{FAIL}: {e}")

    # ── Categorisation: unseen merchant ──────────────────────
    print("\n[5] POST /categorise — 'Uber Eats Delhi'")
    try:
        r = post("/categorise", {"merchant": "Uber Eats Delhi"})
        print(f"    Category:   {r['category']}")
        print(f"    Confidence: {r['confidence']:.2%}")
        print(PASS)
    except Exception as e:
        print(f"{FAIL}: {e}")

    # ── Categorisation: transport ─────────────────────────────
    print("\n[6] POST /categorise — 'Ola Cabs'")
    try:
        r = post("/categorise", {"merchant": "Ola Cabs"})
        print(f"    Category:   {r['category']}")
        print(f"    Confidence: {r['confidence']:.2%}")
        print(PASS)
    except Exception as e:
        print(f"{FAIL}: {e}")

    # ── Forecast: mid-month ───────────────────────────────────
    print("\n[7] POST /forecast — day 15, ₹8,000 spent, avg ₹20,000")
    try:
        r = post("/forecast", {
            "day_of_month":   15,
            "spent_so_far":   8000,
            "historical_avg": 20000,
        })
        assert "forecast" in r
        print(f"    ML forecast:       ₹{r['forecast']:,.0f}")
        print(f"    Simple projection: ₹{r['simple_projection']:,.0f}")
        print(f"    Daily rate:        ₹{r['daily_rate']:,.0f}")
        print(f"    Days remaining:    {r['days_remaining']}")
        print(PASS)
    except Exception as e:
        print(f"{FAIL}: {e}")

    # ── Edge cases ────────────────────────────────────────────
    print("\n[8] POST /predict — missing field (should return 400)")
    try:
        try:
            post("/predict", {"category": "Food"})  # no amount
            print(f"{FAIL}: expected 400 error")
        except urllib.error.HTTPError as e:
            assert e.code == 400
            print(f"    Got expected 400 error")
            print(PASS)
    except Exception as e:
        print(f"{FAIL}: {e}")

    print("\n" + "=" * 50)
    print("  All tests complete.")
    print("=" * 50 + "\n")


if __name__ == "__main__":
    run_tests()
