# backend/main.py

import os
import base64
import json
import uuid
from typing import Dict, List, Any, Union # Added Union

from fastapi import FastAPI, File, UploadFile, HTTPException, status, Depends, Body
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware # Import CORS
from groq import Groq, GroqError
from dotenv import load_dotenv
import mimetypes
from sqlalchemy.orm import Session
from pydantic import BaseModel # For request body validation

# Import database setup, models, and functions
import database
from database import SessionLocal, engine, get_db, add_business_card, add_visitor_log_entries

# Import validation functions
from validation import validate_business_card_data, validate_visitor_register_data

# --- Initial Setup ---
database.create_db_and_tables()
load_dotenv()

# --- Configuration ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL_NAME = "meta-llama/llama-4-scout-17b-16e-instruct"
MAX_RETRIES = 3


# --- FastAPI App Initialization ---
app = FastAPI(
    title="Image Data Extractor API with DB Storage",
    description="Extracts info from images, allows user validation via frontend, and stores data.",
    version="1.3.0" # Version bump
)

# --- CORS Middleware ---
# Allows requests from your React frontend (adjust origins if needed)
origins = [
    "http://localhost:3000", # Default React dev server port
    "http://localhost:3001", # Another common port
    # Add other origins if your frontend is served elsewhere
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)


# --- Groq Client Initialization ---
# (Keep the existing Groq client initialization logic)
if not GROQ_API_KEY:
    print("Error: GROQ_API_KEY environment variable not set.")
    groq_client = None
else:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        print(f"Error initializing Groq client: {e}")
        groq_client = None

# --- Helper Function ---
def encode_image_to_base64(image_bytes: bytes) -> str:
    return base64.b64encode(image_bytes).decode('utf-8')


# --- Shared Extraction & Validation Logic ---
async def perform_extraction_and_validation(
    image_bytes: bytes,
    image_mime_type: str,
    base64_image: str
) -> Dict[str, Any]:
    """
    Handles the core logic of calling Groq, parsing, validating, and retrying.
    Returns the validated data structure or raises HTTPException on failure.
    """
    if not groq_client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Groq client unavailable.")

    base_prompt_text = """
    Analyze the provided image. First, determine if it is primarily a 'business_card' or a 'visitor_register'.
    Then, extract the relevant information based on the identified type and structure the output STRICTLY as a JSON object.

    1. If 'business_card': Format as {"type": "business_card", "data": {"name": "...", "title": "...", "phone": [...], "email": [...], "website": [...], "address": "..."}}
    2. If 'visitor_register': Format as {"type": "visitor_register", "data": [{"date": "...", "visitor_name": "...", "address": "...", "time_in": "...", "time_out": "..."}, ...]}
    3. If neither: Format as {"type": "unknown", "data": null}

    Use null for missing fields. Use lists for phone/email/website. Ensure the entire response is ONLY the JSON object.
    """

    last_error = None
    extracted_data = None

    for attempt in range(MAX_RETRIES):
        print(f"--- Extraction Attempt {attempt + 1} of {MAX_RETRIES} ---")
        current_prompt = base_prompt_text
        if last_error:
            print(f"Retrying due to validation error: {last_error}")
            reflection_prompt = f"""
            The previous attempt failed validation: '{last_error}'.
            Re-analyze the image and STRICTLY follow the required JSON structure:
            Business Card: {{"type": "business_card", "data": {{"name": string|null, "title": string|null, "phone": list[string]|null, "email": list[string]|null, "website": list[string]|null, "address": string|null}}}}
            Visitor Register: {{"type": "visitor_register", "data": list[{{"date": string|null, "visitor_name": string|null, "address": string|null, "time_in": string|null, "time_out": string|null}}]}}
            Unknown: {{"type": "unknown", "data": null}}
            Respond ONLY with the single, valid JSON object.
            """
            current_prompt = reflection_prompt

        try:
            completion = groq_client.chat.completions.create(
                model=GROQ_MODEL_NAME,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": current_prompt},
                            {"type": "image_url", "image_url": {"url": f"data:{image_mime_type};base64,{base64_image}"}},
                        ],
                    }
                ],
                response_format={"type": "json_object"},
                max_tokens=4096,
                temperature=0.1 + (attempt * 0.05),
            )
            response_content = completion.choices[0].message.content
            print(f"Raw LLM response (Attempt {attempt + 1}): {response_content}")

            try:
                llm_output = json.loads(response_content)
                if not isinstance(llm_output, dict) or "type" not in llm_output or "data" not in llm_output:
                    last_error = "LLM response missing 'type' or 'data' keys."
                    continue

                doc_type = llm_output.get("type")
                data_payload = llm_output.get("data")
                is_valid = False
                validation_error = None

                if doc_type == "business_card":
                    if isinstance(data_payload, dict): is_valid, validation_error = validate_business_card_data(data_payload)
                    else: validation_error = "Expected 'data' dictionary for business_card."
                elif doc_type == "visitor_register":
                    if isinstance(data_payload, list): is_valid, validation_error = validate_visitor_register_data(data_payload)
                    else: validation_error = "Expected 'data' list for visitor_register."
                elif doc_type == "unknown":
                    is_valid = True
                else:
                    validation_error = f"Unrecognized document type '{doc_type}'."

                if is_valid:
                    print("Extraction and validation successful.")
                    extracted_data = llm_output
                    last_error = None
                    break
                else:
                    last_error = validation_error
                    print(f"Validation failed: {last_error}")

            except json.JSONDecodeError:
                last_error = "LLM response was not valid JSON."
                print(f"JSON Decode Error (Attempt {attempt + 1}).")
                continue

        except GroqError as e:
            print(f"Groq API Error (Attempt {attempt + 1}): {e}")
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Groq API error: {e}")
        except Exception as e:
            print(f"Unexpected Error during LLM call/parsing (Attempt {attempt + 1}): {e}")
            last_error = f"Unexpected error: {e}"

    if last_error or extracted_data is None:
        detail = f"Failed to extract valid data after {MAX_RETRIES} attempts."
        if last_error: detail += f" Last error: {last_error}"
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)

    return extracted_data # Return the successfully validated data


