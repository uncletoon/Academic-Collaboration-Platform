from html import escape
from pathlib import Path
import re
import sys


WORK = Path(__file__).resolve().parent
sys.path.insert(0, str(WORK))
from build_data_dictionary import TABLES  # noqa: E402


OUTPUT = Path(
    r"D:\Toon\My Doc\Classmate\Divine"
    r"\Simplified Physical Data Model - Main Tables.svg"
)

SELECTED = [
    "institutions",
    "departments",
    "users",
    "academic_communities",
    "projects",
    "events",
    "news",
    "notifications",
]

DISPLAY_NAMES = {
    "institutions": "INSTITUTIONS",
    "departments": "DEPARTMENTS",
    "users": "USERS",
    "academic_communities": "ACADEMIC COMMUNITIES",
    "projects": "PROJECTS",
    "events": "EVENTS",
    "news": "NEWS",
    "notifications": "NOTIFICATIONS",
}

PAGE_W = 5200
PAGE_H = 3700
BOX_W = 1420
HEADER_H = 76
COLUMNS_H = 58
ROW_H = 54

POSITIONS = {
    "institutions": (110, 250),
    "departments": (110, 910),
    "notifications": (110, 2200),
    "users": (1890, 1050),
    "academic_communities": (3670, 210),
    "projects": (3670, 1010),
    "events": (3670, 1900),
    "news": (3670, 2790),
}

TABLE_MAP = {name: fields for name, _description, fields in TABLES if name in SELECTED}

if set(TABLE_MAP) != set(SELECTED):
    missing = sorted(set(SELECTED) - set(TABLE_MAP))
    raise RuntimeError(f"Missing selected tables: {missing}")


def field_y(table_name: str, field_name: str) -> float:
    _, top = POSITIONS[table_name]
    fields = TABLE_MAP[table_name]
    index = next(i for i, field in enumerate(fields) if field["name"] == field_name)
    return top + HEADER_H + COLUMNS_H + index * ROW_H + ROW_H / 2


def box_height(table_name: str) -> int:
    return HEADER_H + COLUMNS_H + len(TABLE_MAP[table_name]) * ROW_H


def key_label(constraint: str) -> str:
    keys = []
    if re.search(r"\bPK\b", constraint):
        keys.append("PK")
    if re.search(r"\bFK\b", constraint):
        keys.append("FK")
    if "UNIQUE" in constraint or "UQ " in constraint:
        keys.append("UQ")
    return "/".join(keys)


def detail_label(constraint: str) -> str:
    if constraint == "-":
        return ""
    if "FK ->" in constraint:
        target = constraint.split("FK ->", 1)[1].split(";", 1)[0].strip()
        action = ""
        if "CASCADE" in constraint:
            action = " · CASCADE"
        elif "SET NULL" in constraint:
            action = " · SET NULL"
        return f"→ {target}{action}"
    if constraint.startswith("CHECK:"):
        value = constraint.replace("CHECK:", "").strip()
        return f"CHECK: {value}"
    if constraint == "UNIQUE":
        return "UNIQUE"
    if constraint.startswith("UQ with"):
        return constraint
    return constraint


def truncate(value: str, max_chars: int) -> str:
    return value if len(value) <= max_chars else value[: max_chars - 1] + "…"


