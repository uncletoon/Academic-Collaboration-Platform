from html import escape
from pathlib import Path


OUTPUT_DIR = Path(r"D:\Toon\My Doc\Classmate\Divine")
LEVEL0_SVG = OUTPUT_DIR / "DFD Level 0 - Academic Collaboration System.svg"
LEVEL1_SVG = OUTPUT_DIR / "DFD Level 1 - Academic Collaboration System.svg"

CYAN = "#43c8eb"
LIGHT_CYAN = "#dff7fd"
INK = "#111111"
FLOW = "#454545"


def svg_header(width: int, height: int) -> str:
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}"
     viewBox="0 0 {width} {height}">
  <defs>
    <style>
      text {{ font-family: Arial, Helvetica, sans-serif; fill: {INK}; }}
      .entity {{ fill: {CYAN}; stroke: {INK}; stroke-width: 5; }}
      .entity-text {{ font-size: 46px; font-weight: 700; }}
      .process-outer {{ fill: {CYAN}; stroke: {INK}; stroke-width: 5; }}
      .process-body {{ fill: #ffffff; stroke: {INK}; stroke-width: 3; }}
      .process-number {{ font-size: 34px; font-weight: 700; }}
      .process-title {{ font-size: 38px; font-weight: 700; }}
      .context-title {{ font-size: 54px; font-weight: 800; }}
      .store {{ fill: {LIGHT_CYAN}; stroke: {INK}; stroke-width: 5; }}
      .store-code {{ font-size: 34px; font-weight: 700; }}
      .store-name {{ font-size: 30px; font-weight: 700; }}
      .flow {{ fill: none; stroke: {FLOW}; stroke-width: 6; stroke-linejoin: round; }}
      .flow-label {{ fill: #111111; font-size: 31px; font-weight: 700; }}
      .small-label {{ fill: #111111; font-size: 26px; font-weight: 700; }}
    </style>
    <marker id="arrow" markerWidth="18" markerHeight="18" refX="15" refY="9"
            orient="auto" markerUnits="userSpaceOnUse">
      <path d="M 1 1 L 16 9 L 1 17" fill="none" stroke="{FLOW}" stroke-width="4"/>
    </marker>
  </defs>
'''


def multiline_text(x: float, y: float, lines: list[str], css_class: str,
                   anchor: str = "middle", line_height: int = 38) -> str:
    tspans = []
    for index, line in enumerate(lines):
        dy = 0 if index == 0 else line_height
        tspans.append(
            f'<tspan x="{x}" dy="{dy}">{escape(line)}</tspan>'
        )
    return (
        f'<text x="{x}" y="{y}" class="{css_class}" '
        f'text-anchor="{anchor}">' + "".join(tspans) + "</text>"
    )


def external_entity(x: int, y: int, width: int, height: int, label: str,
                    font_size: int | None = None) -> str:
    style = f' style="font-size:{font_size}px"' if font_size else ""
    lines = label.split("|")
    effective_size = font_size or 46
    line_gap = round(effective_size * 0.95)
    first_y = y + height / 2 + effective_size * 0.18 - (len(lines) - 1) * line_gap / 2
    text = []
    for index, line in enumerate(lines):
        dy = 0 if index == 0 else line_gap
        text.append(f'<tspan x="{x + width / 2}" dy="{dy}">{escape(line)}</tspan>')
    return f'''
    <g>
      <rect x="{x}" y="{y}" width="{width}" height="{height}" rx="36"
            class="entity"/>
      <text x="{x + width / 2}" y="{first_y}"
            class="entity-text" text-anchor="middle"{style}>{''.join(text)}</text>
    </g>'''


def context_process(x: int, y: int, width: int, height: int) -> str:
    header_h = 160
    footer_h = 140
    return f'''
    <g id="process-0">
      <rect x="{x}" y="{y}" width="{width}" height="{height}" rx="24"
            class="process-outer"/>
      <rect x="{x}" y="{y + header_h}" width="{width}"
            height="{height - header_h - footer_h}" class="process-body"/>
      <line x1="{x + 190}" y1="{y}" x2="{x + 190}" y2="{y + header_h}"
            stroke="{INK}" stroke-width="4"/>
      <text x="{x + 95}" y="{y + 104}" class="process-number"
            text-anchor="middle">0</text>
      {multiline_text(x + width / 2, y + 520,
          ["CROSS-INSTITUTIONAL", "ACADEMIC COLLABORATION", "AND REAL-TIME EVENT", "NOTIFICATION SYSTEM"],
          "context-title", line_height=125)}
    </g>'''


def arrow_path(path_id: str, d: str, label_lines: list[str], lx: float, ly: float,
               label_class: str = "flow-label", both: bool = False,
               anchor: str = "middle", line_height: int = 32,
               label_box: tuple[int, int] | None = None) -> str:
    start_marker = ' marker-start="url(#arrow)"' if both else ""
    box = ""
    if label_box:
        box_width, box_height = label_box
        if anchor == "middle":
            box_x = lx - box_width / 2
        elif anchor == "end":
            box_x = lx - box_width
        else:
            box_x = lx
        box_y = ly - 70
        box = (
            f'<rect x="{box_x}" y="{box_y}" width="{box_width}" '
            f'height="{box_height}" rx="18" fill="#ffffff" fill-opacity="0.96"/>'
        )
    return f'''
    <g id="{path_id}">
      <path d="{d}" class="flow"{start_marker} marker-end="url(#arrow)"/>
      {box}
      {multiline_text(lx, ly, label_lines, label_class, anchor=anchor, line_height=line_height)}
    </g>'''


def build_level0() -> str:
    width, height = 6500, 4000
    process_x, process_y, process_w, process_h = 2200, 1300, 2100, 1400
    parts = [svg_header(width, height),
             f'<rect x="0" y="0" width="{width}" height="{height}" fill="#ffffff"/>',
             '''<style>
                  .entity-text { font-size: 92px; }
                  .process-number { font-size: 68px; }
                  .context-title { font-size: 108px; }
                  .flow-label { font-size: 62px; }
                </style>''']

    parts.extend([
        external_entity(100, 250, 900, 450, "Student"),
        external_entity(100, 3300, 900, 450, "Lecturer"),
        external_entity(5500, 250, 900, 450, "Institutional|Administrator", 84),
        external_entity(5500, 3300, 900, 450, "System Admin", 84),
    ])

    # Data flows are drawn before the central process so the box hides line ends cleanly.
    parts.extend([
        arrow_path("l0-student-in", "M 1000 400 L 2200 1540",
                   ["Login, profile and", "collaboration requests"],
                   1510, 835, line_height=76, label_box=(1050, 180)),
        arrow_path("l0-student-out", "M 2200 1740 L 1000 580",
                   ["Results, messages and", "event notifications"],
                   1510, 1100, line_height=76, label_box=(1050, 180)),
        arrow_path("l0-lecturer-in", "M 1000 3450 L 2200 2260",
                   ["Academic content,", "projects, events and news"],
                   1510, 2900, line_height=76, label_box=(1050, 180)),
        arrow_path("l0-lecturer-out", "M 2200 2460 L 1000 3600",
                   ["Responses, reports,", "messages and notifications"],
                   1510, 3170, line_height=76, label_box=(1050, 180)),
        arrow_path("l0-inst-admin-in", "M 5500 400 L 4300 1540",
                   ["Institution, department", "and user data"],
                   4990, 835, line_height=76, label_box=(1050, 180)),
        arrow_path("l0-inst-admin-out", "M 4300 1740 L 5500 580",
                   ["Reports, user status and", "administrative alerts"],
                   4990, 1100, line_height=76, label_box=(1050, 180)),
        arrow_path("l0-system-admin-in", "M 5500 3450 L 4300 2260",
                   ["System configuration", "and security commands"],
                   4990, 2900, line_height=76, label_box=(1050, 180)),
        arrow_path("l0-system-admin-out", "M 4300 2460 L 5500 3600",
                   ["Reports, logs, health", "and security alerts"],
                   4990, 3170, line_height=76, label_box=(1050, 180)),
        context_process(process_x, process_y, process_w, process_h),
        "</svg>",
    ])
    return "\n".join(parts)


def process_box(number: str, x: int, y: int, width: int, height: int,
                title_lines: list[str]) -> str:
    header_h = 86
    return f'''
    <g id="process-{number.replace('.', '-')}">
      <rect x="{x}" y="{y}" width="{width}" height="{height}" rx="22"
            class="process-outer"/>
      <rect x="{x}" y="{y + header_h}" width="{width}" height="{height - header_h - 42}"
            class="process-body"/>
      <line x1="{x + 150}" y1="{y}" x2="{x + 150}" y2="{y + header_h}"
            stroke="{INK}" stroke-width="4"/>
      <text x="{x + 75}" y="{y + 57}" class="process-number"
            text-anchor="middle">{escape(number)}</text>
      {multiline_text(x + width / 2, y + 165, title_lines,
                      "process-title", line_height=60)}
    </g>'''


def data_store(code: str, x: int, y: int, width: int, height: int,
               name_lines: list[str]) -> str:
    return f'''
    <g id="store-{code.lower()}">
      <rect x="{x}" y="{y}" width="{width}" height="{height}" class="store"/>
      <line x1="{x + 155}" y1="{y}" x2="{x + 155}" y2="{y + height}"
            stroke="{INK}" stroke-width="4"/>
      <text x="{x + 77}" y="{y + height / 2 + 11}" class="store-code"
            text-anchor="middle">{escape(code)}</text>
      {multiline_text(x + 155 + (width - 155) / 2, y + height / 2 - 10,
                      name_lines, "store-name", line_height=52)}
    </g>'''


def build_level1() -> str:
    width, height = 7600, 4500
    parts = [svg_header(width, height),
             f'<rect x="0" y="0" width="{width}" height="{height}" fill="#ffffff"/>',
             '''<style>
                  .entity-text { font-size: 62px; }
                  .process-number { font-size: 48px; }
                  .process-title { font-size: 56px; }
                  .store-code { font-size: 48px; }
                  .store-name { font-size: 44px; }
                  .small-label { font-size: 36px; }
                </style>''']

    # External entities.
    parts.extend([
        external_entity(80, 260, 900, 280, "Student"),
        external_entity(80, 1260, 900, 280, "Lecturer"),
        external_entity(80, 2700, 900, 300, "Institutional|Administrator", 56),
        external_entity(80, 4020, 900, 280, "System Admin", 60),
    ])

    process_w, process_h = 1350, 470
    processes = {
        "1.0": (1550, 1770, ["AUTHENTICATE, AUTHORIZE", "AND ROUTE REQUESTS"]),
        "2.0": (3500, 250, ["MANAGE COMMUNITIES", "AND CONTENT"]),
        "3.0": (3500, 1100, ["MANAGE PROJECTS", "AND SHARED FILES"]),
        "4.0": (3500, 1950, ["MANAGE EVENTS", "AND REGISTRATIONS"]),
        "5.0": (3500, 2800, ["MANAGE NEWS", "AND DOCUMENTS"]),
        "6.0": (3500, 3650, ["REAL-TIME CHAT", "AND NOTIFICATIONS"]),
        "7.0": (1550, 600, ["INSTITUTIONAL", "ADMINISTRATION"]),
        "8.0": (1550, 3570, ["SYSTEM ADMINISTRATION", "AND MONITORING"]),
    }

    # Data stores. Each store groups the named physical tables from the implemented schema.
    stores = {
        "D1": (5900, 250, ["IDENTITY AND INSTITUTION DATA", "institutions · departments · users"]),
        "D2": (5900, 980, ["COMMUNITY AND CONTENT DATA", "communities · members · posts · comments · likes"]),
        "D3": (5900, 1710, ["PROJECT DATA", "projects · members · requests · files"]),
        "D4": (5900, 2440, ["EVENT DATA", "events · registrations"]),
        "D5": (5900, 3170, ["NEWS DATA", "news · news documents"]),
        "D6": (5900, 3900, ["CHAT AND NOTIFICATION DATA", "rooms · members · messages · notifications"]),
    }

    # Actor exchanges.
    parts.extend([
        arrow_path("l1-student-access", "M 980 400 L 1550 1900",
                   ["Login, profile and", "service requests"], 1190, 980,
                   "small-label", both=True),
        arrow_path("l1-lecturer-access", "M 980 1400 L 1550 1990",
                   ["Login, academic content", "and collaboration requests"], 1230, 1580,
                   "small-label", both=True),
        arrow_path("l1-inst-access", "M 980 2810 L 1550 2080",
                   ["Administrator login", "and access response"], 1220, 2500,
                   "small-label", both=True),
        arrow_path("l1-inst-manage", "M 980 2860 L 1550 815",
                   ["Institution setup,", "user control and reports"], 1120, 2150,
                   "small-label", both=True),
        arrow_path("l1-system-manage", "M 980 4160 L 1550 3785",
                   ["Configuration, monitoring", "and global reports"], 1240, 3970,
                   "small-label", both=True),
    ])

    # Authorized requests routed from Process 1.0 to the main service modules.
    parts.extend([
        arrow_path("l1-route-community", "M 2900 1855 L 3500 465",
                   ["Community request"], 3200, 1040, "small-label"),
        arrow_path("l1-route-project", "M 2900 1935 L 3500 1315",
                   ["Project request"], 3200, 1570, "small-label"),
        arrow_path("l1-route-event", "M 2900 2015 L 3500 2165",
                   ["Event request"], 3200, 1990, "small-label"),
        arrow_path("l1-route-news", "M 2900 2095 L 3500 3015",
                   ["News request"], 3210, 2640, "small-label"),
        arrow_path("l1-route-realtime", "M 2900 2175 L 3500 3865",
                   ["Chat and alert request"], 3200, 3050, "small-label"),
    ])

    # Process/data-store exchanges.
    parts.extend([
        arrow_path("l1-p1-d1", "M 2900 1815 L 5900 390",
                   ["Accounts and institution data"], 5100, 780,
                   "small-label", both=True),
        arrow_path("l1-p7-d1", "M 2900 815 L 5900 420",
                   ["Institution and user records"], 4300, 640,
                   "small-label", both=True),
        arrow_path("l1-p2-d2", "M 4850 465 L 5900 1195",
                   ["Community and content data"], 5420, 840,
                   "small-label", both=True),
        arrow_path("l1-p3-d3", "M 4850 1315 L 5900 1925",
                   ["Project and file data"], 5400, 1640,
                   "small-label", both=True),
        arrow_path("l1-p4-d4", "M 4850 2165 L 5900 2655",
                   ["Event and registration data"], 5420, 2440,
                   "small-label", both=True),
        arrow_path("l1-p5-d5", "M 4850 3015 L 5900 3385",
                   ["News and document data"], 5420, 3210,
                   "small-label", both=True),
        arrow_path("l1-p6-d6", "M 4850 3865 L 5900 4115",
                   ["Chat and notification data"], 5400, 3990,
                   "small-label", both=True),
        arrow_path("l1-p8-d6", "M 2900 3785 L 5900 4210",
                   ["Monitoring and admin alerts"], 4350, 4050,
                   "small-label", both=True),
    ])

    # Draw nodes after flows so connectors end cleanly at their borders.
    parts.extend(
        process_box(number, x, y, process_w, process_h, title)
        for number, (x, y, title) in processes.items()
    )
    parts.extend(
        data_store(code, x, y, 1600, 330, name)
        for code, (x, y, name) in stores.items()
    )
    parts.append("</svg>")
    return "\n".join(parts)


if __name__ == "__main__":
    LEVEL0_SVG.write_text(build_level0(), encoding="utf-8")
    LEVEL1_SVG.write_text(build_level1(), encoding="utf-8")
    print(f"Created: {LEVEL0_SVG}")
    print(f"Created: {LEVEL1_SVG}")
    print("Level 0: 4 external entities, 1 system process, 8 directed flows")
    print("Level 1: 4 external entities, 8 processes, 6 grouped data stores")
