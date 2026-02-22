import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def seed():
    # Insert a test item
    item = {
        "url": "https://www.momoshop.com.tw/goods/GoodsDetail.jsp?i_code=10028667",
        "name": "Honeywell Filter Test",
        "user_id": "00000000-0000-0000-0000-000000000000" # Dummy UUID for test
    }
    
    # Note: If RLS is enabled and policies use auth.uid(), 
    # service_role can still insert with a dummy UUID.
    # We might need to handle the dummy user or just use a real one if auth is setup.
    
    try:
        result = supabase.table("tracked_items").insert(item).execute()
        print("Inserted test item:", result.data)
    except Exception as e:
        print(f"Error seeding: {e}")

if __name__ == "__main__":
    seed()
