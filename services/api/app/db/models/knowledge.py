from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from datetime import datetime
from app.db.session import Base
class KnowledgeSource(Base):
    __tablename__="knowledge_sources"
    id=Column(Integer, primary_key=True, autoincrement=True)
    type=Column(String) # pdf, web, qa
    title=Column(String)
    uri=Column(Text)
    created_at=Column(DateTime, default=datetime.utcnow)
class DocumentChunk(Base):
    __tablename__="document_chunks"
    id=Column(Integer, primary_key=True, autoincrement=True)
    source_id=Column(Integer)
    chunk_index=Column(Integer)
    content=Column(Text)
    embedding_id=Column(String, nullable=True)
    created_at=Column(DateTime, default=datetime.utcnow)