def table_svg(table_name: str) -> str:
    left, top = POSITIONS[table_name]
    fields = TABLE_MAP[table_name]
    height = box_height(table_name)
    x_key = left + 45
    x_field = left + 150
    x_type = left + 560
    x_null = left + 885
    x_detail = left + 1010
    divider_x = [left + 120, left + 530, left + 855, left + 980]

    output = [
        f'<g id="table-{table_name}">',
        f'<rect x="{left}" y="{top}" width="{BOX_W}" height="{height}" '
        'rx="12" fill="#ffffff" stroke="#111111" stroke-width="4"/>',
        f'<text x="{left + BOX_W / 2}" y="{top + 49}" class="table-title" '
        f'text-anchor="middle">{escape(DISPLAY_NAMES[table_name])}</text>',
        f'<line x1="{left}" y1="{top + HEADER_H}" x2="{left + BOX_W}" '
        f'y2="{top + HEADER_H}" class="rule strong"/>',
        f'<text x="{x_key}" y="{top + HEADER_H + 38}" class="column-title">KEY</text>',
        f'<text x="{x_field}" y="{top + HEADER_H + 38}" class="column-title">FIELD</text>',
        f'<text x="{x_type}" y="{top + HEADER_H + 38}" class="column-title">DATA TYPE</text>',
        f'<text x="{x_null}" y="{top + HEADER_H + 38}" class="column-title">NULL</text>',
        f'<text x="{x_detail}" y="{top + HEADER_H + 38}" class="column-title">CONSTRAINT</text>',
        f'<line x1="{left}" y1="{top + HEADER_H + COLUMNS_H}" '
        f'x2="{left + BOX_W}" y2="{top + HEADER_H + COLUMNS_H}" class="rule"/>',
    ]

    for divider in divider_x:
        output.append(
            f'<line x1="{divider}" y1="{top + HEADER_H}" x2="{divider}" '
            f'y2="{top + height}" class="rule light"/>'
        )

    for index, field in enumerate(fields):
        row_top = top + HEADER_H + COLUMNS_H + index * ROW_H
        baseline = row_top + 36
        constraint = field["constraint"]
        output.extend(
            [
                f'<text x="{x_key}" y="{baseline}" class="cell key">'
                f'{escape(key_label(constraint))}</text>',
                f'<text x="{x_field}" y="{baseline}" class="cell field">'
                f'{escape(field["name"])}</text>',
                f'<text x="{x_type}" y="{baseline}" class="cell">'
                f'{escape(field["type"])}</text>',
                f'<text x="{x_null}" y="{baseline}" class="cell">'
                f'{escape(field["nullable"])}</text>',
                f'<text x="{x_detail}" y="{baseline}" class="cell detail">'
                f'{escape(truncate(detail_label(constraint), 28))}</text>',
            ]
        )
        if index < len(fields) - 1:
            output.append(
                f'<line x1="{left}" y1="{row_top + ROW_H}" '
                f'x2="{left + BOX_W}" y2="{row_top + ROW_H}" class="rule light"/>'
            )
    output.append("</g>")
    return "\n".join(output)


RELATIONSHIPS = [
    ("institutions", "id", "departments", "institution_id", "cascade", "right", "left", 1550),
    ("institutions", "id", "users", "institution_id", "set-null", "right", "left", 1650),
    ("departments", "id", "users", "department_id", "set-null", "right", "left", 1740),
    ("users", "id", "academic_communities", "created_by", "set-null", "right", "left", 3450),
    ("institutions", "id", "academic_communities", "institution_id", "set-null", "right", "left", 3370),
    ("users", "id", "projects", "created_by", "set-null", "right", "left", 3500),
    ("institutions", "id", "projects", "institution_id", "set-null", "right", "left", 3410),
    ("users", "id", "events", "organizer_id", "set-null", "right", "left", 3530),
    ("institutions", "id", "events", "institution_id", "set-null", "right", "left", 3440),
    ("users", "id", "news", "created_by", "set-null", "right", "left", 3560),
    ("users", "id", "notifications", "user_id", "cascade", "left", "right", 1660),
]


def relationship_svg(index: int, relationship: tuple) -> str:
    (
        source_table,
        source_field,
        target_table,
        target_field,
        delete_action,
        source_side,
        target_side,
        lane_x,
    ) = relationship
    sx0, _ = POSITIONS[source_table]
    tx0, _ = POSITIONS[target_table]
    sx = sx0 + BOX_W if source_side == "right" else sx0
    tx = tx0 + BOX_W if target_side == "right" else tx0
    sy = field_y(source_table, source_field)
    ty = field_y(target_table, target_field)
    path = f"M {sx} {sy} H {lane_x} V {ty} H {tx}"
    title = (
        f"{source_table}.{source_field} to {target_table}.{target_field}; "
        f"ON DELETE {delete_action.replace('-', ' ').upper()}"
    )
    return (
        f'<path id="rel-{index}" d="{path}" class="edge {delete_action}" '
        f'marker-start="url(#one)" marker-end="url(#many)">'
        f"<title>{escape(title)}</title></path>"
    )


