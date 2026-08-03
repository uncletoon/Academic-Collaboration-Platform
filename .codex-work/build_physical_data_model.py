from __future__ import annotations

import html
import importlib.util
from collections import Counter, defaultdict
from pathlib import Path


WORKSPACE = Path(r"D:\Toon\My Doc\Classmate\Divine\Collaboration")
DATA_DICTIONARY_BUILDER = WORKSPACE / ".codex-work" / "build_data_dictionary.py"
OUTPUT_SVG = Path(
    r"D:\Toon\My Doc\Classmate\Divine\Physical Data Model - Academic Collaboration System.svg"
)


def load_table_definitions():
    spec = importlib.util.spec_from_file_location("data_dictionary", DATA_DICTIONARY_BUILDER)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module.TABLES


RAW_TABLES = load_table_definitions()
TABLES = {
    name: {"purpose": purpose, "fields": fields}
    for name, purpose, fields in RAW_TABLES
}


# Parent table, child table, child FK column, referential action.
RELATIONSHIPS = [
    ("institutions", "departments", "institution_id", "CASCADE"),
    ("institutions", "users", "institution_id", "SET NULL"),
    ("departments", "users", "department_id", "SET NULL"),
    ("users", "academic_communities", "created_by", "SET NULL"),
    ("institutions", "academic_communities", "institution_id", "SET NULL"),
    ("academic_communities", "community_members", "community_id", "CASCADE"),
    ("users", "community_members", "user_id", "CASCADE"),
    ("academic_communities", "community_invitations", "community_id", "CASCADE"),
    ("users", "community_invitations", "user_id", "CASCADE"),
    ("users", "posts", "user_id", "CASCADE"),
    ("academic_communities", "posts", "community_id", "CASCADE"),
    ("posts", "comments", "post_id", "CASCADE"),
    ("users", "comments", "user_id", "CASCADE"),
    ("posts", "likes", "post_id", "CASCADE"),
    ("users", "likes", "user_id", "CASCADE"),
    ("users", "projects", "created_by", "SET NULL"),
    ("institutions", "projects", "institution_id", "SET NULL"),
    ("projects", "project_members", "project_id", "CASCADE"),
    ("users", "project_members", "user_id", "CASCADE"),
    ("projects", "project_join_requests", "project_id", "CASCADE"),
    ("users", "project_join_requests", "user_id", "CASCADE"),
    ("users", "project_join_requests", "responded_by", "SET NULL"),
    ("projects", "project_files", "project_id", "CASCADE"),
    ("users", "project_files", "uploaded_by", "SET NULL"),
    ("users", "events", "organizer_id", "SET NULL"),
    ("institutions", "events", "institution_id", "SET NULL"),
    ("events", "event_registrations", "event_id", "CASCADE"),
    ("users", "event_registrations", "user_id", "CASCADE"),
    ("users", "news", "created_by", "SET NULL"),
    ("news", "news_documents", "news_id", "CASCADE"),
    ("chat_rooms", "chat_members", "room_id", "CASCADE"),
    ("users", "chat_members", "user_id", "CASCADE"),
    ("chat_rooms", "chat_messages", "room_id", "CASCADE"),
    ("users", "chat_messages", "sender_id", "CASCADE"),
    ("users", "notifications", "user_id", "CASCADE"),
]


POSITIONS = {
    # Core identity and institution data
    "institutions": (90, 1770),
    "departments": (1080, 1790),
    "users": (2070, 1640),
    # Communities and academic content
    "academic_communities": (1030, 250),
    "community_members": (2070, 230),
    "community_invitations": (3110, 220),
    "posts": (2070, 700),
    "comments": (3110, 700),
    "likes": (4150, 740),
    # Projects
    "projects": (4650, 1180),
    "project_members": (5680, 1160),
    "project_join_requests": (5680, 1630),
    "project_files": (4650, 2060),
    # Events and public news
    "events": (90, 2660),
    "event_registrations": (1080, 2800),
    "news": (90, 3570),
    "news_documents": (1080, 3640),
    # Chat and notifications
    "chat_rooms": (3110, 3020),
    "chat_members": (4150, 2960),
    "chat_messages": (4150, 3440),
    "notifications": (5390, 3160),
}


