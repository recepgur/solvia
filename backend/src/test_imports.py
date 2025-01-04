import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from solana import publickey
    logger.info("Found solana.publickey")
except ImportError:
    logger.error("Could not import solana.publickey")

try:
    from solana_sdk import publickey
    logger.info("Found solana_sdk.publickey")
except ImportError:
    logger.error("Could not import solana_sdk.publickey")

try:
    import solana
    logger.info(f"Solana package path: {solana.__file__}")
    logger.info(f"Available modules: {dir(solana)}")
except ImportError:
    logger.error("Could not import solana package")
