"""
RAG Service Module
==================

Provides the runtime RAG (Retrieval Augmented Generation) service.

This module handles:
- Loading existing ChromaDB collections
- Converting queries to embeddings
- Retrieving relevant context chunks
- Constructing grounded prompts
- Generating responses via Gemini API

The service is stateless and uses dependency injection for configuration.

Example Usage:
--------------
    from app.services.rag import RAGService, RAGConfig
    
    config = RAGConfig()  # Uses GEMINI_API_KEY from main settings
    rag = RAGService(config)
    response = rag.query("What is the main topic of the documents?")
    print(response.answer)
"""

import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import chromadb
from chromadb.config import Settings
import google.genai as genai

from .config import RAGConfig

logger = logging.getLogger(__name__)


@dataclass
class RetrievedChunk:
    """
    Represents a retrieved document chunk with metadata.
    
    Attributes:
        text: The chunk text content.
        score: Similarity score (lower is more similar for cosine distance).
        metadata: Additional metadata about the chunk.
        chunk_id: Unique identifier for the chunk.
    """
    text: str
    score: float
    metadata: Dict[str, Any]
    chunk_id: str


@dataclass
class RAGResponse:
    """
    Response from the RAG service.
    
    Attributes:
        answer: The generated answer text.
        context_chunks: List of retrieved chunks used for context.
        query: The original query.
        has_context: Whether relevant context was found.
        model_used: The Gemini model used for generation.
    """
    answer: str
    context_chunks: List[RetrievedChunk]
    query: str
    has_context: bool
    model_used: str


