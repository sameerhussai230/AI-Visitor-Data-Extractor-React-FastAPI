# AI-Visitor-Data-Extractor

A full-stack web application demonstrating AI-powered data extraction from images of business cards and visitor registers using the Groq Cloud API, FastAPI, and React.

## Overview

This application streamlines the process of digitizing physical records like visitor logbooks and business cards. Users upload an image, and the AI backend extracts relevant information into a structured format. The frontend provides an interface for uploading, validating the extracted data side-by-side with the image, and storing the confirmed information in a database. It also includes a visualization tab to view and filter stored records.

**Business Use Case:** Automates tedious manual data entry, reduces errors, saves time, and creates searchable digital records from physical documents common in reception areas or networking events.

## Demo

![visiter_gif](https://github.com/user-attachments/assets/7f418ecd-8b4b-455a-b52b-1464e7dcfc11)

## Key Features

*   **Image Upload:** Simple interface to upload JPG, PNG, or WEBP images.
*   **AI Data Extraction:** Utilizes Groq's Llama 4 Scout model to identify document type (business card/visitor register) and extract relevant fields.
*   **User Validation:** Presents the uploaded image and the AI-extracted data side-by-side for user review and confirmation before saving.
*   **Database Storage:** Stores validated data persistently in an SQLite database.
*   **Data Visualization:** Tabular view of stored records with date filtering and charts showing entry trends over time.
*   **Retry Mechanism:** Backend automatically re-prompts the AI with error context if initial extraction fails validation checks.

## Technology Stack

*   **Frontend:** React.js, Axios, Chart.js (`react-chartjs-2`), `react-datepicker`
*   **Backend:** Python 3, FastAPI, SQLAlchemy (for ORM), Uvicorn (ASGI server)
*   **Database:** SQLite
*   **AI / LLM:** [Groq Cloud API](https://console.groq.com/)
    *   **Model Used:** `meta-llama/llama-4-scout-17b-16e-instruct`

## Core Techniques

*   **Multimodal LLM Interaction:** Sends image data (Base64 encoded) along with a structured text prompt to the Groq API endpoint via REST.
*   **Prompt Engineering:** Carefully crafted prompts instruct the LLM to identify document types and return data in a specific JSON format. Reflection prompts are used during retries.
*   **JSON Mode:** Leverages the LLM's capability to generate structured JSON output directly.
*   **Backend Validation:** Pydantic models (implicitly via FastAPI) and custom validation functions check the structure and basic types of the LLM's response.
*   **RESTful API Design:** FastAPI provides endpoints for image processing (`/extract_validate/`), data storage (`/store_data/`), and data retrieval (`/get_business_cards/`, `/get_visitor_logs/`).
*   **CORS:** FastAPI middleware handles Cross-Origin Resource Sharing for the React frontend.
*   **ORM:** SQLAlchemy maps Python classes to SQLite database tables (`business_visting_cards`, `visitor_log_book`).
*   **Asynchronous Processing:** FastAPI naturally handles requests asynchronously.
*   **Client-Side Rendering & State Management:** React manages the UI, user interactions, API calls, and application state (`useState`, `useEffect`).
*   **Data Visualization:** Chart.js renders bar/line charts based on aggregated data fetched from the backend.

## Setup and Running

Follow these steps to set up and run the application locally. Ensure you are in the project's root directory (`AI-Visitor-Data-Extractor` or similar) where the `backend` and `frontend` folders reside.

**Prerequisites:**

*   Python 3.8+ and pip
*   Node.js (v16+) and npm (or yarn)
*   A [Groq Cloud API Key](https://console.groq.com/)

**1. Backend Setup (`/backend` directory):**

   *   **Navigate to the backend directory:**
      ```bash
      cd backend
      ```
   *   **Create and activate a virtual environment:**
      ```bash
      # Create environment
      python -m venv venv

      # Activate environment
      # Windows:
      .\venv\Scripts\activate
      # macOS/Linux:
      source venv/bin/activate
      ```
   *   **Install Python dependencies:**
      ```bash
      pip install -r requirements.txt
      ```
   *   **Configure API Key:**
      *   Create a file named `.env` inside the `backend` directory.
      *   Add your Groq API key to the `.env` file like this:
         ```dotenv
         GROQ_API_KEY='your_gsk_api_key_here'
         ```
      *   *(Note: Ensure `.env` is listed in your `.gitignore` file to avoid committing secrets.)*
   *   **Run the FastAPI server:**
      *   Make sure your virtual environment is active.
      *   Start the server using Uvicorn:
         ```bash
         uvicorn main:app --reload --host 127.0.0.1 --port 8000
         ```
   *   The backend API should now be running on `http://127.0.0.1:8000`. The SQLite database (`data_extractor.db`) will be created automatically in the `backend` directory upon first interaction that requires it. Keep this terminal window open.

**2. Frontend Setup (`/frontend` directory):**

   *   **Open a *new* terminal window.**
   *   **Navigate to the frontend directory (from the project root):**
      ```bash
      cd frontend
      ```
   *   **Install Node.js dependencies:**
      ```bash
      npm install
      # or if you use yarn:
      # yarn install
      ```
   *   **Start the React development server:**
      ```bash
      npm start
      # or if you use yarn:
      # yarn start
      ```
   *   The frontend application should open automatically in your default web browser, typically at `http://localhost:3000`.

**3. Using the Application:**

*   Ensure both the backend (FastAPI/Uvicorn) and frontend (React dev server) are running simultaneously in their respective terminals.
*   Open `http://localhost:3000` in your browser.
*   Verify that the `BACKEND_URL` constant within the React frontend code (check components making API calls, e.g., `src/App.js` or similar) points to the correct address of your running backend (`http://127.0.0.1:8000` for local development).
*   Start uploading images via the "Upload & Extract" tab.
