from typing import List, Optional
from datetime import datetime
import logging
from ..features import Asset, AssetType

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class MarketDataService:
    @staticmethod
    def _get_mock_assets() -> List[Asset]:
        now = datetime.now()
        logger.info("Generating mock assets data")
        return [
            # Stocks
            Asset(
                symbol="THYAO",
                type=AssetType.STOCK,
                name="Türk Hava Yolları",
                current_price=238.26,
                change_24h=2.5,
                volume=1234567,
                last_updated=now
            ),
            Asset(
                symbol="GARAN",
                type=AssetType.STOCK,
                name="Garanti Bankası",
                current_price=402.15,
                change_24h=1.8,
                volume=987654,
                last_updated=now
            ),
            Asset(
                symbol="ASELS",
                type=AssetType.STOCK,
                name="Aselsan",
                current_price=152.19,
                change_24h=-0.5,
                volume=654321,
                last_updated=now
            ),
            # Indices
            Asset(
                symbol="XU100",
                type=AssetType.INDEX,
                name="BIST 100",
                current_price=8924.56,
                change_24h=1.2,
                last_updated=now
            ),
            Asset(
                symbol="XU030",
                type=AssetType.INDEX,
                name="BIST 30",
                current_price=9876.54,
                change_24h=-0.8,
                last_updated=now
            ),
            Asset(
                symbol="XBANK",
                type=AssetType.INDEX,
                name="BIST Banka",
                current_price=7654.32,
                change_24h=0.5,
                last_updated=now
            ),
            # Currencies
            Asset(
                symbol="USD/TRY",
                type=AssetType.CURRENCY,
                name="Dolar/TL",
                current_price=31.25,
                change_24h=0.3,
                last_updated=now
            ),
            Asset(
                symbol="EUR/TRY",
                type=AssetType.CURRENCY,
                name="Euro/TL",
                current_price=33.85,
                change_24h=-0.2,
                last_updated=now
            )
        ]

    @staticmethod
    async def get_asset_data(symbol: str) -> Asset:
        try:
            logger.info(f"Fetching asset data for symbol: {symbol}")
            assets = MarketDataService._get_mock_assets()
            asset = next((asset for asset in assets if asset.symbol.upper() == symbol.upper()), None)
            
            if not asset:
                logger.warning(f"Asset not found for symbol: {symbol}")
                raise ValueError(f"Asset not found: {symbol}")
                
            logger.info(f"Found asset: {asset.symbol} ({asset.name})")
            return asset
        except ValueError as e:
            raise e
        except Exception as e:
            logger.error(f"Error fetching asset data for {symbol}: {str(e)}")
            raise ValueError(f"Could not fetch data for symbol {symbol}")
    
    @staticmethod
    async def get_historical_prices(symbol: str, days: int = 30) -> List[float]:
        try:
            logger.info(f"Fetching historical prices for {symbol}")
            base_price = (await MarketDataService.get_asset_data(symbol)).current_price
            return [base_price * (1 + np.random.normal(0, 0.02)) for _ in range(days)]
        except Exception as e:
            logger.error(f"Error fetching historical prices for {symbol}: {str(e)}")
            raise ValueError(f"Could not fetch historical prices for {symbol}")
    
    @staticmethod
    async def get_current_price(symbol: str) -> float:
        try:
            asset = await MarketDataService.get_asset_data(symbol)
            return asset.current_price
        except Exception as e:
            logger.error(f"Error fetching current price for {symbol}: {str(e)}")
            raise ValueError(f"Could not fetch current price for {symbol}")
    
    @staticmethod
    async def get_latest_news(symbol: str) -> Optional[str]:
        mock_news = {
            "THYAO": "Türk Hava Yolları yeni uçak siparişi verdi. Filo genişletme planları olumlu karşılandı.",
            "GARAN": "Garanti Bankası güçlü finansal sonuçlar açıkladı. Karlılık beklentilerin üzerinde.",
            "ASELS": "Aselsan yeni savunma projeleri için anlaşma imzaladı."
        }
        return mock_news.get(symbol.upper())
    @staticmethod
    async def search_assets(query: str, type: Optional[AssetType] = None) -> List[Asset]:
        try:
            logger.info(f"Searching assets with query: {query}, type: {type}")
            assets = MarketDataService._get_mock_assets()
            
            if type:
                logger.info(f"Filtering by asset type: {type}")
                assets = [a for a in assets if a.type == type]
            
            if query:
                query = query.upper()
                assets = [a for a in assets if (
                    query in a.symbol.upper() or 
                    query in a.name.upper()
                )]
            
            logger.info(f"Found {len(assets)} matching assets")
            return assets
        except Exception as e:
            logger.error(f"Error searching assets: {str(e)}")
            raise ValueError(f"Failed to search assets: {str(e)}")
