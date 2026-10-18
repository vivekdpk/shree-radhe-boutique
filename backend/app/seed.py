from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.models import GarmentTemplate, GarmentTemplateVersion

from app.template_catalog import TEMPLATES, fields


def seed_templates(db: Session) -> None:
    for key, name, category, template_fields in TEMPLATES:
        template = db.scalar(select(GarmentTemplate).where(GarmentTemplate.template_key == key))
        if template:
            continue
        template = GarmentTemplate(template_key=key, name=name, category=category, active=True)
        db.add(template)
        db.flush()
        db.add(GarmentTemplateVersion(template_id=template.id, version=1, fields=fields(template_fields)))
    db.commit()
