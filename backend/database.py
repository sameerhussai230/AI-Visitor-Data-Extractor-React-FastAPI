# database.py

import os
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.sql import func
from datetime import datetime
import json # To store lists/dicts as JSON strings

# --- Database Configuration ---
DATABASE_URL = "sqlite:///./data_extractor.db" # File-based SQLite DB

# Create SQLAlchemy engine
# connect_args is needed for SQLite to allow multi-threaded access (FastAPI is async)
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# Create a session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for declarative models
Base = declarative_base()

# --- Database Models ---

class BusinessCard(Base):
    __tablename__ = "business_visting_cards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=True)
    title = Column(String, nullable=True)
    # Store lists as JSON strings in Text columns
    phone = Column(Text, nullable=True) # JSON string representation of list
    email = Column(Text, nullable=True) # JSON string representation of list
    website = Column(Text, nullable=True) # JSON string representation of list
    address = Column(Text, nullable=True)
    raw_json = Column(Text, nullable=False) # Store the validated JSON from LLM
    image_filename = Column(String, nullable=True) # Original filename if needed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class VisitorLogEntry(Base):
    __tablename__ = "visitor_log_book"

    id = Column(Integer, primary_key=True, index=True)
    # Use a batch ID (e.g., UUID string) to group entries from the same image upload
    batch_id = Column(String, index=True, nullable=False)
    date_str = Column(String, nullable=True) # Store date as extracted string
    visitor_name = Column(String, index=True, nullable=True)
    address = Column(String, nullable=True)
    time_in = Column(String, nullable=True)
    time_out = Column(String, nullable=True)
    raw_json_entry = Column(Text, nullable=False) # Store JSON for this specific entry
    image_filename = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# --- Database Utility Functions ---

def create_db_and_tables():
    """Creates the database file and tables if they don't exist."""
    print("Attempting to create database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables checked/created successfully.")
    except Exception as e:
        print(f"Error creating database tables: {e}")

def get_db():
    """Dependency function to get a database session for FastAPI endpoints."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Data Insertion Functions ---

def add_business_card(db: SessionLocal, card_data: dict, filename: str | None = None):
    """Adds a validated business card record to the database."""
    try:
        db_card = BusinessCard(
            name=card_data.get("name"),
            title=card_data.get("title"),
            # Convert lists to JSON strings for storage
            phone=json.dumps(card_data.get("phone")) if card_data.get("phone") is not None else None,
            email=json.dumps(card_data.get("email")) if card_data.get("email") is not None else None,
            website=json.dumps(card_data.get("website")) if card_data.get("website") is not None else None,
            address=card_data.get("address"),
            raw_json=json.dumps(card_data), # Store the whole validated dict
            image_filename=filename
        )
        db.add(db_card)
        db.commit()
        db.refresh(db_card)
        print(f"Successfully added Business Card ID: {db_card.id}")
        return db_card
    except Exception as e:
        db.rollback()
        print(f"Error adding business card to DB: {e}")
        raise # Re-raise the exception to be caught by the endpoint handler

def add_visitor_log_entries(db: SessionLocal, log_entries: list[dict], batch_id: str, filename: str | None = None):
    """Adds multiple validated visitor log entries to the database for a single batch."""
    added_ids = []
    try:
        for entry_data in log_entries:
            db_entry = VisitorLogEntry(
                batch_id=batch_id,
                date_str=entry_data.get("date"), # Keep consistent naming
                visitor_name=entry_data.get("visitor_name"),
                address=entry_data.get("address"),
                time_in=entry_data.get("time_in"),
                time_out=entry_data.get("time_out"),
                raw_json_entry=json.dumps(entry_data), # Store JSON for this entry
                image_filename=filename
            )
            db.add(db_entry)
        db.commit()
        # Note: Refreshing multiple objects added in a loop isn't straightforward
        # without querying them back. We'll just return the count or batch_id.
        print(f"Successfully added {len(log_entries)} Visitor Log Entries for Batch ID: {batch_id}")
        # Query back the added entries to get their IDs if needed (optional)
        # added_records = db.query(VisitorLogEntry).filter(VisitorLogEntry.batch_id == batch_id).all()
        # added_ids = [record.id for record in added_records]
        return {"batch_id": batch_id, "entries_added": len(log_entries)} #, "ids": added_ids}
    except Exception as e:
        db.rollback()
        print(f"Error adding visitor log entries to DB: {e}")
        raise # Re-raise the exception