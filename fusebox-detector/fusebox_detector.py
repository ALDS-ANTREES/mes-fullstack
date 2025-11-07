import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim
import random
import time
import os
import json

# --- 이미지 처리 함수 (변경 없음) ---
def detect_components(image):
    blurred = cv2.GaussianBlur(image, (5, 5), 0)
    hsv = cv2.cvtColor(blurred, cv2.COLOR_BGR2HSV)
    components = {}
    color_ranges = {
        "blue_body": ([90, 80, 80], [130, 255, 255]),
        "yellow_fuse": ([20, 100, 100], [30, 255, 255]),
        "red_fuse": ([0, 120, 120], [10, 255, 255])
    }
    for name, (lower, upper) in color_ranges.items():
        lower = np.array(lower, dtype="uint8")
        upper = np.array(upper, dtype="uint8")
        mask = cv2.inRange(hsv, lower, upper)
        if name == "red_fuse":
            lower2 = np.array([170, 120, 120], dtype="uint8")
            upper2 = np.array([180, 255, 255], dtype="uint8")
            mask2 = cv2.inRange(hsv, lower2, upper2)
            mask = cv2.bitwise_or(mask, mask2)
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            if cv2.contourArea(largest_contour) > 100:
                components[name] = cv2.boundingRect(largest_contour)
    return components

def compare_fuse_boxes(data_img_path, target_img_path, ssim_threshold=0.8, position_tolerance=20, size_tolerance_ratio=0.5):
    data_img = cv2.imread(data_img_path)
    target_img = cv2.imread(target_img_path)
    if data_img is None or target_img is None:
        return "ERROR: Image not found", None
    data_components = detect_components(data_img)
    target_components = detect_components(target_img)
    annotated_image = target_img.copy()
    defects = []
    processed_defects = set()
    for name, data_bbox in data_components.items():
        dx, dy, dw, dh = data_bbox
        if name not in target_components:
            if (name, 'missing') not in processed_defects:
                defects.append(f"{name} 누락")
                cv2.rectangle(annotated_image, (dx, dy), (dx + dw, dy + dh), (0, 0, 255), 2)
                cv2.putText(annotated_image, f"{name} Missing", (dx, dy - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                processed_defects.add((name, 'missing'))
            continue
        target_bbox = target_components[name]
        tx, ty, tw, th = target_bbox
        if abs(dx - tx) > position_tolerance or abs(dy - ty) > position_tolerance:
            if (name, 'misplaced') not in processed_defects:
                defects.append(f"{name} 위치 불량")
                cv2.rectangle(annotated_image, (tx, ty), (tx + tw, ty + th), (0, 165, 255), 2)
                cv2.putText(annotated_image, f"{name} Misplaced", (tx, ty - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)
                processed_defects.add((name, 'misplaced'))
        width_diff = abs(dw - tw) / float(dw)
        height_diff = abs(dh - th) / float(dh)
        if width_diff > size_tolerance_ratio or height_diff > size_tolerance_ratio:
            if (name, 'size') not in processed_defects:
                defects.append(f"{name} 크기 불량")
                cv2.rectangle(annotated_image, (tx, ty), (tx + tw, ty + th), (255, 0, 255), 2)
                cv2.putText(annotated_image, f"{name} Size Mismatch", (tx, ty - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 255), 2)
                processed_defects.add((name, 'size'))
        data_roi = data_img[dy:dy+dh, dx:dx+dw]
        target_roi = target_img[ty:ty+th, tx:tx+tw]
        target_roi_resized = cv2.resize(target_roi, (dw, dh))
        data_gray_roi = cv2.cvtColor(data_roi, cv2.COLOR_BGR2GRAY)
        target_gray_roi = cv2.cvtColor(target_roi_resized, cv2.COLOR_BGR2GRAY)
        score, _ = ssim(data_gray_roi, target_gray_roi, full=True)
        if score < ssim_threshold:
            if (name, 'shape') not in processed_defects:
                defects.append(f"{name} 모양 불량 (SSIM: {score:.2f})")
                cv2.rectangle(annotated_image, (tx, ty), (tx + tw, ty + th), (0, 255, 255), 2)
                cv2.putText(annotated_image, f"{name} Shape Mismatch", (tx, ty - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                processed_defects.add((name, 'shape'))
    for name, target_bbox in target_components.items():
        if name not in data_components:
            if (name, 'extra') not in processed_defects:
                defects.append(f"{name} 추가됨")
                tx, ty, tw, th = target_bbox
                cv2.rectangle(annotated_image, (tx, ty), (tx + tw, ty + th), (0, 255, 0), 2)
                cv2.putText(annotated_image, f"{name} Extra", (tx, ty - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                processed_defects.add((name, 'extra'))
    if not defects:
        result_string = "정상품"
    else:
        result_string = "불량: " + ", ".join(sorted(list(set(defects))))
    return result_string, annotated_image

def run_detection_process():
    """
    메인 이미지 처리 및 결과 출력 로직.
    """
    print("처리 시작...", flush=True)

    normal_image = "target/normal_fusebox.jpg"
    test_images_dir = "target"

    if not os.path.isdir(test_images_dir):
        print(json.dumps({"error": f"Directory not found: {test_images_dir}"}), flush=True)
        return

    test_images = [os.path.join(test_images_dir, f) for f in os.listdir(test_images_dir) if f.endswith('.jpg') and f.startswith('test')]
    random.shuffle(test_images)

    for i, test_image_path in enumerate(test_images, 1):
        result, annotated_image = compare_fuse_boxes(normal_image, test_image_path)
        
        is_defective = "불량" in result
        
        # 결과를 JSON 형태로 표준 출력
        output_data = {
            "device_id": f"DEVICE-{i}",
            "value": 101 if is_defective else 99,
            "image_path": test_image_path, # 이미지 경로도 함께 전달
            "defective": is_defective,
            "details": result
        }
        print(json.dumps(output_data), flush=True)

        if is_defective and annotated_image is not None:
            # 결과 이미지 저장
            if not os.path.exists("result"):
                os.makedirs("result")
            base_name = os.path.basename(test_image_path)
            file_name_without_ext = os.path.splitext(base_name)[0]
            output_filename = f"result/diff_bbox_{file_name_without_ext}.png"
            cv2.imwrite(output_filename, annotated_image)
        
        time.sleep(3)

    print("모든 테스트 완료.", flush=True)

if __name__ == "__main__":
    run_detection_process()
