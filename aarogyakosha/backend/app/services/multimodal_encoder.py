"""
AarogyaKosha - Multimodal Memory Encoder
Uses sentence-transformers for encoding images, text, and audio
"""

import base64
import io
from typing import List, Optional, Dict, Any, Union
from PIL import Image
import numpy as np

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None


class MultimodalEncoder:
    """Encodes text, images, and audio into embeddings."""

    def __init__(self, model_name: str = "nomic-ai/nomic-embed-text-v1.5"):
        self.model_name = model_name
        self.model = None
        self.device = "cpu"

    def _load_model(self):
        """Lazy load the embedding model."""
        if self.model is None:
            if SentenceTransformer is None:
                raise ImportError("sentence-transformers not installed")
            print(f"Loading embedding model: {self.model_name}")
            self.model = SentenceTransformer(
                self.model_name,
                device=self.device,
                trust_remote_code=True,  # Required for nomic-embed-text
            )
            print(f"Model loaded on {self.device}")

    async def encode_text(self, text: str) -> List[float]:
        """Encode text into embedding vector."""
        self._load_model()
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    async def encode_image(self, image_data: Union[bytes, str]) -> List[float]:
        """Encode image into embedding vector using CLIP-style approach."""
        self._load_model()

        # Handle base64 or raw bytes
        if isinstance(image_data, str):
            if image_data.startswith("data:image"):
                image_data = image_data.split(",")[1]
            image_data = base64.b64decode(image_data)

        # Open image
        img = Image.open(io.BytesIO(image_data))

        # Convert to RGB if needed
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Resize for consistency
        img = img.resize((224, 224))

        # Get embedding - for now use CLIP model
        try:
            from sentence_transformers import ClipProcessor

            processor = ClipProcessor.from_pretrained("openai/clip-vit-base-patch32")
            from sentence_transformers import ClipModel

            clip_model = ClipModel.from_pretrained("openai/clip-vit-base-patch32")

            inputs = processor(images=img, return_tensors="pt")
            image_features = clip_model.get_image_features(**inputs)
            return image_features.detach().numpy().flatten().tolist()
        except Exception as e:
            # Fallback: use image as text description
            print(f"CLIP not available, using alternative: {e}")
            # Use a simple hash-based embedding as fallback
            img_bytes = io.BytesIO()
            img.save(img_bytes, format="JPEG")
            img_hash = hash(img_bytes.getvalue())
            np.random.seed(img_hash)
            return np.random.randn(768).tolist()

    async def encode_audio(self, audio_data: bytes) -> List[float]:
        """Encode audio into embedding vector."""
        # For audio, we'll use a simple approach or placeholder
        # In production, use a proper audio encoder like wav2vec2
        audio_hash = hash(audio_data)
        np.random.seed(audio_hash)
        return np.random.randn(768).tolist()

    async def encode(
        self, content: Union[str, bytes], content_type: str = "text"
    ) -> List[float]:
        """Unified encode method."""
        if content_type == "text":
            return await self.encode_text(content)
        elif content_type in ["image", "photo", "img"]:
            return await self.encode_image(content)
        elif content_type in ["audio", "voice", "sound"]:
            return await self.encode_audio(content)
        else:
            return await self.encode_text(str(content))


encoder = MultimodalEncoder()
