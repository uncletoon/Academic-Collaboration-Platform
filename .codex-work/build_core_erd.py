from html import escape
from pathlib import Path


OUTPUT = Path(
    r"D:\Toon\My Doc\Classmate\Divine"
    r"\ERD - Main Academic Collaboration Entities.svg"
)

PAGE_W = 7600
PAGE_H = 5000
ENTITY_W = 560
ENTITY_H = 180
ATTRIBUTE_W = 370
ATTRIBUTE_H = 125

ENTITIES = {
    "Institution": {
        "center": (900, 1450),
        "attributes": ["institution_id", "name", "type", "location"],
        "position": "top",
    },
    "Department": {
        "center": (2700, 1450),
        "attributes": ["department_id", "name"],
        "position": "top",
    },
    "User": {
        "center": (4650, 1450),
        "attributes": ["user_id", "email", "full_name", "role", "status"],
        "position": "top",
    },
    "Notification": {
        "center": (6600, 1450),
        "attributes": ["notification_id", "title", "type", "is_read", "created_at"],
        "position": "top",
    },
    "Community": {
        "center": (900, 3550),
        "attributes": ["community_id", "name", "category", "privacy_type"],
        "position": "bottom",
    },
    "Project": {
        "center": (2700, 3550),
        "attributes": ["project_id", "title", "status", "access_scope"],
        "position": "bottom",
    },
    "Event": {
        "center": (4650, 3550),
        "attributes": ["event_id", "title", "event_date", "location", "capacity"],
        "position": "bottom",
    },
    "News": {
        "center": (6600, 3550),
        "attributes": ["news_id", "title", "category", "external_link", "created_at"],
        "position": "bottom",
    },
}

RELATIONSHIPS = [
    {
        "name": "HAS",
        "center": (1800, 1450),
        "source": "Institution",
        "target": "Department",
        "source_cardinality": "1",
        "target_cardinality": "N",
    },
    {
        "name": "HAS",
        "center": (3675, 1450),
        "source": "Department",
        "target": "User",
        "source_cardinality": "1",
        "target_cardinality": "N",
    },
    {
        "name": "AFFILIATES",
        "center": (2800, 2050),
        "source": "Institution",
        "target": "User",
        "source_cardinality": "1",
        "target_cardinality": "N",
    },
    {
        "name": "RECEIVES",
        "center": (5625, 1450),
        "source": "User",
        "target": "Notification",
        "source_cardinality": "1",
        "target_cardinality": "N",
    },
    {
        "name": "CREATES",
        "center": (2700, 2520),
        "source": "User",
        "target": "Community",
        "source_cardinality": "1",
        "target_cardinality": "N",
    },
    {
        "name": "CREATES",
        "center": (3650, 2700),
        "source": "User",
        "target": "Project",
        "source_cardinality": "1",
        "target_cardinality": "N",
    },
    {
        "name": "ORGANIZES",
        "center": (4650, 2520),
        "source": "User",
        "target": "Event",
        "source_cardinality": "1",
        "target_cardinality": "N",
    },
    {
        "name": "PUBLISHES",
        "center": (5650, 2700),
        "source": "User",
        "target": "News",
        "source_cardinality": "1",
        "target_cardinality": "N",
    },
]


def attribute_offsets(count: int, position: str) -> list[tuple[int, int]]:
    top_patterns = {
        2: [(-300, -650), (300, -650)],
        4: [(-600, -600), (-210, -900), (210, -900), (600, -600)],
        5: [
            (-660, -570),
            (-345, -890),
            (0, -1010),
            (345, -890),
            (660, -570),
        ],
    }
    points = top_patterns[count]
    if position == "bottom":
        return [(x, -y) for x, y in points]
    return points


def entity_anchor(entity_name: str, toward: tuple[int, int]) -> tuple[float, float]:
    cx, cy = ENTITIES[entity_name]["center"]
    tx, ty = toward
    dx = tx - cx
    dy = ty - cy
    if dx == 0 and dy == 0:
        return cx, cy
    x_scale = ENTITY_W / 2 / abs(dx) if dx else float("inf")
    y_scale = ENTITY_H / 2 / abs(dy) if dy else float("inf")
    scale = min(x_scale, y_scale)
    return cx + dx * scale, cy + dy * scale


def diamond_anchor(
    center: tuple[int, int], toward: tuple[int, int], width: int = 500, height: int = 190
) -> tuple[float, float]:
    cx, cy = center
    tx, ty = toward
    dx = tx - cx
    dy = ty - cy
    denominator = abs(dx) / (width / 2) + abs(dy) / (height / 2)
    scale = 1 / denominator if denominator else 0
    return cx + dx * scale, cy + dy * scale


def attribute_svg(entity_name: str) -> str:
    entity = ENTITIES[entity_name]
    cx, cy = entity["center"]
    attributes = entity["attributes"]
    offsets = attribute_offsets(len(attributes), entity["position"])
    output = []
    entity_edge_y = cy - ENTITY_H / 2 if entity["position"] == "top" else cy + ENTITY_H / 2

    for attribute, (offset_x, offset_y) in zip(attributes, offsets):
        ax = cx + offset_x
        ay = cy + offset_y
        ellipse_edge_y = ay + ATTRIBUTE_H / 2 if entity["position"] == "top" else ay - ATTRIBUTE_H / 2
        output.append(
            f'<line x1="{cx}" y1="{entity_edge_y}" x2="{ax}" y2="{ellipse_edge_y}" '
            'class="attribute-line"/>'
        )
        output.append(
            f'<ellipse cx="{ax}" cy="{ay}" rx="{ATTRIBUTE_W / 2}" ry="{ATTRIBUTE_H / 2}" '
            'class="attribute"/>'
        )
        primary_key = attribute.endswith("_id") and attribute.startswith(
            entity_name.lower().replace("institution", "institution")
        )
        text_class = "attribute-text primary-key" if primary_key else "attribute-text"
        output.append(
            f'<text x="{ax}" y="{ay + 11}" class="{text_class}" text-anchor="middle">'
            f"{escape(attribute)}</text>"
        )
    return "\n".join(output)


