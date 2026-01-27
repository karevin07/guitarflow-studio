
# Backend Development Roadmap: Python + FastAPI + Beanie

This document details the implementation plan to migrate GuitarFlow Studio from a LocalStorage-only app to a **MongoDB** backend using **Python** and **FastAPI**.

本文檔詳細說明如何使用 **Python** 和 **FastAPI** 將 GuitarFlow Studio 從僅使用 LocalStorage 的應用程式遷移到 **MongoDB** 後端。

Since this is for **personal use** (single user), we use **Beanie** (an ODM for MongoDB) to map our complex JSON structures directly to Python objects without the overhead of relational tables.

由於這是**個人使用**（單一使用者），我們使用 **Beanie**（MongoDB 的 ODM）將複雜的 JSON 結構直接映射為 Python 物件，而無需關聯式資料表的繁瑣開銷。

---

## 1. Technology Stack (技術棧)

| Component | Technology | Description |
|-----------|------------|-------------|
| **Language** | **Python 3.10+** | Modern Python with type hinting is required for Pydantic/FastAPI. |
| **Web Framework** | **FastAPI** | High-performance, easy to use, and auto-generates Swagger docs. |
| **Database** | **MongoDB** | Stores the nested array structure of guitar tabs natively. |
| **ODM** | **Beanie** | An asynchronous ODM based on Pydantic. Perfect for FastAPI integration. |
| **Driver** | **Motor** | The async Python driver for MongoDB. |

---

## 2. Project Structure (專案結構)

Recommended folder structure for the backend:
建議的後端專案目錄結構：

```text
backend/
├── main.py            # Entry point, App initialization, CORS
├── database.py        # MongoDB connection & Beanie initialization
├── models.py          # Pydantic models & Beanie Documents
├── routes/
│   └── songs.py       # CRUD endpoints for songs
└── requirements.txt   # fastapi, uvicorn, beanie, motor
```

---

## 3. Data Modeling (資料模型)

We need to map the TypeScript interfaces from `types.ts` to Python Pydantic models.
我們需要將 `types.ts` 中的 TypeScript 介面映射到 Python 的 Pydantic 模型。

**Key Strategy:** Use `alias` in Pydantic to maintain camelCase for the frontend (React) while using snake_case in Python.
**關鍵策略：** 在 Pydantic 中使用 `alias` 來保持前端 (React) 的 camelCase 命名慣例，同時在 Python 中使用 snake_case。

### `models.py`

```python
from typing import List, Optional
from beanie import Document
from pydantic import BaseModel, Field
from datetime import datetime

# 1. Chord Definition
class ChordDefinition(BaseModel):
    name: str
    # TS: (number | null)[] -> Python: List[Optional[int]]
    frets: List[Optional[int]]

# 2. Tab Section
class TabSection(BaseModel):
    id: str
    title: str
    capo: int
    # TS: string[][][] -> Python: List[List[List[str]]]
    # Structure: [measure_index][string_index][column_index]
    measures: List[List[List[str]]] 
    
    # TS: (string | null)[][]
    chords: List[List[Optional[str]]]
    lyrics: List[List[Optional[str]]]

# 3. Main Song Document
class Song(Document):
    title: str
    # Use alias to match frontend JSON key "lastModified"
    last_modified: int = Field(..., alias="lastModified") 
    transpose_offset: int = Field(default=0, alias="transposeOffset")
    
    # Nested complex structures
    sections: List[TabSection]
    custom_chords: List[ChordDefinition] = Field(default_factory=list, alias="customChords")

    class Settings:
        name = "songs" # Collection name in MongoDB
        
    class Config:
        populate_by_name = True # Allow creating objects using the alias
        json_schema_extra = {
            "example": {
                "title": "My New Riff",
                "lastModified": 1715423000,
                "sections": [],
                "customChords": []
            }
        }
```

---

## 4. Database Connection (資料庫連線)

### `database.py`

```python
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from models import Song

async def init_db():
    # Connection string (Update with your local or Atlas URL)
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    
    # Initialize Beanie with the specific database and models
    await init_beanie(database=client.guitarflow_db, document_models=[Song])
```

---

## 5. API Implementation (API 實作)

### `main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from models import Song
from typing import List
from beanie import PydanticObjectId

app = FastAPI(title="GuitarFlow API")

# Allow Frontend to access Backend (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Adjust to your frontend port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def start_db():
    await init_db()

# --- ROUTES ---

@app.get("/api/songs", response_model=List[Song])
async def get_songs():
    # Sort by last_modified descending
    return await Song.find_all().sort("-last_modified").to_list()

@app.get("/api/songs/{song_id}", response_model=Song)
async def get_song(song_id: PydanticObjectId):
    return await Song.get(song_id)

@app.post("/api/songs", response_model=Song)
async def create_song(song: Song):
    # Determine ID: Frontend might send an ID, but MongoDB generates _id.
    # Strategy: Ignore frontend ID for creation, let Mongo handle it, 
    # OR map frontend ID to a custom field if you want to keep UUIDs.
    # Here we let Beanie handle creation.
    await song.create()
    return song

@app.put("/api/songs/{song_id}", response_model=Song)
async def update_song(song_id: PydanticObjectId, updated_data: Song):
    song = await Song.get(song_id)
    if not song:
        return {"error": "Song not found"}
    
    # Update fields
    song.title = updated_data.title
    song.last_modified = updated_data.last_modified
    song.sections = updated_data.sections
    song.custom_chords = updated_data.custom_chords
    song.transpose_offset = updated_data.transpose_offset
    
    await song.save()
    return song

@app.delete("/api/songs/{song_id}")
async def delete_song(song_id: PydanticObjectId):
    song = await Song.get(song_id)
    if song:
        await song.delete()
        return {"message": "Deleted"}
    return {"error": "Not found"}
```

---

## 6. Frontend Integration (前端整合)

To switch from LocalStorage to this backend:

1.  **Install Axios**: `npm install axios`
2.  **Create API Service**:

```typescript
// services/api.ts
import axios from 'axios';
import { GuitarSong } from '../types';

const API_URL = 'http://localhost:8000/api';

export const getSongs = async (): Promise<GuitarSong[]> => {
  const res = await axios.get(`${API_URL}/songs`);
  // Map MongoDB '_id' to frontend 'id' if necessary
  return res.data.map((s: any) => ({ ...s, id: s._id }));
};

export const saveSong = async (song: GuitarSong): Promise<GuitarSong> => {
  // If it's a new song (created locally with random ID), POST
  // If it's an existing MongoDB song, PUT
  // Logic needed here to distinguish.
  if (song.id.length < 20) { 
      // Assuming MongoDB IDs are long ObjectIds and local IDs are short random strings
      const { id, ...data } = song; // Remove local ID before sending
      return (await axios.post(`${API_URL}/songs`, data)).data;
  } else {
      return (await axios.put(`${API_URL}/songs/${song.id}`, song)).data;
  }
};

export const deleteSong = async (id: string) => {
    await axios.delete(`${API_URL}/songs/${id}`);
}
```

---

## 7. Migration Logic (資料遷移邏輯)

When you first run the full stack app:

1.  Create a "Sync to Cloud" button in the Settings or Home.
2.  Read `localStorage` for `guitarflow_index`.
3.  Iterate through the IDs.
4.  For each song, call `POST /api/songs` to send the JSON data to FastAPI.
5.  FastAPI + Beanie will validate the structure and save it to MongoDB.
6.  Once successful, you can clear LocalStorage.
