import re
import uuid
from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func, or_, text
from sqlalchemy.orm import Session, joinedload
from app.core.config import settings
from app.db import get_db
from app.models.models import Customer, GarmentTemplate, GarmentTemplateVersion, MeasurementProfile, MeasurementRecord, Order
from app.schemas.schemas import (
    LoginRequest, CustomerCreate, CustomerUpdate, CustomerOut, CustomerPage, TemplateOut,
    ProfileCreate, ProfileOut, ProfileIndexOut, MeasurementCreate, MeasurementOut, OrderCreate, OrderUpdate, OrderOut,
)
from app.security import issue_session, clear_session, verify_password, require_owner
from app.seed import seed_templates
from app.services.measurements import measurement_validation_error

app = FastAPI(title="Shree Radhe Boutique API", version="0.1.0", docs_url="/docs" if settings.app_env != "production" else None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.frontend_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-CSRF-Token", "Idempotency-Key"],
)


@app.on_event("startup")
def startup():
    if len(settings.session_secret) < 32:
        raise RuntimeError("SESSION_SECRET must be at least 32 characters")
    # Fail early on an unsafe production configuration instead of accepting traffic.
    if settings.app_env == "production":
        if not settings.cookie_secure:
            raise RuntimeError("COOKIE_SECURE must be true in production")
        if len(settings.session_secret) < 32:
            raise RuntimeError("SESSION_SECRET must be at least 32 characters in production")
        if not settings.owner_password_hash:
            raise RuntimeError("OWNER_PASSWORD_HASH must be configured in production")
    # Schema migrations are applied by the container entrypoint before serving traffic.
    # Keep startup focused on idempotent reference-data seeding.
    with next(get_db()) as db:
        seed_templates(db)


@app.get("/api/v1/health/live")
def live():
    return {"status": "ok"}


@app.get("/api/v1/health/ready")
def ready(db: Session = Depends(get_db)):
    db.execute(select(1))
    return {"status": "ready"}


@app.post("/api/v1/auth/login")
def login(payload: LoginRequest, response: Response):
    if not verify_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    issue_session(response)
    return {"authenticated": True}


