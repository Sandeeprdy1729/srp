"""
AarogyaKosha - Local Vector Store
Uses ChromaDB for local, privacy-focused vector storage
"""

import os
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime
import json

try:
    import chromadb
    from chromadb.config import Settings
except ImportError:
    chromadb = None
    Settings = None


class VectorStore:
    """Local vector store using ChromaDB for privacy-focused storage."""

    def __init__(self, persist_directory: str = "./data/memory_store"):
        if chromadb is None:
            raise ImportError("chromadb not installed")

        self.persist_directory = persist_directory

        # Ensure directory exists
        os.makedirs(persist_directory, exist_ok=True)

        # Initialize ChromaDB client - use in-memory if disk full
        try:
            self.client = chromadb.PersistentClient(
                path=persist_directory,
                settings=Settings(anonymized_telemetry=False, allow_reset=True),
            )
        except Exception as e:
            print(f"Persistence error, using in-memory: {e}")
            self.client = chromadb.Client()

        # Initialize collections
        self._init_collections()

    def _init_collections(self):
        """Initialize memory collections."""
        # Main memories collection
        try:
            self.memories = self.client.get_or_create_collection(
                name="memories",
                metadata={"description": "User memories and observations"},
                get_or_create=True,
            )
        except Exception as e:
            print(f"Collection error: {e}")
            self.client.reset()
            self.memories = self.client.get_or_create_collection(
                name="memories",
                metadata={"description": "User memories and observations"},
            )

        # Context window for reasoning
        self.context_window = 128_000  # 128K tokens

    async def add_memory(
        self,
        content: str,
        embedding: List[float],
        metadata: Optional[Dict[str, Any]] = None,
        memory_type: str = "observation",
    ) -> str:
        """Add a memory to the store."""
        memory_id = str(uuid.uuid4())

        # Prepare metadata
        meta = metadata or {}
        meta.update(
            {
                "memory_type": memory_type,
                "created_at": datetime.utcnow().isoformat(),
                "content": content[:500],  # Store snippet for reference
            }
        )

        # Add to collection
        self.memories.add(
            ids=[memory_id],
            embeddings=[embedding],
            documents=[content],
            metadatas=[meta],
        )

        return memory_id

    async def search(
        self,
        query_embedding: List[float],
        n_results: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None,
        memory_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Search memories by similarity."""
        # Build where clause
        where_clause = {}
        if memory_type:
            where_clause["memory_type"] = memory_type
        if filter_metadata:
            where_clause.update(filter_metadata)

        try:
            results = self.memories.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where_clause if where_clause else None,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as e:
            print(f"Search error: {e}")
            return []

        # Format results
        memories = []
        if results and results.get("ids") and results["ids"][0]:
            for i, mem_id in enumerate(results["ids"][0]):
                memories.append(
                    {
                        "id": mem_id,
                        "content": results["documents"][0][i],
                        "metadata": results["metadatas"][0][i],
                        "similarity": 1
                        - results["distances"][0][i],  # Convert distance to similarity
                    }
                )

        return memories

    async def get_recent_memories(
        self, limit: int = 10, memory_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get recent memories ordered by time."""
        try:
            results = self.memories.get(include=["documents", "metadatas"])
        except:
            return []

        if not results or not results.get("ids"):
            return []

        # Sort by created_at
        memories = []
        for i, mem_id in enumerate(results["ids"]):
            meta = results["metadatas"][i]
            if memory_type and meta.get("memory_type") != memory_type:
                continue
            memories.append(
                {
                    "id": mem_id,
                    "content": results["documents"][i],
                    "metadata": meta,
                    "created_at": meta.get("created_at", ""),
                }
            )

        # Sort by date descending
        memories.sort(key=lambda x: x["created_at"], reverse=True)

        return memories[:limit]

    async def delete_memory(self, memory_id: str) -> bool:
        """Delete a specific memory."""
        try:
            self.memories.delete(ids=[memory_id])
            return True
        except:
            return False

    async def get_stats(self) -> Dict[str, Any]:
        """Get memory store statistics."""
        try:
            count = self.memories.count()
        except:
            count = 0

        return {
            "total_memories": count,
            "persist_directory": self.persist_directory,
            "context_window": self.context_window,
        }

    async def clear_all(self):
        """Clear all memories (use with caution)."""
        self.client.reset()


# Global instance
vector_store = VectorStore()