# --- NEW Endpoint: Extract & Validate Only ---
@app.post("/extract_validate/",
          summary="Extract & Validate Image Info (No DB Storage)",
          description="Uploads image, extracts/validates data using LLM (with retries), returns validated JSON for frontend review.",
          response_description="JSON containing 'type' and 'data' if successful.")
async def extract_and_validate_only(
    file: UploadFile = File(..., description="Image file (JPG, PNG, WEBP)")
):
    # --- Input Validation ---
    allowed_mime_types = ["image/jpeg", "image/png", "image/webp"]
    file_mime_type, _ = mimetypes.guess_type(file.filename)
    actual_mime_type = file.content_type or file_mime_type
    if actual_mime_type not in allowed_mime_types:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Unsupported file type.")

    # --- Image Processing ---
    try:
        image_bytes = await file.read()
        base64_image = encode_image_to_base64(image_bytes)
        image_mime_type = actual_mime_type
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error reading image: {e}")

    # --- Call shared extraction logic ---
    validated_data = await perform_extraction_and_validation(
        image_bytes=image_bytes,
        image_mime_type=image_mime_type,
        base64_image=base64_image
    )

    # Return the validated data without storing
    return JSONResponse(status_code=status.HTTP_200_OK, content=validated_data)


# --- Pydantic Model for Store Request Body ---
class StoreDataRequest(BaseModel):
    type: str
    data: Union[Dict[str, Any], List[Dict[str, Any]], None] # Allow dict, list or null
    # Add filename if you want to store it from frontend confirmation step
    # filename: Optional[str] = None

# backend/main.py (ADD THESE NEW ENDPOINTS)

from sqlalchemy import func, cast, Date # Import Date type for casting
from datetime import date, datetime # Import date for type hinting

# --- NEW Endpoint: Get Business Cards ---
@app.get("/get_business_cards/",
         summary="Get Stored Business Cards",
         description="Retrieves all stored business card records, optionally filtered by creation date.",
         response_description="A list of business card records.")
async def get_business_cards(
    start_date: date | None = None, # Optional query parameter for start date
    end_date: date | None = None,   # Optional query parameter for end date
    db: Session = Depends(get_db)
):
    try:
        query = db.query(database.BusinessCard)

        # Apply date filtering based on created_at column
        if start_date:
            # Cast created_at to Date for comparison
            query = query.filter(cast(database.BusinessCard.created_at, Date) >= start_date)
        if end_date:
            query = query.filter(cast(database.BusinessCard.created_at, Date) <= end_date)

        records = query.order_by(database.BusinessCard.created_at.desc()).all()

        # Convert records to a list of dicts for JSON response
        # Handle potential JSON decoding for list fields
        result_list = []
        for record in records:
            card_dict = {c.name: getattr(record, c.name) for c in record.__table__.columns}
            # Decode JSON string fields back into lists/null
            for key in ['phone', 'email', 'website']:
                if card_dict[key]:
                    try:
                        card_dict[key] = json.loads(card_dict[key])
                    except (json.JSONDecodeError, TypeError):
                         # Keep as string if decoding fails, or set to None/error indicator
                        print(f"Warning: Could not decode JSON for key '{key}' in card ID {card_dict['id']}")
                        card_dict[key] = None # Or keep original string: pass
                else:
                     card_dict[key] = None # Ensure null if original was null/empty
            # Convert datetime objects to ISO format strings
            card_dict['created_at'] = record.created_at.isoformat() if record.created_at else None
            card_dict['updated_at'] = record.updated_at.isoformat() if record.updated_at else None
            result_list.append(card_dict)

        return JSONResponse(content=result_list)
    except Exception as e:
        print(f"Error fetching business cards: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch business card data.")


