import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from exploit_generation_model import ExploitGenerator

# Initialize FastAPI app
app = FastAPI()

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize exploit generator
generator = ExploitGenerator("EleutherAI/gpt-neo-125M")

class TargetRequest(BaseModel):
    target: str
    context: Optional[Dict[str, Any]] = None

@app.post("/analyze")
async def analyze_target(request: TargetRequest):
    try:
        if not generator.validate_target(request.target):
            raise HTTPException(status_code=403, detail="Target not allowed")
            
        exploit = generator.generate_exploit(request.target, request.context)
        return {"status": "success", "exploit": exploit}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
