"""
Knowledge Base Builder
======================

Handles document ingestion into ChromaDB for RAG retrieval.

This module is responsible for:
- Reading documents from files or accepting raw text
- Chunking text into manageable pieces
- Generating embeddings using Gemini API
- Storing embeddings in ChromaDB with deduplication

This module can be used independently for batch ingestion tasks.

Example Usage:
--------------
    from app.services.rag import KnowledgeBaseBuilder, RAGConfig
    
    config = RAGConfig(chunk_size=500)
    builder = KnowledgeBaseBuilder(config)
    
    # Ingest from files
    builder.ingest_files(["doc1.txt", "doc2.md"])
    
    # Ingest raw text
    builder.ingest_texts([
        {"id": "doc1", "text": "Your document content here..."}
    ])
"""

import hashlib
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import chromadb
from chromadb.config import Settings
import google.genai as genai

# Optional: docx support
try:
    from docx import Document as DocxDocument
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

from .config import RAGConfig

logger = logging.getLogger(__name__)


class TextChunker:
    """
    Splits text into overlapping chunks for embedding.
    
    Uses a sliding window approach with configurable size and overlap.
    Attempts to split at sentence boundaries when possible.
    
    Attributes:
        chunk_size: Maximum characters per chunk.
        chunk_overlap: Characters to overlap between consecutive chunks.
    """
    
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        """
        Initialize the text chunker.
        
        Args:
            chunk_size: Maximum number of characters per chunk.
            chunk_overlap: Number of overlapping characters between chunks.
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        # Pattern to split on sentence boundaries
        self._sentence_pattern = re.compile(r'(?<=[.!?])\s+')
    
    def chunk(self, text: str) -> List[str]:
        """
        Split text into overlapping chunks.
        
        Args:
            text: The text to split.
        
        Returns:
            List of text chunks.
        """
        if not text or not text.strip():
            return []
        
        # Normalize whitespace
        text = ' '.join(text.split())
        
        if len(text) <= self.chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            # Determine chunk end position
            end = start + self.chunk_size
            
            if end >= len(text):
                # Last chunk - take everything remaining
                chunks.append(text[start:].strip())
                break
            
            # Try to find a sentence boundary near the end
            chunk_text = text[start:end]
            last_sentence_end = self._find_last_sentence_boundary(chunk_text)
            
            if last_sentence_end > self.chunk_size // 2:
                # Found a good sentence boundary
                end = start + last_sentence_end
            else:
                # No good sentence boundary - find last space
                last_space = chunk_text.rfind(' ')
                if last_space > self.chunk_size // 2:
                    end = start + last_space
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # Move start position with overlap
            prev_start = start
            start = end - self.chunk_overlap
            if start <= prev_start:
                start = end  # Prevent infinite loop
        
        return chunks
    
    def _find_last_sentence_boundary(self, text: str) -> int:
        """
        Find the position of the last sentence boundary in text.
        
        Args:
            text: Text to search.
        
        Returns:
            Position of last sentence boundary, or -1 if not found.
        """
        matches = list(self._sentence_pattern.finditer(text))
        if matches:
            return matches[-1].end()
        return -1


class KnowledgeBaseBuilder:
    """
    Builds and updates the ChromaDB knowledge base.
    
    Handles document ingestion with automatic chunking, embedding generation,
    and deduplication. Supports both file-based and direct text input.
    
    Attributes:
        config: RAG configuration object.
        chunker: Text chunking instance.
        genai_client: Gemini client for embeddings.
        client: ChromaDB client.
        collection: ChromaDB collection.
    
    Example:
        >>> config = RAGConfig(collection_name="docs")
        >>> builder = KnowledgeBaseBuilder(config)
        >>> builder.ingest_files(["readme.txt"])
        >>> stats = builder.get_stats()
        >>> print(f"Total documents: {stats['total_documents']}")
    """
    
    def __init__(self, config: Optional[RAGConfig] = None):
        """
        Initialize the knowledge base builder.
        
        Args:
            config: RAG configuration. Uses defaults if not provided.
        """
        self.config = config or RAGConfig()
        self.chunker = TextChunker(
            chunk_size=self.config.chunk_size,
            chunk_overlap=self.config.chunk_overlap
        )
        
        # Initialize Gemini client for embeddings
        if not self.config.gemini_api_key:
            raise ValueError(
                "Gemini API key is required. Set GEMINI_API_KEY environment "
                "variable or configure it in the main settings."
            )
        self._genai_client = genai.Client(api_key=self.config.gemini_api_key)
        
        # Initialize ChromaDB
        self._init_chromadb()
        
        logger.info(
            f"KnowledgeBaseBuilder initialized: collection={self.config.collection_name}, "
            f"path={self.config.chroma_path}"
        )
    
    def _generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings using Gemini API.
        
        Args:
            texts: List of text strings to embed.
        
        Returns:
            List of embedding vectors.
        """
        embeddings = []
        # Process in batches (Gemini has limits)
        batch_size = 100
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            for text in batch:
                result = self._genai_client.models.embed_content(
                    model=self.config.embedding_model,
                    contents=text
                )
                embeddings.append(result.embeddings[0].values)
        return embeddings
    
    def _init_chromadb(self) -> None:
        """Initialize ChromaDB client and collection."""
        # Ensure storage directory exists
        os.makedirs(self.config.chroma_path, exist_ok=True)
        
        # Initialize persistent client
        self.client = chromadb.PersistentClient(
            path=self.config.chroma_path,
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=self.config.collection_name,
            metadata={"hnsw:space": "cosine"}
        )
    
    def _read_docx(self, file_path: Path) -> str:
        """
        Read text content from a .docx file.
        
        Args:
            file_path: Path to the .docx file.
        
        Returns:
            Extracted text content.
        
        Raises:
            ValueError: If python-docx is not installed or file cannot be read.
        """
        if not DOCX_AVAILABLE:
            raise ValueError(
                "python-docx is required to read .docx files. "
                "Install with: pip install python-docx"
            )
        
        try:
            doc = DocxDocument(str(file_path))
            paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
            return "\n\n".join(paragraphs)
        except Exception as e:
            raise ValueError(f"Could not read .docx file {file_path}: {e}")
    
    def _generate_chunk_id(self, text: str, source: str) -> str:
        """
        Generate a unique ID for a text chunk.
        
        Uses content hash to enable deduplication.
        
        Args:
            text: The chunk text.
            source: Source identifier (file path or document ID).
        
        Returns:
            Unique hash-based identifier.
        """
        content = f"{source}:{text}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _chunk_exists(self, chunk_id: str) -> bool:
        """
        Check if a chunk already exists in the collection.
        
        Args:
            chunk_id: The chunk identifier.
        
        Returns:
            True if the chunk exists, False otherwise.
        """
        try:
            result = self.collection.get(ids=[chunk_id])
            return len(result['ids']) > 0
        except Exception:
            return False
    
    def ingest_texts(
        self,
        documents: List[Dict[str, str]],
        skip_duplicates: bool = True
    ) -> Dict[str, int]:
        """
        Ingest raw text documents into the knowledge base.
        
        Args:
            documents: List of dicts with 'id' and 'text' keys.
                       Optional 'metadata' key for additional metadata.
            skip_duplicates: If True, skip chunks that already exist.
        
        Returns:
            Dict with 'added', 'skipped', and 'total_chunks' counts.
        
        Example:
            >>> builder.ingest_texts([
            ...     {"id": "doc1", "text": "Content here..."},
            ...     {"id": "doc2", "text": "More content...", "metadata": {"author": "John"}}
            ... ])
        """
        stats = {"added": 0, "skipped": 0, "total_chunks": 0}
        
        all_chunks = []
        all_ids = []
        all_metadatas = []
        
        for doc in documents:
            doc_id = doc.get("id", "unknown")
            text = doc.get("text", "")
            base_metadata = doc.get("metadata", {})
            
            if not text.strip():
                continue
            
            # Chunk the document
            chunks = self.chunker.chunk(text)
            stats["total_chunks"] += len(chunks)
            
            for i, chunk in enumerate(chunks):
                chunk_id = self._generate_chunk_id(chunk, doc_id)
                
                if skip_duplicates and self._chunk_exists(chunk_id):
                    stats["skipped"] += 1
                    continue
                
                # Prepare metadata
                metadata = {
                    **base_metadata,
                    "source": doc_id,
                    "chunk_index": i,
                    "total_chunks": len(chunks)
                }
                
                all_chunks.append(chunk)
                all_ids.append(chunk_id)
                all_metadatas.append(metadata)
        
        # Batch add to collection
        if all_chunks:
            logger.info(f"Generating embeddings for {len(all_chunks)} chunks using Gemini...")
            embeddings = self._generate_embeddings(all_chunks)
            
            self.collection.add(
                documents=all_chunks,
                embeddings=embeddings,
                ids=all_ids,
                metadatas=all_metadatas
            )
            stats["added"] = len(all_chunks)
            logger.info(f"Added {stats['added']} chunks to collection")
        
        return stats
    
    def ingest_files(
        self,
        file_paths: List[Union[str, Path]],
        skip_duplicates: bool = True
    ) -> Dict[str, int]:
        """
        Ingest documents from file paths.
        
        Supports plain text files (.txt, .md, .rst) and Word documents (.docx).
        
        Args:
            file_paths: List of file paths to ingest.
            skip_duplicates: If True, skip chunks that already exist.
        
        Returns:
            Dict with ingestion statistics.
        
        Raises:
            FileNotFoundError: If a file doesn't exist.
            ValueError: If a file cannot be read.
        
        Example:
            >>> builder.ingest_files(["docs/readme.txt", "docs/guide.docx"])
        """
        documents = []
        
        for file_path in file_paths:
            path = Path(file_path)
            
            if not path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # Handle .docx files
            if path.suffix.lower() == ".docx":
                text = self._read_docx(path)
            else:
                try:
                    text = path.read_text(encoding="utf-8")
                except UnicodeDecodeError:
                    # Try with latin-1 as fallback
                    text = path.read_text(encoding="latin-1")
                except Exception as e:
                    raise ValueError(f"Could not read file {file_path}: {e}")
            
            documents.append({
                "id": str(path.absolute()),
                "text": text,
                "metadata": {
                    "filename": path.name,
                    "extension": path.suffix
                }
            })
        
        logger.info(f"Ingesting {len(documents)} files...")
        return self.ingest_texts(documents, skip_duplicates=skip_duplicates)
    
    def ingest_directory(
        self,
        directory: Union[str, Path],
        extensions: Optional[List[str]] = None,
        recursive: bool = True,
        skip_duplicates: bool = True
    ) -> Dict[str, int]:
        """
        Ingest all matching files from a directory.
        
        Args:
            directory: Path to the directory.
            extensions: List of file extensions to include (e.g., [".txt", ".md"]).
                       If None, includes common text file extensions.
            recursive: If True, search subdirectories.
            skip_duplicates: If True, skip chunks that already exist.
        
        Returns:
            Dict with ingestion statistics.
        
        Example:
            >>> builder.ingest_directory("./docs", extensions=[".md", ".txt"])
        """
        if extensions is None:
            extensions = [".txt", ".md", ".rst", ".text", ".docx"]
        
        # Normalize extensions
        extensions = [ext if ext.startswith(".") else f".{ext}" for ext in extensions]
        
        directory = Path(directory)
        if not directory.is_dir():
            raise NotADirectoryError(f"Not a directory: {directory}")
        
        # Find matching files
        pattern = "**/*" if recursive else "*"
        file_paths = [
            f for f in directory.glob(pattern)
            if f.is_file() and f.suffix.lower() in extensions
        ]
        
        if not file_paths:
            logger.warning(f"No matching files found in {directory}")
            return {"added": 0, "skipped": 0, "total_chunks": 0}
        
        logger.info(f"Found {len(file_paths)} files to ingest from {directory}")
        return self.ingest_files(file_paths, skip_duplicates=skip_duplicates)
    
    def clear_collection(self) -> None:
        """
        Delete all documents from the collection.
        
        Warning: This operation is irreversible.
        """
        logger.warning(f"Clearing collection: {self.config.collection_name}")
        # Delete and recreate the collection
        self.client.delete_collection(self.config.collection_name)
        self.collection = self.client.get_or_create_collection(
            name=self.config.collection_name,
            metadata={"hnsw:space": "cosine"}
        )
        logger.info("Collection cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the knowledge base.
        
        Returns:
            Dict containing collection statistics.
        """
        return {
            "collection_name": self.config.collection_name,
            "total_documents": self.collection.count(),
            "chroma_path": self.config.chroma_path,
            "embedding_model": self.config.embedding_model,
            "chunk_size": self.config.chunk_size,
            "chunk_overlap": self.config.chunk_overlap
        }
