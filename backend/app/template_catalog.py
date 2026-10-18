MEN_SHIRT = [
    ("neck", "Neck"), ("chest", "Chest"), ("waist", "Waist"),
    ("shoulder", "Shoulder"), ("shirt_length", "Shirt length"),
    ("sleeve_length", "Sleeve length"), ("bicep", "Bicep"),
    ("cuff", "Cuff"), ("armhole", "Armhole"), ("wrist", "Wrist"),
]
MEN_TROUSER = [
    ("waist", "Waist"), ("hip", "Hip / seat"), ("thigh", "Thigh"),
    ("knee", "Knee"), ("calf", "Calf"), ("bottom", "Bottom / hem"),
    ("outseam", "Outseam length"), ("inseam", "Inseam length"),
    ("front_rise", "Front rise"), ("back_rise", "Back rise"),
]
WOMEN_BLOUSE = [
    ("bust", "Bust"), ("underbust", "Underbust"), ("waist", "Waist"),
    ("shoulder", "Shoulder"), ("front_neck_depth", "Front neck depth"),
    ("back_neck_depth", "Back neck depth"), ("blouse_length", "Blouse length"),
    ("sleeve_length", "Sleeve length"), ("upper_arm", "Upper arm"),
    ("armhole", "Armhole"), ("apex_to_apex", "Apex to apex"),
    ("shoulder_to_apex", "Shoulder to apex"),
]
WOMEN_KURTI = [
    ("bust", "Bust"), ("waist", "Waist"), ("hip", "Hip"),
    ("shoulder", "Shoulder"), ("kurti_length", "Kurti length"),
    ("sleeve_length", "Sleeve length"), ("armhole", "Armhole"),
    ("upper_arm", "Upper arm"),
]
WOMEN_LEHENGA = [
    ("bust", "Bust"), ("underbust", "Underbust"), ("waist", "Waist"),
    ("high_hip", "High hip"), ("full_hip", "Full hip"),
    ("bodice_length", "Bodice length"), ("skirt_length", "Skirt length"),
    ("skirt_circumference", "Skirt circumference"),
]


def fields(items):
    return [
        {"key": key, "label": label, "type": "decimal", "required": True,
         "min": 1, "max": 100, "step": 0.25, "group": "Measurements",
         "display_order": i + 1, "help_text": ""}
        for i, (key, label) in enumerate(items)
    ]


TEMPLATES = [
    ("mens-shirt", "Men's shirt", "mens", MEN_SHIRT),
    ("mens-trouser", "Men's trouser", "mens", MEN_TROUSER),
    ("mens-kurta", "Men's kurta", "mens", MEN_SHIRT + [("kurta_length", "Kurta length")]),
    ("womens-blouse", "Women's blouse", "womens", WOMEN_BLOUSE),
    ("womens-kurti", "Women's kurti / suit top", "womens", WOMEN_KURTI),
    ("womens-lehenga", "Women's lehenga / gown", "womens", WOMEN_LEHENGA),
]

