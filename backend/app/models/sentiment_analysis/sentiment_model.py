from transformers import AutoTokenizer, AutoModelForSequenceClassification, PreTrainedTokenizer, PreTrainedModel
import os
import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModel, AutoModelForSequenceClassification
import numpy as np
from typing import Dict, List, Optional, Any, DefaultDict
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

class FinancialSentimentModel:
    def __init__(self, model_name: str = "dbmdz/bert-base-turkish-cased"):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.base_model = AutoModel.from_pretrained(model_name).to(self.device)
        
        # Enhanced multi-head attention for Turkish financial context
        self.attention_heads = nn.ModuleList([
            nn.Sequential(
                nn.Linear(768, 768),
                nn.Tanh(),
                nn.Linear(768, 1)
            ).to(self.device) for _ in range(8)
        ])
        
        # Advanced classifier with market regime awareness
        self.classifier = nn.Sequential(
            nn.Linear(768 * 8, 512),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 3)  # 3 classes: positive, negative, neutral
        ).to(self.device)
        
        # Enhanced Turkish market-specific features
        self.market_keywords = {
            'positive': [
                'yükseliş', 'artış', 'kazanç', 'büyüme', 'olumlu', 'güçlü', 'başarılı',
                'rekor', 'aşırı alım', 'yükseliş trendi', 'kar', 'ihracat artışı',
                'güçlü bilanço', 'temettü', 'yatırım', 'büyüme potansiyeli',
                'hedef yükseldi', 'alım fırsatı', 'pozitif ayrışma', 'güçlü momentum',
                'kar marjı artışı', 'pazar payı artışı', 'yeni anlaşma', 'stratejik ortaklık',
                'teknoloji yatırımı', 'kapasite artışı', 'ihale kazandı', 'patent aldı'
            ],
            'negative': [
                'düşüş', 'azalış', 'kayıp', 'zarar', 'olumsuz', 'zayıf', 'başarısız',
                'risk', 'borç', 'iflas', 'kriz', 'satış baskısı', 'aşırı satım',
                'düşüş trendi', 'zarar açıkladı', 'belirsizlik', 'hedef düşürüldü',
                'kar realizasyonu', 'negatif ayrışma', 'zayıf momentum', 'kar marjı düşüşü',
                'pazar payı kaybı', 'anlaşma iptali', 'soruşturma', 'dava açıldı',
                'üretim durdu', 'ihale kaybetti', 'lisans iptali'
            ],
            'neutral': [
                'sabit', 'değişmedi', 'devam', 'beklenti', 'tahmin', 'konsolidasyon',
                'denge', 'yatay seyir', 'takip', 'analiz', 'piyasa takibi',
                'değerlendirme', 'gözlem', 'bekleme', 'stabilizasyon', 'yatay bant',
                'teknik analiz', 'fiyat hedefi', 'piyasa araştırması', 'sektör raporu',
                'şirket sunumu', 'genel kurul', 'olağan toplantı', 'düzenleyici açıklama'
            ]
        }
        
        # Enhanced Turkish market sector features
        self.sector_keywords = {
            'banking': [
                'banka', 'kredi', 'mevduat', 'faiz', 'finans', 'bankacılık', 'katılım', 'aktif', 'pasif', 'bilanço',
                'kar marjı', 'net kar', 'takipteki krediler', 'mevduat faizi', 'kredi büyümesi', 'sermaye yeterlilik',
                'aktif kalitesi', 'net faiz marjı', 'komisyon geliri', 'dijital bankacılık', 'mobil bankacılık'
            ],
            'technology': [
                'teknoloji', 'yazılım', 'dijital', 'inovasyon', 'bilişim', 'yapay zeka', 'blockchain', 'bulut',
                'siber güvenlik', 'e-ticaret', 'fintech', 'büyük veri', 'veri merkezi', 'yazılım ihracatı',
                'teknoloji yatırımı', 'ar-ge merkezi', 'patent başvurusu', 'teknokent', 'dijital dönüşüm'
            ],
            'energy': [
                'enerji', 'petrol', 'doğalgaz', 'elektrik', 'yenilenebilir', 'güneş', 'rüzgar', 'hidroelektrik',
                'akaryakıt', 'madencilik', 'enerji verimliliği', 'karbon emisyonu', 'yenilenebilir enerji',
                'enerji depolama', 'elektrikli araç', 'şarj istasyonu', 'enerji ticareti', 'spot piyasa'
            ],
            'retail': [
                'perakende', 'mağaza', 'satış', 'tüketici', 'market', 'alışveriş', 'tedarik', 'stok', 'envanter',
                'müşteri', 'e-ticaret', 'online satış', 'mağaza trafiği', 'sepet büyüklüğü', 'satış/metrekare',
                'özel markalı ürün', 'sadakat programı', 'tüketici güveni', 'kampanya', 'indirim'
            ],
            'industrial': [
                'sanayi', 'üretim', 'fabrika', 'ihracat', 'imalat', 'endüstri', 'otomotiv', 'çelik', 'inşaat',
                'lojistik', 'kapasite kullanımı', 'ihracat siparişi', 'hammadde maliyeti', 'üretim verimliliği',
                'tedarik zinciri', 'endüstri 4.0', 'otomasyon', 'kalite kontrol', 'iso sertifikası'
            ],
            'telecom': [
                'telekom', 'iletişim', 'mobil', 'altyapı', 'fiber', 'internet', 'gsm', 'operatör', '5g yatırımı',
                'fiber altyapı', 'abone sayısı', 'arpu', 'veri kullanımı', 'mobil penetrasyon', 'altyapı yatırımı',
                'spektrum ihalesi', 'dijital servisler', 'sabit internet', 'fiber penetrasyon'
            ],
            'healthcare': [
                'sağlık', 'ilaç', 'hastane', 'medikal', 'biyoteknoloji', 'tıbbi', 'eczane', 'sağlık turizmi',
                'medikal cihaz', 'klinik araştırma', 'ilaç ruhsatı', 'hastane doluluk', 'yatak kapasitesi',
                'sağlık sigortası', 'özel hastane', 'tıbbi malzeme', 'ar-ge yatırımı', 'klinik test'
            ],
            'real_estate': [
                'gayrimenkul', 'inşaat', 'konut', 'kira', 'proje', 'arsa', 'emlak', 'konut kredisi', 'kira endeksi',
                'konut fiyat endeksi', 'bina izni', 'yapı ruhsatı', 'konut satışı', 'ofis doluluk', 'avm cirosu',
                'kira kontratı', 'gayrimenkul değerleme', 'kentsel dönüşüm', 'ticari gayrimenkul'
            ],
            'defense': [
                'savunma', 'askeri', 'silah', 'ihracat', 'mühimmat', 'radar', 'insansız hava aracı', 'iha', 'siha',
                'elektronik harp', 'füze sistemi', 'savunma ihracatı', 'askeri modernizasyon', 'savunma sanayi',
                'askeri proje', 'savunma teknolojisi', 'milli teknoloji', 'yerli üretim', 'offset anlaşması'
            ]
        }
    
    def preprocess_text(self, text: str) -> Dict[str, torch.Tensor]:
        # Tokenize text
        encoded = self.tokenizer(
            text,
            max_length=512,
            truncation=True,
            padding='max_length',
            return_tensors='pt'
        )
        return {k: v.to(self.device) for k, v in encoded.items()}
    
    def analyze_sector_context(self, text: str) -> Dict[str, Any]:
        text_lower = text.lower()
        
        sector_scores = defaultdict(float)
        sector_keywords_found = defaultdict(set)
        
        for sector, keywords in self.sector_keywords.items():
            for word in keywords:
                if word in text_lower:
                    sector_scores[sector] += 1
                    sector_keywords_found[sector].add(word)
        
        if not any(sector_scores.values()):
            return {'sector': 'unknown', 'strength': 0.0, 'confidence': 0.1}
        
        total_mentions = sum(sector_scores.values())
        max_sector = max(sector_scores.items(), key=lambda x: x[1])
        
        keyword_diversity = len(sector_keywords_found[max_sector[0]]) / len(self.sector_keywords[max_sector[0]])
        mention_strength = max_sector[1] / total_mentions if total_mentions > 0 else 0
        
        combined_strength = (keyword_diversity * 0.6 + mention_strength * 0.4)
        confidence = min(0.95, 0.3 + combined_strength * 0.6 + keyword_diversity * 0.2)
        
        secondary_sectors = sorted(
            [(s, v) for s, v in sector_scores.items() if s != max_sector[0]],
            key=lambda x: x[1],
            reverse=True
        )[:2]
        
        return {
            'sector': max_sector[0],
            'strength': min(1.0, combined_strength),
            'confidence': confidence,
            'keyword_diversity': float(keyword_diversity),
            'related_sectors': [
                {
                    'sector': s,
                    'correlation': float(v / max_sector[1])
                }
                for s, v in secondary_sectors if v > 0
            ]
        }
        
    def extract_market_signals(self, text: str) -> Dict[str, Any]:
        text_lower = text.lower()
        
        # Enhanced Turkish market regime indicators with volatility bands
        bull_signals = {
            'trend': [
                'yükseliş trendi', 'güçlü momentum', 'pozitif trend', 'alım fırsatı',
                'tarihi zirve', 'yeni rekor', 'güçlü yükseliş', 'trend devamı',
                'alım desteği', 'güçlü talep', 'yabancı alımı', 'kurumsal alım',
                'güçlü alıcı', 'trend yukarı', 'dip tamamlandı', 'alım sinyali'
            ],
            'fundamental': [
                'güçlü bilanço', 'kar artışı', 'büyüme', 'rekor seviye',
                'ihracat artışı', 'pazar payı artışı', 'yeni yatırım', 'kapasite artışı',
                'güçlü nakit akışı', 'düşük borçluluk', 'yüksek karlılık', 'temettü artışı',
                'yabancı yatırımcı ilgisi', 'stratejik ortaklık', 'yeni ihale', 'teknoloji yatırımı',
                'ar-ge başarısı', 'patent onayı', 'marka değeri artışı', 'piyasa liderliği'
            ],
            'technical': [
                'aşırı alım', 'güçlü talep', 'yükseliş sinyali', 'hedef yükseldi',
                'altın kesişim', 'destek noktası', 'hacim artışı', 'momentum güçlü',
                'fibo desteği', 'trend kırılması yukarı', 'macd pozitif', 'rsi yükseliş',
                'bollinger üst bandı', 'stokastik aşırı alım', 'dmi pozitif', 'adx yükseliş',
                'hacim ağırlıklı fiyat', 'üssel ortalama yukarı', 'momentum osilatörü pozitif',
                'ichimoku bulutu üstünde', 'parabolic sar alım', 'williams r pozitif'
            ],
            'sentiment': [
                'pozitif görünüm', 'güven artışı', 'iyimser beklenti', 'güçlü temel',
                'ekonomik iyileşme', 'sektör liderliği', 'rekabet avantajı', 'stratejik ortaklık',
                'yeni proje', 'teknoloji yatırımı', 'ar-ge başarısı', 'patent onayı',
                'yabancı yatırımcı güveni', 'kurumsal alım desteği', 'piyasa yapıcı desteği',
                'güçlü finansal yapı', 'sürdürülebilir büyüme', 'global rekabet gücü',
                'inovasyon liderliği', 'dijital dönüşüm başarısı', 'yeşil enerji yatırımı',
                'ihracat potansiyeli', 'pazar penetrasyonu', 'marka bilinirliği'
            ]
        }
        
        bear_signals = {
            'trend': [
                'düşüş trendi', 'satış baskısı', 'negatif trend', 'kar satışı',
                'destek kırıldı', 'sert düşüş', 'yabancı çıkışı', 'panik satışı',
                'kurumsal satış', 'stop-loss', 'margin call', 'teknik satış',
                'trend aşağı', 'zirve tamamlandı', 'satış sinyali', 'güçlü satıcı',
                'düşüş ivmesi', 'kritik destek kırıldı', 'yabancı çıkışı hızlandı'
            ],
            'fundamental': [
                'zayıf bilanço', 'zarar açıkladı', 'küçülme', 'dip seviye',
                'borç yapılandırma', 'nakit sıkışıklığı', 'pazar payı kaybı', 'maliyet artışı',
                'operasyonel sorunlar', 'düşük kapasite', 'temettü kesintisi', 'kredi riski',
                'finansal zorluk', 'sermaye yetersizliği', 'likidite sorunu', 'yüksek borçluluk',
                'tahsilat sorunu', 'ihracat düşüşü', 'tedarik zinciri sorunu', 'maliyet baskısı',
                'kur riski', 'faiz yükü', 'vergi borcu', 'işletme sermayesi açığı',
                'yatırım iptali', 'denetim sorunu', 'regülasyon cezası', 'piyasa payı kaybı'
            ],
            'technical': [
                'aşırı satım', 'zayıf talep', 'düşüş sinyali', 'hedef düşürüldü',
                'ölüm kesişimi', 'direnç kırıldı', 'hacim düşüşü', 'momentum zayıf',
                'fibo direnci', 'trend kırılması aşağı', 'macd negatif', 'rsi düşüş',
                'bollinger alt bandı', 'stokastik aşırı satım', 'dmi negatif', 'adx düşüş',
                'hacim ağırlıklı fiyat düşüş', 'üssel ortalama aşağı', 'momentum osilatörü negatif',
                'ichimoku bulutu altında', 'parabolic sar satış', 'williams r negatif',
                'destek seviyeleri kırıldı', 'düşen üçgen formasyonu', 'omuz baş omuz'
            ],
            'sentiment': [
                'negatif görünüm', 'güven kaybı', 'kötümser beklenti', 'zayıf temel',
                'ekonomik belirsizlik', 'sektörel sorunlar', 'rekabet baskısı', 'regülasyon riski',
                'soruşturma', 'dava süreci', 'yönetim değişikliği', 'strateji belirsizliği',
                'yabancı çıkışı hızlanıyor', 'kurumsal satış baskısı', 'piyasa yapıcı desteği zayıf',
                'finansal yapı bozuluyor', 'sürdürülemez büyüme', 'global rekabet kaybı',
                'inovasyon eksikliği', 'dijital dönüşüm başarısız', 'çevresel sorunlar artıyor',
                'ihracat daralması', 'pazar payı düşüşü', 'marka değeri azalıyor',
                'ekonomik kriz endişesi', 'sektörel daralma', 'yatırımcı güvensizliği'
            ]
        }
        
        range_signals = {
            'trend': [
                'yatay seyir', 'konsolidasyon', 'denge', 'bekleme',
                'dar bant', 'sıkışma bölgesi', 'momentum eksikliği', 'düşük volatilite',
                'alım-satım dengesi', 'birikim bölgesi', 'dalgalanma', 'yön arayışı',
                'fiyat sıkışması', 'denge noktası', 'yatay kanal', 'momentum denge',
                'volatilite daralması', 'trend dönüş sinyali', 'birikim aşaması', 'dağılım bölgesi'
            ],
            'technical': [
                'sıkışma', 'birikim', 'stabilizasyon', 'momentum kaybı',
                'bollinger daralması', 'düşük hacim', 'rsi nötr bölge', 'macd yatay',
                'fibo yatay', 'destek-direnç bandı', 'trend belirsizliği', 'volatilite düşüşü',
                'üçgen formasyon', 'bayrak formasyon', 'flama formasyon', 'dikdörtgen formasyon',
                'simetrik üçgen', 'yatay momentum', 'hacim dengesi', 'osilatör nötr',
                'stokastik çapraz', 'dmi nötr', 'bollinger sıkışması', 'pivot noktası'
            ],
            'sentiment': [
                'kararsız', 'nötr görünüm', 'yatay bant', 'belirsizlik',
                'bekleme modu', 'temkinli yaklaşım', 'karma sinyaller', 'veri beklentisi',
                'piyasa takibi', 'sektör rotasyonu', 'pozisyon koruma', 'risk nötr',
                'bekle gör stratejisi', 'nötr pozisyonlanma', 'karışık sinyaller', 'denge arayışı',
                'piyasa dengesi', 'yön netleşmesi bekleniyor', 'alım satım dengesi', 'yatırımcı kararsızlığı',
                'sektörel dönüşüm', 'global belirsizlik', 'makro beklenti', 'teknik denge'
            ]
        }
        
        regime_scores = {
            'bullish': sum(1 for signal in bull_signals if signal in text_lower),
            'bearish': sum(1 for signal in bear_signals if signal in text_lower),
            'ranging': sum(1 for signal in range_signals if signal in text_lower)
        }
        
        # Enhanced market regime analysis
        signal_counts = {
            'bullish': sum(sum(1 for signal in signals if signal in text_lower) 
                          for signals in bull_signals.values()),
            'bearish': sum(sum(1 for signal in signals if signal in text_lower) 
                          for signals in bear_signals.values()),
            'ranging': sum(sum(1 for signal in signals if signal in text_lower) 
                          for signals in range_signals.values())
        }
        
        total_signals = sum(signal_counts.values()) + 1e-6
        regime_strength = max(signal_counts.values()) / total_signals
        dominant_regime = max(signal_counts.items(), key=lambda x: x[1])[0]
        
        # Calculate signal type weights
        signal_weights = {
            'trend': 0.35,
            'fundamental': 0.30,
            'technical': 0.20,
            'sentiment': 0.15
        }
        
        # Calculate weighted regime strength
        weighted_strength = regime_strength * (
            1 + sum(weight * any(signal in text_lower for signal in signals)
                   for signal_type, signals in 
                   (bull_signals if dominant_regime == 'bullish' else
                    bear_signals if dominant_regime == 'bearish' else
                    range_signals).items()
                   for weight in [signal_weights.get(signal_type, 0.0)])
        )
        
        # Get keyword sentiment scores
        keyword_scores = self.keyword_sentiment_score(text)
        
        return {
            'regime': dominant_regime,
            'strength': regime_strength,
            'positive': keyword_scores['positive'],
            'negative': keyword_scores['negative'],
            'neutral': keyword_scores['neutral']
        }
        
    def calculate_signal_agreement(
        self,
        base_scores: Dict[str, float],
        keyword_scores: Dict[str, float],
        market_signals: Dict[str, Any]
    ) -> float:
        # Get dominant sentiment from each source
        get_max_sentiment = lambda scores: max(scores.items(), key=lambda x: x[1] if x[0] in ['positive', 'negative', 'neutral'] else (-1, -1))[0]
        
        model_sentiment = get_max_sentiment(base_scores)
        keyword_sentiment = get_max_sentiment(keyword_scores)
        market_sentiment = 'positive' if market_signals['regime'] == 'bullish' else 'negative' if market_signals['regime'] == 'bearish' else 'neutral'
        
        # Calculate agreement score
        sentiments = [model_sentiment, keyword_sentiment, market_sentiment]
        agreement = len(set(sentiments))  # 1 means all agree, 3 means all differ
        
        return 1.0 - ((agreement - 1) / 2)  # Scale to 1.0 (full agreement) to 0.0 (no agreement)
        
    def keyword_sentiment_score(self, text: str) -> Dict[str, float]:
        text_lower = text.lower()
        scores = {
            'positive': sum(1 for word in self.market_keywords['positive'] if word in text_lower),
            'negative': sum(1 for word in self.market_keywords['negative'] if word in text_lower),
            'neutral': sum(1 for word in self.market_keywords['neutral'] if word in text_lower)
        }
        total = sum(scores.values()) + 1e-6
        return {k: v/total for k, v in scores.items()}
    
    def analyze_text(self, text: str) -> Dict[str, float]:
        self.base_model.eval()
        self.classifier.eval()
        
        with torch.no_grad():
            # Get BERT embeddings with multi-head attention
            inputs = self.preprocess_text(text)
            outputs = self.base_model(**inputs)
            sequence_output = outputs.last_hidden_state
            
            # Apply multi-head attention mechanism
            attention_outputs = []
            for attention_head in self.attention_heads:
                attention_weights = torch.softmax(attention_head(sequence_output), dim=1)
                head_context = torch.sum(attention_weights * sequence_output, dim=1)
                attention_outputs.append(head_context)
            
            # Concatenate multi-head outputs
            context_vector = torch.cat(attention_outputs, dim=1)
            
            # Get model predictions with ensemble
            logits = self.classifier(context_vector)
            probs = torch.softmax(logits, dim=1)[0]
            
            # Monte Carlo dropout for uncertainty estimation
            self.classifier.train()
            mc_predictions = []
            for _ in range(10):
                mc_logits = self.classifier(context_vector)
                mc_probs = torch.softmax(mc_logits, dim=1)[0]
                mc_predictions.append(mc_probs.cpu().numpy())
            self.classifier.eval()
            
            # Calculate prediction uncertainty
            mc_predictions = np.array(mc_predictions)
            prediction_mean = np.mean(mc_predictions, axis=0)
            prediction_std = np.std(mc_predictions, axis=0)
            
            # Get keyword-based sentiment with sector context
            keyword_scores = self.keyword_sentiment_score(text)
            sector_context = self.analyze_sector_context(text)
            
            # Identify market context signals
            market_signals = self.extract_market_signals(text)
            
            # Calculate base sentiment scores
            base_scores = {
                'positive': float(probs[0]),
                'negative': float(probs[1]),
                'neutral': float(probs[2])
            }
            
            # Weight adjustments based on sector and market context
            weights = {
                'model': 0.6,
                'keywords': 0.2,
                'context': 0.2
            }
            
            if sector_context['strength'] > 0.5:
                weights['context'] += 0.1
                weights['model'] -= 0.1
            
            if market_signals['strength'] > 0.5:
                weights['keywords'] += 0.1
                weights['model'] -= 0.1
            
            # Combine scores with dynamic weights
            combined_scores = {}
            for sentiment in ['positive', 'negative', 'neutral']:
                combined_scores[sentiment] = (
                    weights['model'] * base_scores[sentiment] +
                    weights['keywords'] * keyword_scores[sentiment] +
                    weights['context'] * market_signals.get(sentiment, 0)
                )
            
            # Normalize scores
            total = sum(combined_scores.values())
            normalized_scores = {k: v/total for k, v in combined_scores.items()}
            
            # Calculate confidence based on multiple factors
            agreement_score = self.calculate_signal_agreement(
                base_scores, keyword_scores, market_signals
            )
            context_confidence = sector_context['confidence']
            signal_strength = market_signals['strength']
            
            # Weighted confidence calculation
            confidence = (
                0.4 * agreement_score +
                0.3 * context_confidence +
                0.3 * signal_strength
            )
            confidence = max(0.1, min(0.9, confidence))
            
            normalized_scores['confidence'] = confidence
            normalized_scores['sector'] = sector_context['sector']
            normalized_scores['market_regime'] = market_signals['regime']
            
            return normalized_scores
    
    def train(self, texts: List[str], labels: List[int], 
             validation_split: float = 0.2, 
             epochs: int = 10,
             batch_size: int = 16) -> Dict[str, float]:
        
        # Prepare datasets
        dataset_size = len(texts)
        indices = np.random.permutation(dataset_size)
        split_idx = int(dataset_size * (1 - validation_split))
        train_indices = indices[:split_idx]
        val_indices = indices[split_idx:]
        
        optimizer = torch.optim.AdamW([
            {'params': self.base_model.parameters(), 'lr': 1e-5},
            {'params': self.classifier.parameters(), 'lr': 1e-4}
        ])
        criterion = nn.CrossEntropyLoss()
        
        best_val_loss = float('inf')
        patience = 3
        patience_counter = 0
        
        metrics = {
            'train_loss': [],
            'val_loss': [],
            'train_acc': [],
            'val_acc': []
        }
        
        for epoch in range(epochs):
            # Training
            self.base_model.train()
            self.classifier.train()
            train_loss = 0
            correct = 0
            
            for i in range(0, len(train_indices), batch_size):
                batch_indices = train_indices[i:i+batch_size]
                batch_texts = [texts[j] for j in batch_indices]
                batch_labels = torch.tensor([labels[j] for j in batch_indices]).to(self.device)
                
                inputs = self.preprocess_text(' '.join(batch_texts))
                optimizer.zero_grad()
                
                outputs = self.base_model(**inputs)
                pooled_output = outputs.last_hidden_state[:, 0, :]
                logits = self.classifier(pooled_output)
                
                loss = criterion(logits, batch_labels)
                loss.backward()
                optimizer.step()
                
                train_loss += loss.item()
                correct += (logits.argmax(dim=1) == batch_labels).sum().item()
            
            train_loss /= len(train_indices)
            train_acc = correct / len(train_indices)
            
            # Validation
            self.base_model.eval()
            self.classifier.eval()
            val_loss = 0
            correct = 0
            
            with torch.no_grad():
                for i in range(0, len(val_indices), batch_size):
                    batch_indices = val_indices[i:i+batch_size]
                    batch_texts = [texts[j] for j in batch_indices]
                    batch_labels = torch.tensor([labels[j] for j in batch_indices]).to(self.device)
                    
                    inputs = self.preprocess_text(' '.join(batch_texts))
                    outputs = self.base_model(**inputs)
                    pooled_output = outputs.last_hidden_state[:, 0, :]
                    logits = self.classifier(pooled_output)
                    
                    loss = criterion(logits, batch_labels)
                    val_loss += loss.item()
                    correct += (logits.argmax(dim=1) == batch_labels).sum().item()
            
            val_loss /= len(val_indices)
            val_acc = correct / len(val_indices)
            
            metrics['train_loss'].append(train_loss)
            metrics['val_loss'].append(val_loss)
            metrics['train_acc'].append(train_acc)
            metrics['val_acc'].append(val_acc)
            
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    logger.info(f"Early stopping at epoch {epoch+1}")
                    break
        
        return {
            'final_train_loss': metrics['train_loss'][-1],
            'final_val_loss': metrics['val_loss'][-1],
            'final_train_acc': metrics['train_acc'][-1],
            'final_val_acc': metrics['val_acc'][-1],
            'epochs_trained': len(metrics['train_loss'])
        }
