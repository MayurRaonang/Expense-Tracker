"""
Merchant Auto-Categorisation — Improved Pipeline
--------------------------------------------------
Key changes over v1:
  1. Word-level n-grams (1,2) INSTEAD of char n-grams — short brand names
     like "Amazon", "Ola", "Swiggy" are single tokens; char n-grams shred
     them into noise. Word unigrams + bigrams give the model the full token.

  2. Exact-match lookup table (checked BEFORE ML) — handles the most
     common/ambiguous merchants deterministically. This is why "Amazon"
     was going to "Other": it appeared in both Shopping and Other
     (Amazon Pay), so the model averaged them out. Exact match wins.

  3. Keyword heuristics as a second-pass fallback — if confidence is low,
     scan for domain keywords (pharmacy, cab, flight, etc.) before
     returning FALLBACK. This is a simple rule-based prior that mimics
     what a human would do.

  4. Complement Naive Bayes (ComplementNB) instead of MultinomialNB —
     CNB is specifically designed for imbalanced datasets (which this is,
     since "Other" has ~50 labels vs ~10 per other category). CNB trains
     each class on its *complement* (everything NOT that class), making it
     much more robust against the dominant-class bias.

  5. min_df=1, sublinear_tf=True — on a small corpus every word matters;
     min_df=2+ silently drops rare but decisive tokens like "zomato".
"""

import os, re
import pandas as pd
import joblib
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import ComplementNB
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import accuracy_score, classification_report
from sklearn.calibration import CalibratedClassifierCV
from utils.logger import get_logger
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC

logger = get_logger(__name__)

MODEL_PATH   = "saved_models/category_pipeline.pkl"
ENCODER_PATH = "saved_models/category_encoder.pkl"
DATA_PATH    = "data/merchant_labels.csv"

FALLBACK_CATEGORY = "Other"
CONFIDENCE_THRESHOLD = 0.30   # below this, fall back to keyword rules


# ---------------------------------------------------------------------------
# 1. EXACT-MATCH LOOKUP  (checked first, before any ML)
# ---------------------------------------------------------------------------
# Handles merchants that appear in multiple categories in the training data
# (e.g. "Amazon" = Shopping, "Amazon Pay" = Other, "Amazon Prime" = Entertainment)
# The model can't resolve these — a lookup table can.
EXACT_MATCH: dict[str, str] = {
    "amazon":          "Shopping",
    "amazon pay":      "Other",
    "amazon prime":    "Entertainment",
    "flipkart":        "Shopping",
    "myntra":          "Shopping",
    "swiggy":          "Food",
    "swiggy instamart":"Food",
    "zomato":          "Food",
    "blinkit":         "Other",         # quick-commerce — keep as Other per CSV
    "zepto":           "Other",
    "dunzo":           "Other",
    "dunzo food":      "Food",
    "paytm":           "Other",
    "phonepe":         "Other",
    "google pay":      "Other",
    "disney hotstar":  "Entertainment",
    "hotstar":         "Entertainment",
    "jio":             "Utilities",
    "jio saavn":       "Entertainment",
    "jiomart":         "Shopping",
    "jio mart":        "Shopping",
    "netflix":         "Entertainment",
    "spotify":         "Entertainment",
    "youtube premium": "Entertainment",
    "uber":            "Transport",
    "ola":             "Transport",
    "rapido":          "Transport",
    "indigo":          "Travel",
    "air india":       "Travel",
    "makemytrip":      "Travel",
    "oyo":             "Travel",
    "airbnb":          "Travel",
    "irctc":           "Transport",
    "zerodha":         "Other",
    "groww":           "Other",
    "hdfc":            "Other",
    "sbi":             "Other",
    "icici":           "Other",
    "lic":             "Other",
    "byju":            "Education",
    "unacademy":       "Education",
    "upgrad":          "Education",
    "coursera":        "Education",
    "udemy":           "Education",
    "1mg":             "Health",
    "pharmeasy":       "Health",
    "practo":          "Health",
    "cult.fit":        "Health",
    "curefit":         "Health",
    "healthifyme":     "Health",
    "bigbasket":       "Food",
    "dmart":           "Shopping",
    "reliance fresh":  "Food",
    "decathlon":       "Shopping",
    "croma":           "Shopping",
    "nykaa":           "Shopping",
    "bookmyshow":      "Entertainment",
    "pvr":             "Entertainment",
    "inox":            "Entertainment",
    "steam":           "Entertainment",
}


