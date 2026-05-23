import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_DETAILS = os.getenv("MONGO_DB_URL", "mongodb://localhost:27017")

client = motor.motor_asyncio.AsyncIOMotorClient(
    MONGO_DETAILS,
    tls=True,
    tlsAllowInvalidCertificates=True,
)
database = client.hackhcc
user_collection = database.get_collection("users")
medication_collection = database.get_collection("medications")
schedule_collection = database.get_collection("schedules")
changelog_collection = database.get_collection("changelogs")
action_plan_collection = database.get_collection("action_plans")
