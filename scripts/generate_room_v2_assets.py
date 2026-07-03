#!/usr/bin/env python3
"""Generate no-cost low-poly GLB assets for room-v2-library.html.

The room can hot-swap these files from models/v2/.  This script avoids paid
text-to-3D services by making simple, warm, rounded-ish study room props.
"""

from __future__ import annotations

import json
import math
import struct
from dataclasses import dataclass, field
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "models" / "v2"


def rgba(hex_color: int, alpha: float = 1.0) -> list[float]:
    return [
        ((hex_color >> 16) & 255) / 255,
        ((hex_color >> 8) & 255) / 255,
        (hex_color & 255) / 255,
        alpha,
    ]


@dataclass
class Primitive:
    name: str
    color: int
    positions: list[tuple[float, float, float]] = field(default_factory=list)
    normals: list[tuple[float, float, float]] = field(default_factory=list)
    indices: list[int] = field(default_factory=list)

    def add_vertex(self, pos, normal) -> int:
        self.positions.append(pos)
        self.normals.append(normal)
        return len(self.positions) - 1

    def extend(self, positions, normals, indices):
        offset = len(self.positions)
        self.positions.extend(positions)
        self.normals.extend(normals)
        self.indices.extend([offset + i for i in indices])


class Asset:
    def __init__(self, name: str):
        self.name = name
        self.prims: list[Primitive] = []

    def prim(self, name: str, color: int) -> Primitive:
        p = Primitive(name, color)
        self.prims.append(p)
        return p

    def write(self, filename: str):
        OUT.mkdir(parents=True, exist_ok=True)
        write_glb(OUT / filename, self)


def add_box(p: Primitive, center, size, color_normal_boost=False):
    cx, cy, cz = center
    sx, sy, sz = (v / 2 for v in size)
    corners = {
        "lbf": (cx - sx, cy - sy, cz + sz),
        "rbf": (cx + sx, cy - sy, cz + sz),
        "rtf": (cx + sx, cy + sy, cz + sz),
        "ltf": (cx - sx, cy + sy, cz + sz),
        "lbb": (cx - sx, cy - sy, cz - sz),
        "rbb": (cx + sx, cy - sy, cz - sz),
        "rtb": (cx + sx, cy + sy, cz - sz),
        "ltb": (cx - sx, cy + sy, cz - sz),
    }
    faces = [
        (("lbf", "rbf", "rtf", "ltf"), (0, 0, 1)),
        (("rbb", "lbb", "ltb", "rtb"), (0, 0, -1)),
        (("rbf", "rbb", "rtb", "rtf"), (1, 0, 0)),
        (("lbb", "lbf", "ltf", "ltb"), (-1, 0, 0)),
        (("ltf", "rtf", "rtb", "ltb"), (0, 1, 0)),
        (("lbb", "rbb", "rbf", "lbf"), (0, -1, 0)),
    ]
    for keys, normal in faces:
        start = len(p.positions)
        for k in keys:
            p.add_vertex(corners[k], normal)
        p.indices.extend([start, start + 1, start + 2, start, start + 2, start + 3])


def add_cylinder(p: Primitive, center, radius, height, segments=16, color=None):
    cx, cy, cz = center
    top_y = cy + height / 2
    bot_y = cy - height / 2
    top_center = p.add_vertex((cx, top_y, cz), (0, 1, 0))
    bot_center = p.add_vertex((cx, bot_y, cz), (0, -1, 0))
    top = []
    bot = []
    for i in range(segments):
        a = i * math.tau / segments
        x = cx + math.cos(a) * radius
        z = cz + math.sin(a) * radius
        n = (math.cos(a), 0, math.sin(a))
        top.append(p.add_vertex((x, top_y, z), n))
        bot.append(p.add_vertex((x, bot_y, z), n))
    for i in range(segments):
        j = (i + 1) % segments
        p.indices.extend([top[i], bot[i], bot[j], top[i], bot[j], top[j]])
        p.indices.extend([top_center, top[j], top[i]])
        p.indices.extend([bot_center, bot[i], bot[j]])


def add_cone(p: Primitive, center, radius, height, segments=16):
    cx, cy, cz = center
    apex = p.add_vertex((cx, cy + height / 2, cz), (0, 1, 0))
    base_center = p.add_vertex((cx, cy - height / 2, cz), (0, -1, 0))
    ring = []
    for i in range(segments):
        a = i * math.tau / segments
        x = cx + math.cos(a) * radius
        z = cz + math.sin(a) * radius
        n = (math.cos(a), radius / max(height, 0.01), math.sin(a))
        ring.append(p.add_vertex((x, cy - height / 2, z), n))
    for i in range(segments):
        j = (i + 1) % segments
        p.indices.extend([apex, ring[i], ring[j]])
        p.indices.extend([base_center, ring[j], ring[i]])


