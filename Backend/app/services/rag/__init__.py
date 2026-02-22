"""
RAG Service Package
===================

A modular Retrieval Augmented Generation (RAG) service for the Backend.

Components:
-----------
- RAGConfig: Configuration management for RAG
- KnowledgeBaseBuilder: Ingests documents into ChromaDB
- RAGService: Handles runtime query-response flow

Usage:
------
    from app.services.rag import KnowledgeBaseBuilder, RAGService, RAGConfig

    # Build knowledge base
    config = RAGConfig()
    builder = KnowledgeBaseBuilder(config)
    builder.ingest_documents(["doc1.txt", "doc2.txt"])

    # Query at runtime
    rag = RAGService(config)
    response = rag.query("What is the main topic?")
"""

from .config import RAGConfig
from .knowledge_base_builder import KnowledgeBaseBuilder, TextChunker
from .service import RAGService, RAGResponse, RetrievedChunk

__all__ = [
    "RAGConfig",
    "KnowledgeBaseBuilder",
    "TextChunker",
    "RAGService",
    "RAGResponse",
    "RetrievedChunk",
]
