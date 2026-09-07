import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { validBody } from "./support/post-fixture.mjs";

// Mock เฉพาะระบบภายนอก: app/router/validation/multer/protectAdmin ทำงานจริง
const mocks = vi.hoisted(() => ({
  query: vi.fn(), getUser: vi.fn(), upload: vi.fn(), getPublicUrl: vi.fn(),
}));
vi.mock("../utils/db.mjs", () => ({ default: { query: mocks.query } }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mocks.getUser },
    storage: { from: vi.fn(() => ({ upload: mocks.upload, getPublicUrl: mocks.getPublicUrl })) },
  })),
}));
import app from "../app.mjs";

const insertCalls = () => mocks.query.mock.calls.filter(([sql]) => /INSERT INTO posts/.test(sql));
const post = () => request(app).post("/posts").set("Authorization", "Bearer test-admin-token");
const expectResponse = (res, status, key, message) => {
  expect(res.status).toBe(status); // Status
  expect(res.headers["content-type"]).toMatch(/application\/json/);
  expect(res.body).toEqual({ [key]: expect.any(String) }); // Body / Schema
  expect(res.body[key]).toBe(message); // ข้อความ success/error ตรงตามสัญญา
};

describe("POST /posts (integration)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "test-admin" } }, error: null });
    mocks.query.mockImplementation(async (sql) => {
      if (/SELECT role FROM users/.test(sql)) return { rows: [{ role: "admin" }] };
      return { rows: [], rowCount: 1 };
    });
    mocks.upload.mockResolvedValue({ data: { path: "posts/test.png" }, error: null });
    mocks.getPublicUrl.mockReturnValue({ data: { publicUrl: "https://example.com/uploaded.png" } });
  });
  afterEach(() => { vi.resetAllMocks(); });

  test("Happy: JSON ที่ถูกต้องสร้างโพสต์ได้", async () => {
    const body = validBody();
    const res = await post().send(body);
    expectResponse(res, 201, "message", "Created post successfully");
    expect(insertCalls()).toHaveLength(1);
    expect(insertCalls()[0][1]).toEqual([
      body.title, body.image, body.category_id, body.description, body.content, body.status_id,
    ]);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  test.each([
    ["ไม่ส่ง title", { title: undefined }, "Title is required"],
    ["title ว่าง", { title: "" }, "Title is required"],
    ["category_id เป็น string", { category_id: "1" }, "Category ID must be a number"],
    ["title เป็นช่องว่าง", { title: " " }, "Title is required"],
    ["status_id ไม่ถูกต้อง", { status_id: 99 }, "Status ID must be 1 or 2"],
    ["ไม่มีรูป", { image: undefined }, "Image is required"],
  ])("Error: %s → 400 และไม่เขียนข้อมูล", async (_name, changes, message) => {
    const res = await post().send({ ...validBody(), ...changes });
    expectResponse(res, 400, "message", message);
    expect(insertCalls()).toHaveLength(0);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  test("Happy: multipart อัปโหลดรูปเดิมและแปลง ID เป็นตัวเลข", async () => {
    const { image, ...fields } = validBody();
    let req = post();
    for (const [key, value] of Object.entries(fields)) req = req.field(key, String(value));
    const buffer = Buffer.from("test image bytes");
    const res = await req.attach("imageFile", buffer, { filename: "post.png", contentType: "image/png" });
    expectResponse(res, 201, "message", "Created post successfully");
    expect(mocks.upload).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/^posts\/\d+$/), buffer, {
      contentType: "image/png", upsert: false,
    });
    expect(insertCalls()).toHaveLength(1);
    expect(insertCalls()[0][1]).toEqual([
      fields.title, "https://example.com/uploaded.png", 1, fields.description, fields.content, 2,
    ]);
  });

  test("Error: multipart status_id 99 ไม่อัปโหลดหรือเขียนโพสต์", async () => {
    let req = post();
    for (const [key, value] of Object.entries({ ...validBody(), status_id: 99 })) {
      req = req.field(key, String(value));
    }
    const res = await req.attach("imageFile", Buffer.from("test"), "post.png");
    expectResponse(res, 400, "message", "Status ID must be 1 or 2");
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(insertCalls()).toHaveLength(0);
  });

  test("Error: ไม่ส่ง token → 401", async () => {
    const res = await request(app).post("/posts").send(validBody());
    expectResponse(res, 401, "error", "Unauthorized: Token missing");
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  test("Error: ผู้ใช้ไม่ใช่ admin → 403", async () => {
    mocks.query.mockResolvedValue({ rows: [{ role: "user" }] });
    const res = await post().send(validBody());
    expectResponse(res, 403, "error", "Forbidden: You do not have admin access");
    expect(insertCalls()).toHaveLength(0);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  test("Error: DB insert ล้มเหลว → 500", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ role: "admin" }] }).mockRejectedValueOnce(new Error("DB unavailable"));
    const res = await post().send(validBody());
    expectResponse(res, 500, "message", "Server could not create post because database connection");
    expect(insertCalls()).toHaveLength(1);
  });

  test("Error: upload ล้มเหลว → 500 และไม่ insert", async () => {
    mocks.upload.mockResolvedValue({ data: null, error: new Error("Upload failed") });
    let req = post();
    const { image, ...fields } = validBody();
    for (const [key, value] of Object.entries(fields)) req = req.field(key, String(value));
    const res = await req.attach("imageFile", Buffer.from("test"), "post.png");
    expectResponse(res, 500, "message", "Server could not create post because database connection");
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(insertCalls()).toHaveLength(0);
  });
});