CANVAS_W = 6500
CANVAS_H = 4300
NODE_W = 880
TITLE_H = 42
COLUMN_H = 28
ROW_H = 28
COLUMNS = (110, 380, 300, 90)  # Key, field, type, null


def esc(value):
    return html.escape(str(value), quote=True)


def field_index(table_name, field_name):
    for index, field in enumerate(TABLES[table_name]["fields"]):
        if field["name"] == field_name:
            return index
    raise KeyError(f"{table_name}.{field_name}")


def node_height(table_name):
    return TITLE_H + COLUMN_H + ROW_H * len(TABLES[table_name]["fields"])


def field_center_y(table_name, field_name):
    _, top = POSITIONS[table_name]
    return top + TITLE_H + COLUMN_H + ROW_H * field_index(table_name, field_name) + ROW_H / 2


def key_marker(field):
    constraint = field["constraint"].upper()
    parts = []
    if "PK" in constraint:
        parts.append("PK")
    if "FK" in constraint:
        parts.append("FK")
    if "UQ" in constraint and "PK" not in constraint:
        parts.append("UQ")
    return "/".join(parts) if parts else ""


def validate_model():
    errors = []
    if len(TABLES) != 21:
        errors.append(f"Expected 21 tables; found {len(TABLES)}")
    field_count = sum(len(table["fields"]) for table in TABLES.values())
    if field_count != 130:
        errors.append(f"Expected 130 fields; found {field_count}")

    actual_fk_fields = set()
    for table_name, table in TABLES.items():
        for field in table["fields"]:
            if "FK" in field["constraint"].upper():
                actual_fk_fields.add((table_name, field["name"]))

    diagram_fk_fields = set()
    for parent, child, child_field, _ in RELATIONSHIPS:
        if parent not in TABLES:
            errors.append(f"Missing parent table: {parent}")
        if child not in TABLES:
            errors.append(f"Missing child table: {child}")
        try:
            child_spec = TABLES[child]["fields"][field_index(child, child_field)]
        except (KeyError, IndexError):
            errors.append(f"Missing FK field: {child}.{child_field}")
            continue
        if "FK" not in child_spec["constraint"].upper():
            errors.append(f"Relationship field is not marked FK: {child}.{child_field}")
        diagram_fk_fields.add((child, child_field))

    missing = sorted(actual_fk_fields - diagram_fk_fields)
    extra = sorted(diagram_fk_fields - actual_fk_fields)
    if missing:
        errors.append(f"FK fields missing from diagram: {missing}")
    if extra:
        errors.append(f"Unexpected diagram relationships: {extra}")
    if len(RELATIONSHIPS) != 35:
        errors.append(f"Expected 35 FK relationships; found {len(RELATIONSHIPS)}")
    if errors:
        raise RuntimeError("\n".join(errors))
    return field_count


def draw_node(table_name, sequence):
    x, y = POSITIONS[table_name]
    fields = TABLES[table_name]["fields"]
    height = node_height(table_name)
    col_x = [x]
    for width in COLUMNS:
        col_x.append(col_x[-1] + width)

    chunks = [
        f'<g id="table-{esc(table_name)}">',
        f'<rect x="{x}" y="{y}" width="{NODE_W}" height="{height}" rx="10" '
        'fill="#ffffff" stroke="#111111" stroke-width="2.2"/>',
        f'<line x1="{x}" y1="{y + TITLE_H}" x2="{x + NODE_W}" y2="{y + TITLE_H}" '
        'stroke="#111111" stroke-width="2"/>',
        f'<line x1="{x}" y1="{y + TITLE_H + COLUMN_H}" x2="{x + NODE_W}" '
        f'y2="{y + TITLE_H + COLUMN_H}" stroke="#111111" stroke-width="1.6"/>',
        f'<text x="{x + 14}" y="{y + 28}" class="table-seq">T{sequence:02d}</text>',
        f'<text x="{x + NODE_W / 2}" y="{y + 28}" class="table-title" '
        f'text-anchor="middle">{esc(table_name.upper())}</text>',
    ]

    headers = ("KEY", "FIELD", "DATA TYPE", "NULL")
    for index, header in enumerate(headers):
        center = (col_x[index] + col_x[index + 1]) / 2
        chunks.append(
            f'<text x="{center}" y="{y + TITLE_H + 20}" '
            f'class="column-title" text-anchor="middle">{header}</text>'
        )
    for boundary in col_x[1:-1]:
        chunks.append(
            f'<line x1="{boundary}" y1="{y + TITLE_H}" x2="{boundary}" '
            f'y2="{y + height}" stroke="#333333" stroke-width="1"/>'
        )

    for index, field in enumerate(fields):
        row_top = y + TITLE_H + COLUMN_H + ROW_H * index
        row_mid = row_top + 19
        if index:
            chunks.append(
                f'<line x1="{x}" y1="{row_top}" x2="{x + NODE_W}" y2="{row_top}" '
                'stroke="#666666" stroke-width="0.8"/>'
            )
        marker = key_marker(field)
        marker_class = "key-text strong" if marker else "key-text"
        chunks.extend(
            [
                f'<text x="{x + COLUMNS[0] / 2}" y="{row_mid}" class="{marker_class}" '
                f'text-anchor="middle">{esc(marker)}</text>',
                f'<text x="{col_x[1] + 10}" y="{row_mid}" class="field-text">'
                f'{esc(field["name"])}</text>',
                f'<text x="{(col_x[2] + col_x[3]) / 2}" y="{row_mid}" '
                f'class="type-text" text-anchor="middle">{esc(field["type"])}</text>',
                f'<text x="{(col_x[3] + col_x[4]) / 2}" y="{row_mid}" '
                f'class="null-text" text-anchor="middle">'
                f'{"Y" if field["nullable"] == "Yes" else "N"}</text>',
            ]
        )
    chunks.append("</g>")
    return "\n".join(chunks)


