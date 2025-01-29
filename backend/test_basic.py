import requests
import json
import logging
from datetime import datetime
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_endpoint(method, url, data=None):
    try:
        logger.info(f"Testing {method} {url}")
        if method == "GET":
            response = requests.get(url, timeout=10)
        else:
            response = requests.post(url, json=data, timeout=10)
        
        if response.status_code != 200:
            logger.error(f"Request failed with status {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
            
        logger.info(f"Response: {json.dumps(response.json(), indent=2)}")
        return True
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return False

def run_tests():
    base_url = "http://localhost:8050"
    failures = 0
    
    # Test health check
    logger.info("\n=== Testing Health Check ===")
    if not test_endpoint("GET", f"{base_url}/healthz"):
        failures += 1
    
    # Test market data search
    logger.info("\n=== Testing Market Data Search ===")
    if not test_endpoint("GET", f"{base_url}/market-data/search?query=THY"):
        failures += 1
    
    # Test portfolio creation
    logger.info("\n=== Testing Portfolio ===")
    portfolio_data = {
        "user_id": "test_user",
        "assets": [],
        "total_value": 0.0,
        "risk_score": 0.5,
        "last_updated": datetime.now().isoformat()
    }
    if not test_endpoint("POST", f"{base_url}/portfolio", portfolio_data):
        failures += 1
    
    # Test price prediction
    logger.info("\n=== Testing Price Prediction ===")
    if not test_endpoint("GET", f"{base_url}/predictions/price/THYAO"):
        failures += 1
    
    # Test news sentiment analysis
    logger.info("\n=== Testing News Sentiment Analysis ===")
    news_data = {
        "text": "THYAO ve GARAN hisseleri güçlü finansal sonuçlar açıkladı. Şirketlerin karlılığı beklentilerin üzerinde gerçekleşti."
    }
    if not test_endpoint("POST", f"{base_url}/news/analyze", news_data):
        failures += 1

    # Test price alerts
    logger.info("\n=== Testing Price Alerts ===")
    alert_data = {
        "user_id": "test_user",
        "asset_symbol": "THYAO",
        "target_price": 320.0,
        "condition": "above",
        "is_active": True
    }
    if not test_endpoint("POST", f"{base_url}/alerts", alert_data):
        failures += 1

    # Test risk analysis
    logger.info("\n=== Testing Risk Analysis ===")
    if not test_endpoint("GET", f"{base_url}/portfolio/test_user/risk"):
        failures += 1
    
    # Test model validation
    logger.info("\n=== Testing Model Cross-Validation ===")
    validation_data = {
        "price_data": [float(x) for x in range(100, 200)],
        "sentiment_data": {
            "texts": [
                "THYAO hisseleri yükselişte",
                "Piyasalar düşüş gösterdi",
                "Finansal sonuçlar beklentilerin üzerinde",
                "Şirket zarar açıkladı",
                "Borsa güne yükselişle başladı",
                "Hisse fiyatları düşüş trendinde",
                "Yatırımcılar kar realizasyonuna gitti",
                "Güçlü finansal performans",
                "Piyasalarda sert satış baskısı",
                "Şirket büyüme hedeflerini aştı"
            ],
            "labels": [1, -1, 1, -1, 1, -1, -1, 1, -1, 1]
        }
    }
    if not test_endpoint("POST", f"{base_url}/training/validate", validation_data):
        failures += 1
    
    # Test feedback submission
    logger.info("\n=== Testing Feedback Submission ===")
    feedback_data = {
        "user_id": "test_user",
        "feature_type": "prediction",
        "rating": 4,
        "comment": "Fiyat tahminleri oldukça doğru",
        "timestamp": datetime.now().isoformat()
    }
    if not test_endpoint("POST", f"{base_url}/feedback", feedback_data):
        failures += 1
        
    # Test autonomous trading
    logger.info("\n=== Testing Autonomous Trading ===")
    if not test_endpoint("POST", f"{base_url}/autonomous/trade", {
        "user_id": "test_user"
    }):
        failures += 1
        
    if not test_endpoint("POST", f"{base_url}/autonomous/rebalance", {
        "user_id": "test_user",
        "target_weights": {"THYAO": 0.4, "GARAN": 0.3, "ASELS": 0.3}
    }):
        failures += 1
        
    if not test_endpoint("POST", f"{base_url}/autonomous/backtest", {
        "symbols": ["THYAO", "GARAN", "ASELS"],
        "start_date": datetime.now().isoformat(),
        "end_date": (datetime.now() + timedelta(days=30)).isoformat(),
        "initial_capital": 1000000,
        "strategy_params": {
            "max_position_size": 0.3,
            "stop_loss_threshold": 0.05,
            "max_volatility": 0.4
        }
    }):
        failures += 1
    
    return failures

if __name__ == "__main__":
    logger.info("Starting tests...")
    failures = run_tests()
    if failures > 0:
        logger.error(f"Tests completed with {failures} failures")
        exit(1)
    else:
        logger.info("All tests passed successfully!")