def build_svg() -> str:
    relationships = "\n".join(
        relationship_svg(index, relationship)
        for index, relationship in enumerate(RELATIONSHIPS, start=1)
    )
    tables = "\n".join(table_svg(table_name) for table_name in SELECTED)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{PAGE_W}" height="{PAGE_H}"
     viewBox="0 0 {PAGE_W} {PAGE_H}">
  <defs>
    <style>
      text {{ font-family: Arial, Helvetica, sans-serif; fill: #111111; }}
      .main-title {{ font-size: 45px; font-weight: 700; }}
      .subtitle {{ font-size: 25px; }}
      .table-title {{ font-size: 29px; font-weight: 700; }}
      .column-title {{ font-size: 20px; font-weight: 700; }}
      .cell {{ font-size: 22px; }}
      .field {{ font-weight: 600; }}
      .key {{ font-weight: 700; }}
      .detail {{ font-size: 19px; }}
      .rule {{ stroke: #333333; stroke-width: 2; }}
      .rule.strong {{ stroke-width: 3; }}
      .rule.light {{ stroke: #aaaaaa; stroke-width: 1.4; }}
      .edge {{ fill: none; stroke: #111111; stroke-width: 4; }}
      .edge.set-null {{ stroke-dasharray: 15 10; }}
      .legend {{ font-size: 22px; }}
    </style>
    <marker id="one" markerWidth="18" markerHeight="18" refX="4" refY="9"
            orient="auto" markerUnits="userSpaceOnUse">
      <path d="M 3 1 L 3 17 M 9 1 L 9 17" fill="none"
            stroke="#111111" stroke-width="3"/>
    </marker>
    <marker id="many" markerWidth="25" markerHeight="24" refX="23" refY="12"
            orient="auto" markerUnits="userSpaceOnUse">
      <path d="M 23 12 L 2 2 M 23 12 L 2 12 M 23 12 L 2 22"
            fill="none" stroke="#111111" stroke-width="3"/>
    </marker>
  </defs>
  <rect x="0" y="0" width="{PAGE_W}" height="{PAGE_H}" fill="#ffffff"/>
  <text x="{PAGE_W / 2}" y="72" class="main-title" text-anchor="middle">
    PHYSICAL DATA MODEL — MAIN SYSTEM TABLES
  </text>
  <text x="{PAGE_W / 2}" y="116" class="subtitle" text-anchor="middle">
    Cross-Institutional Academic Collaboration and Real-Time Event Notification System
  </text>
  <g transform="translate(1650, 145)">
    <path d="M 0 18 H 105" class="edge cascade"
          marker-start="url(#one)" marker-end="url(#many)"/>
    <text x="130" y="26" class="legend">one-to-many; solid = CASCADE</text>
    <path d="M 750 18 H 855" class="edge set-null"
          marker-start="url(#one)" marker-end="url(#many)"/>
    <text x="880" y="26" class="legend">dashed = SET NULL</text>
  </g>
  <g id="relationships">{relationships}</g>
  <g id="tables">{tables}</g>
  <text x="{PAGE_W / 2}" y="{PAGE_H - 35}" class="subtitle" text-anchor="middle">
    PK = Primary Key · FK = Foreign Key · UQ = Unique Constraint
  </text>
</svg>
"""


if __name__ == "__main__":
    OUTPUT.write_text(build_svg(), encoding="utf-8")
    selected_fields = sum(len(TABLE_MAP[name]) for name in SELECTED)
    print(f"Created: {OUTPUT}")
    print(f"Tables: {len(SELECTED)}")
    print(f"Fields: {selected_fields}")
    print(f"Relationships: {len(RELATIONSHIPS)}")
