/**
 * Test Case List
 * เคสบังคับ (จาก template ใน Workshop):
 * - Happy: validBody → next()
 * - Error: ไม่ส่ง title → 400
 * - Error: title "" → 400
 * - Error: category_id "1" → 400
 * - Error: title " " → 400
 * - Error: status_id 99 → 400
 *
 * เคสที่ออกแบบเอง (คนละหมวดกับเคสบังคับ):
 * - Input: ไม่มี image | Expected: 400 "Image is required"
 *   เหตุผล: โพสต์ต้องมีรูป ป้องกันข้อมูลไม่ครบ
 * - Input: content เป็น 123 | Expected: 400 "Content is must be a string"
 *   เหตุผล: ป้องกันชนิดเนื้อหาผิดซึ่งส่งผลต่อการแสดงบทความ
 * ใช้ validBody เป็นฐาน และเปลี่ยนเฉพาะ field ของแต่ละเคส
 */
import { describe, test, expect, vi } from "vitest";
import validatePostData from "../middleware/postValidation.mjs";
import { validBody } from "./support/post-fixture.mjs";

const makeRes = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
});

describe("validatePostData", () => {
  test("Happy: validBody เรียก next หนึ่งครั้ง", () => {
    // Arrange
    const req = { body: validBody() };
    const res = makeRes();
    const next = vi.fn();
    // Act
    validatePostData(req, res, next);
    // Assert
    expect(next).toHaveBeenCalledExactlyOnceWith();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test.each([
    ["ไม่ส่ง title", { title: undefined }, "Title is required"],
    ["title ว่าง", { title: "" }, "Title is required"],
    ["category_id เป็น string", { category_id: "1" }, "Category ID must be a number"],
    ["title เป็นช่องว่าง", { title: " " }, "Title is required"],
    ["status_id นอกค่าที่อนุญาต", { status_id: 99 }, "Status ID must be 1 or 2"],
    ["ออกแบบเอง: ไม่มี image", { image: undefined }, "Image is required"],
    ["ออกแบบเอง: content เป็นตัวเลข", { content: 123 }, "Content is must be a string"],
  ])("Error: %s", (_name, changes, message) => {
    // Arrange
    const body = { ...validBody(), ...changes };
    for (const key of Object.keys(body)) {
      if (body[key] === undefined) delete body[key];
    }
    const req = { body };
    const res = makeRes();
    const next = vi.fn();
    // Act
    validatePostData(req, res, next);
    // Assert
    expect(res.status).toHaveBeenCalledExactlyOnceWith(400);
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ message });
    expect(next).not.toHaveBeenCalled();
  });
});