def add_uv_sphere(p: Primitive, center, scale, rings=5, segments=10):
    cx, cy, cz = center
    sx, sy, sz = scale
    ids = []
    for r in range(rings + 1):
        v = r / rings
        theta = v * math.pi
        row = []
        for s in range(segments):
            u = s / segments
            phi = u * math.tau
            nx = math.sin(theta) * math.cos(phi)
            ny = math.cos(theta)
            nz = math.sin(theta) * math.sin(phi)
            row.append(p.add_vertex((cx + nx * sx, cy + ny * sy, cz + nz * sz), (nx, ny, nz)))
        ids.append(row)
    for r in range(rings):
        for s in range(segments):
            a = ids[r][s]
            b = ids[r][(s + 1) % segments]
            c = ids[r + 1][(s + 1) % segments]
            d = ids[r + 1][s]
            p.indices.extend([a, d, c, a, c, b])


def add_rounded_boxish(asset: Asset, name, color, center, size):
    p = asset.prim(name, color)
    add_box(p, center, size)
    return p


def build_desk():
    a = Asset("desk")
    wood = a.prim("warm birch desk wood", 0xDDB987)
    add_box(wood, (0, 0.72, 0), (1.55, 0.14, 0.72))
    add_box(wood, (0, 0.61, 0.18), (1.36, 0.08, 0.18))
    for x in [-0.62, 0.62]:
        for z in [-0.26, 0.26]:
            add_cylinder(wood, (x, 0.33, z), 0.045, 0.66, 10)
    add_box(wood, (0.48, 0.55, 0.18), (0.42, 0.18, 0.08))
    paper = a.prim("open cream study book", 0xFFF1CD)
    add_box(paper, (-0.15, 0.81, -0.06), (0.34, 0.025, 0.23))
    add_box(paper, (0.18, 0.81, -0.06), (0.34, 0.025, 0.23))
    note = a.prim("blue notebook accent", 0x78B6C8)
    add_box(note, (-0.52, 0.82, 0.12), (0.30, 0.035, 0.16))
    a.write("desk.glb")


def build_chair():
    a = Asset("chair")
    wood = a.prim("light birch chair", 0xCFAC79)
    add_box(wood, (0, 0.48, 0), (0.62, 0.12, 0.56))
    for x in [-0.24, 0.24]:
        for z in [-0.20, 0.20]:
            add_cylinder(wood, (x, 0.25, z), 0.035, 0.50, 10)
    add_box(wood, (0, 0.83, 0.25), (0.66, 0.10, 0.08))
    add_box(wood, (0, 1.05, 0.25), (0.66, 0.10, 0.08))
    for x in [-0.26, 0.26]:
        add_cylinder(wood, (x, 0.80, 0.25), 0.035, 0.72, 10)
    a.write("chair.glb")


def build_bookcase():
    a = Asset("bookcase")
    frame = a.prim("rounded birch bookcase", 0xDDB987)
    add_box(frame, (0, 1.25, 0), (1.12, 2.50, 0.28))
    back = a.prim("warm shelf backing", 0xF0DAB5)
    add_box(back, (0, 1.25, -0.05), (0.95, 2.25, 0.08))
    shelf = a.prim("shelf rails", 0xB98A55)
    for y in [0.40, 0.82, 1.24, 1.66, 2.08]:
        add_box(shelf, (0, y, 0.10), (0.95, 0.055, 0.26))
    colors = [0x7FAE8C, 0xD8A99C, 0x82B2C5, 0xD7BE72, 0xAFA3D1, 0xE7CFA3]
    for row, y in enumerate([0.55, 0.97, 1.39, 1.81]):
        for i in range(8):
            p = a.prim(f"soft pastel book {row}-{i}", colors[(row + i) % len(colors)])
            x = -0.38 + i * 0.11
            h = 0.22 + (i % 3) * 0.05
            add_box(p, (x, y + h / 2, 0.20), (0.065, h, 0.12))
    a.write("bookcase.glb")


def build_sideboard():
    a = Asset("sideboard")
    wood = a.prim("low birch sideboard", 0xD8B582)
    add_box(wood, (0, 0.42, 0), (1.25, 0.74, 0.45))
    add_box(wood, (0, 0.83, 0), (1.35, 0.10, 0.52))
    seam = a.prim("soft cabinet seams", 0xB88B58)
    add_box(seam, (0, 0.44, 0.235), (0.025, 0.42, 0.025))
    for x in [-0.18, 0.18]:
        add_cylinder(seam, (x, 0.47, 0.26), 0.025, 0.025, 10)
    a.write("sideboard.glb")


def build_pendant():
    a = Asset("pendant")
    cord = a.prim("short bronze cord", 0x9C7B45)
    add_cylinder(cord, (0, 0.55, 0), 0.018, 0.86, 10)
    shade = a.prim("warm brass pendant shade", 0xC9A96E)
    add_cone(shade, (0, 0.08, 0), 0.34, 0.20, 18)
    bulb = a.prim("warm bulb", 0xFFE6A6)
    add_uv_sphere(bulb, (0, -0.03, 0), (0.095, 0.095, 0.095), 4, 10)
    a.write("pendant.glb")