@app.post("/api/v1/auth/logout")
def logout(response: Response, _owner=Depends(require_owner)):
    clear_session(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@app.get("/api/v1/auth/me")
def me(_owner=Depends(require_owner)):
    return {"authenticated": True, "user": "owner"}


def normalize_phone(phone: str | None) -> str | None:
    if not phone:
        return None
    return re.sub(r"\D", "", phone)


def next_customer_code(db: Session) -> str:
    # Uses a PostgreSQL sequence to avoid count-based collisions.
    number = db.execute(text("SELECT nextval('customer_code_seq')")).scalar_one()
    return f"SRB-{number:06d}"


@app.post("/api/v1/customers", response_model=CustomerOut, status_code=201)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    phone_norm = normalize_phone(payload.phone)
    customer = Customer(
        customer_code=next_customer_code(db),
        name=payload.name.strip(),
        normalized_name=payload.name.strip().casefold(),
        gender=payload.gender,
        city=payload.city,
        phone=payload.phone,
        normalized_phone=phone_norm,
        alternate_phone=payload.alternate_phone,
        email=payload.email,
        notes=payload.notes,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@app.get("/api/v1/customers", response_model=CustomerPage)
def list_customers(
    search: str = "",
    gender: str | None = Query(None, pattern="^(female|male)$"),
    limit: int = Query(20, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _owner=Depends(require_owner),
):
    query = select(Customer).where(Customer.archived_at.is_(None))
    if gender in {"female", "male"}:
        query = query.where(Customer.gender == gender)
    term = search.strip()
    if term:
        like = f"%{term.casefold()}%"
        digits = normalize_phone(term)
        criteria = [Customer.normalized_name.ilike(like), Customer.customer_code.ilike(f"%{term}%")]
        criteria.append(Customer.city.ilike(like))
        if digits:
            criteria.append(Customer.normalized_phone.ilike(f"%{digits}%"))
        query = query.where(or_(*criteria))
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(query.order_by(Customer.updated_at.desc()).limit(limit).offset(offset)).all()
    return CustomerPage(items=items, total_count=total, limit=limit, offset=offset)


@app.get("/api/v1/customers/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: uuid.UUID, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    customer = db.get(Customer, customer_id)
    if not customer or customer.archived_at:
        raise HTTPException(404, "Customer not found")
    return customer


@app.patch("/api/v1/customers/{customer_id}", response_model=CustomerOut)
def update_customer(customer_id: uuid.UUID, payload: CustomerUpdate, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    customer = db.get(Customer, customer_id)
    if not customer or customer.archived_at:
        raise HTTPException(404, "Customer not found")
    changes = payload.model_dump(exclude_unset=True)
    if "name" in changes and changes["name"] is not None:
        changes["name"] = changes["name"].strip()
        changes["normalized_name"] = changes["name"].casefold()
    if "phone" in changes:
        changes["normalized_phone"] = normalize_phone(changes["phone"])
    for key, value in changes.items():
        setattr(customer, key, value)
    customer.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(customer)
    return customer


@app.post("/api/v1/customers/{customer_id}/archive", status_code=204)
def archive_customer(customer_id: uuid.UUID, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    customer = db.get(Customer, customer_id)
    if not customer or customer.archived_at:
        raise HTTPException(404, "Customer not found")
    customer.archived_at = datetime.now(timezone.utc)
    db.commit()
    return Response(status_code=204)


@app.get("/api/v1/customers/{customer_id}/export")
def export_customer(customer_id: uuid.UUID, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    customer = db.get(Customer, customer_id)
    if not customer or customer.archived_at:
        raise HTTPException(404, "Customer not found")
    profiles = db.scalars(select(MeasurementProfile).where(MeasurementProfile.customer_id == customer_id)).all()
    profile_data = []
    for profile in profiles:
        records = db.scalars(select(MeasurementRecord).where(MeasurementRecord.profile_id == profile.id).order_by(MeasurementRecord.version)).all()
        profile_data.append({
            "profile_name": profile.profile_name,
            "garment": profile.template.name,
            "measurements": [MeasurementOut.model_validate(record).model_dump(mode="json") for record in records],
        })
    orders = db.scalars(select(Order).where(Order.customer_id == customer_id).order_by(Order.order_date)).all()
    order_data = [order_payload(order, customer) for order in orders]
    return {
        "customer": CustomerOut.model_validate(customer).model_dump(mode="json"),
        "measurement_profiles": profile_data,
        "orders": order_data,
    }


@app.delete("/api/v1/customers/{customer_id}", status_code=204)
def delete_customer(customer_id: uuid.UUID, confirm_name: str = Query(..., min_length=1), db: Session = Depends(get_db), _owner=Depends(require_owner)):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")
    if confirm_name.strip().casefold() != customer.name.casefold():
        raise HTTPException(422, "Confirmation name does not match")
    profiles = db.scalars(select(MeasurementProfile).where(MeasurementProfile.customer_id == customer_id)).all()
    profile_ids = [p.id for p in profiles]
    record_ids = []
    if profile_ids:
        record_ids = list(db.scalars(select(MeasurementRecord.id).where(MeasurementRecord.profile_id.in_(profile_ids))).all())
    if record_ids:
        db.query(Order).filter(Order.measurement_record_id.in_(record_ids)).update({Order.measurement_record_id: None}, synchronize_session=False)
    db.query(Order).filter(Order.customer_id == customer_id).delete(synchronize_session=False)
    if profile_ids:
        db.query(MeasurementRecord).filter(MeasurementRecord.profile_id.in_(profile_ids)).delete(synchronize_session=False)
        db.query(MeasurementProfile).filter(MeasurementProfile.id.in_(profile_ids)).delete(synchronize_session=False)
    db.delete(customer)
    db.commit()
    return Response(status_code=204)


def order_payload(order: Order, customer: Customer | None = None):
    customer = customer or order.customer
    price, advance = float(order.price), float(order.advance)
    return {
        "id": order.id, "order_number": order.order_number, "customer_id": order.customer_id,
        "customer_name": customer.name, "customer_phone": customer.phone,
        "measurement_record_id": order.measurement_record_id, "garment_name": order.garment_name,
        "status": order.status, "order_date": order.order_date, "due_date": order.due_date,
        "price": price, "advance": advance, "balance": round(price - advance, 2),
        "notes": order.notes, "created_at": order.created_at, "updated_at": order.updated_at,
    }


@app.get("/api/v1/orders", response_model=list[OrderOut])
def list_orders(status_filter: str | None = Query(None, alias="status"), due_before: datetime | None = None, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    query = select(Order).join(Customer).where(Customer.archived_at.is_(None))
    if status_filter in {"new", "in_progress", "ready", "delivered", "cancelled"}:
        query = query.where(Order.status == status_filter)
    if due_before:
        query = query.where(Order.due_date <= due_before)
    orders = db.scalars(query.order_by(Order.due_date, Order.created_at.desc())).all()
    return [order_payload(order) for order in orders]


@app.get("/api/v1/customers/{customer_id}/orders", response_model=list[OrderOut])
def customer_orders(customer_id: uuid.UUID, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    customer = db.get(Customer, customer_id)
    if not customer or customer.archived_at:
        raise HTTPException(404, "Customer not found")
    orders = db.scalars(select(Order).where(Order.customer_id == customer_id).order_by(Order.due_date.desc())).all()
    return [order_payload(order, customer) for order in orders]


@app.post("/api/v1/customers/{customer_id}/orders", response_model=OrderOut, status_code=201)
def create_order(customer_id: uuid.UUID, payload: OrderCreate, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    customer = db.get(Customer, customer_id)
    if not customer or customer.archived_at:
        raise HTTPException(404, "Customer not found")
    if payload.advance > payload.price:
        raise HTTPException(422, "Advance cannot be greater than the total price")
    if payload.measurement_record_id:
        record = db.get(MeasurementRecord, payload.measurement_record_id)
        if not record or db.get(MeasurementProfile, record.profile_id).customer_id != customer_id:
            raise HTTPException(422, "Selected measurement record does not belong to this customer")
    number = db.execute(text("SELECT nextval('order_number_seq')")).scalar_one()
    now = datetime.now(timezone.utc)
    order = Order(order_number=f"SRB-O{number:06d}", customer_id=customer_id,
        order_date=now, updated_at=now, **payload.model_dump())
    db.add(order); db.commit(); db.refresh(order)
    return order_payload(order, customer)


@app.patch("/api/v1/orders/{order_id}", response_model=OrderOut)
def update_order(order_id: uuid.UUID, payload: OrderUpdate, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    changes = payload.model_dump(exclude_unset=True)
    price = changes.get("price", float(order.price))
    advance = changes.get("advance", float(order.advance))
    if advance > price:
        raise HTTPException(422, "Advance cannot be greater than the total price")
    if "measurement_record_id" in changes and changes["measurement_record_id"]:
        record = db.get(MeasurementRecord, changes["measurement_record_id"])
        profile = db.get(MeasurementProfile, record.profile_id) if record else None
        if not profile or profile.customer_id != order.customer_id:
            raise HTTPException(422, "Selected measurement record does not belong to this customer")
    for key, value in changes.items():
        setattr(order, key, value)
    order.updated_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(order)
    return order_payload(order)


@app.get("/api/v1/garment-templates", response_model=list[TemplateOut])
def list_templates(category: str | None = None, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    query = select(GarmentTemplate).where(GarmentTemplate.active.is_(True))
    if category in {"mens", "womens", "unisex"}:
        query = query.where(GarmentTemplate.category == category)
    templates = db.scalars(query.order_by(GarmentTemplate.category, GarmentTemplate.name)).all()
    result = []
    for template in templates:
        current = db.scalar(select(GarmentTemplateVersion).where(
            GarmentTemplateVersion.template_id == template.id
        ).order_by(GarmentTemplateVersion.version.desc()).limit(1))
        if current:
            result.append(TemplateOut(
                id=template.id, template_key=template.template_key, name=template.name,
                category=template.category, current_version=current.version, current_version_id=current.id, fields=current.fields
            ))
    return result


@app.post("/api/v1/customers/{customer_id}/measurement-profiles", response_model=ProfileOut, status_code=201)
def create_profile(customer_id: uuid.UUID, payload: ProfileCreate, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    customer = db.get(Customer, customer_id)
    template = db.get(GarmentTemplate, payload.template_id)
    if not customer or customer.archived_at:
        raise HTTPException(404, "Customer not found")
    if not template or not template.active:
        raise HTTPException(404, "Garment template not found")
    profile = MeasurementProfile(
        customer_id=customer_id, template_id=template.id, profile_name=payload.profile_name.strip()
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return ProfileOut(
        id=profile.id, customer_id=customer_id, template_id=template.id,
        template_name=template.name, category=template.category,
        profile_name=profile.profile_name, created_at=profile.created_at
    )


@app.get("/api/v1/customers/{customer_id}/measurement-profiles", response_model=list[ProfileOut])
def list_profiles(customer_id: uuid.UUID, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    customer = db.get(Customer, customer_id)
    if not customer or customer.archived_at:
        raise HTTPException(404, "Customer not found")
    rows = db.execute(
        select(MeasurementProfile, GarmentTemplate)
        .join(GarmentTemplate, MeasurementProfile.template_id == GarmentTemplate.id)
        .where(MeasurementProfile.customer_id == customer_id, MeasurementProfile.archived_at.is_(None))
        .order_by(MeasurementProfile.created_at.desc())
    ).all()
    return [
        ProfileOut(
            id=p.id, customer_id=p.customer_id, template_id=p.template_id,
            template_name=t.name, category=t.category, profile_name=p.profile_name,
            created_at=p.created_at
        )
        for p, t in rows
    ]


@app.get("/api/v1/measurement-profiles", response_model=list[ProfileIndexOut])
def list_all_profiles(db: Session = Depends(get_db), _owner=Depends(require_owner)):
    rows = db.execute(
        select(MeasurementProfile, Customer, GarmentTemplate)
        .join(Customer, MeasurementProfile.customer_id == Customer.id)
        .join(GarmentTemplate, MeasurementProfile.template_id == GarmentTemplate.id)
        .where(MeasurementProfile.archived_at.is_(None), Customer.archived_at.is_(None))
        .order_by(Customer.name, MeasurementProfile.profile_name)
    ).all()
    profile_ids = [profile.id for profile, _, _ in rows]
    latest = dict(db.execute(
        select(MeasurementRecord.profile_id, func.max(MeasurementRecord.version))
        .where(MeasurementRecord.profile_id.in_(profile_ids))
        .group_by(MeasurementRecord.profile_id)
    ).all()) if profile_ids else {}
    return [ProfileIndexOut(
        id=profile.id, customer_id=customer.id, customer_name=customer.name,
        customer_code=customer.customer_code, phone=customer.phone,
        template_name=template.name, category=template.category,
        profile_name=profile.profile_name, latest_version=latest.get(profile.id),
    ) for profile, customer, template in rows]


def validate_measurements(fields: list[dict], values: dict[str, float]):
    error = measurement_validation_error(fields, values)
    if error:
        raise HTTPException(422, detail=error)


@app.post("/api/v1/measurement-profiles/{profile_id}/records", response_model=MeasurementOut, status_code=201)
def create_measurement(profile_id: uuid.UUID, payload: MeasurementCreate, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    profile = db.scalar(
        select(MeasurementProfile).options(joinedload(MeasurementProfile.template))
        .where(MeasurementProfile.id == profile_id, MeasurementProfile.archived_at.is_(None))
    )
    if not profile:
        raise HTTPException(404, "Measurement profile not found")
    template_version = db.get(GarmentTemplateVersion, payload.template_version_id)
    if not template_version or template_version.template_id != profile.template_id:
        raise HTTPException(422, "Template version does not match profile garment")
    validate_measurements(template_version.fields, payload.measurements)
    # Lock the profile row to serialize version allocation for this profile.
    db.execute(select(MeasurementProfile).where(MeasurementProfile.id == profile_id).with_for_update())
    latest = db.scalar(
        select(func.max(MeasurementRecord.version)).where(MeasurementRecord.profile_id == profile_id)
    ) or 0
    record = MeasurementRecord(
        profile_id=profile_id, version=latest + 1,
        template_version_id=template_version.id,
        measured_at=payload.measured_at or datetime.now(timezone.utc),
        unit=payload.unit, measurements=payload.measurements,
        fit_preference=payload.fit_preference, notes=payload.notes,
        change_reason=payload.change_reason,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/api/v1/measurement-profiles/{profile_id}/records", response_model=list[MeasurementOut])
def list_measurements(profile_id: uuid.UUID, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    profile = db.get(MeasurementProfile, profile_id)
    if not profile:
        raise HTTPException(404, "Measurement profile not found")
    return db.scalars(
        select(MeasurementRecord).where(MeasurementRecord.profile_id == profile_id)
        .order_by(MeasurementRecord.version.desc())
    ).all()


@app.get("/api/v1/measurement-records/{record_id}", response_model=MeasurementOut)
def get_measurement(record_id: uuid.UUID, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    record = db.get(MeasurementRecord, record_id)
    if not record:
        raise HTTPException(404, "Measurement record not found")
    return record
