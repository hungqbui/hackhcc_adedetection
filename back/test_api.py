import requests
import time
import random
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("=" * 60)
    print("🚀 STARTING MEDEASE API INTEGRATION TESTS")
    print("=" * 60)

    # 1. Test Root Endpoint
    print("\n[1/7] Testing Root Endpoint GET / ...")
    try:
        r = requests.get(f"{BASE_URL}/")
        print(f"Status: {r.status_code}")
        print(f"Response: {r.json()}")
        if r.status_code != 200:
            print("❌ Root endpoint failed. Make sure your FastAPI server is running at http://127.0.0.1:8000")
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Cannot reach server. Please run uvicorn main:app --reload inside the 'back' folder.")
        sys.exit(1)

    # Generate a unique username for testing
    rand_id = random.randint(1000, 9999)
    username = f"testuser_{rand_id}"
    email = f"testuser_{rand_id}@example.com"
    password = "securepassword123"

    # 2. Test Registration
    print(f"\n[2/7] Testing User Registration POST /auth/register ...")
    reg_payload = {
        "username": username,
        "email": email,
        "password": password,
        "webhook_url": "https://discord.com/api/webhooks/mock_url"
    }
    r = requests.post(f"{BASE_URL}/auth/register", json=reg_payload)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
    if r.status_code != 200:
        print("❌ Registration failed.")
        sys.exit(1)

    # 3. Test Login (OAuth2PasswordRequestForm expects form-data)
    print("\n[3/7] Testing User Login POST /auth/login ...")
    login_data = {
        "username": username,
        "password": password
    }
    r = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    print(f"Status: {r.status_code}")
    response_json = r.json()
    print(f"Response (truncated token): { {k: (v[:15] + '...' if k == 'access_token' else v) for k, v in response_json.items()} }")
    if r.status_code != 200:
        print("❌ Login failed.")
        sys.exit(1)

    token = response_json["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify Profile
    print("\nChecking Profile GET /auth/me ...")
    profile_r = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print(f"Status: {profile_r.status_code}")
    print(f"Profile data: {profile_r.json()}")

    # 4. Test Add Medications
    print("\n[4/7] Testing Add Medication POST /medications/ ...")
    med1 = {
        "name": "Metformin 500mg",
        "purpose": "Type 2 Diabetes management",
        "type": "prescription",
        "dosage": "1 tablet",
        "frequency": "Twice daily with breakfast and dinner",
        "optimal_time": ["08:00", "20:00"],
        "with_food": True,
        "interactions_to_avoid": ["Excessive alcohol"],
        "special_instructions": "Take with meals to minimize gastrointestinal side effects.",
        "side_effects": ["Nausea", "Diarrhea", "Metabolic taste"],
        "when_to_avoid": "Severe renal impairment",
        "simplified_explanation": "Helps lower blood sugar levels by improving the way the body handles insulin."
    }
    
    med2 = {
        "name": "Dolutegravir 50mg",
        "purpose": "HIV-1 treatment",
        "type": "prescription",
        "dosage": "1 tablet",
        "frequency": "Once daily",
        "optimal_time": ["12:00"],
        "with_food": False,
        "interactions_to_avoid": ["Calcium/Magnesium supplements (separate by 2 hours)"],
        "special_instructions": "Do not take at the same time as antacids or supplements.",
        "side_effects": ["Headache", "Insomnia", "Fatigue"],
        "when_to_avoid": "Co-administration with dofetilide",
        "simplified_explanation": "An antiretroviral medication that helps control HIV infection."
    }

    med_ids = []
    
    # Insert Medication 1
    r1 = requests.post(f"{BASE_URL}/medications/", json=med1, headers=headers)
    print(f"Medication 1 Status: {r1.status_code}")
    r1_json = r1.json()
    med1_id = r1_json.get("id")
    print(f"Medication 1 Saved ID: {med1_id}")
    if med1_id:
        med_ids.append(med1_id)

    # Insert Medication 2
    r2 = requests.post(f"{BASE_URL}/medications/", json=med2, headers=headers)
    print(f"Medication 2 Status: {r2.status_code}")
    r2_json = r2.json()
    med2_id = r2_json.get("id")
    print(f"Medication 2 Saved ID: {med2_id}")
    if med2_id:
        med_ids.append(med2_id)

    if len(med_ids) < 2:
        print("❌ Failed to add test medications.")
        sys.exit(1)

    # List Medications to verify
    print("\nListing Medications GET /medications/ ...")
    list_r = requests.get(f"{BASE_URL}/medications/", headers=headers)
    print(f"Count: {len(list_r.json())} medications retrieved.")

    # 5. Generate optimized schedule
    print("\n[5/7] Testing Generate Schedule POST /medications/schedule/generate ...")
    sched_request = {
        "medication_ids": med_ids,
        "wake_time": "07:00",
        "sleep_time": "22:00",
        "breakfast_time": "08:00",
        "lunch_time": "12:30",
        "dinner_time": "19:00",
        "routine_notes": "Prefer to take HIV meds around lunchtime."
    }
    r = requests.post(f"{BASE_URL}/medications/schedule/generate", json=sched_request, headers=headers)
    print(f"Status: {r.status_code}")
    if r.status_code != 200:
        print("❌ Schedule generation failed.")
        print(f"Detail: {r.text}")
        sys.exit(1)
        
    generated_schedule = r.json()
    print("Generated Schedule Slots:")
    for slot in generated_schedule.get("slots", []):
        print(f"  - Time: {slot['time']} | Meds: {slot['medication_names']} | Instructions: {slot['instructions']}")
    print(f"General Advice: {generated_schedule.get('general_advice')[:120]}...")

    # 6. Save/Persist Schedule
    print("\n[6/7] Testing Save Schedule POST /medications/schedule ...")
    persist_payload = {
        "slots": generated_schedule.get("slots", []),
        "general_advice": generated_schedule.get("general_advice", "")
    }
    r = requests.post(f"{BASE_URL}/medications/schedule", json=persist_payload, headers=headers)
    print(f"Status: {r.status_code}")
    if r.status_code != 200:
        print("❌ Saving schedule failed.")
        sys.exit(1)

    # Retrieve Schedule
    print("\nRetrieving Saved Schedule GET /medications/schedule ...")
    get_sched_r = requests.get(f"{BASE_URL}/medications/schedule", headers=headers)
    print(f"Status: {get_sched_r.status_code}")
    print(f"Retrieved slots count: {len(get_sched_r.json().get('slots', []))}")

    # 7. Test Chat Advising (advising / chat_advising expects form fields)
    print("\n[7/7] Testing Chat Advising POST /chat/advising ...")
    chat_form = {
        "message": "Is it safe to take Vitamin C at the same time as my Dolutegravir?",
        "history": "[]" # Empty list representing history
    }
    r = requests.post(f"{BASE_URL}/chat/advising", data=chat_form, headers=headers)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        advising_json = r.json()
        print(f"AI Assistant Reply: {advising_json.get('reply')}")
        print(f"Retrieved Similar Meds: {[m['name'] for m in advising_json.get('retrieved_medications', [])]}")
    else:
        print("❌ Chat advising failed.")
        print(f"Detail: {r.text}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