def build_plant(big=True):
    a = Asset("plant" if big else "plant-small")
    pot = a.prim("white ribbed ceramic pot", 0xF4F0E7)
    scale = 1.0 if big else 0.55
    add_cylinder(pot, (0, 0.18 * scale, 0), 0.22 * scale, 0.36 * scale, 16)
    rib = a.prim("soft pot ribs", 0xD9D2C5)
    for i in range(8):
        ang = i * math.tau / 8
        add_box(rib, (math.cos(ang) * 0.225 * scale, 0.18 * scale, math.sin(ang) * 0.225 * scale), (0.014 * scale, 0.30 * scale, 0.014 * scale))
    leaf = a.prim("sage green leaves", 0x8FAE7F if big else 0x96B786)
    count = 11 if big else 7
    for i in range(count):
        ang = i * math.tau / count
        r = 0.25 * scale + (i % 3) * 0.045 * scale
        x = math.cos(ang) * r
        z = math.sin(ang) * r
        y = (0.52 + (i % 4) * 0.055) * scale
        add_uv_sphere(leaf, (x, y, z), (0.13 * scale, 0.055 * scale, 0.20 * scale), 4, 8)
    flower = a.prim("tiny pale blooms", 0xF2B7C2)
    for i in range(4 if big else 2):
        ang = i * math.tau / max(1, (4 if big else 2))
        add_uv_sphere(flower, (math.cos(ang) * 0.18 * scale, 0.67 * scale, math.sin(ang) * 0.16 * scale), (0.032 * scale, 0.032 * scale, 0.032 * scale), 3, 8)
    a.write("plant.glb" if big else "plant-small.glb")


def pack_floats(values):
    return b"".join(struct.pack("<f", v) for row in values for v in row)


def pack_uints(values):
    return b"".join(struct.pack("<I", v) for v in values)


def pad4(data: bytes, pad=b"\x00") -> bytes:
    return data + pad * ((4 - len(data) % 4) % 4)


def write_glb(path: Path, asset: Asset):
    buffer = b""
    buffer_views = []
    accessors = []
    materials = []
    primitives_json = []

    def add_blob(blob: bytes, target: int) -> int:
        nonlocal buffer
        buffer = pad4(buffer)
        offset = len(buffer)
        buffer += pad4(blob)
        buffer_views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(blob), "target": target})
        return len(buffer_views) - 1

    for prim in asset.prims:
        if not prim.positions or not prim.indices:
            continue
        mat_idx = len(materials)
        materials.append({
            "name": prim.name,
            "pbrMetallicRoughness": {
                "baseColorFactor": rgba(prim.color),
                "roughnessFactor": 0.88,
                "metallicFactor": 0.0,
            },
        })
        pos_view = add_blob(pack_floats(prim.positions), 34962)
        norm_view = add_blob(pack_floats(prim.normals), 34962)
        idx_view = add_blob(pack_uints(prim.indices), 34963)
        mins = [min(v[i] for v in prim.positions) for i in range(3)]
        maxs = [max(v[i] for v in prim.positions) for i in range(3)]
        pos_acc = len(accessors)
        accessors.append({"bufferView": pos_view, "componentType": 5126, "count": len(prim.positions), "type": "VEC3", "min": mins, "max": maxs})
        norm_acc = len(accessors)
        accessors.append({"bufferView": norm_view, "componentType": 5126, "count": len(prim.normals), "type": "VEC3"})
        idx_acc = len(accessors)
        accessors.append({"bufferView": idx_view, "componentType": 5125, "count": len(prim.indices), "type": "SCALAR"})
        primitives_json.append({
            "attributes": {"POSITION": pos_acc, "NORMAL": norm_acc},
            "indices": idx_acc,
            "material": mat_idx,
            "mode": 4,
        })

    gltf = {
        "asset": {"version": "2.0", "generator": "SoFa room-v2 procedural asset generator"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": asset.name}],
        "meshes": [{"name": asset.name, "primitives": primitives_json}],
        "materials": materials,
        "buffers": [{"byteLength": len(buffer)}],
        "bufferViews": buffer_views,
        "accessors": accessors,
    }
    json_chunk = pad4(json.dumps(gltf, separators=(",", ":")).encode("utf-8"), b" ")
    bin_chunk = pad4(buffer)
    total_len = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
    out = [
        struct.pack("<III", 0x46546C67, 2, total_len),
        struct.pack("<I4s", len(json_chunk), b"JSON"),
        json_chunk,
        struct.pack("<I4s", len(bin_chunk), b"BIN\x00"),
        bin_chunk,
    ]
    path.write_bytes(b"".join(out))
    print(f"wrote {path.relative_to(ROOT)} ({path.stat().st_size} bytes)")


def main():
    build_desk()
    build_chair()
    build_bookcase()
    build_sideboard()
    build_pendant()
    build_plant(True)
    build_plant(False)


if __name__ == "__main__":
    main()
