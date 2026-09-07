# Workshop Notes

## ขอบเขตและแหล่งโจทย์

ทำตาม 4 หัวข้อที่เลือกจาก [Skill Checkpoint: Software Testing Workshop](https://platform.techupth.com/learn/courses/fsd11/software-testing/software-testing-software-testing-workshop-skill-checkpoint-software-testing-workshop-assignment-5GxHXpccELRNawEuipXhv) วันที่ 6 กันยายน 2026 โดยไม่ push หรือส่งลิงก์งาน

หน้า Assignment ระบุ 6 เคสบังคับชัดเจนใน template แต่ไม่ได้แสดงตาราง Whiteboard เต็ม จึงยึด 6 เคสนั้นร่วมกับกติกาใน Validation ของ repository ไม่อ้างว่าได้ตรวจตาราง Whiteboard ทั้งหมด ค่า status 1 = draft และ 2 = published อ้างอิง flow เดิมในโปรเจกต์

## Test Planning

มี comment ด้านบน `server/tests/post.validation.test.mjs` ตาม template รวม 6 เคสบังคับและ 2 เคสออกแบบเอง ระบุ Input / Expected / เหตุผล โดยใช้ข้อมูลถูกต้องครบเป็นฐานแล้วเปลี่ยนเฉพาะ field ที่ทดสอบ

| เคส         | Input ที่ต่างจาก validBody          | Expected                          | เหตุผล                   |
| ----------- | ----------------------------------- | --------------------------------- | ------------------------ |
| บังคับ 1    | ข้อมูลครบและชนิดถูกต้อง             | next() ครั้งเดียว ไม่ส่ง error    | Happy Path               |
| บังคับ 2    | ไม่ส่ง title                        | 400, Title is required            | ต้องมีชื่อบทความ         |
| บังคับ 3    | title เป็นข้อความว่าง               | 400, Title is required            | ป้องกันชื่อว่าง          |
| บังคับ 4    | category_id เป็น string "1" ใน JSON | 400, Category ID must be a number | ตรวจชนิดข้อมูล           |
| บังคับ 5    | title เป็นช่องว่าง " "              | 400, Title is required            | ป้องกันชื่อที่มองไม่เห็น |
| บังคับ 6    | status_id เป็น 99                   | 400, Status ID must be 1 or 2     | จำกัดสถานะ               |
| ออกแบบเอง 1 | ไม่ส่ง image                        | 400, Image is required            | ต้องมีรูปประกอบ          |
| ออกแบบเอง 2 | content เป็นตัวเลข 123              | 400, Content is must be a string  | ป้องกันเนื้อหาผิดชนิด    |

เคสออกแบบเองทั้งสองเป็น reject และใช้หมวด image/content ซึ่งต่างจาก title/category_id/status_id ของชุดบังคับ ข้อความ error ของ content รักษาตามโค้ดเดิม

## Unit Testing

- `server/tests/post.validation.test.mjs`: 8 เคส ครบทั้ง 6 เคสบังคับและ 2 เคสออกแบบเอง
- เรียก Validation โดยตรง ใช้ `makeRes`, `vi.fn()` และ Arrange → Act → Assert
- Happy ตรวจว่า next เรียกครั้งเดียวและไม่เรียก status/json
- Error ตรวจ status(400), ข้อความ JSON ที่แน่นอน และ next ไม่ถูกเรียก
- ผลก่อนแก้ Validation: 6 ผ่าน / 2 ไม่ผ่าน (title ช่องว่าง และ status_id 99)
- หลังได้รับอนุญาตแก้: เพิ่มการปฏิเสธชื่อที่มีแต่ช่องว่างและจำกัด status_id ให้เป็น 1 หรือ 2 โดยไม่ลดความเข้มงวดของ assertion เพื่อทำให้ผ่าน

## Integration Testing

`server/tests/posts.create.integration.test.mjs`: 13 เคส

- Happy JSON 1 เคส ตรวจ 201, JSON schema, ข้อความสำเร็จ และค่าที่ส่งเข้า INSERT
- Error validation 6 เคส: ไม่ส่ง title, title ว่าง, category_id string, title ช่องว่าง, status_id 99, ไม่มีรูป
- Happy multipart 1 เคส: ผ่าน multer จริง มีรูปอัปโหลดและแปลง numeric fields เป็น number
- Error multipart 1 เคส: status_id 99 ถูกปฏิเสธก่อนอัปโหลด/INSERT
- Error ไม่มี token 401 และไม่ใช่ admin 403
- Error ฐานข้อมูลเขียนไม่สำเร็จ 500 และอัปโหลดไม่สำเร็จ 500
- ทุกเคสตรวจ Status / Body·Schema / ข้อความ success หรือ error พร้อมตรวจผลข้างเคียงที่เกี่ยวข้อง
- ใช้ app, router, protectAdmin, multer และ Validation จริง Mock เฉพาะ PostgreSQL กับ Supabase ผ่าน `vi.mock` และเตรียม/ล้าง mocks ด้วย beforeEach/afterEach
- เป็น integration ระดับ HTTP → middleware → handler → mocked external services ไม่ยืนยันการเชื่อมต่อฐานข้อมูลหรือ Storage จริง และไม่สร้างข้อมูลจริง

## การปรับโค้ดเพื่อรองรับ Workshop

- `server/app.mjs`: export app ให้ Supertest import ได้ และเปิด listener เมื่อรันไฟล์โดยตรงเท่านั้น
- `server/middleware/postValidation.mjs`: เพิ่มกติกา title/status พร้อมรับไฟล์ที่ multer parse และแปลง ID เฉพาะ multipart; JSON category_id "1" ยังต้องถูกปฏิเสธ
- `server/apps/postRouter.mjs`: เชื่อม Validation หลัง parse multipart/ตรวจสิทธิ์ รองรับ JSON image URL ตามตัวอย่าง `.send(...)` และคง flow อัปโหลดไฟล์เดิม
- `server/vitest.config.mjs`: ตั้ง Node environment และวัด coverage ทุกไฟล์ production ของเซิร์ฟเวอร์ รวมไฟล์ที่ยังไม่มี Test เพื่อไม่ให้ตัวเลขดูสูงเกินจริง
- `server/.gitignore`: ไม่ติดตามรายงาน coverage ที่สร้างใหม่
- package.json/package-lock.json มีการเพิ่มเครื่องมือทดสอบอยู่ก่อนเริ่มงาน ใช้ dependencies เดิมโดยไม่ได้ติดตั้งเพิ่มหรือเขียนทับการเปลี่ยนแปลงเหล่านั้น

## Coverage

### ผลที่รันได้

รันจากโฟลเดอร์ `server`:

```sh
npx vitest run --coverage
```

ผลจริงวันที่ 6 กันยายน 2026:

```text
Test Files  2 passed (2)
Tests       21 passed (21)

Statements : 27.15% (104/383)
Branches   : 28.32% (49/173)
Functions  : 11.11% (3/27)
Lines      : 27.15% (104/383)
```

| ไฟล์ / ขอบเขต                 |  Lines | Branches |
| ----------------------------- | -----: | -------: |
| ทั้ง server                   | 27.15% |   28.32% |
| middleware/postValidation.mjs | 76.47% |   76.92% |
| middleware/protectAdmin.mjs   |    85% |   83.33% |
| apps/postRouter.mjs           | 20.25% |    7.40% |

รายงาน HTML: `server/coverage/index.html` และข้อมูลสรุป: `server/coverage/coverage-summary.json` (สร้างซ้ำด้วยคำสั่งข้างต้น)

- Uncovered 1: `server/middleware/protectAdmin.mjs` — บรรทัด 22 token ไม่ถูกต้อง, 34 ไม่พบ role, 50 ระบบตรวจสิทธิ์ล้มเหลว
- Uncovered 2: `server/middleware/postValidation.mjs` — บรรทัด 26/30/34/38 ขาด field และ 43/47/55/63 field ผิดชนิดที่ยังไม่มีเคสตรง
- จะปิดก่อน: `server/middleware/protectAdmin.mjs:22` — Supabase คืน error หรือไม่พบ user ต้องตอบ 401 และไม่อัปโหลด/INSERT โพสต์
- เหตุผล (Impact): จุดตรวจสิทธิ์คุมการสร้างบทความ หาก token ที่ใช้ไม่ได้หลุดผ่าน ผู้ไม่มีสิทธิ์อาจเขียนเนื้อหาได้ จึงสำคัญกว่าการเลือกไฟล์ที่เปอร์เซ็นต์ต่ำสุด
- เหตุผล (Likelihood): token หมดอายุ/ถูกเพิกถอนหรือส่งผิดเกิดได้ในการใช้งานปกติ จัดโอกาสเกิดเป็นปานกลางถึงสูงในเชิงประเมิน ไม่ใช่สถิติ production
- Test ถัดไปที่เสนอ: mock getUser ให้คืน error หรือ user เป็น null แล้วตรวจ 401 พร้อมยืนยันว่า DB และ upload ไม่ถูกเรียก ยังไม่ได้เขียนเคสนี้เพื่อแยกสิ่งที่เสนอออกจากผลที่ทดสอบแล้ว

Coverage ทั้งเซิร์ฟเวอร์ยังต่ำเพราะรวม Auth/Profile/Category และการอ่าน/แก้/ลบโพสต์ที่ไม่ได้อยู่ในขอบเขต Create Post; db.mjs ถูก mock จึงไม่มี execution coverage ของการเชื่อมต่อจริง เปอร์เซ็นต์ของ postRouter เป็นทั้งไฟล์ ไม่ใช่เฉพาะ Create Post

## ตรงตาม Workshop หรือไม่

| หัวข้อ                     | ผล                                                                              |
| -------------------------- | ------------------------------------------------------------------------------- |
| Test Planning              | ครบ 6 เคสบังคับ + 2 เคสออกแบบเอง มี comment/Input/Expected/เหตุผล               |
| Unit Testing               | ผ่าน 8 เคส มากกว่าเกณฑ์อย่างน้อย 5 จาก 6 และครบเป้าหมาย 6 บังคับ                |
| Integration Testing        | ผ่าน 13 เคส มากกว่าเป้าหมาย Happy 1 + Error 2 มี assertions และ mock            |
| Coverage Prioritization    | มีผลจริง จุด uncovered และเลือกจุดถัดไปด้วย Impact/Likelihood                   |
| Whiteboard / กิจกรรมในห้อง | ตรวจได้เฉพาะ template บนหน้า Assignment ไม่ได้เข้าร่วม brainstorm หรือแชร์ในแชท |
| TestSprite                 | ยังไม่ทำ เพราะอยู่นอก 4 หัวข้อที่ผู้ใช้เลือก ไม่มีผล AI ที่นำมาอ้างได้          |
| Push / ส่งงาน              | ไม่ทำตามคำสั่งผู้ใช้                                                            |

สี่หัวข้อที่เลือกทำครบตามข้อกำหนดที่อ่านได้บนหน้า Assignment แต่ยังไม่อ้างว่าผ่านเกณฑ์ส่ง Workshop ทั้งหมด เพราะหน้าโจทย์กำหนดผล TestSprite เพิ่มด้วย

## TestSprite

- AI พลาดเคส: `<เทียบกับตารางห้อง>`
- AI เพิ่มเคส / ส่วนที่คนต้องอ่านกติกาเอง: `<...>`
