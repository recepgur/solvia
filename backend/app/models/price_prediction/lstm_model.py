import os
import torch
import torch.nn as nn
import numpy as np
from typing import List, Tuple, Dict
from sklearn.metrics import mean_squared_error, mean_absolute_error

class LSTMPredictor(nn.Module):
    def __init__(self, input_dim: int = 1, hidden_dim: int = 32, num_layers: int = 2, dropout: float = 0.2):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size=input_dim, hidden_size=hidden_dim, num_layers=num_layers, dropout=dropout, batch_first=True)
        self.fc = nn.Linear(hidden_dim, 1)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        lstm_out, _ = self.lstm(x)
        predictions = self.fc(lstm_out[:, -1, :])
        return predictions

class PricePredictionModel:
    def __init__(self, sequence_length: int = 10, model_path: str | None = None):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = LSTMPredictor().to(self.device)
        self.sequence_length = sequence_length
        self.scaler = None
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
            
    def save_model(self, path: str) -> None:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        state = {
            'model_state': self.model.state_dict(),
            'scaler': self.scaler
        }
        torch.save(state, path)
        
    def load_model(self, path: str) -> None:
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model file not found: {path}")
        state = torch.load(path, map_location=self.device)
        self.model.load_state_dict(state['model_state'])
        self.scaler = state['scaler']
    
    def prepare_sequence(self, prices: List[float]) -> Tuple[torch.Tensor, torch.Tensor]:
        prices = np.array(prices).reshape(-1, 1)
        sequences = []
        targets = []
        
        for i in range(len(prices) - self.sequence_length):
            seq = prices[i:i + self.sequence_length]
            target = prices[i + self.sequence_length]
            sequences.append(seq)
            targets.append(target)
        
        sequences = torch.FloatTensor(sequences).to(self.device)
        targets = torch.FloatTensor(targets).to(self.device)
        return sequences, targets
    
    def predict(self, prices: List[float]) -> float:
        self.model.eval()
        with torch.no_grad():
            if len(prices) < self.sequence_length:
                raise ValueError(f"Need at least {self.sequence_length} price points")
            
            # Calculate returns instead of using raw prices
            returns = np.diff(prices) / prices[:-1]
            sequence = returns[-self.sequence_length:]
            
            # Normalize sequence
            if self.scaler:
                sequence = self.scaler.transform(sequence.reshape(-1, 1)).flatten()
            
            sequence = torch.FloatTensor(sequence).reshape(1, -1, 1).to(self.device)
            predicted_return = self.model(sequence).item()
            
            # Convert predicted return to price and ensure reasonable bounds
            last_price = prices[-1]
            max_change = 0.10  # Max 10% change prediction
            predicted_return = max(min(predicted_return, max_change), -max_change)
            predicted_price = last_price * (1 + predicted_return)
            return predicted_price

    def train(self, prices: List[float], epochs: int = 100, learning_rate: float = 0.001, validation_split: float = 0.2) -> Dict[str, float]:
        # Calculate returns
        returns = np.diff(prices) / prices[:-1]
        metrics = {}
        
        # Initialize scaler
        from sklearn.preprocessing import StandardScaler
        self.scaler = StandardScaler()
        returns_scaled = self.scaler.fit_transform(returns.reshape(-1, 1)).flatten()
        
        # Prepare sequences
        sequences, targets = self.prepare_sequence(returns_scaled)
        
        # Split into train/validation
        split_idx = int(len(sequences) * (1 - validation_split))
        train_sequences = sequences[:split_idx]
        train_targets = targets[:split_idx]
        val_sequences = sequences[split_idx:]
        val_targets = targets[split_idx:]
        
        optimizer = torch.optim.Adam(self.model.parameters(), lr=learning_rate)
        criterion = nn.MSELoss()
        best_val_loss = float('inf')
        patience = 5
        patience_counter = 0
        
        self.model.train()
        for epoch in range(epochs):
            # Training
            optimizer.zero_grad()
            outputs = self.model(train_sequences)
            loss = criterion(outputs, train_targets)
            loss.backward()
            optimizer.step()
            
            # Validation
            self.model.eval()
            with torch.no_grad():
                val_outputs = self.model(val_sequences)
                val_loss = criterion(val_outputs, val_targets)
            
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    break
            
            self.model.train()
            
        # Calculate final metrics
        self.model.eval()
        with torch.no_grad():
            train_pred = self.model(train_sequences).cpu().numpy()
            val_pred = self.model(val_sequences).cpu().numpy()
            
            metrics['train_mse'] = mean_squared_error(train_targets.cpu().numpy(), train_pred)
            metrics['val_mse'] = mean_squared_error(val_targets.cpu().numpy(), val_pred)
            metrics['train_mae'] = mean_absolute_error(train_targets.cpu().numpy(), train_pred)
            metrics['val_mae'] = mean_absolute_error(val_targets.cpu().numpy(), val_pred)
            
        return metrics
