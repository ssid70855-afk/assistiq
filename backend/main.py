from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client
from jose import jwt
from passlib.context import CryptContext
from dotenv import load_dotenv
from groq import Groq
from pypdf import PdfReader
import io
import os

load_dotenv()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

pwd_ctx = CryptContext(schemes=["bcrypt"])
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

doc_store = {}

@app.get("/")
def root():
    return {"status": "running"}

@app.post("/signup")
def signup(email: str, password: str):
    hashed = pwd_ctx.hash(password)
    supabase.table("users").insert({"email": email, "password_hash": hashed}).execute()
    return {"message": "Account created"}

@app.post("/login")
def login(email: str, password: str):
    user = supabase.table("users").select("*").eq("email", email).single().execute()
    if not pwd_ctx.verify(password, user.data["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = jwt.encode({"sub": email}, os.getenv("JWT_SECRET"))
    return {"token": token}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()
    if file.filename.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(content))
        text = " ".join(page.extract_text() for page in reader.pages)
    else:
        text = content.decode("utf-8")
    doc_store["current"] = text
    chunks = len(text) // 500
    return {"chunks_stored": max(1, chunks)}

@app.post("/chat")
def chat(session_id: str, user_message: str):
    history = supabase.table("messages").select("*")\
        .eq("session_id", session_id).order("created_at").execute()

    chat_history = []
    for m in history.data:
        role = "user" if m["role"] == "user" else "assistant"
        chat_history.append({"role": role, "content": m["content"]})

    context = doc_store.get("current", "")
    if context:
        augmented = f"Document context:\n{context[:3000]}\n\nUser: {user_message}"
    else:
        augmented = user_message

    chat_history.append({"role": "user", "content": augmented})

    supabase.table("messages").insert(
        {"session_id": session_id, "role": "user", "content": user_message}
    ).execute()

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=chat_history
    )
    reply = response.choices[0].message.content

    supabase.table("messages").insert(
        {"session_id": session_id, "role": "model", "content": reply}
    ).execute()

    return {"reply": reply}
