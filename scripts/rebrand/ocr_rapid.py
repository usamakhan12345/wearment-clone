"""
OCR images with RapidOCR (PaddleOCR models via onnxruntime). Read-only on the images.

For every text region it writes the rotated quadrilateral (original pixels) plus the text's
reading direction, which RapidOCR does not return directly: wide boxes read along p0->p1, tall
boxes (h/w >= 1.5) are rotated 90 deg counter-clockwise before recognition so they read along
p0->p3, and when the angle classifier flipped the crop 180 deg the direction is reversed.

Used by find-labels.ts. Install once, outside the project:

    python -m venv <dir>/venv
    <dir>/venv/Scripts/python.exe -m pip install rapidocr-onnxruntime

Run:  python -I ocr_rapid.py <out.jsonl> <scale> @<listfile>     (one image path per line)
One JSON object per image is appended to <out.jsonl>, so a long run can be watched or resumed.
"""
import json
import math
import os
import sys
import tempfile

import cv2
import numpy as np
from rapidocr_onnxruntime import RapidOCR
from rapidocr_onnxruntime.main import DEFAULT_CFG_PATH

CLS_THRESH = 0.9  # RapidOCR's default: flip the crop only when the classifier is this sure.


def geometry(poly, flipped):
    p = np.array(poly, dtype=float)
    width = max(np.linalg.norm(p[0] - p[1]), np.linalg.norm(p[2] - p[3]))
    height = max(np.linalg.norm(p[0] - p[3]), np.linalg.norm(p[1] - p[2]))
    tall = height / max(width, 1e-6) >= 1.5
    direction = (p[3] - p[0]) + (p[2] - p[1]) if tall else (p[1] - p[0]) + (p[2] - p[3])
    if flipped:
        direction = -direction
    return {
        "cx": float(p[:, 0].mean()),
        "cy": float(p[:, 1].mean()),
        "length": float(height if tall else width),
        "thick": float(width if tall else height),
        "angle": float(math.degrees(math.atan2(direction[1], direction[0]))),
    }


def build_engine():
    # OCR_THREADS limits onnxruntime's threads per process; several workers each grabbing every
    # core just fight each other.
    threads = int(os.environ.get("OCR_THREADS", "0"))
    if threads > 0:
        text = open(DEFAULT_CFG_PATH, encoding="utf-8").read()
        text = text.replace("&intra_nums -1", f"&intra_nums {threads}").replace("&inter_nums -1", "&inter_nums 1")
        config_path = os.path.join(tempfile.mkdtemp(), "rapidocr.yaml")
        with open(config_path, "w", encoding="utf-8") as handle:
            handle.write(text)
        engine = RapidOCR(config_path=config_path)
    else:
        engine = RapidOCR()
    state = {"cls": [], "flips": []}

    original_cls = engine.text_cls

    def cls_wrap(images):
        result = original_cls(images)  # (images, cls_res, elapse)
        state["cls"] = result[1] or []
        return result

    def filter_wrap(boxes, rec_res):
        if boxes is None or rec_res is None:
            return None, None
        kept_boxes, kept_rec, flips = [], [], []
        for index, (box, rec) in enumerate(zip(boxes, rec_res)):
            if float(rec[1]) >= engine.text_score:
                kept_boxes.append(box)
                kept_rec.append(rec)
                label = state["cls"][index] if index < len(state["cls"]) else ["0", 0.0]
                flips.append("180" in str(label[0]) and float(label[1]) > CLS_THRESH)
        state["flips"] = flips
        return kept_boxes, kept_rec

    engine.text_cls = cls_wrap
    engine.filter_result = filter_wrap
    return engine, state


def main() -> None:
    out_path, scale_arg, list_arg = sys.argv[1:4]
    scale = float(scale_arg)
    with open(list_arg.lstrip("@"), encoding="utf-8") as handle:
        paths = [line.strip() for line in handle if line.strip()]

    engine, state = build_engine()
    with open(out_path, "a", encoding="utf-8") as out:
        for path in paths:
            image = cv2.imread(path)
            if image is None:
                out.write(json.dumps({"file": path, "error": "unreadable", "regions": []}) + "\n")
                out.flush()
                continue
            if scale != 1.0:
                image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
            state["cls"], state["flips"] = [], []
            try:
                found, _ = engine(image)
            except Exception as error:  # keep going; one bad image must not stop the run
                out.write(json.dumps({"file": path, "error": str(error), "regions": []}) + "\n")
                out.flush()
                continue

            regions = []
            for (poly, text, score), flipped in zip(found or [], state["flips"]):
                scaled = [[x / scale, y / scale] for x, y in poly]
                geo = geometry(scaled, flipped)
                regions.append(
                    {
                        "text": text,
                        "score": float(score),
                        "flipped": bool(flipped),
                        "poly": [[round(x, 1), round(y, 1)] for x, y in scaled],
                        **{key: round(value, 2) for key, value in geo.items()},
                    }
                )
            out.write(json.dumps({"file": path, "regions": regions}) + "\n")
            out.flush()


if __name__ == "__main__":
    main()
