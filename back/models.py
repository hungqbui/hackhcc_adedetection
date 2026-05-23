from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str
    password: str = Field(..., min_length=6)

class UserInDB(BaseModel):
    username: str
    email: str
    hashed_password: str

class UserResponse(BaseModel):
    username: str
    email: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# --- Medication Tracking Schemas ---

class MedicationType(str, Enum):
    PRESCRIPTION = "prescription"
    SUPPLEMENT = "supplement"
    OTC = "over_the_counter"
    OTHER = "other"

class TimeOfDay(str, Enum):
    MORNING = "morning"
    AFTERNOON = "afternoon"
    EVENING = "evening"
    NIGHT = "night"
    AS_NEEDED = "as_needed"

class MedicationBase(BaseModel):
    name: str = Field(..., description="Name of the drug or supplement (e.g., Aspirin, Vitamin D)")
    purpose: str = Field(..., description="The medical purpose, indication, or reason for taking this medication")
    type: MedicationType
    dosage: str = Field(..., description="Amount and unit (e.g., '500 mg', '1 tablet')")
    frequency: str = Field(..., description="How often to take it (e.g., 'Once daily', 'Every 8 hours')")
    optimal_time: List[TimeOfDay] = Field(default_factory=list, description="Specific recommended times to set push reminders, in HH:MM 24-hour format (e.g., ['08:00', '20:00'])")
    with_food: bool = Field(False, description="Whether it must be taken with food")
    interactions_to_avoid: List[str] = Field(default_factory=list, description="Known drug/food interactions to avoid")
    special_instructions: Optional[str] = Field(None, description="E.g., 'Take with a full glass of water'")
    side_effects: List[str] = Field(default_factory=list, description="Common side effects of this medication")
    when_to_avoid: Optional[str] = Field(None, description="When to avoid taking this medication (contraindications)")
    simplified_explanation: Optional[str] = Field(None, description="A simplified, patient-friendly explanation of what the drug is and does")
    rxcui: Optional[List[str]] = Field(default_factory=list, description="RxNorm Concept Unique Identifiers (RxCUIs) associated with this medication")

    @field_validator("type", mode="before")
    @classmethod
    def validate_type(cls, v):
        if not v:
            return MedicationType.OTHER
        if isinstance(v, str):
            val = v.lower().strip().replace(" ", "_").replace("-", "_")
            if val in ["prescription", "rx", "prescribed"]:
                return MedicationType.PRESCRIPTION
            elif val in ["supplement", "vitamin", "vitamins", "mineral", "supplemental"]:
                return MedicationType.SUPPLEMENT
            elif val in ["over_the_counter", "otc", "over-the-counter"]:
                return MedicationType.OTC
            # Direct check if value exists in enum
            for e in MedicationType:
                if val == e.value:
                    return e
        return MedicationType.OTHER

    @field_validator("optimal_time", mode="before")
    @classmethod
    def validate_optimal_time(cls, v):
        if not v:
            return []
        if isinstance(v, str):
            v = [v]
        validated = []
        for item in v:
            if isinstance(item, str):
                val = item.lower().strip().replace(" ", "_").replace("-", "_")
                if val in ["morning", "afternoon", "evening", "night", "as_needed"]:
                    validated.append(TimeOfDay(val))
                elif "morning" in val:
                    validated.append(TimeOfDay.MORNING)
                elif "afternoon" in val:
                    validated.append(TimeOfDay.AFTERNOON)
                elif "evening" in val:
                    validated.append(TimeOfDay.EVENING)
                elif "night" in val or "bed" in val:
                    validated.append(TimeOfDay.NIGHT)
                elif "need" in val:
                    validated.append(TimeOfDay.AS_NEEDED)
        return list(set(validated))


class MedicationCreate(MedicationBase):
    pass

class MedicationInDB(MedicationBase):
    id: str = Field(..., alias="_id")
    username: str = Field(..., description="The user this medication belongs to")
    embedding: Optional[List[float]] = Field(None, description="Vector embedding of the medication name and purpose")
    created_at: datetime
    updated_at: datetime

class MedicationResponse(MedicationBase):
    id: str
    created_at: datetime

# --- Action Plan / Daily Schedule Schema ---

class ScheduleStatus(str, Enum):
    PENDING = "pending"
    TAKEN = "taken"
    MISSED = "missed"
    SKIPPED = "skipped"

class DailyActionPlanEntry(BaseModel):
    medication_id: str
    medication_name: str
    dosage: str
    scheduled_time: datetime
    status: ScheduleStatus = ScheduleStatus.PENDING
    taken_at: Optional[datetime] = None

class ScheduleTimeSlot(BaseModel):
    time: str = Field(..., description="Time of day in HH:MM 24-hour format (e.g., '08:00')")
    medication_names: List[str] = Field(..., description="Names of medications to take at this exact time")
    instructions: str = Field(..., description="Instructions for this time slot (e.g., 'Take with a full meal')")
    interaction_warnings: Optional[str] = Field(None, description="Any warnings about combining these specific drugs, or why they were separated from others")

class GeneratedMasterSchedule(BaseModel):
    slots: List[ScheduleTimeSlot] = Field(..., description="Chronological list of time slots for the day")
    general_advice: str = Field(..., description="Overall medical advice regarding this specific combination of drugs")

class GenerateScheduleRequest(BaseModel):
    medication_ids: List[str]
    wake_time: str
    sleep_time: str
    breakfast_time: str
    lunch_time: str
    dinner_time: str
    routine_notes: Optional[str] = None