class RAGService:
    """
    Runtime RAG service for query-response generation.
    
    Handles the full RAG pipeline:
    1. Query embedding generation
    2. Relevant chunk retrieval from ChromaDB
    3. Context-grounded prompt construction
    4. Response generation via Gemini API
    
    The service is stateless and can be safely used across requests.
    
    Attributes:
        config: RAG configuration object.
    
    Example:
        >>> config = RAGConfig()
        >>> rag = RAGService(config)
        >>> response = rag.query("What is Python?")
        >>> print(response.answer)
        >>> print(f"Used {len(response.context_chunks)} context chunks")
    """
    
    # Default system prompt template
    DEFAULT_SYSTEM_PROMPT = """You are a helpful assistant that answers questions based on the provided context.

INSTRUCTIONS:
- Answer the user's question using ONLY the information from the provided context.
- If the context doesn't contain enough information to answer the question, clearly state that.
- Be concise and direct in your responses.
- Do not make up information that is not in the context.
- If you quote from the context, indicate it clearly.

CONTEXT:
{context}

USER QUESTION: {query}

ANSWER:"""
    
    # Prompt when no context is available
    NO_CONTEXT_PROMPT = """You are a helpful assistant. The user asked a question, but no relevant context was found in the knowledge base.

Please respond politely explaining that you don't have specific information about their question in the available documents, and suggest they try rephrasing their question or ask about a different topic.

USER QUESTION: {query}

RESPONSE:"""
    
    def __init__(
        self,
        config: Optional[RAGConfig] = None,
        gemini_api_key: Optional[str] = None,
        system_prompt: Optional[str] = None
    ):
        """
        Initialize the RAG service.
        
        Args:
            config: RAG configuration. Uses defaults if not provided.
            gemini_api_key: Gemini API key. Overrides config if provided.
            system_prompt: Custom system prompt template. Must contain
                          {context} and {query} placeholders.
        
        Raises:
            ValueError: If Gemini API key is not provided.
        """
        self.config = config or RAGConfig()
        
        # Set API key (parameter overrides config)
        self._api_key = gemini_api_key or self.config.gemini_api_key
        if not self._api_key:
            raise ValueError(
                "Gemini API key is required. Set GEMINI_API_KEY environment "
                "variable or configure it in the main settings."
            )
        
        # Initialize Gemini client (new google-genai SDK)
        self._genai_client = genai.Client(api_key=self._api_key)
        
        # Set custom system prompt if provided
        self.system_prompt = system_prompt or self.DEFAULT_SYSTEM_PROMPT
        
        # Lazy-load ChromaDB collection
        self._collection = None
        
        logger.info(
            f"RAGService initialized: collection={self.config.collection_name}, "
            f"model={self.config.gemini_model}"
        )
    
    @property
    def collection(self):
        """Lazy-load the ChromaDB collection."""
        if self._collection is None:
            client = chromadb.PersistentClient(
                path=self.config.chroma_path,
                settings=Settings(anonymized_telemetry=False)
            )
            self._collection = client.get_or_create_collection(
                name=self.config.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
        return self._collection
    
    def _embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for a query using Gemini API.
        
        Args:
            query: The query text.
        
        Returns:
            Embedding vector as a list of floats.
        """
        result = self._genai_client.models.embed_content(
            model=self.config.embedding_model,
            contents=query
        )
        return result.embeddings[0].values
    
    def retrieve(
        self,
        query: str,
        top_k: Optional[int] = None,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[RetrievedChunk]:
        """
        Retrieve relevant chunks for a query.
        
        Args:
            query: The query text.
            top_k: Number of chunks to retrieve. Uses config default if not provided.
            filter_metadata: Optional metadata filter for ChromaDB where clause.
        
        Returns:
            List of RetrievedChunk objects ordered by relevance.
        
        Example:
            >>> chunks = rag.retrieve("What is machine learning?", top_k=3)
            >>> for chunk in chunks:
            ...     print(f"Score: {chunk.score:.4f}")
            ...     print(f"Text: {chunk.text[:100]}...")
        """
        k = top_k or self.config.top_k
        
        # Generate query embedding
        query_embedding = self._embed_query(query)
        
        # Build query parameters
        query_params = {
            "query_embeddings": [query_embedding],
            "n_results": k,
            "include": ["documents", "metadatas", "distances"]
        }
        
        if filter_metadata:
            query_params["where"] = filter_metadata
        
        # Execute query
        results = self.collection.query(**query_params)
        
        # Parse results into RetrievedChunk objects
        chunks = []
        if results["documents"] and results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                chunks.append(RetrievedChunk(
                    text=doc,
                    score=results["distances"][0][i] if results["distances"] else 0.0,
                    metadata=results["metadatas"][0][i] if results["metadatas"] else {},
                    chunk_id=results["ids"][0][i] if results["ids"] else ""
                ))
        
        logger.debug(f"Retrieved {len(chunks)} chunks for query: {query[:50]}...")
        return chunks
    
    def _build_prompt(
        self,
        query: str,
        chunks: List[RetrievedChunk]
    ) -> str:
        """
        Build the final prompt for Gemini.
        
        Args:
            query: The user's query.
            chunks: Retrieved context chunks.
        
        Returns:
            Formatted prompt string.
        """
        if not chunks:
            return self.NO_CONTEXT_PROMPT.format(query=query)
        
        # Format context from chunks
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            source = chunk.metadata.get("source", "Unknown")
            context_parts.append(f"[{i}] Source: {source}\n{chunk.text}")
        
        context = "\n\n".join(context_parts)
        
        return self.system_prompt.format(context=context, query=query)
    
    def _generate_response(self, prompt: str) -> str:
        """
        Generate a response using Gemini.
        
        Args:
            prompt: The formatted prompt.
        
        Returns:
            Generated response text.
        
        Raises:
            RuntimeError: If Gemini API call fails.
        """
        try:
            response = self._genai_client.models.generate_content(
                model=self.config.gemini_model,
                contents=prompt
            )
            return response.text
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise RuntimeError(f"Gemini API error: {e}") from e
    
    def query(
        self,
        query: str,
        top_k: Optional[int] = None,
        filter_metadata: Optional[Dict[str, Any]] = None,
        min_relevance_score: Optional[float] = None
    ) -> RAGResponse:
        """
        Execute a full RAG query pipeline.
        
        This method:
        1. Retrieves relevant chunks from the knowledge base
        2. Optionally filters by relevance score
        3. Constructs a grounded prompt
        4. Generates a response via Gemini
        
        Args:
            query: The user's question.
            top_k: Number of chunks to retrieve.
            filter_metadata: Optional metadata filter.
            min_relevance_score: Minimum similarity score threshold.
                                Chunks with higher scores (less similar)
                                are filtered out.
        
        Returns:
            RAGResponse containing the answer and metadata.
        
        Example:
            >>> response = rag.query("What is the capital of France?")
            >>> print(response.answer)
            >>> if response.has_context:
            ...     print(f"Based on {len(response.context_chunks)} sources")
        """
        logger.info(f"Processing RAG query: {query[:50]}...")
        
        # Retrieve relevant chunks
        chunks = self.retrieve(query, top_k=top_k, filter_metadata=filter_metadata)
        
        # Filter by relevance score if specified
        if min_relevance_score is not None:
            chunks = [c for c in chunks if c.score <= min_relevance_score]
        
        # Build prompt and generate response
        prompt = self._build_prompt(query, chunks)
        answer = self._generate_response(prompt)
        
        return RAGResponse(
            answer=answer,
            context_chunks=chunks,
            query=query,
            has_context=len(chunks) > 0,
            model_used=self.config.gemini_model
        )
    
    def query_with_custom_prompt(
        self,
        query: str,
        custom_prompt: str,
        top_k: Optional[int] = None
    ) -> RAGResponse:
        """
        Execute RAG query with a custom prompt template.
        
        Args:
            query: The user's question.
            custom_prompt: Prompt template with {context} and {query} placeholders.
            top_k: Number of chunks to retrieve.
        
        Returns:
            RAGResponse containing the answer and metadata.
        
        Example:
            >>> custom = "Context: {context}\\n\\nQuestion: {query}\\n\\nAnswer briefly:"
            >>> response = rag.query_with_custom_prompt("What is X?", custom)
        """
        # Temporarily swap prompt
        original_prompt = self.system_prompt
        self.system_prompt = custom_prompt
        
        try:
            return self.query(query, top_k=top_k)
        finally:
            self.system_prompt = original_prompt
    
    def get_collection_info(self) -> Dict[str, Any]:
        """
        Get information about the loaded collection.
        
        Returns:
            Dict with collection metadata.
        """
        return {
            "collection_name": self.config.collection_name,
            "document_count": self.collection.count(),
            "chroma_path": self.config.chroma_path,
            "embedding_model": self.config.embedding_model,
            "gemini_model": self.config.gemini_model
        }
    
    def health_check(self) -> Dict[str, Any]:
        """
        Perform a health check on all components.
        
        Returns:
            Dict with health status of each component.
        """
        health = {
            "chromadb": False,
            "embeddings": False,
            "gemini": False,
            "errors": []
        }
        
        # Check ChromaDB
        try:
            _ = self.collection.count()
            health["chromadb"] = True
        except Exception as e:
            health["errors"].append(f"ChromaDB: {str(e)}")
        
        # Check Gemini embeddings
        try:
            _ = self._embed_query("test")
            health["embeddings"] = True
        except Exception as e:
            health["errors"].append(f"Embeddings: {str(e)}")
        
        # Check Gemini generation
        try:
            response = self._genai_client.models.generate_content(
                model=self.config.gemini_model,
                contents="Say 'OK'"
            )
            if response.text:
                health["gemini"] = True
        except Exception as e:
            health["errors"].append(f"Gemini: {str(e)}")
        
        health["healthy"] = all([
            health["chromadb"],
            health["embeddings"],
            health["gemini"]
        ])
        
        return health
