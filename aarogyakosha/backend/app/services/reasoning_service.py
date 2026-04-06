"""
AarogyaKosha - Memory Reasoning Service
Uses Ollama for contextual reasoning with thinking mode
"""

import asyncio
import os
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import json

try:
    import httpx
except ImportError:
    httpx = None


class ReasoningService:
    """Uses Ollama for reasoning with thinking mode."""

    def __init__(self, model: str = "llama3.1:8b"):
        self.model = model
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.timeout = 120  # seconds

    async def think_and_respond(
        self,
        query: str,
        context: List[Dict[str, Any]],
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Use thinking mode to reason about context before responding."""

        if not httpx:
            raise ImportError("httpx not installed")

        # Build context from retrieved memories
        context_text = "\n\n".join(
            [
                f"[Memory {i + 1}]: {mem.get('content', '')}"
                for i, mem in enumerate(context)
            ]
        )

        # Build the prompt with thinking
        prompt = f"""Given the user's query and relevant memories from the knowledge base, reason step by step to provide the best response.

Query: {query}

Relevant Memories:
{context_text}

First, think about how these memories relate to the query and what information is relevant. Then provide your response.

<|think|>
Let me analyze the query and relevant memories:

"""

        # Prepare messages
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        # Call Ollama API
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False,
                        "options": {
                            "temperature": 0.7,
                            "top_p": 0.9,
                        },
                    },
                )

                if response.status_code == 200:
                    result = response.json()
                    return {
                        "response": result["message"]["content"],
                        "model": self.model,
                        "context_used": len(context),
                        "reasoning": "completed",
                    }
                else:
                    return {
                        "response": "Unable to generate response",
                        "error": response.text,
                        "model": self.model,
                    }
        except Exception as e:
            return {
                "response": f"Error: {str(e)}",
                "error": str(e),
                "model": self.model,
            }

    async def analyze_image(
        self, image_description: str, query: str, context: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze an image in context of user history."""

        context_text = "\n\n".join(
            [
                f"[Memory {i + 1}]: {mem.get('content', '')}"
                for i, mem in enumerate(context[:5])  # Limit context
            ]
        )

        prompt = f"""The user has shared an image with the following description:
{image_description}

They're asking: {query}

Context from your memory:
{context_text}

Provide a helpful analysis considering the user's history and the image content.

<|think|>
Analyzing the image in context of user history:

"""

        return await self.think_and_respond(
            query,
            context,
            system_prompt="You are a helpful AI assistant that analyzes medical images and documents in the context of user's health history.",
        )

    async def simple_generate(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> str:
        """Simple text generation without context."""

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={"model": self.model, "messages": messages, "stream": False},
                )

                if response.status_code == 200:
                    result = response.json()
                    return result["message"]["content"]
                else:
                    return f"Error: {response.text}"
        except Exception as e:
            return f"Error: {str(e)}"


reasoning_service = ReasoningService()
