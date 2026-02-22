#!/usr/bin/env python3
"""
RAG Service Test Script
=======================

This script demonstrates how to use the RAG service for:
1. Ingesting documents into the knowledge base
2. Querying the knowledge base

Usage:
------
    # From Backend directory:
    python scripts/test_rag.py ingest    # Ingest documents
    python scripts/test_rag.py query     # Interactive query mode
    python scripts/test_rag.py stats     # Show knowledge base stats
    python scripts/test_rag.py health    # Health check
    python scripts/test_rag.py all       # Run full demo

Prerequisites:
--------------
    - Set GEMINI_API_KEY in .env or environment
    - Install dependencies: pip install -r requirements.txt
"""

import sys
import os

# Add Backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pathlib import Path


def test_ingestion():
    """Test document ingestion into the knowledge base."""
    print("\n" + "=" * 60)
    print("STEP 1: Knowledge Base Ingestion")
    print("=" * 60)
    
    from app.services.rag import KnowledgeBaseBuilder, RAGConfig
    
    # Initialize with default config
    config = RAGConfig()
    print(f"\nConfiguration:")
    print(f"  ChromaDB Path: {config.chroma_path}")
    print(f"  Collection: {config.collection_name}")
    print(f"  Chunk Size: {config.chunk_size}")
    print(f"  Embedding Model: {config.embedding_model}")
    
    builder = KnowledgeBaseBuilder(config)
    
    # Path to knowledge base documents
    kb_path = Path(__file__).parent.parent / "data" / "knowledge_base"
    
    if not kb_path.exists():
        print(f"\n[!] Knowledge base directory not found: {kb_path}")
        print("    Creating directory...")
        kb_path.mkdir(parents=True, exist_ok=True)
        print("    Add .txt, .md, or .docx files to this directory and run again.")
        return
    
    # Count files
    files = list(kb_path.glob("**/*.md")) + list(kb_path.glob("**/*.txt")) + list(kb_path.glob("**/*.docx"))
    print(f"\nFound {len(files)} document(s) in {kb_path}")
    
    if not files:
        print("[!] No documents found. Add .txt, .md, or .docx files to the knowledge_base directory.")
        return
    
    for f in files:
        print(f"  - {f.name}")
    
    # Ingest
    print("\nIngesting documents...")
    stats = builder.ingest_directory(kb_path, extensions=[".md", ".txt", ".docx"])
    
    print(f"\nIngestion Results:")
    print(f"  Added: {stats['added']} chunks")
    print(f"  Skipped (duplicates): {stats['skipped']} chunks")
    print(f"  Total chunks processed: {stats['total_chunks']}")
    
    # Show final stats
    final_stats = builder.get_stats()
    print(f"\nKnowledge Base Stats:")
    print(f"  Total documents in collection: {final_stats['total_documents']}")


def test_query(query: str = None):
    """Test querying the knowledge base."""
    print("\n" + "=" * 60)
    print("STEP 2: RAG Query")
    print("=" * 60)
    
    from app.services.rag import RAGService, RAGConfig
    
    config = RAGConfig()
    
    try:
        rag = RAGService(config)
    except ValueError as e:
        print(f"\n[!] Error: {e}")
        print("    Set GEMINI_API_KEY in your .env file or environment.")
        return
    
    # Show collection info
    info = rag.get_collection_info()
    print(f"\nCollection Info:")
    print(f"  Documents: {info['document_count']}")
    print(f"  Gemini Model: {info['gemini_model']}")
    
    if info['document_count'] == 0:
        print("\n[!] No documents in knowledge base. Run ingestion first.")
        return
    
    # Use provided query or default
    if not query:
        query = "What are message templates in WhatsApp Business API?"
    
    print(f"\nQuery: {query}")
    print("-" * 40)
    
    # Execute query
    response = rag.query(query, top_k=3)
    
    print(f"\nAnswer:\n{response.answer}")
    
    print(f"\n--- Context Used ({len(response.context_chunks)} chunks) ---")
    for i, chunk in enumerate(response.context_chunks, 1):
        source = chunk.metadata.get("filename", "Unknown")
        print(f"\n[{i}] Source: {source} (score: {chunk.score:.4f})")
        print(f"    {chunk.text[:150]}...")


def interactive_query():
    """Interactive query mode."""
    print("\n" + "=" * 60)
    print("Interactive Query Mode")
    print("=" * 60)
    print("Type your questions (or 'quit' to exit)\n")
    
    from app.services.rag import RAGService, RAGConfig
    
    try:
        rag = RAGService(RAGConfig())
    except ValueError as e:
        print(f"[!] Error: {e}")
        return
    
    while True:
        try:
            query = input("\nYou: ").strip()
            if query.lower() in ('quit', 'exit', 'q'):
                print("Goodbye!")
                break
            if not query:
                continue
            
            response = rag.query(query)
            print(f"\nAssistant: {response.answer}")
            
            if response.context_chunks:
                print(f"\n  (Based on {len(response.context_chunks)} source(s))")
        except KeyboardInterrupt:
            print("\nGoodbye!")
            break


def show_stats():
    """Show knowledge base statistics."""
    print("\n" + "=" * 60)
    print("Knowledge Base Statistics")
    print("=" * 60)
    
    from app.services.rag import KnowledgeBaseBuilder, RAGConfig
    
    builder = KnowledgeBaseBuilder(RAGConfig())
    stats = builder.get_stats()
    
    print(f"\n  Collection Name: {stats['collection_name']}")
    print(f"  Total Documents: {stats['total_documents']}")
    print(f"  ChromaDB Path: {stats['chroma_path']}")
    print(f"  Embedding Model: {stats['embedding_model']}")
    print(f"  Chunk Size: {stats['chunk_size']}")
    print(f"  Chunk Overlap: {stats['chunk_overlap']}")


def health_check():
    """Run health check on RAG components."""
    print("\n" + "=" * 60)
    print("RAG Service Health Check")
    print("=" * 60)
    
    from app.services.rag import RAGService, RAGConfig
    
    try:
        rag = RAGService(RAGConfig())
    except ValueError as e:
        print(f"\n[!] Configuration Error: {e}")
        return
    
    print("\nChecking components...")
    health = rag.health_check()
    
    print(f"\n  ChromaDB:   {'✓ OK' if health['chromadb'] else '✗ FAIL'}")
    print(f"  Embeddings: {'✓ OK' if health['embeddings'] else '✗ FAIL'}")
    print(f"  Gemini:     {'✓ OK' if health['gemini'] else '✗ FAIL'}")
    
    if health['errors']:
        print(f"\nErrors:")
        for error in health['errors']:
            print(f"  - {error}")
    
    print(f"\nOverall: {'✓ Healthy' if health['healthy'] else '✗ Unhealthy'}")


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nCommands: ingest, query, interactive, stats, health, all")
        return
    
    command = sys.argv[1].lower()
    
    if command == "ingest":
        test_ingestion()
    elif command == "query":
        query = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else None
        test_query(query)
    elif command == "interactive":
        interactive_query()
    elif command == "stats":
        show_stats()
    elif command == "health":
        health_check()
    elif command == "all":
        test_ingestion()
        test_query()
        health_check()
    else:
        print(f"Unknown command: {command}")
        print("Commands: ingest, query, interactive, stats, health, all")


if __name__ == "__main__":
    main()