def entity_svg(entity_name: str) -> str:
    cx, cy = ENTITIES[entity_name]["center"]
    left = cx - ENTITY_W / 2
    top = cy - ENTITY_H / 2
    return (
        f'<g id="entity-{entity_name.lower()}">'
        f'<rect x="{left}" y="{top}" width="{ENTITY_W}" height="{ENTITY_H}" '
        'class="entity"/>'
        f'<text x="{cx}" y="{cy + 15}" class="entity-text" text-anchor="middle">'
        f"{escape(entity_name)}</text>"
        "</g>"
    )


def relationship_svg(index: int, relationship: dict) -> str:
    center = relationship["center"]
    source_center = ENTITIES[relationship["source"]]["center"]
    target_center = ENTITIES[relationship["target"]]["center"]
    source_point = entity_anchor(relationship["source"], center)
    target_point = entity_anchor(relationship["target"], center)
    source_diamond = diamond_anchor(center, source_center)
    target_diamond = diamond_anchor(center, target_center)
    cx, cy = center
    half_w = 250
    half_h = 95
    points = f"{cx},{cy-half_h} {cx+half_w},{cy} {cx},{cy+half_h} {cx-half_w},{cy}"

    def cardinality_position(
        entity_point: tuple[float, float], diamond_point: tuple[float, float]
    ) -> tuple[float, float]:
        x = entity_point[0] * 0.64 + diamond_point[0] * 0.36
        y = entity_point[1] * 0.64 + diamond_point[1] * 0.36 - 30
        return x, y

    source_card = cardinality_position(source_point, source_diamond)
    target_card = cardinality_position(target_point, target_diamond)
    return f"""
    <g id="relationship-{index}">
      <line x1="{source_point[0]:.1f}" y1="{source_point[1]:.1f}"
            x2="{source_diamond[0]:.1f}" y2="{source_diamond[1]:.1f}"
            class="relationship-line"/>
      <line x1="{target_diamond[0]:.1f}" y1="{target_diamond[1]:.1f}"
            x2="{target_point[0]:.1f}" y2="{target_point[1]:.1f}"
            class="relationship-line"/>
      <polygon points="{points}" class="relationship"/>
      <text x="{cx}" y="{cy + 2}" class="relationship-text" text-anchor="middle">
        {escape(relationship["name"])}
      </text>
      <text x="{cx}" y="{cy + 47}" class="relationship-cardinality" text-anchor="middle">
        1 : N
      </text>
      <text x="{source_card[0]:.1f}" y="{source_card[1]:.1f}"
            class="cardinality" text-anchor="middle">{relationship["source_cardinality"]}</text>
      <text x="{target_card[0]:.1f}" y="{target_card[1]:.1f}"
            class="cardinality" text-anchor="middle">{relationship["target_cardinality"]}</text>
    </g>"""


def build_svg() -> str:
    attributes = "\n".join(attribute_svg(name) for name in ENTITIES)
    relationships = "\n".join(
        relationship_svg(index, relationship)
        for index, relationship in enumerate(RELATIONSHIPS, start=1)
    )
    entities = "\n".join(entity_svg(name) for name in ENTITIES)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{PAGE_W}" height="{PAGE_H}"
     viewBox="0 0 {PAGE_W} {PAGE_H}">
  <defs>
    <style>
      text {{ font-family: Arial, Helvetica, sans-serif; }}
      .entity {{ fill: #5794f7; stroke: #3c78d8; stroke-width: 5; }}
      .entity-text {{ fill: #ffffff; font-size: 42px; font-weight: 700; }}
      .attribute {{ fill: #58df91; stroke: #43c77b; stroke-width: 4; }}
      .attribute-text {{ fill: #111111; font-size: 31px; font-weight: 600; }}
      .primary-key {{ text-decoration: underline; font-weight: 800; }}
      .attribute-line {{ stroke: #a5a5a5; stroke-width: 5; }}
      .relationship {{ fill: #2f2f2f; stroke: #222222; stroke-width: 5; }}
      .relationship-text {{ fill: #ffffff; font-size: 31px; font-weight: 700; }}
      .relationship-cardinality {{ fill: #ffffff; font-size: 25px; font-weight: 700; }}
      .relationship-line {{ stroke: #6e6e6e; stroke-width: 6; }}
      .cardinality {{ fill: #111111; font-size: 35px; font-weight: 800;
                      paint-order: stroke; stroke: #ffffff; stroke-width: 12px; }}
    </style>
  </defs>
  <rect x="0" y="0" width="{PAGE_W}" height="{PAGE_H}" fill="#ffffff"/>
  <g id="attributes">{attributes}</g>
  <g id="relationships">{relationships}</g>
  <g id="entities">{entities}</g>
</svg>
"""


if __name__ == "__main__":
    OUTPUT.write_text(build_svg(), encoding="utf-8")
    attribute_count = sum(len(entity["attributes"]) for entity in ENTITIES.values())
    print(f"Created: {OUTPUT}")
    print(f"Entities: {len(ENTITIES)}")
    print(f"Attributes: {attribute_count}")
    print(f"Relationships: {len(RELATIONSHIPS)}")
