from transformers import AutoTokenizer, AutoModelForSequenceClassification, PreTrainedTokenizer, PreTrainedModel
import os
import torch
import random
from typing import List, Dict, Union, Optional, Tuple
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.utils.class_weight import compute_class_weight
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class ModelMetrics(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1: float
    confusion_matrix: List[List[float]]

    class Config:
        arbitrary_types_allowed = True

    @classmethod
    def from_numpy(cls, accuracy: float, precision: float, recall: float, f1: float, confusion_matrix: np.ndarray):
        return cls(
            accuracy=float(accuracy),
            precision=float(precision),
            recall=float(recall),
            f1=float(f1),
            confusion_matrix=confusion_matrix.tolist()
        )

class SentimentAnalysisModel:
    def __init__(self, model_name: str = "dbmdz/bert-base-turkish-cased", model_path: Optional[str] = None):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model_name = model_name
        self.tokenizer: Optional[PreTrainedTokenizer] = None
        self.model: Optional[PreTrainedModel] = None
        self.learning_rate = 2e-5
        self.batch_size = 16
        self.max_length = 512
        
        try:
            if model_path and os.path.exists(os.path.join(model_path, "pytorch_model.bin")):
                logger.info(f"Loading model from local path: {model_path}")
                self.tokenizer = AutoTokenizer.from_pretrained(model_path)
                self.model = AutoModelForSequenceClassification.from_pretrained(
                    model_path,
                    num_labels=3,
                    local_files_only=True
                ).to(self.device)
            else:
                logger.info(f"Downloading pre-trained model: {model_name}")
                self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                self.model = AutoModelForSequenceClassification.from_pretrained(
                    model_name,
                    num_labels=3,
                    ignore_mismatched_sizes=True
                ).to(self.device)
                
                # Initialize classification layer with better defaults
                if self.model is not None and hasattr(self.model, 'classifier'):
                    try:
                        self.model.classifier.weight.data.normal_(mean=0.0, std=0.02)
                        self.model.classifier.bias.data.zero_()
                    except Exception as e:
                        logger.warning(f"Could not initialize classifier weights: {str(e)}")
                
            if not self.tokenizer or not self.model:
                raise RuntimeError("Failed to initialize tokenizer or model")
                
            logger.info(f"Model initialized successfully on device: {self.device}")
        except Exception as e:
            logger.error(f"Failed to initialize sentiment model: {str(e)}")
            raise RuntimeError(f"Failed to initialize sentiment model: {str(e)}")
            
    def train(self, texts: List[str], labels: List[int], epochs: int = 3) -> Dict[str, float]:
        if not self.model or not self.tokenizer:
            raise RuntimeError("Model or tokenizer not initialized")
            
        if len(texts) != len(labels):
            raise ValueError("Number of texts and labels must match")
            
        try:
            self.model.train()
            optimizer = torch.optim.AdamW(self.model.parameters(), lr=self.learning_rate)
            scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=1, factor=0.5)
            
            dataset = list(zip(texts, labels))
            # Adjust batch size if dataset is smaller
            effective_batch_size = min(self.batch_size, len(dataset))
            num_batches = max(1, len(dataset) // effective_batch_size)
            max_grad_norm = 1.0
            
            best_loss = float('inf')
            metrics = {'train_loss': []}
            
            for epoch in range(epochs):
                epoch_loss = 0
                random.shuffle(dataset)
                
                for i in range(0, len(dataset), effective_batch_size):
                    batch = dataset[i:i + effective_batch_size]
                    batch_texts, batch_labels = zip(*batch)
                    
                    inputs = self.tokenizer(
                        list(batch_texts),
                        padding=True,
                        truncation=True,
                        max_length=self.max_length,
                        return_tensors="pt"
                    ).to(self.device)
                    
                    labels_tensor = torch.tensor(batch_labels).to(self.device)
                    
                    optimizer.zero_grad()
                    outputs = self.model(**inputs, labels=labels_tensor)
                    loss = outputs.loss
                    loss.backward()
                    torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_grad_norm)
                    optimizer.step()
                    
                    epoch_loss += loss.item()
                
                avg_loss = epoch_loss / num_batches
                metrics['train_loss'].append(avg_loss)
                scheduler.step(avg_loss)
                
                if avg_loss < best_loss:
                    best_loss = avg_loss
                    
                logger.info(f"Epoch {epoch + 1}/{epochs}, Loss: {avg_loss:.4f}")
            
            evaluation_metrics = self.evaluate(texts, labels)
            return {
                'final_loss': metrics['train_loss'][-1],
                'best_loss': best_loss,
                'epochs_completed': epochs,
                'accuracy': evaluation_metrics.accuracy,
                'precision': evaluation_metrics.precision,
                'recall': evaluation_metrics.recall,
                'f1': evaluation_metrics.f1
            }
            
        except Exception as e:
            logger.error(f"Error during training: {str(e)}")
            raise RuntimeError(f"Failed to train model: {str(e)}")
    
    def analyze_text(self, text: str) -> Dict[str, float]:
        if not self.model or not self.tokenizer:
            raise RuntimeError("Model or tokenizer not initialized")
            
        try:
            self.model.eval()
            with torch.no_grad():
                inputs = self.tokenizer(
                    text,
                    return_tensors="pt",
                    truncation=True,
                    max_length=512,
                    padding=True
                ).to(self.device)
                
                outputs = self.model(**inputs)
                probabilities = torch.softmax(outputs.logits, dim=1)
                
                sentiment_scores = {
                    "positive": float(probabilities[0][2]),
                    "neutral": float(probabilities[0][1]),
                    "negative": float(probabilities[0][0])
                }
                return sentiment_scores
        except Exception as e:
            logger.error(f"Error analyzing text: {str(e)}")
            raise RuntimeError(f"Failed to analyze text: {str(e)}")
    
    def analyze_news_batch(self, news_list: List[str]) -> List[Dict[str, float]]:
        return [self.analyze_text(news) for news in news_list]

    def save_model(self, path: str) -> None:
        if not self.model or not self.tokenizer:
            raise RuntimeError("Model or tokenizer not initialized")
        try:
            os.makedirs(path, exist_ok=True)
            self.model.save_pretrained(path)
            self.tokenizer.save_pretrained(path)
            logger.info(f"Model saved successfully to {path}")
        except Exception as e:
            logger.error(f"Failed to save model: {str(e)}")
            raise RuntimeError(f"Failed to save model: {str(e)}")
    
    def evaluate(self, texts: List[str], labels: List[int]) -> ModelMetrics:
        if not self.model or not self.tokenizer:
            raise RuntimeError("Model or tokenizer not initialized")
            
        if not texts or not labels:
            raise ValueError("Empty texts or labels provided")
            
        if len(texts) != len(labels):
            raise ValueError(f"Number of texts ({len(texts)}) does not match number of labels ({len(labels)})")
            
        if not all(isinstance(label, int) and 0 <= label <= 2 for label in labels):
            raise ValueError("Labels must be integers in range [0, 2]")
            
        try:
            self.model.eval()
            predictions = []
            batch_size = 32
            
            with torch.no_grad():
                for i in range(0, len(texts), batch_size):
                    batch_texts = texts[i:i + batch_size]
                    inputs = self.tokenizer(
                        batch_texts,
                        return_tensors="pt",
                        padding=True,
                        truncation=True,
                        max_length=512
                    ).to(self.device)
                    
                    outputs = self.model(**inputs)
                    probabilities = torch.softmax(outputs.logits, dim=1)
                    batch_preds = torch.argmax(probabilities, dim=1)
                    predictions.extend(batch_preds.cpu().tolist())
            
            # Handle class imbalance in metrics calculation
            class_weights = compute_class_weight(
                'balanced',
                classes=np.unique(labels),
                y=labels
            )
            sample_weights = [class_weights[label] for label in labels]
            
            report = classification_report(
                labels,
                predictions,
                output_dict=True,
                sample_weight=sample_weights,
                zero_division=0
            )
            conf_matrix = confusion_matrix(labels, predictions, sample_weight=sample_weights)
            
            if isinstance(report, str):
                logger.error(f"Unexpected report format: {report}")
                metrics = ModelMetrics.from_numpy(
                    accuracy=0.0,
                    precision=0.0,
                    recall=0.0,
                    f1=0.0,
                    confusion_matrix=conf_matrix
                )
            else:
                metrics = ModelMetrics.from_numpy(
                    accuracy=float(report.get('accuracy', 0.0)),
                    precision=float(report.get('macro avg', {}).get('precision', 0.0)),
                    recall=float(report.get('macro avg', {}).get('recall', 0.0)),
                    f1=float(report.get('macro avg', {}).get('f1-score', 0.0)),
                    confusion_matrix=conf_matrix
                )
            
            logger.info(f"Model evaluation completed. Accuracy: {metrics.accuracy:.3f}, F1: {metrics.f1:.3f}")
            return metrics
            
        except Exception as e:
            logger.error(f"Error during model evaluation: {str(e)}")
            raise RuntimeError(f"Failed to evaluate model: {str(e)}")
    
    def get_investment_signal(self, sentiment_scores: Dict[str, float]) -> float:
        signal = sentiment_scores["positive"] - sentiment_scores["negative"]
        return float(signal)