# ---------------------------------------------------------------------------
# 2. KEYWORD HEURISTICS  (fallback when ML confidence is low)
# ---------------------------------------------------------------------------
KEYWORD_RULES: list[tuple[list[str], str]] = [
    (["pharmacy","pharma","medplus","medicine","health","clinic","hospital",
      "doctor","fitness","gym","diet","protein","yoga","1mg","netmeds"],  "Health"),
    (["cab","taxi","auto","bike","ride","bus","metro","train","railway",
      "transport","porter","shuttle"],                                     "Transport"),
    (["flight","hotel","hostel","resort","booking","travel","air","airline",
      "airway","trip","tour","yatra","holiday"],                           "Travel"),
    (["school","college","course","learn","edu","tutor","coaching","exam",
      "test","study","class","skill","academy","certification"],           "Education"),
    (["grocery","vegetable","fruit","supermarket","kirana","fresh","organic",
      "milk","bakery","sweets","restaurant","cafe","food","eat","biryani",
      "pizza","burger","dhaba","kitchen"],                                 "Food"),
    (["movie","cinema","stream","music","game","play","show","ott","video",
      "audio","entertainment","podcast","club","event","concert","ticket"], "Entertainment"),
    (["electricity","power","gas","water","internet","broadband","wifi",
      "telecom","mobile","recharge","dth","cable","bill","utility"],       "Utilities"),
    (["shop","store","mart","fashion","cloth","wear","apparel","brand",
      "retail","buy","ecommerce","mall","bazaar","style"],                 "Shopping"),
    (["bank","insurance","invest","mutual","fund","stock","broker","loan",
      "emi","credit","debit","wallet","pay","finance","policy","premium",
      "trading","nse","bse","ipo","sip"],                                  "Other"),
]


def _preprocess(text: str) -> str:
    """Lowercase, remove punctuation, normalise whitespace."""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _exact_match(cleaned: str) -> str | None:
    """Return category if merchant matches lookup table, else None."""
    # Try full string first, then each word (for prefix matches like "HDFC Bank")
    if cleaned in EXACT_MATCH:
        return EXACT_MATCH[cleaned]
    for key, cat in EXACT_MATCH.items():
        if cleaned.startswith(key) or key in cleaned:
            return cat
    return None


def _keyword_match(cleaned: str) -> str | None:
    """Return category based on keyword rules, else None."""
    for keywords, category in KEYWORD_RULES:
        for kw in keywords:
            if kw in cleaned:
                return category
    return None


# ---------------------------------------------------------------------------
# 3. MODEL TRAINING
# ---------------------------------------------------------------------------

