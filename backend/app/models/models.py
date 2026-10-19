import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    gender: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    city: Mapped[str | None] = mapped_column(String(100))
    seeded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    normalized_phone: Mapped[str | None] = mapped_column(String(20), index=True)
    alternate_phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(254))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (CheckConstraint("gender IN ('female','male')", name="ck_customer_gender"),)
    profiles: Mapped[list["MeasurementProfile"]] = relationship(back_populates="customer")


class GarmentTemplate(Base):
    __tablename__ = "garment_templates"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_key: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    __table_args__ = (CheckConstraint("category IN ('mens','womens','unisex')", name="ck_template_category"),)
    versions: Mapped[list["GarmentTemplateVersion"]] = relationship(back_populates="template")


class GarmentTemplateVersion(Base):
    __tablename__ = "garment_template_versions"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("garment_templates.id"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    fields: Mapped[list] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    __table_args__ = (UniqueConstraint("template_id", "version", name="uq_template_version"),)
    template: Mapped[GarmentTemplate] = relationship(back_populates="versions")


class MeasurementProfile(Base):
    __tablename__ = "measurement_profiles"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id"), nullable=False, index=True)
    template_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("garment_templates.id"), nullable=False, index=True)
    profile_name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    customer: Mapped[Customer] = relationship(back_populates="profiles")
    template: Mapped[GarmentTemplate] = relationship()
    records: Mapped[list["MeasurementRecord"]] = relationship(back_populates="profile")


class MeasurementRecord(Base):
    __tablename__ = "measurement_records"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("measurement_profiles.id"), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    template_version_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("garment_template_versions.id"), nullable=False)
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    unit: Mapped[str] = mapped_column(String(10), nullable=False)
    measurements: Mapped[dict] = mapped_column(JSONB, nullable=False)
    fit_preference: Mapped[str | None] = mapped_column(String(30))
    notes: Mapped[str | None] = mapped_column(Text)
    change_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    profile: Mapped[MeasurementProfile] = relationship(back_populates="records")
    template_version: Mapped[GarmentTemplateVersion] = relationship()
    __table_args__ = (
        UniqueConstraint("profile_id", "version", name="uq_profile_record_version"),
        CheckConstraint("unit IN ('inches','cm')", name="ck_measurement_unit"),
    )


class Order(Base):
    __tablename__ = "orders"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_number: Mapped[str] = mapped_column(String(24), unique=True, nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id"), nullable=False, index=True)
    measurement_record_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("measurement_records.id"), nullable=True)
    garment_name: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="new")
    order_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    advance: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    seeded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    __table_args__ = (
        CheckConstraint("status IN ('new','in_progress','ready','delivered','cancelled')", name="ck_order_status"),
        CheckConstraint("price >= 0 AND advance >= 0 AND advance <= price", name="ck_order_amounts"),
    )
    customer: Mapped[Customer] = relationship()
    measurement_record: Mapped[MeasurementRecord | None] = relationship()
    payments: Mapped[list["OrderPayment"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderPayment(Base):
    __tablename__ = "order_payments"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)
    method: Mapped[str] = mapped_column(String(20), nullable=False, default="cash")
    note: Mapped[str | None] = mapped_column(String(300))
    is_opening_balance: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_order_payment_positive"),
        CheckConstraint("method IN ('cash','upi','bank_transfer','card','other')", name="ck_order_payment_method"),
    )
    order: Mapped[Order] = relationship(back_populates="payments")


class Inquiry(Base):
    __tablename__ = "inquiries"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(12), nullable=False, default="new", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    __table_args__ = (CheckConstraint("status IN ('new','read','archived')", name="ck_inquiry_status"),)


class SiteSetting(Base):
    __tablename__ = "site_settings"
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[str] = mapped_column(String(100), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


Index("ix_measurement_history", MeasurementRecord.profile_id, MeasurementRecord.version.desc())
