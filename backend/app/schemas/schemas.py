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
    city: str | None = Field(default=None, max_length=100)
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

    @field_validator("city")
    @classmethod
    def trim_city(cls, value: str | None) -> str | None:
        value = value.strip() if value is not None else None
        return value or None


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    gender: Gender | None = None
    city: str | None = Field(default=None, max_length=100)
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

    @field_validator("city")
    @classmethod
    def trim_updated_city(cls, value: str | None) -> str | None:
        value = value.strip() if value is not None else None
        return value or None


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    customer_code: str
    name: str
    gender: Gender
    city: str | None
    phone: str | None
    alternate_phone: str | None
    email: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class CustomerOrderTotals(BaseModel):
    order_count: int = 0
    order_value: float = 0
    amount_paid: float = 0
    balance_due: float = 0


class CustomerListOut(CustomerOut):
    order_count: int = 0
    order_value: float = 0
    amount_paid: float = 0
    balance_due: float = 0


class CustomerPage(BaseModel):
    items: list[CustomerListOut]
    total_count: int
    limit: int
    offset: int
    summary: CustomerOrderTotals


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
    model_config = ConfigDict(extra="forbid")
    garment_name: str | None = Field(default=None, min_length=1, max_length=120)
    due_date: datetime | None = None
    price: float | None = Field(default=None, ge=0, le=99999999)
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


PaymentMethod = Literal["cash", "upi", "bank_transfer", "card", "other"]


class OrderPaymentCreate(BaseModel):
    amount: float = Field(gt=0, le=99999999)
    method: PaymentMethod = "cash"
    paid_at: datetime | None = None
    note: str | None = Field(default=None, max_length=300)

    @field_validator("note")
    @classmethod
    def trim_payment_note(cls, value: str | None) -> str | None:
        value = value.strip() if value else None
        return value or None


class OrderPaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    order_id: UUID
    amount: float
    paid_at: datetime
    method: PaymentMethod
    note: str | None
    is_opening_balance: bool
    created_at: datetime


class InquiryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    phone: str = Field(min_length=7, max_length=30)
    email: str = Field(min_length=3, max_length=254)
    message: str = Field(min_length=1, max_length=3000)
    website: str = Field(default="", max_length=300)

    @field_validator("name", "phone", "email", "message")
    @classmethod
    def trim_inquiry_fields(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value

    @field_validator("phone")
    @classmethod
    def validate_inquiry_phone(cls, value: str) -> str:
        digits = "".join(character for character in value if character.isdigit())
        if len(digits) < 7:
            raise ValueError("Enter a valid phone number")
        return value

    @field_validator("email")
    @classmethod
    def validate_inquiry_email(cls, value: str) -> str:
        import re
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid email address")
        return value


InquiryStatus = Literal["new", "read", "archived"]


class InquiryStatusUpdate(BaseModel):
    status: InquiryStatus


class InquiryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    phone: str
    email: str
    message: str
    status: InquiryStatus
    created_at: datetime
    updated_at: datetime


class InquiryPage(BaseModel):
    items: list[InquiryOut]
    total_count: int
    limit: int
    offset: int


class InquirySubmitOut(BaseModel):
    submitted: bool = True


ThemeName = Literal["forest", "rose", "plum", "terracotta", "indigo", "black-blush"]


class SiteThemeUpdate(BaseModel):
    theme: ThemeName


class SiteThemeOut(BaseModel):
    theme: ThemeName


LanguageName = Literal["english", "hinglish", "hindi"]


class SiteLanguageUpdate(BaseModel):
    language: LanguageName


class SiteLanguageOut(BaseModel):
    language: LanguageName