def _train_new_model() -> tuple:
    logger.info("Training improved Naive Bayes categorisation model...")

    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Training data not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH).dropna()
    df["merchant_clean"] = df["merchant"].apply(_preprocess)

    X = df["merchant_clean"].values
    y = df["category"].values

    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(y)

    # --- Pipeline ---
    # Word unigrams + bigrams instead of char n-grams.
    # On a small dataset of brand names, whole tokens beat character fragments.
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            analyzer="word",
            ngram_range=(1, 2),
            min_df=1,
            max_features=8000,
            sublinear_tf=True,
        )),
        # LinearSVC generalises far better than NB on small datasets.
        # CalibratedClassifierCV wraps it to give probability outputs (needed for confidence scores).
        ("clf", CalibratedClassifierCV(
            LinearSVC(C=1.0, max_iter=2000, dual='auto'),
            cv=3
        )),
    ])

    # Cross-val gives a better accuracy estimate than a single 80/20 split
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, X, y_encoded, cv=cv, scoring="accuracy")
    logger.info(
        f"5-fold CV accuracy: {cv_scores.mean():.2%} ± {cv_scores.std():.2%}"
    )
    for c in [0.1, 0.5, 1.0, 2.0, 5.0]:
        test_pipe = Pipeline([
            ("tfidf", TfidfVectorizer(analyzer="word", ngram_range=(1,2), min_df=1, sublinear_tf=True)),
            ("clf", CalibratedClassifierCV(LinearSVC(C=c, dual='auto', max_iter=2000), cv=3)),
        ])
        scores = cross_val_score(test_pipe, X, y_encoded, cv=cv, scoring="accuracy")
        logger.info(f"C={c}: {scores.mean():.2%} ± {scores.std():.2%}")
    # Final fit on all data
    pipeline.fit(X, y_encoded)

    os.makedirs("saved_models", exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    joblib.dump(encoder,  ENCODER_PATH)
    logger.info("Categorisation model saved.")

    # Print full classification report for debugging
    y_pred_all = pipeline.predict(X)
    logger.info("\n" + classification_report(
        y_encoded, y_pred_all,
        target_names=encoder.classes_
    ))

    return pipeline, encoder


def load_or_train() -> tuple:
    if os.path.exists(MODEL_PATH) and os.path.exists(ENCODER_PATH):
        try:
            pipeline = joblib.load(MODEL_PATH)
            encoder  = joblib.load(ENCODER_PATH)
            logger.info("Loaded existing categorisation model.")
            return pipeline, encoder
        except Exception as e:
            logger.warning(f"Failed to load model ({e}), retraining...")
    return _train_new_model()


# ---------------------------------------------------------------------------
# 4. PREDICTION  — 3-layer decision hierarchy
# ---------------------------------------------------------------------------

def predict_category(merchant: str) -> dict:
    """
    Decision hierarchy:
      Layer 1: Exact-match lookup  (deterministic, highest priority)
      Layer 2: ML model prediction (if confidence ≥ threshold)
      Layer 3: Keyword heuristics  (if ML is uncertain)
      Layer 4: Fallback → "Other"
    """
    cleaned = _preprocess(merchant)

    if not cleaned:
        return {"category": FALLBACK_CATEGORY, "confidence": 0.0, "all_probs": {}}

    # --- Layer 1: Exact match ---
    exact = _exact_match(cleaned)
    if exact:
        logger.info(f"Exact match: '{merchant}' → '{exact}'")
        return {"category": exact, "confidence": 1.0, "all_probs": {exact: 1.0}}

    # --- Layer 2: ML model ---
    pipeline, encoder = load_or_train()

    try:
        proba      = pipeline.predict_proba([cleaned])[0]
        class_idx  = proba.argmax()
        category   = encoder.inverse_transform([class_idx])[0]
        confidence = float(proba[class_idx])

        top5 = dict(
            sorted(
                {encoder.inverse_transform([i])[0]: round(float(p), 4)
                 for i, p in enumerate(proba)}.items(),
                key=lambda x: -x[1]
            )[:5]
        )

        if confidence >= CONFIDENCE_THRESHOLD:
            logger.info(f"ML: '{merchant}' → '{category}' ({confidence:.2%})")
            return {
                "category":   category,
                "confidence": round(confidence, 4),
                "all_probs":  top5,
            }

        # --- Layer 3: Keyword fallback (ML not confident enough) ---
        keyword_cat = _keyword_match(cleaned)
        if keyword_cat:
            logger.info(
                f"Keyword fallback: '{merchant}' → '{keyword_cat}' "
                f"(ML was {confidence:.2%} for '{category}')"
            )
            return {
                "category":   keyword_cat,
                "confidence": round(confidence, 4),
                "all_probs":  top5,
            }

        # --- Layer 4: Default ---
        logger.info(f"Fallback: '{merchant}' → '{FALLBACK_CATEGORY}'")
        return {"category": FALLBACK_CATEGORY, "confidence": round(confidence, 4), "all_probs": top5}

    except Exception as e:
        logger.error(f"Prediction failed for '{merchant}': {e}")
        return {"category": FALLBACK_CATEGORY, "confidence": 0.0, "all_probs": {}}