def edge_ports(parent, child, child_field):
    px, py = POSITIONS[parent]
    cx, cy = POSITIONS[child]
    ph = node_height(parent)
    ch = node_height(child)
    parent_row = "id"
    if not any(field["name"] == "id" for field in TABLES[parent]["fields"]):
        parent_row = TABLES[parent]["fields"][0]["name"]
    sy = field_center_y(parent, parent_row)
    ey = field_center_y(child, child_field)
    parent_center = px + NODE_W / 2
    child_center = cx + NODE_W / 2
    if child_center >= parent_center:
        sx = px + NODE_W
        ex = cx
        direction = 1
    else:
        sx = px
        ex = cx + NODE_W
        direction = -1
    return sx, sy, ex, ey, direction, (px, py, ph), (cx, cy, ch)


def draw_edges():
    pair_counts = Counter((p, c) for p, c, _, _ in RELATIONSHIPS)
    pair_seen = defaultdict(int)
    chunks = ['<g id="relationships">']

    for index, (parent, child, child_field, action) in enumerate(RELATIONSHIPS):
        sx, sy, ex, ey, direction, pbox, cbox = edge_ports(parent, child, child_field)
        pair_key = (parent, child)
        duplicate_offset = pair_seen[pair_key] - (pair_counts[pair_key] - 1) / 2
        pair_seen[pair_key] += 1

        px, py, ph = pbox
        cx, cy, ch = cbox
        horizontal_gap = max(cx, px) - min(px + NODE_W, cx + NODE_W)
        if horizontal_gap > 80:
            lane = (sx + ex) / 2 + duplicate_offset * 34
        else:
            if direction > 0:
                lane = max(px + NODE_W, cx + NODE_W) + 75 + index % 4 * 18
            else:
                lane = min(px, cx) - 75 - index % 4 * 18

        path = f"M {sx:.1f} {sy:.1f} H {lane:.1f} V {ey:.1f} H {ex:.1f}"
        edge_class = "edge cascade" if action == "CASCADE" else "edge set-null"
        chunks.append(
            f'<path id="rel-{index + 1}" d="{path}" class="{edge_class}" '
            f'marker-start="url(#one)" marker-end="url(#many)">'
            f'<title>{esc(parent)}.id -> {esc(child)}.{esc(child_field)} '
            f'({esc(action)})</title></path>'
        )

    chunks.append("</g>")
    return "\n".join(chunks)


def group_label(x, y, text, width):
    return (
        f'<g><text x="{x}" y="{y}" class="group-title">{esc(text)}</text>'
        f'<line x1="{x}" y1="{y + 9}" x2="{x + width}" y2="{y + 9}" '
        'stroke="#777777" stroke-width="1"/></g>'
    )


