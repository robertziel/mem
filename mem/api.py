from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path

from .service import (
    list_notes, search_notes, get_note,
    create_note, update_note, delete_note,
)

app = FastAPI(title="mem API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class NoteCreate(BaseModel):
    title: str
    tags: str = ""
    body: str = ""


class NoteUpdate(BaseModel):
    content: str


@app.get("/api/notes")
def api_list_notes(limit: int = 50):
    return list_notes(limit)


@app.get("/api/notes/search")
def api_search_notes(q: str = ""):
    return search_notes(q)


@app.get("/api/notes/{path:path}")
def api_get_note(path: str):
    try:
        return get_note(path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Note not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/notes", status_code=201)
def api_create_note(data: NoteCreate):
    try:
        return create_note(data.title, data.tags, data.body)
    except FileExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.put("/api/notes/{path:path}")
def api_update_note(path: str, data: NoteUpdate):
    try:
        return update_note(path, data.content)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Note not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/notes/{path:path}")
def api_delete_note(path: str):
    try:
        return delete_note(path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Note not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Serve React build in production
dist_dir = Path(__file__).parent.parent / "web" / "dist"
if dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="static")
