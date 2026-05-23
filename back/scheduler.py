import asyncio
from datetime import datetime
import os
import httpx
from database import schedule_collection, user_collection

# Global variables for scheduler management
_scheduler_task = None
_running = False

async def send_discord_reminder(username: str, slot: dict):
    # Try fetching from user's model first
    user = await user_collection.find_one({"username": username})
    webhook_url = None
    if user:
        webhook_url = user.get("webhook_url")
        
    # Fallback to env var if user has not set a custom webhook_url
    if not webhook_url:
        webhook_url = os.getenv("WEBHOOK_URL") or os.getenv("DISCORD_WEBHOOK_URL")
        
    if not webhook_url:
        print(f"[WARNING] Discord Webhook URL is not configured for user {username}.")
        return
    
    medications_list = ", ".join(slot.get("medication_names", []))
    instructions = slot.get("instructions", "No special instructions.")
    warnings = slot.get("interaction_warnings", "")
    
    # Premium embed construction
    embed = {
        "title": "⏰ Medication Reminder",
        "description": f"Hi **{username}**, it's time for your scheduled medication dose.",
        "color": 3447003, # Premium Slate Blue
        "fields": [
            {
                "name": "💊 Medications",
                "value": medications_list or "N/A",
                "inline": True
            },
            {
                "name": "⏰ Scheduled Time",
                "value": slot.get("time", "N/A"),
                "inline": True
            }
        ],
        "footer": {
            "text": "MedEase AI Pharmacist Assistant"
        }
    }
    
    if instructions:
        embed["fields"].append({
            "name": "💡 Instructions",
            "value": instructions,
            "inline": False
        })
        
    if warnings:
        embed["fields"].append({
            "name": "⚠️ Interaction Warnings",
            "value": warnings,
            "inline": False
        })
        embed["color"] = 15158332 # Red warning color
        
    payload = {
        "embeds": [embed]
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(webhook_url, json=payload)
            if response.status_code >= 400:
                print(f"[ERROR] Failed to send Discord Webhook: {response.status_code} {response.text}")
            else:
                print(f"[SUCCESS] Discord reminder sent to {username} for {medications_list} at {slot.get('time')}")
    except Exception as e:
        print(f"[ERROR] Failed to execute discord webhook request: {e}")

async def _scheduler_loop():
    global _running
    print("[SCHEDULER] Background scheduler loop started.")
    last_checked_minute = None
    
    while _running:
        try:
            now = datetime.now()
            current_minute = now.strftime("%Y-%m-%d %H:%M")
            
            if current_minute != last_checked_minute:
                # A new minute has started!
                last_checked_minute = current_minute
                time_str = now.strftime("%H:%M")
                
                # Fetch all user schedules
                schedules_cursor = schedule_collection.find()
                async for schedule in schedules_cursor:
                    username = schedule.get("username")
                    slots = schedule.get("slots", [])
                    
                    for slot in slots:
                        slot_time = slot.get("time")
                        if slot_time == time_str:
                            # It's time! Spawn reminder task
                            asyncio.create_task(send_discord_reminder(username, slot))
                            
            # Sleep a bit before checking again
            await asyncio.sleep(10)
        except Exception as e:
            print(f"[SCHEDULER ERROR] Error in loop: {e}")
            await asyncio.sleep(10)

def start_scheduler():
    global _scheduler_task, _running
    if not _running:
        _running = True
        _scheduler_task = asyncio.create_task(_scheduler_loop())
        print("[SCHEDULER] Scheduler task created.")

def stop_scheduler():
    global _scheduler_task, _running
    if _running:
        _running = False
        if _scheduler_task:
            _scheduler_task.cancel()
            _scheduler_task = None
        print("[SCHEDULER] Scheduler task stopped.")