def build_svg():
    field_count = validate_model()
    style = """
    <style>
      text { font-family: Arial, Helvetica, sans-serif; fill: #111111; }
      .main-title { font-size: 38px; font-weight: 700; letter-spacing: 0.5px; }
      .subtitle { font-size: 18px; fill: #444444; }
      .legend { font-size: 16px; fill: #333333; }
      .group-title { font-size: 17px; font-weight: 700; fill: #555555; letter-spacing: 1.2px; }
      .table-title { font-size: 19px; font-weight: 700; }
      .table-seq { font-size: 13px; font-weight: 700; fill: #555555; }
      .column-title { font-size: 13px; font-weight: 700; }
      .key-text, .field-text, .type-text, .null-text { font-size: 14px; }
      .strong { font-weight: 700; }
      .edge { fill: none; stroke: #505050; stroke-width: 1.7; }
      .cascade { stroke-dasharray: none; }
      .set-null { stroke: #707070; stroke-dasharray: 8 6; }
    </style>
    """
    defs = """
    <defs>
      <marker id="one" markerWidth="14" markerHeight="18" refX="1" refY="9"
              orient="auto-start-reverse" markerUnits="userSpaceOnUse">
        <path d="M 2 2 L 2 16 M 6 2 L 6 16" fill="none"
              stroke="#444444" stroke-width="1.8"/>
      </marker>
      <marker id="many" markerWidth="18" markerHeight="20" refX="16" refY="10"
              orient="auto" markerUnits="userSpaceOnUse">
        <path d="M 16 10 L 2 2 M 16 10 L 2 10 M 16 10 L 2 18"
              fill="none" stroke="#444444" stroke-width="1.8"/>
      </marker>
    </defs>
    """

    table_order = list(TABLES.keys())
    nodes = "\n".join(draw_node(name, index + 1) for index, name in enumerate(table_order))
    groups = "\n".join(
        [
            group_label(90, 1710, "CORE INSTITUTION & USER TABLES", 640),
            group_label(1030, 190, "COMMUNITY & CONTENT TABLES", 610),
            group_label(4650, 1120, "PROJECT COLLABORATION TABLES", 620),
            group_label(90, 2600, "EVENT & PUBLIC NEWS TABLES", 570),
            group_label(3110, 2890, "CHAT & NOTIFICATION TABLES", 560),
        ]
    )
    legend = """
      <g id="legend" transform="translate(90,108)">
        <text x="0" y="0" class="subtitle">
          PostgreSQL implementation: 21 tables, 130 fields and 35 foreign-key relationships
        </text>
        <path d="M 0 36 H 96" class="edge cascade" marker-start="url(#one)"
              marker-end="url(#many)"/>
        <text x="116" y="42" class="legend">1-to-many; solid line = ON DELETE CASCADE</text>
        <path d="M 540 36 H 636" class="edge set-null" marker-start="url(#one)"
              marker-end="url(#many)"/>
        <text x="656" y="42" class="legend">dashed line = ON DELETE SET NULL</text>
        <text x="1120" y="42" class="legend">
          PK = primary key   FK = foreign key   UQ = unique   NULL: Y/N
        </text>
      </g>
    """

    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{CANVAS_W}" height="{CANVAS_H}"
     viewBox="0 0 {CANVAS_W} {CANVAS_H}" role="img"
     aria-labelledby="diagram-title diagram-desc">
  <title id="diagram-title">Physical Data Model - Academic Collaboration System</title>
  <desc id="diagram-desc">Field-level PostgreSQL physical data model containing all
  twenty-one tables and thirty-five foreign-key relationships.</desc>
  <rect width="100%" height="100%" fill="#ffffff"/>
  {style}
  {defs}
  <text x="{CANVAS_W / 2}" y="58" class="main-title" text-anchor="middle">
    PHYSICAL DATA MODEL - CROSS-INSTITUTIONAL ACADEMIC COLLABORATION SYSTEM
  </text>
  {legend}
  {groups}
  {draw_edges()}
  {nodes}
</svg>
"""
    OUTPUT_SVG.write_text(svg, encoding="utf-8")
    print(f"Created: {OUTPUT_SVG}")
    print(f"Tables: {len(TABLES)}")
    print(f"Fields: {field_count}")
    print(f"Relationships: {len(RELATIONSHIPS)}")


if __name__ == "__main__":
    build_svg()