import random
from typing import List, Dict, Union, Optional, Tuple
from datetime import datetime
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
        self.update_history: List[Dict[str, float]] = []
        self.market_context_buffer: List[Dict[str, Any]] = []
        self.max_buffer_size = 1000
        
        # Enhanced Turkish market-specific thresholds
        self.volatility_threshold = {
            'low': 0.15,
            'medium': 0.25,
            'high': 0.35,
            'extreme': 0.45
        }
        # Enhanced Turkish market-specific thresholds
        self.trend_thresholds = {
            'weak': 0.02,
            'moderate': 0.04,
            'strong': 0.06,
            'extreme': 0.08
        }
        self.trend_threshold = self.trend_thresholds['moderate']  # Default threshold
        
        self.momentum_thresholds = {
            'weak': 0.03,
            'moderate': 0.05,
            'strong': 0.08,
            'extreme': 0.12
        }
        self.momentum_threshold = self.momentum_thresholds['moderate']  # Default threshold
        
        # Turkish market-specific signal thresholds
        self.signal_thresholds = {
            'price_impact': 0.04,    # Minimum price movement for signal
            'volume_surge': 1.8,     # Volume increase factor
            'momentum_confirm': 0.06, # Momentum confirmation level
            'trend_confirm': 0.05,   # Trend confirmation level
            'volatility_filter': 0.35 # Maximum volatility for signal
        }
        self.volume_thresholds = {
            'low': 0.5,
            'normal': 1.0,
            'high': 2.0,
            'extreme': 3.0
        }
        
        # Advanced market regime parameters
        self.regime_params = {
            'detection_window': {
                'short': 10,
                'medium': 20,
                'long': 40
            },
            'change_threshold': {
                'quick': 0.1,
                'normal': 0.15,
                'conservative': 0.2
            },
            'min_duration': {
                'short': 3,
                'medium': 5,
                'long': 8
            },
            'confidence_levels': {
                'low': 0.3,
                'medium': 0.5,
                'high': 0.7,
                'very_high': 0.85
            }
        }
        
        # Enhanced attention mechanism
        self.attention = nn.Sequential(
            nn.Linear(768, 384),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.LayerNorm(384),
            nn.Linear(384, 1),
            nn.Sigmoid()
        ).to(self.device)
        self.market_regimes = {
            'bullish': {'min_confidence': 0.7, 'signal_threshold': 0.6},
            'bearish': {'min_confidence': 0.7, 'signal_threshold': -0.6},
            'volatile': {'min_confidence': 0.8, 'signal_threshold': 0.4},
            'ranging': {'min_confidence': 0.75, 'signal_threshold': 0.3}
        }
        self.continuous_learning = {
            'feedback_buffer': [],
            'adaptation_rate': 0.1,
            'min_samples': 50,
            'max_buffer_size': 1000
        }
        
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
            
    def train(self, texts: List[str], labels: List[int], epochs: int = 3, market_context: Optional[Dict[str, Any]] = None) -> Dict[str, float]:
        if not self.model or not self.tokenizer:
            raise RuntimeError("Model or tokenizer not initialized")
            
        if market_context:
            regime = market_context.get('market_regime', 'neutral')
            regime_params = self.market_regimes.get(regime, {'min_confidence': 0.7, 'signal_threshold': 0.5})
            self.learning_rate *= max(0.5, min(1.5, 1.0 + market_context.get('volatility', 0) * 0.5))
            if regime == 'volatile':
                self.batch_size = max(8, self.batch_size // 2)
            
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
    
    def analyze_text(self, text: str, market_context: Optional[Dict[str, Any]] = None) -> Dict[str, float]:
        if not self.model or not self.tokenizer:
            raise RuntimeError("Model or tokenizer not initialized")
            
        if market_context:
            regime = market_context.get('market_regime', 'neutral')
            regime_params = self.market_regimes.get(regime, {'min_confidence': 0.7, 'signal_threshold': 0.5})
            
            # Enhanced Turkish market-specific regime adaptation
            volatility = market_context.get('volatility', 0.0)
            if volatility > self.volatility_threshold:
                regime_params['min_confidence'] *= 1.2  # Higher confidence requirement in volatile markets
                regime_params['signal_threshold'] *= 0.8  # More conservative signals
                
            trend_strength = market_context.get('trend_strength', 0.0)
            if trend_strength > self.trend_threshold:
                regime_params['signal_threshold'] *= 1.2  # Stronger signals in trending markets
                
            if len(self.continuous_learning['feedback_buffer']) >= self.continuous_learning['min_samples']:
                self._adapt_to_market_conditions()
            
        try:
            self.model.eval()
            with torch.no_grad():
                # Enhanced text preprocessing with Turkish market context
                inputs = self.tokenizer(
                    text,
                    return_tensors="pt",
                    truncation=True,
                    max_length=512,
                    padding=True
                ).to(self.device)
                
                # Monte Carlo dropout for uncertainty estimation
                predictions = []
                self.model.train()  # Enable dropout
                for _ in range(10):
                    outputs = self.model(**inputs)
                    probs = torch.softmax(outputs.logits, dim=1)
                    predictions.append(probs.cpu().numpy())
                self.model.eval()
                
                # Calculate mean and uncertainty
                predictions = np.array(predictions)
                mean_probs = np.mean(predictions, axis=0)[0]
                uncertainty = np.std(predictions, axis=0)[0]
                
                # Apply attention mechanism
                attention_scores = self.attention(outputs.last_hidden_state).squeeze()
                weighted_output = outputs.last_hidden_state * attention_scores.unsqueeze(-1)
                context_vector = torch.mean(weighted_output, dim=1)
                
                # Calculate final sentiment scores with uncertainty
                sentiment_scores = {
                    "positive": float(mean_probs[2]),
                    "neutral": float(mean_probs[1]),
                    "negative": float(mean_probs[0]),
                    "uncertainty": float(np.mean(uncertainty)),
                    "attention_score": float(torch.mean(attention_scores).item())
                }
                
                # Add market context influence
                if market_context:
                    sentiment_scores.update({
                        "market_regime": regime,
                        "regime_confidence": float(regime_params['min_confidence']),
                        "market_volatility": float(market_context.get('volatility', 0.0))
                    })
                
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
    
    def _adapt_to_market_conditions(self) -> None:
        if len(self.continuous_learning['feedback_buffer']) < self.continuous_learning['min_samples']:
            return
            
        recent_feedback = self.continuous_learning['feedback_buffer'][-self.continuous_learning['min_samples']:]
        
        market_stats = {
            'volatility': [],
            'trend_strength': [],
            'sentiment_stability': [],
            'volume_impact': [],
            'sector_performance': {},
            'regime_accuracy': {}
        }
        
        sectors = {
            'banking': {'weight': 0.25, 'min_samples': 20, 'volatility_factor': 1.2},
            'technology': {'weight': 0.15, 'min_samples': 15, 'volatility_factor': 1.1},
            'energy': {'weight': 0.15, 'min_samples': 15, 'volatility_factor': 1.1},
            'retail': {'weight': 0.10, 'min_samples': 10, 'volatility_factor': 1.0},
            'industrial': {'weight': 0.15, 'min_samples': 15, 'volatility_factor': 1.0},
            'telecom': {'weight': 0.05, 'min_samples': 10, 'volatility_factor': 0.9},
            'healthcare': {'weight': 0.05, 'min_samples': 10, 'volatility_factor': 0.8},
            'real_estate': {'weight': 0.05, 'min_samples': 10, 'volatility_factor': 1.1},
            'defense': {'weight': 0.05, 'min_samples': 10, 'volatility_factor': 1.2}
        }
        
        for sector in sectors:
            market_stats['sector_performance'][sector] = []
            
        regimes = {
            'bullish': {
                'threshold': 0.6,
                'confidence': 0.7,
                'volatility_adjust': 0.8,
                'momentum_factor': 1.2
            },
            'bearish': {
                'threshold': -0.6,
                'confidence': 0.7,
                'volatility_adjust': 0.8,
                'momentum_factor': 1.2
            },
            'volatile': {
                'threshold': 0.4,
                'confidence': 0.8,
                'volatility_adjust': 1.2,
                'momentum_factor': 0.8
            },
            'ranging': {
                'threshold': 0.3,
                'confidence': 0.75,
                'volatility_adjust': 1.0,
                'momentum_factor': 1.0
            }
        }
        
        for regime in regimes:
            market_stats['regime_accuracy'][regime] = []
            
        self.sectors = sectors
        self.regimes = regimes
        
        for i in range(1, len(recent_feedback)):
            prev = recent_feedback[i-1]
            curr = recent_feedback[i]
            
            if prev.get('market_context') and curr.get('market_context'):
                # Enhanced volatility calculation
                price_vol = float(curr['market_context'].get('volatility', 0))
                sent_vol = abs(
                    float(curr['market_context'].get('sentiment_volatility', 0)) -
                    float(prev['market_context'].get('sentiment_volatility', 0))
                )
                market_stats['volatility'].append((price_vol + sent_vol) / 2)
                
                # Enhanced trend analysis
                trend_curr = float(curr['market_context'].get('trend', 0))
                trend_prev = float(prev['market_context'].get('trend', 0))
                trend_strength = abs(trend_curr - trend_prev)
                market_stats['trend_strength'].append(trend_strength)
                
                # Volume analysis
                volume_ratio = float(curr['market_context'].get('volume_ratio', 1.0))
                market_stats['volume_impact'].append(volume_ratio)
                
                # Sector-specific performance
                sector = curr['market_context'].get('sector', 'unknown')
                is_correct = curr['predicted'] == curr['actual']
                market_stats['sector_performance'][sector].append(is_correct)
                
                # Regime-specific accuracy
                regime = curr['market_context'].get('market_regime', 'unknown')
                market_stats['regime_accuracy'][regime].append(is_correct)
                
                # Sentiment stability with confidence weighting
                confidence = float(curr['market_context'].get('confidence', 0.5))
                stability = 1 if curr['predicted'] == curr['actual'] else 0
                market_stats['sentiment_stability'].append(stability * confidence)
        
        # Calculate aggregate statistics
        stats = {
            'volatility': np.mean(market_stats['volatility']) if market_stats['volatility'] else 0.5,
            'trend_strength': np.mean(market_stats['trend_strength']) if market_stats['trend_strength'] else 0.5,
            'volume_impact': np.mean(market_stats['volume_impact']) if market_stats['volume_impact'] else 1.0,
            'sentiment_stability': np.mean(market_stats['sentiment_stability']) if market_stats['sentiment_stability'] else 0.5
        }
        
        # Calculate sector-specific accuracies
        sector_accuracies = {
            sector: np.mean(performances) if performances else 0.5
            for sector, performances in market_stats['sector_performance'].items()
        }
        
        # Calculate regime-specific accuracies
        regime_accuracies = {
            regime: np.mean(accuracies) if accuracies else 0.5
            for regime, accuracies in market_stats['regime_accuracy'].items()
        }
        
        # Dynamic learning rate adjustment with enhanced factors
        base_lr = self.learning_rate
        
        # Volatility-based adjustment
        vol_factor = 1.0 + (stats['volatility'] - 0.5) * 0.3
        
        # Trend-based adjustment
        trend_factor = 1.0 + stats['trend_strength'] * 0.2
        
        # Volume-based adjustment
        volume_factor = np.clip(stats['volume_impact'], 0.8, 1.2)
        
        # Stability-based adjustment
        stability_factor = 1.0 + (stats['sentiment_stability'] - 0.5) * 0.4
        
        # Regime-specific adjustments
        current_regime = recent_feedback[-1]['market_context'].get('market_regime', 'unknown')
        regime_accuracy = regime_accuracies.get(current_regime, 0.5)
        
        if regime_accuracy < 0.6:
            regime_factor = 1.2  # Increase learning for poor performance
        elif regime_accuracy > 0.8:
            regime_factor = 0.9  # Decrease learning for good performance
        else:
            regime_factor = 1.0
        
        # Apply combined adjustments
        self.learning_rate = base_lr * vol_factor * trend_factor * volume_factor * stability_factor * regime_factor
        
        # Update regime parameters
        for regime, accuracy in regime_accuracies.items():
            if regime in self.market_regimes:
                if accuracy < 0.6:
                    self.market_regimes[regime]['min_confidence'] = min(0.9, self.market_regimes[regime]['min_confidence'] * 1.1)
                    self.market_regimes[regime]['signal_threshold'] *= 0.9
                elif accuracy > 0.8:
                    self.market_regimes[regime]['min_confidence'] = max(0.5, self.market_regimes[regime]['min_confidence'] * 0.95)
                    self.market_regimes[regime]['signal_threshold'] *= 1.05
        
        # Ensure bounds
        self.learning_rate = np.clip(self.learning_rate, 1e-6, 1e-4)
        for regime in self.market_regimes:
            self.market_regimes[regime]['min_confidence'] = np.clip(self.market_regimes[regime]['min_confidence'], 0.5, 0.9)
            self.market_regimes[regime]['signal_threshold'] = np.clip(abs(self.market_regimes[regime]['signal_threshold']), 0.2, 0.8)
    
    def add_feedback(self, text: str, predicted_sentiment: str, actual_sentiment: str, market_context: Optional[Dict[str, Any]] = None) -> None:
        self.continuous_learning['feedback_buffer'].append({
            'text': text,
            'predicted': predicted_sentiment,
            'actual': actual_sentiment,
            'market_context': market_context,
            'timestamp': datetime.now().isoformat()
        })
        
        if len(self.continuous_learning['feedback_buffer']) > self.continuous_learning['max_buffer_size']:
            self.continuous_learning['feedback_buffer'] = self.continuous_learning['feedback_buffer'][-self.continuous_learning['max_buffer_size']:]
    
    def get_investment_signal(self, sentiment_scores: Dict[str, float], market_context: Optional[Dict[str, Any]] = None) -> Dict[str, float]:
        # Turkish market-specific dynamic weight system
        base_weights = {
            'positive': 1.3,  # Higher weight for positive signals in Turkish market
            'negative': 1.2,  # Higher weight for negative signals due to market sensitivity
            'neutral': 0.4,   # Increased neutral weight for consolidation periods
            'uncertainty': 0.3,  # Higher uncertainty weight for Turkish market volatility
            'attention': 0.3    # Increased attention weight for market momentum
        }
        
        # Enhanced Turkish market regime-specific adjustments
        regime_weights = {
            'bullish': {
                'positive': 1.4,  # Stronger momentum in bullish trends
                'negative': 0.7,  # Reduced impact of negative signals in uptrends
                'neutral': 0.6    # Lower neutral weight in strong trends
            },
            'bearish': {
                'positive': 0.7,  # Reduced positive signal impact in downtrends
                'negative': 1.4,  # Increased negative signal weight
                'neutral': 0.6    # Lower neutral weight in strong trends
            },
            'volatile': {
                'positive': 0.8,  # Reduced directional weights in volatile periods
                'negative': 0.8,
                'neutral': 1.4    # Higher neutral weight for volatility protection
            },
            'ranging': {
                'positive': 1.1,  # Balanced weights with slight momentum bias
                'negative': 1.1,
                'neutral': 1.2    # Higher neutral weight for consolidation
            }
        }
        
        if market_context:
            volatility = market_context.get('volatility', 0.5)
            trend_strength = market_context.get('trend_strength', 0.5)
            volume_ratio = market_context.get('volume_ratio', 1.0)
            
            # Adjust weights based on market conditions
            if volatility > 0.7:  # High volatility
                base_weights['neutral'] *= 1.5  # Increase neutral weight
                base_weights['positive'] *= 0.8  # Reduce directional weights
                base_weights['negative'] *= 0.8
            elif trend_strength > 0.7:  # Strong trend
                base_weights['neutral'] *= 0.7  # Reduce neutral weight
                if market_context.get('trend', 0) > 0:  # Uptrend
                    base_weights['positive'] *= 1.3
                else:  # Downtrend
                    base_weights['negative'] *= 1.3
            
            # Volume-based adjustment
            if volume_ratio > 1.5:  # High volume
                base_weights['positive'] *= 1.2
                base_weights['negative'] *= 1.2
            
        # Calculate base signal with dynamic weights
        base_signal = (
            base_weights['positive'] * sentiment_scores["positive"] -
            base_weights['negative'] * sentiment_scores["negative"] +
            base_weights['neutral'] * (sentiment_scores.get("neutral", 0.5) - 0.5)
        )
        
        signal_strength = abs(base_signal)
        signal_direction = np.sign(base_signal)
        
        # Enhanced market context adjustments
        if market_context:
            sector = market_context.get('sector', 'unknown')
            sector_strength = market_context.get('sector_strength', 0.5)
            sector_momentum = market_context.get('sector_momentum', 0.0)
            
            # Sector-specific adjustments
            sector_factor = 1.0
            if sector_momentum * signal_direction > 0:  # Aligned with sector momentum
                sector_factor = 1.0 + (sector_strength * 0.3)
            else:
                sector_factor = 1.0 - (sector_strength * 0.2)
            
            signal_strength *= sector_factor
            
            # Market regime adjustments
            regime = market_context.get('market_regime', 'unknown')
            regime_confidence = market_context.get('regime_confidence', 0.5)
            
            # Turkish market-specific regime adjustments with enhanced volatility bands
            if regime == 'volatile':
                volatility_band = np.clip(volatility, 0.3, 0.6)  # Higher volatility bands for Turkish market
                signal_strength *= max(0.5, 1.0 - (volatility_band * regime_confidence))
                
                # Enhanced momentum adaptation for volatile periods
                if sector_momentum and abs(sector_momentum) > 0.15:  # Higher momentum threshold
                    momentum_factor = 1.0 + np.sign(sector_momentum) * 0.3  # Stronger momentum impact
                    signal_strength *= momentum_factor
                    
                # Volume-based volatility adjustment
                if volume_ratio > 1.8:  # Strong volume confirmation
                    signal_strength *= 1.25
                elif volume_ratio < 0.4:  # Very low volume
                    signal_strength *= 0.7
                    
            elif regime == 'trending':
                trend_alignment = signal_direction * (1 if market_context.get('trend', 0) > 0 else -1)
                trend_score = trend_strength * regime_confidence
                momentum_score = market_context.get('momentum', 0.0)
                volume_trend = volume_ratio > 1.2 and np.sign(momentum_score) == np.sign(trend_alignment)
                
                if trend_alignment > 0 and trend_score > 0.6:
                    if volume_trend and abs(momentum_score) > 0.2:
                        signal_strength *= 1.5  # Strong trend with volume confirmation
                    else:
                        signal_strength *= 1.3  # Strong trend alignment
                elif trend_alignment > 0:
                    if volume_trend:
                        signal_strength *= 1.3  # Volume-confirmed moderate trend
                    else:
                        signal_strength *= 1.1  # Moderate trend alignment
                else:
                    if abs(momentum_score) > 0.3 and volume_trend:
                        signal_strength *= 0.6  # Strong counter-trend signals
                    else:
                        signal_strength *= 0.8  # Moderate counter-trend signals
                    
            elif regime == 'ranging':
                mean_reversion = market_context.get('mean_reversion', 0.0)
                price_to_ma = market_context.get('price_to_ma', 1.0)
                bb_position = market_context.get('bb_position', 0.5)
                consolidation_score = market_context.get('consolidation_score', 0.0)
                
                # Enhanced mean reversion detection
                if abs(price_to_ma - 1.0) > 0.03:  # Price deviation from moving average
                    if mean_reversion > 0.6 and volume_ratio > 1.2:
                        signal_strength *= 1.4  # Strong mean reversion with volume
                    elif mean_reversion > 0.5:
                        signal_strength *= 1.2  # Moderate mean reversion
                    else:
                        signal_strength *= 0.7  # Weak mean reversion
                
                # Consolidation pattern analysis
                if consolidation_score > 0.7:
                    if bb_position > 0.8:  # Near upper band
                        signal_strength *= 0.7  # Resistance level
                    elif bb_position < 0.2:  # Near lower band
                        signal_strength *= 1.3  # Support level
                    else:
                        signal_strength *= 0.9  # Middle of range
                    
            # Calculate base confidence with multiple factors
            base_confidence = sentiment_scores.get('confidence', 0.5)
            sector_confidence = min(0.9, base_confidence * (1 + sector_strength))
            
            # Volume-based confidence and signal adjustments
            volume_ratio = market_context.get('volume_ratio', 1.0)
            volume_confidence = min(0.9, sector_confidence * (1 + (volume_ratio - 1) * 0.2))
            
            if volume_ratio > 1.5:  # High volume confirms signal
                signal_strength *= 1.2
                volume_confidence = min(0.9, volume_confidence * 1.1)
            elif volume_ratio < 0.5:  # Low volume reduces confidence
                signal_strength *= 0.8
                volume_confidence *= 0.9
            
            # Final confidence calculation with regime adjustment
            regime_adjusted_confidence = min(0.95, volume_confidence * (1 + regime_confidence * 0.2))
            confidence = regime_adjusted_confidence
        else:
            confidence = sentiment_scores.get('confidence', 0.5)
        
        # Calculate final signal with Turkish market-specific adjustments
        final_signal = signal_direction * signal_strength
        
        # Enhanced confidence calculation for Turkish market conditions
        if market_context:
            volatility = market_context.get('volatility', 0.3)
            if volatility > 0.4:  # High volatility periods
                confidence *= 0.8
            elif volatility < 0.2:  # Low volatility periods
                confidence *= 1.2
            
            # Volume impact on confidence
            if volume_ratio > 2.0:
                confidence = min(0.95, confidence * 1.3)
            elif volume_ratio < 0.3:
                confidence *= 0.7
            
            # Trend alignment boost
            if abs(trend_strength) > 0.6 and signal_direction * market_context.get('trend', 0) > 0:
                confidence = min(0.95, confidence * 1.2)
            
            # Enhanced sector-specific adjustments for Turkish market
            sector_adjustments = {
                'banking': {
                    'momentum_threshold': 0.15,  # More sensitive to momentum
                    'confidence_boost': 1.25,
                    'volatility_sensitivity': 1.2
                },
                'industrial': {
                    'momentum_threshold': 0.18,
                    'confidence_boost': 1.2,
                    'volatility_sensitivity': 1.1
                },
                'technology': {
                    'momentum_threshold': 0.2,
                    'confidence_boost': 1.15,
                    'volatility_sensitivity': 1.3
                },
                'energy': {
                    'momentum_threshold': 0.17,
                    'confidence_boost': 1.18,
                    'volatility_sensitivity': 1.15
                },
                'defense': {
                    'momentum_threshold': 0.15,
                    'confidence_boost': 1.3,
                    'volatility_sensitivity': 1.1
                }
            }
            
            if sector in sector_adjustments:
                adj = sector_adjustments[sector]
                if sector_momentum and abs(sector_momentum) > adj['momentum_threshold']:
                    confidence = min(0.95, confidence * adj['confidence_boost'])
                    if volatility > 0.3:
                        # Adjust for sector-specific volatility sensitivity
                        confidence *= max(0.7, 1.0 - (volatility - 0.3) * adj['volatility_sensitivity'])
                        
                # Special handling for banking sector during high volatility
                if sector == 'banking' and volatility > 0.4:
                    if market_context.get('trend', 0) < -0.1:  # Downtrend
                        confidence *= 0.85  # More conservative in banking during volatile downtrends
                        signal_strength *= 0.9
                    
                # Enhanced defense sector handling
                if sector == 'defense':
                    global_tension = market_context.get('global_tension', 0.0)
                    if global_tension > 0.5:
                        confidence = min(0.95, confidence * 1.2)
                        signal_strength *= 1.15
        
        # Ensure confidence bounds
        confidence = max(0.2, min(0.95, confidence))
        
        return {
            'signal': float(final_signal),
            'confidence': float(confidence),
            'strength': float(signal_strength),
            'direction': float(signal_direction),
            'sector_alignment': float(sector_factor if market_context else 1.0),
            'regime_impact': float(regime_confidence if market_context else 0.5),
            'volume_impact': float(volume_ratio if market_context else 1.0),
            'volatility_level': float(volatility if market_context else 0.0),
            'trend_strength': float(trend_strength if market_context else 0.0),
            'sector_momentum': float(sector_momentum if market_context else 0.0)
        }
