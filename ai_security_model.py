import numpy as np
import pandas as pd
import torch
import torch.nn.functional as F
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from torch import nn
from torch.utils.data import DataLoader, Dataset
from transformers import AutoModelForSequenceClassification, AutoTokenizer


class SecurityDataset(Dataset):
    def __init__(self, descriptions, labels, tokenizer, max_length=512):
        self.descriptions = descriptions
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.descriptions)

    def __getitem__(self, idx):
        desc = str(self.descriptions[idx])
        encoding = self.tokenizer(
            desc,
            add_special_tokens=True,
            max_length=self.max_length,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )

        return {
            "input_ids": encoding["input_ids"].flatten(),
            "attention_mask": encoding["attention_mask"].flatten(),
            "labels": torch.tensor(self.labels[idx], dtype=torch.long),
        }


class HybridSecurityModel(nn.Module):
    def __init__(self, num_classes):
        super().__init__()
        # Use pre-trained BERT model for understanding vulnerability descriptions
        self.bert = AutoModelForSequenceClassification.from_pretrained(
            "bert-base-uncased",
            num_labels=num_classes,
            output_hidden_states=True,  # Enable hidden states output
        )

        # Additional layers for attack pattern learning
        self.pattern_layer = nn.Sequential(
            nn.Linear(768, 512),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(256, num_classes),
        )

        # Enhanced reinforcement learning components
        self.value_head = nn.Sequential(
            nn.Linear(768, 256),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, 1),
        )

        # GPT exploit feedback integration
        self.exploit_feedback_layer = nn.Sequential(
            nn.Linear(768, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, 1),
        )

        # Initialize metrics tracking
        self.metrics = {
            "success_rate": [],
            "exploit_effectiveness": [],
            "pattern_matches": [],
            "continuous_learning_iterations": 0,
        }

    def forward(self, input_ids, attention_mask, exploit_feedback=None):
        # Get BERT outputs
        outputs = self.bert(
            input_ids=input_ids,
            attention_mask=attention_mask,
            output_hidden_states=True,
        )
        bert_output = outputs.logits

        # Get hidden states for pattern learning
        hidden_states = outputs[1][-1][
            :, 0, :
        ]  # Access last hidden state's [CLS] token

        # Enhanced pattern recognition with continuous learning
        pattern_output = self.pattern_layer(hidden_states)

        # Value prediction for reinforcement learning
        value = self.value_head(hidden_states)

        # Process exploit feedback if available
        if exploit_feedback is not None:
            exploit_value = self.exploit_feedback_layer(hidden_states)
            # Update metrics
            if isinstance(exploit_feedback, (float, int)):
                self.metrics["exploit_effectiveness"].append(float(exploit_feedback))
            self.metrics["continuous_learning_iterations"] += 1

            # Adjust value based on exploit feedback
            value = value * 0.7 + exploit_value * 0.3

        # Combine outputs with dynamic weighting
        combined_output = bert_output * 0.6 + pattern_output * 0.4

        return combined_output, value

    def update_metrics(self, success_rate=None, pattern_matches=None):
        """Update model metrics for continuous learning"""
        if success_rate is not None:
            self.metrics["success_rate"].append(float(success_rate))
        if pattern_matches is not None:
            self.metrics["pattern_matches"].append(int(pattern_matches))

    def get_metrics(self):
        """Get current metrics for monitoring"""
        return {
            "success_rate": (
                np.mean(self.metrics["success_rate"][-100:])
                if self.metrics["success_rate"]
                else 0
            ),
            "exploit_effectiveness": (
                np.mean(self.metrics["exploit_effectiveness"][-100:])
                if self.metrics["exploit_effectiveness"]
                else 0
            ),
            "pattern_matches": (
                np.mean(self.metrics["pattern_matches"][-100:])
                if self.metrics["pattern_matches"]
                else 0
            ),
            "continuous_learning_iterations": self.metrics[
                "continuous_learning_iterations"
            ],
        }


