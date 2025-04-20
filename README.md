# AI-Visitor-Data-Extractor

A full-stack web application demonstrating AI-powered data extraction from images of business cards and visitor registers using the Groq Cloud API, FastAPI, and React.

## Overview

This application streamlines the process of digitizing physical records like visitor logbooks and business cards. Users upload an image, and the AI backend extracts relevant information into a structured format. The frontend provides an interface for uploading, validating the extracted data side-by-side with the image, and storing the confirmed information in a database. It also includes a visualization tab to view and filter stored records.

**Business Use Case:**  
Automates tedious manual data entry, reduces errors, saves time, and creates searchable digital records from physical documents common in reception areas or networking events.

## Demo

![visiter_gif](https://github.com/user-attachments/assets/7f418ecd-8b4b-455a-b52b-1464e7dcfc11)

## Key Features

- **Image Upload:** Simple interface to upload JPG, PNG, or WEBP images.  
- **AI Data Extraction:** Utilizes Groq's Llama 4 Scout model to identify document type (business card/visitor register) and extract relevant fields.  
- **User Validation:** Presents the uploaded image and the AI-extracted data side-by-side for user review and confirmation before saving.  
- **Database Storage:** Stores validated data persistently in an SQLite database.  
- **Data Visualization:** Tabular view of stored records with date filtering and charts showing entry trends over time.  
- **Retry Mechanism:** Backend automatically re-prompts the AI with error context if initial extraction fails validation checks.  

## Technology Stack

- **Frontend:** React.js, Axios, Chart.js (`react-chartjs-2`), `react-datepicker`  
- **Backend:** Python 3, FastAPI, SQLAlchemy (ORM), Uvicorn (ASGI server)  
- **Database:** SQLite  
- **AI / LLM:** Groq Cloud API  
  - **Model Used:** `meta-llama/llama-4-scout-17b-16e-instruct`

## Core Techniques

- **Multimodal LLM Interaction:** Sends image data (Base64 encoded) along with a structured text prompt to the Groq API via REST.  
- **Prompt Engineering:** Carefully crafted prompts instruct the LLM to identify document types and return data in a specific JSON format. Reflection prompts are used on retries.  
- **JSON Mode:** Leverages the LLM's capability to generate structured JSON output directly.  
- **Backend Validation:** Pydantic models (via FastAPI) and custom validation functions check the LLM response structure and types.  
- **RESTful API Design:** FastAPI endpoints for image processing (`/extract_validate/`), data storage (`/store_data/`), and data retrieval (`/get_business_cards/`, `/get_visitor_logs/`).  
- **CORS:** FastAPI middleware handles Cross-Origin Resource Sharing for the React frontend.  
- **ORM:** SQLAlchemy maps Python classes to SQLite tables (`business_visiting_cards`, `visitor_log_book`).  
- **Asynchronous Processing:** FastAPI handles requests asynchronously for performance.  
- **Client-Side Rendering & State Management:** React hooks (`useState`, `useEffect`) manage UI state and API calls.  
- **Data Visualization:** Chart.js renders bar/line charts based on aggregated data from the backend.

## Setup and Running

Make sure you have **Python 3.8+**, **pip**, **Node.js (v16+)**, and **npm** (or **yarn**) installed, plus a Groq Cloud API key.

### 1. Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```
2. **Create and activate a virtual environment:**
   - **Windows:**
     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **macOS/Linux:**
     ```bash
     python -m venv venv
     source venv/bin/activate
     ```
3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Configure your Groq API key:**
   - Create a file named `.env` in the `backend` folder.
   - Add:
     ```dotenv
     GROQ_API_KEY='your_groq_api_key_here'
     ```
   - Ensure `.env` is in your `.gitignore`.
5. **Run the FastAPI server:**
   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```
   The API will be available at `http://127.0.0.1:8000`. A SQLite database (`data_extractor.db`) is created automatically on first use.

### 2. Frontend Setup

1. **Open a new terminal and navigate to the frontend directory:**
   ```bash
   cd frontend
   ```
2. **Install Node.js dependencies:**
   ```bash
   npm install
   # or, if you use yarn:
   # yarn install
   ```
3. **Start the React development server:**
   ```bash
   npm start
   # or, if you use yarn:
   # yarn start
   ```
   The frontend will open at `http://localhost:3000` by default.

### 3. Using the Application

- Make sure **both** backend and frontend servers are running.
- Open your browser to `http://localhost:3000`.
- Verify that the `BACKEND_URL` in your React code (e.g., in `src/App.js`) points to `http://127.0.0.1:8000`.
- Use the **Upload & Extract** tab to upload images and extract data.

---