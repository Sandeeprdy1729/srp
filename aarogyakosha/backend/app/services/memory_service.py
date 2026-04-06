"""
AarogyaKosha - Sovereign Memory Service
Complete multimodal memory system with observe-encode-associate-think workflow
"""

from typing import List, Optional, Dict, Any, Union
from datetime import datetime

from app.services.multimodal_encoder import encoder, MultimodalEncoder
from app.services.vector_store import vector_store, VectorStore
from app.services.reasoning_service import reasoning_service, ReasoningService


class SovereignMemory:
    """
    Complete multimodal memory system.
    Implements: Observe → Encode → Associate → Think → Respond
    """

    def __init__(self):
        self.encoder = encoder
        self.store = vector_store
        self.reasoner = reasoning_service

    async def observe(
        self,
        content: Union[str, bytes],
        content_type: str = "text",
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Observe: Accept input (text, image, audio) from user.
        """
        # Prepare metadata
        meta = metadata or {}
        meta.update(
            {
                "user_id": user_id,
                "content_type": content_type,
                "observed_at": datetime.utcnow().isoformat(),
            }
        )

        return {"status": "observed", "content_type": content_type, "metadata": meta}

    async def encode(
        self, content: Union[str, bytes], content_type: str = "text"
    ) -> List[float]:
        """
        Encode: Generate embedding vector V from content.
        """
        embedding = await self.encoder.encode(content, content_type)
        return embedding

    async def associate(
        self,
        query_embedding: List[float],
        n_results: int = 5,
        memory_type: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Associate: Retrieve similar memories using cosine similarity.
        """
        # Filter by user if provided
        filter_meta = {}
        if user_id:
            filter_meta["user_id"] = user_id

        memories = await self.store.search(
            query_embedding=query_embedding,
            n_results=n_results,
            filter_metadata=filter_meta if filter_meta else None,
            memory_type=memory_type,
        )

        return memories

    async def think(
        self,
        query: str,
        context: List[Dict[str, Any]],
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Think: Use reasoning model to cross-reference with existing knowledge.
        """
        result = await self.reasoner.think_and_respond(
            query=query, context=context, system_prompt=system_prompt
        )

        return result

    async def remember(
        self,
        content: Union[str, bytes],
        content_type: str = "text",
        user_id: Optional[str] = None,
        memory_type: str = "observation",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Complete workflow: Observe → Encode → Associate → Store
        """
        # Observe
        obs_result = await self.observe(content, content_type, user_id, metadata)

        # Encode
        embedding = await self.encode(content, content_type)

        # Prepare content string
        content_str = (
            content if isinstance(content, str) else f"[{content_type} content]"
        )

        # Store in vector store
        meta = metadata or {}
        meta.update(
            {
                "user_id": user_id,
                "content_type": content_type,
                "memory_type": memory_type,
            }
        )

        memory_id = await self.store.add_memory(
            content=content_str,
            embedding=embedding,
            metadata=meta,
            memory_type=memory_type,
        )

        return memory_id

    async def recall(
        self,
        query: Union[str, bytes],
        query_type: str = "text",
        user_id: Optional[str] = None,
        n_results: int = 5,
    ) -> Dict[str, Any]:
        """
        Complete recall workflow: Encode → Associate → Think
        """
        # Encode query
        query_embedding = await self.encode(query, query_type)

        # Associate - find similar memories
        memories = await self.associate(
            query_embedding=query_embedding, n_results=n_results, user_id=user_id
        )

        return {
            "query": query if isinstance(query, str) else f"[{query_type} query]",
            "memories": memories,
            "total_found": len(memories),
        }

    async def query_with_reasoning(
        self, query: str, user_id: Optional[str] = None, n_results: int = 5
    ) -> Dict[str, Any]:
        """
        Full query with reasoning: Encode → Associate → Think
        """
        # Encode query
        query_embedding = await self.encode(query, "text")

        # Associate
        memories = await self.associate(
            query_embedding=query_embedding, n_results=n_results, user_id=user_id
        )

        # Think - reason about the context
        reasoning_result = await self.think(
            query=query,
            context=memories,
            system_prompt="You are a helpful assistant with access to user's health records and memories.",
        )

        return {
            "query": query,
            "memories": memories,
            "reasoning": reasoning_result,
            "response": reasoning_result.get("response", ""),
        }

    async def get_stats(self) -> Dict[str, Any]:
        """Get memory system statistics."""
        return await self.store.get_stats()


# Global instance
memory_service = SovereignMemory()
