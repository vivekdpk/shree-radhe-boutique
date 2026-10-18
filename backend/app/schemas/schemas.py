from datetime import datetime
from typing import Any, Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator


class LoginRequest(BaseModel):
    password: str = Field(min_length=1, max_length=256)


Gender = Literal["female", "male"]


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    gender: Gender
    phone: str | None = Field(default=None, max_length=20)
    alternate_phone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=254)
    notes: str | None = None

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    gender: Gender | None = None
    phone: str | None = Field(default=None, max_length=20)
    alternate_phone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=254)
    notes: str | None = None

    @field_validator("name")
    @classmethod
    def trim_updated_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    customer_code: str
    name: str
    gender: Gender
    phone: str | None
    alternate_phone: str | None
    email: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class CustomerPage(BaseModel):
    items: list[CustomerOut]
    total_count: int
    limit: int
    offset: int


class TemplateOut(BaseModel):
    id: UUID
    template_key: str
    name: str
    category: str
    current_version: int
    current_version_id: UUID
    fields: list[dict[str, Any]]


class ProfileCreate(BaseModel):
    template_id: UUID
    profile_name: str = Field(min_length=1, max_length=100)

    @field_validator("profile_name")
    @classmethod
    def trim_profile_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Profile name cannot be blank")
        return value


class ProfileOut(BaseModel):
    id: UUID
    customer_id: UUID
    template_id: UUID
    template_name: str
    category: str
    profile_name: str
    created_at: datetime


class ProfileIndexOut(BaseModel):
    id: UUID
    customer_id: UUID
    customer_name: str
    customer_code: str
    phone: str | None
    template_name: str
    category: str
    profile_name: str
    latest_version: int | None


class MeasurementCreate(BaseModel):
    template_version_id: UUID
    measured_at: datetime | None = None
    unit: Literal["inches", "cm"] = "inches"
    measurements: dict[str, float]
    fit_preference: str | None = Field(default=None, max_length=30)
    notes: str | None = None
    change_reason: str | None = None


class MeasurementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    profile_id: UUID
    version: int
    template_version_id: UUID
    measured_at: datetime
    unit: str
    measurements: dict[str, float]
    fit_preference: str | None
    notes: str | None
    change_reason: str | None
    created_at: datetime


OrderStatus = Literal["new", "in_progress", "ready", "delivered", "cancelled"]


class OrderCreate(BaseModel):
    garment_name: str = Field(min_length=1, max_length=120)
    due_date: datetime
    price: float = Field(ge=0, le=99999999)
    advance: float = Field(default=0, ge=0, le=99999999)
    status: OrderStatus = "new"
    measurement_record_id: UUID | None = None
    notes: str | None = None

    @field_validator("garment_name")
    @classmethod
    def trim_garment(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Garment name cannot be blank")
        return value

    @field_validator("advance")
    @classmethod
    def advance_within_price(cls, value: float, info):
        price = info.data.get("price")
        if price is not None and value > price:
            raise ValueError("Advance cannot be greater than the total price")
        return value


class OrderUpdate(BaseModel):
    garment_name: str | None = Field(default=None, min_length=1, max_length=120)
    due_date: datetime | None = None
    price: float | None = Field(default=None, ge=0, le=99999999)
    advance: float | None = Field(default=None, ge=0, le=99999999)
    status: OrderStatus | None = None
    measurement_record_id: UUID | None = None
    notes: str | None = None


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    order_number: str
    customer_id: UUID
    customer_name: str
    customer_phone: str | None
    measurement_record_id: UUID | None
    garment_name: str
    status: OrderStatus
    order_date: datetime
    due_date: datetime
    price: float
    advance: float
    balance: float
    notes: str | None
    created_at: datetime
    updated_at: datetime
