"""Model Training Script

This script handles the training process for the security analysis model
using the local GPU (RTX 3070).
"""

import logging
import sys
import os
import torch
import platform
from datetime import datetime
from pathlib import Path
from solvia.utils.gpu_check import check_gpu_environment
from solvia.models.self_learning import SelfLearningSystem
from solvia.models.exploit_generator import ExploitGenerator
from solvia.models.network_analyzer import NetworkAnalyzer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(
            Path.home() / "solvia_training.log" if platform.system().lower() != "windows"
            else Path(os.path.expanduser("~")) / "solvia_training.log"
        )
    ]
)
logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def setup_training_environment():
    """Verify and setup the training environment."""
    logger.info("Verifying GPU environment...")
    gpu_info = check_gpu_environment()
    
    if gpu_info["status"] != "ready":
        logger.error("GPU environment check failed!")
        if gpu_info["platform"] == "windows":
            logger.error("Please ensure you have followed all Windows setup instructions.")
            logger.error("If issues persist, try running as Administrator.")
        sys.exit(1)
    
    # Verify RTX 3070 specifically
    if "3070" not in gpu_info["gpu_name"].lower():
        logger.warning(f"Warning: Expected RTX 3070, but found {gpu_info['gpu_name']}")
        user_continue = input("Continue anyway? (y/n): ").lower()
        if user_continue != 'y':
            logger.info("Training cancelled by user.")
            sys.exit(0)
    
    logger.info(f"GPU ready for training: {gpu_info['gpu_name']}")
    logger.info(f"Available GPU memory: {gpu_info['gpu_memory_gb']} GB")
    logger.info(f"Platform: {gpu_info['platform']}")
    
    # Configure PyTorch for Windows performance
    if gpu_info["platform"] == "windows":
        torch.backends.cudnn.benchmark = True
        os.environ['CUDA_LAUNCH_BLOCKING'] = '1'
    
    return gpu_info

def configure_training_params(gpu_info):
    """Configure training parameters based on GPU specifications."""
    # RTX 3070 has 8GB VRAM, configure accordingly
    params = {
        "batch_size": 32,  # Adjusted for 8GB VRAM
        "learning_rate": 2e-5,
        "epochs": 10,
        "max_seq_length": 512,
        "gradient_accumulation_steps": 2,
        "warmup_steps": 100,
        "weight_decay": 0.01,
        "device": "cuda",
        "checkpoint_dir": str(Path.home() / "solvia_checkpoints" if platform.system().lower() != "windows"
                            else Path(os.path.expanduser("~")) / "solvia_checkpoints"),
        "checkpoint_interval": 1000,  # Save every 1000 steps
        "mixed_precision": True,  # Use mixed precision for RTX 3070
        "gradient_clipping": 1.0
    }
    
    # Create checkpoint directory
    os.makedirs(params["checkpoint_dir"], exist_ok=True)
    logger.info(f"Checkpoints will be saved to: {params['checkpoint_dir']}")
    
    # Adjust batch size based on available GPU memory
    if gpu_info["gpu_memory_gb"] < 8:  # Less than 8GB VRAM
        logger.warning("Limited GPU memory detected, reducing batch size")
        params["batch_size"] = 16
        params["gradient_accumulation_steps"] = 4
    
    return params

async def initialize_components(training_params):
    """Initialize all model components asynchronously."""
    try:
        logger.info("Initializing model components...")
        
        # Initialize components
        self_learning = SelfLearningSystem(model_dir="models", mock_data=False)
        exploit_gen = ExploitGenerator(mock_data=False)
        network_analyzer = NetworkAnalyzer(mock_data=False)
        
        # Initialize all components in parallel
        await asyncio.gather(
            self_learning.initialize(),
            exploit_gen.initialize(),
            network_analyzer.initialize()
        )
        
        return self_learning, exploit_gen, network_analyzer
    except Exception as e:
        logger.error(f"Error initializing components: {str(e)}")
        raise

async def train_models(self_learning, exploit_gen, training_params):
    """Train models using GPU."""
    try:
        logger.info("Beginning training process...")
        logger.info(f"Training parameters: {training_params}")
        
        # Enable mixed precision for better performance on RTX 3070
        if training_params["mixed_precision"]:
            logger.info("Enabling mixed precision training")
            scaler = torch.amp.GradScaler("cuda")
        
        # Configure checkpoint saving
        checkpoint_dir = Path(training_params["checkpoint_dir"])
        checkpoint_dir.mkdir(parents=True, exist_ok=True)
        
        # Train exploit generation model
        logger.info("Training exploit generation model...")
        try:
            await exploit_gen.fine_tune_async(
                training_data=[],  # Will be loaded from collectors
                epochs=training_params["epochs"],
                batch_size=training_params["batch_size"],
                learning_rate=training_params["learning_rate"],
                gradient_clipping=training_params["gradient_clipping"],
                checkpoint_dir=str(checkpoint_dir),
                checkpoint_interval=training_params["checkpoint_interval"]
            )
        except RuntimeError as e:
            if "out of memory" in str(e):
                logger.error("GPU out of memory error - try reducing batch size or model size")
                if training_params["batch_size"] > 8:
                    logger.info("Attempting to continue with reduced batch size...")
                    training_params["batch_size"] //= 2
                    training_params["gradient_accumulation_steps"] *= 2
                    return await train_models(self_learning, exploit_gen, training_params)
            raise
        
        # Record training progress
        logger.info("Recording training experience...")
        await self_learning.record_experience_async(
            experience_type="model_training",
            input_data={"training_params": training_params},
            output_data={
                "status": "completed",
                "checkpoint_dir": str(checkpoint_dir),
                "final_batch_size": training_params["batch_size"]
            },
            success=True
        )
        
        logger.info("Training completed successfully")
        logger.info(f"Model checkpoints saved to: {checkpoint_dir}")
        return True
        
    except Exception as e:
        logger.error(f"Error during training: {str(e)}")
        if platform.system().lower() == "windows":
            logger.error("On Windows, make sure you're running as Administrator")
        return False

async def main():
    """Main training function."""
    try:
        # Setup environment
        gpu_info = setup_training_environment()
        training_params = configure_training_params(gpu_info)
        
        # Initialize components
        self_learning, exploit_gen, network_analyzer = await initialize_components(training_params)
        
        # Train models
        success = await train_models(self_learning, exploit_gen, training_params)
        return success
        
    except Exception as e:
        logger.error(f"Error in main training process: {str(e)}")
        return False

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