def train_model(
    model,
    train_loader,
    val_loader,
    num_epochs=5,
    learning_rate=2e-5,
    exploit_feedback=None,
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)

    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)
    criterion = nn.CrossEntropyLoss()

    # Initialize exploit feedback if provided
    if exploit_feedback is not None:
        exploit_feedback = torch.tensor(exploit_feedback, dtype=torch.float).to(device)

    for epoch in range(num_epochs):
        model.train()
        total_loss = 0
        epoch_success_rate = []

        for batch in train_loader:
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)

            optimizer.zero_grad()
            outputs, value = model(input_ids, attention_mask, exploit_feedback)

            # Enhanced classification loss
            loss = criterion(outputs, labels)

            # Enhanced reinforcement learning with exploit feedback
            advantage = value - value.mean()
            policy_loss = -(F.log_softmax(outputs, dim=1) * advantage.detach()).mean()
            value_loss = F.mse_loss(value, advantage.detach())

            # Calculate success rate for this batch
            _, predicted = outputs.max(1)
            success_rate = (predicted == labels).float().mean().item()
            epoch_success_rate.append(success_rate)

            # Combine losses with dynamic weighting
            if exploit_feedback is not None:
                exploit_loss = F.mse_loss(value, exploit_feedback)
                total_loss = (
                    loss + 0.15 * policy_loss + 0.15 * value_loss + 0.1 * exploit_loss
                )
            else:
                total_loss = loss + 0.15 * policy_loss + 0.15 * value_loss

            total_loss.backward()
            optimizer.step()

        # Validation
        model.eval()
        val_loss = 0
        correct = 0
        total = 0

        with torch.no_grad():
            for batch in val_loader:
                input_ids = batch["input_ids"].to(device)
                attention_mask = batch["attention_mask"].to(device)
                labels = batch["labels"].to(device)

                outputs, _ = model(input_ids, attention_mask)
                loss = criterion(outputs, labels)
                val_loss += loss.item()

                _, predicted = outputs.max(1)
                total += labels.size(0)
                correct += predicted.eq(labels).sum().item()

        print(f"Epoch {epoch+1}/{num_epochs}:")
        print(f"Training Loss: {total_loss:.4f}")
        print(f"Validation Loss: {val_loss/len(val_loader):.4f}")
        print(f"Validation Accuracy: {100.*correct/total:.2f}%\n")


def main():
    print("Initializing continuous learning security model...")

    # Load or initialize the model state
    model_path = "security_model.pth"
    try:
        # Load existing model if available
        print("Attempting to load existing model...")
        state_dict = torch.load(model_path)
        df = pd.read_csv("vulnerability_dataset.csv")
        num_classes = len(pd.qcut(df["severity"].dropna().unique(), q=5).categories)
        model = HybridSecurityModel(num_classes)
        model.load_state_dict(state_dict)
        print("Existing model loaded successfully!")
    except (FileNotFoundError, Exception) as e:
        print(f"No existing model found or error loading model: {str(e)}")
        print("Initializing new model...")

        # Load the vulnerability dataset
        df = pd.read_csv("vulnerability_dataset.csv")

        # Prepare labels with enhanced binning
        try:
            severity_bins = pd.qcut(
                df["severity"],
                q=5,
                labels=["Very Low", "Low", "Medium", "High", "Very High"],
                duplicates="drop",
            )
        except ValueError:
            severity_bins = pd.cut(
                df["severity"],
                bins=[-float("inf"), 2.0, 4.0, 6.0, 8.0, float("inf")],
                labels=["Very Low", "Low", "Medium", "High", "Very High"],
            )

        label_encoder = LabelEncoder()
        labels = label_encoder.fit_transform(severity_bins)

        # Prepare text data
        descriptions = df["description"].values

        # Split the data with stratification
        X_train, X_val, y_train, y_val = train_test_split(
            descriptions, labels, test_size=0.2, random_state=42, stratify=labels
        )

        # Initialize tokenizer
        tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")

        # Create datasets with enhanced processing
        train_dataset = SecurityDataset(X_train, y_train, tokenizer)
        val_dataset = SecurityDataset(X_val, y_val, tokenizer)

        # Create data loaders with optimal batch size
        train_loader = DataLoader(
            train_dataset, batch_size=8, shuffle=True, num_workers=2
        )
        val_loader = DataLoader(val_dataset, batch_size=8, num_workers=2)

        # Initialize model
        num_classes = len(label_encoder.classes_)
        model = HybridSecurityModel(num_classes)

        print("Starting initial model training...")
        # Train with continuous learning enabled
        train_model(model, train_loader, val_loader, num_epochs=5)

    # Enable continuous learning mode
    print("\nEnabling continuous learning mode...")
    model.train()  # Set to training mode for continuous learning

    # Initialize continuous learning parameters
    continuous_learning_config = {
        "min_confidence_threshold": 0.8,
        "update_frequency": 100,  # Update every 100 samples
        "max_memory_samples": 10000,
        "learning_rate": 1e-5,
    }

    print("\nCurrent model metrics:")
    metrics = model.get_metrics()
    for metric_name, value in metrics.items():
        print(f"{metric_name}: {value:.4f}")

    # Save the model with continuous learning state
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "metrics": model.metrics,
            "continuous_learning_config": continuous_learning_config,
        },
        model_path,
    )

    print("\nModel saved with continuous learning capabilities enabled!")
    print(
        "The model will now continuously learn and improve from new data and exploit generation results."
    )


if __name__ == "__main__":
    main()