# --- NEW Endpoint: Get Visitor Logs ---
@app.get("/get_visitor_logs/",
         summary="Get Stored Visitor Log Entries",
         description="Retrieves all stored visitor log entries, optionally filtered by creation date.",
         response_description="A list of visitor log entries.")
async def get_visitor_logs(
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db)
):
    try:
        query = db.query(database.VisitorLogEntry)

        if start_date:
            query = query.filter(cast(database.VisitorLogEntry.created_at, Date) >= start_date)
        if end_date:
            query = query.filter(cast(database.VisitorLogEntry.created_at, Date) <= end_date)

        records = query.order_by(database.VisitorLogEntry.created_at.desc()).all()

        # Convert records to list of dicts
        result_list = []
        for record in records:
             log_dict = {c.name: getattr(record, c.name) for c in record.__table__.columns}
             # created_at is already handled by default JSON encoding if it's a datetime object
             # but let's be explicit for consistency
             log_dict['created_at'] = record.created_at.isoformat() if record.created_at else None
             # raw_json_entry can remain a string if needed, or decode if frontend requires object
             # try:
             #     log_dict['raw_json_entry'] = json.loads(log_dict['raw_json_entry'])
             # except (json.JSONDecodeError, TypeError):
             #     pass # Keep as string if fails
             result_list.append(log_dict)

        return JSONResponse(content=result_list)
    except Exception as e:
        print(f"Error fetching visitor logs: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch visitor log data.")

# --- (Your existing endpoints: /extract_validate/, /store_data/, /) ---
# ...

# --- NEW Endpoint: Store Validated Data ---
@app.post("/store_data/",
          summary="Store Pre-Validated Data",
          description="Receives validated data (presumably confirmed by user via frontend) and stores it in the database.",
          response_description="JSON confirming storage success.")
async def store_validated_data(
    payload: StoreDataRequest = Body(...), # Use Pydantic model for body
    db: Session = Depends(get_db)
):
    doc_type = payload.type
    data_payload = payload.data
    # original_filename = payload.filename # If you pass filename

    print(f"Received request to store data of type: {doc_type}")

    try:
        if doc_type == "business_card":
            if not isinstance(data_payload, dict):
                 raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data format for business_card, expected dictionary.")
            # Re-validate just in case? Optional, but safer.
            is_valid, error = validate_business_card_data(data_payload)
            if not is_valid:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Data validation failed before storage: {error}")

            db_record = add_business_card(db=db, card_data=data_payload) # Add filename if needed
            return JSONResponse(
                status_code=status.HTTP_201_CREATED,
                content={
                    "message": "Business card data stored successfully.",
                    "database_id": db_record.id,
                }
            )
        elif doc_type == "visitor_register":
            if not isinstance(data_payload, list):
                 raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data format for visitor_register, expected list.")
            # Re-validate? Optional.
            is_valid, error = validate_visitor_register_data(data_payload)
            if not is_valid:
                 raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Data validation failed before storage: {error}")

            if not data_payload:
                 return JSONResponse(status_code=status.HTTP_200_OK, content={"message": "Received empty visitor log, nothing stored."})

            batch_id = str(uuid.uuid4())
            result = add_visitor_log_entries(db=db, log_entries=data_payload, batch_id=batch_id) # Add filename if needed
            return JSONResponse(
                status_code=status.HTTP_201_CREATED,
                content={
                    "message": "Visitor register data stored successfully.",
                    "batch_id": result["batch_id"],
                    "entries_added": result["entries_added"],
                }
            )
        elif doc_type == "unknown":
             return JSONResponse(status_code=status.HTTP_200_OK, content={"message": "Data type is 'unknown', nothing stored."})
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid document type '{doc_type}' for storage.")

    except HTTPException as http_exc:
        # Re-raise HTTP exceptions from validation/logic
        raise http_exc
    except Exception as e:
        # Catch potential DB errors during insertion
        print(f"Database insertion error during store: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store data in the database: {e}"
        )


# --- Root Endpoint ---
@app.get("/", include_in_schema=False)
async def root():
    return {"message": "Welcome to the Image Data Extractor API. See /docs for details."}