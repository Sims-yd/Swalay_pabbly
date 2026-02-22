"""
RAG Configuration Module
========================

Provides configuration management for the RAG service.
Integrates with the main Backend settings while allowing
RAG-specific overrides via environment variables.

Environment Variables:
----------------------
- RAG_CHROMA_PATH: Path to ChromaDB storage directory
- RAG_COLLECTION_NAME: Name of the ChromaDB collection
- RAG_CHUNK_SIZE: Size of text chunks for ingestion
- RAG_CHUNK_OVERLAP: Overlap between consecutive chunks
- RAG_EMBEDDING_MODEL: Gemini embedding model name
- RAG_TOP_K: Number of chunks to retrieve for context
- RAG_GEMINI_MODEL: Gemini model for RAG responses
- GEMINI_API_KEY: Google Gemini API key (shared with main config)
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

# Import main backend settings
from config import settings


def _get_default_chroma_path() -> str:
    """Get default ChromaDB path relative to Backend directory."""
    backend_dir = Path(__file__).parent.parent.parent.parent
    return str(backend_dir / "data" / "chroma_db")


@dataclass
class RAGConfig:
    """
    Configuration container for RAG service components.
    
    Integrates with the main Backend settings while allowing
    RAG-specific configuration via environment variables or
    programmatic overrides.
    
    Attributes:
        chroma_path: Directory path for ChromaDB persistence.
                     Default: Backend/data/chroma_db or RAG_CHROMA_PATH env var.
        
        collection_name: Name of the ChromaDB collection.
                         Default: "knowledge_base" or RAG_COLLECTION_NAME env var.
        
        chunk_size: Maximum number of characters per text chunk.
                    Default: 500 or RAG_CHUNK_SIZE env var.
        
        chunk_overlap: Number of overlapping characters between chunks.
                       Default: 50 or RAG_CHUNK_OVERLAP env var.
        
        embedding_model: Gemini embedding model identifier.
                         Default: "text-embedding-004" or RAG_EMBEDDING_MODEL env var.
        
        top_k: Number of most relevant chunks to retrieve.
               Default: 5 or RAG_TOP_K env var.
        
        gemini_api_key: API key for Google Gemini.
                        Default: Uses main settings.GEMINI_API_KEY.
        
        gemini_model: Gemini model to use for generation.
                      Default: "gemini-1.5-flash" or RAG_GEMINI_MODEL env var.
    
    Example:
        >>> config = RAGConfig(
        ...     collection_name="my_docs",
        ...     chunk_size=1000
        ... )
        >>> print(config.chroma_path)
    """
    
    chroma_path: str = field(
        default_factory=lambda: os.getenv("RAG_CHROMA_PATH", _get_default_chroma_path())
    )
    collection_name: str = field(
        default_factory=lambda: os.getenv("RAG_COLLECTION_NAME", "knowledge_base")
    )
    chunk_size: int = field(
        default_factory=lambda: int(os.getenv("RAG_CHUNK_SIZE", "500"))
    )
    chunk_overlap: int = field(
        default_factory=lambda: int(os.getenv("RAG_CHUNK_OVERLAP", "50"))
    )
    embedding_model: str = field(
        default_factory=lambda: os.getenv("RAG_EMBEDDING_MODEL", "gemini-embedding-001")
    )
    top_k: int = field(
        default_factory=lambda: int(os.getenv("RAG_TOP_K", "5"))
    )
    gemini_api_key: Optional[str] = field(
        default_factory=lambda: os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
    )
    gemini_model: str = field(
        default_factory=lambda: os.getenv("RAG_GEMINI_MODEL", "gemini-2.0-flash")
    )
    
    def validate(self) -> None:
        """
        Validate configuration values.
        
        Raises:
            ValueError: If any configuration value is invalid.
        """
        if self.chunk_size <= 0:
            raise ValueError(f"chunk_size must be positive, got {self.chunk_size}")
        
        if self.chunk_overlap < 0:
            raise ValueError(f"chunk_overlap must be non-negative, got {self.chunk_overlap}")
        
        if self.chunk_overlap >= self.chunk_size:
            raise ValueError(
                f"chunk_overlap ({self.chunk_overlap}) must be less than "
                f"chunk_size ({self.chunk_size})"
            )
        
        if self.top_k <= 0:
            raise ValueError(f"top_k must be positive, got {self.top_k}")
        
        if not self.chroma_path:
            raise ValueError("chroma_path cannot be empty")
        
        if not self.collection_name:
            raise ValueError("collection_name cannot be empty")
        
        if not self.embedding_model:
            raise ValueError("embedding_model cannot be empty")
    
    def require_gemini_key(self) -> str:
        """
        Get Gemini API key, raising an error if not configured.
        
        Returns:
            The Gemini API key.
        
        Raises:
            ValueError: If gemini_api_key is not set.
        """
        if not self.gemini_api_key:
            raise ValueError(
                "Gemini API key is required. Set GEMINI_API_KEY environment "
                "variable or configure it in the main settings."
            )
        return self.gemini_api_key
    
    def __post_init__(self) -> None:
        """Validate configuration after initialization."""
        self.validate()
