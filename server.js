const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
console.log("Testing PostgreSQL...");
pool.connect()
  .then(() => console.log("PostgreSQL connected"))
  .catch(err => console.error(err));
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "viver_secret_key_change_when_deploy";

const DB_PATH = path.join(__dirname, "data", "db.json");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function defaultDb() {
  const adminHash = bcrypt.hashSync("123456", 10);

  return {
    users: [
      {
        id: 1,
        fullname: "Quản trị viên ViVer",
        email: "admin@viver.vn",
        phone: "0900000000",
        passwordHash: adminHash,
        role: "admin",
        status: "active",
        avatar: "",
        birthday: "",
        gender: "",
        interests: "Quản trị hệ thống, đổi mới sáng tạo",
        skills: "Admin, EdTech, AI",
        resetOtp: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        fullname: "Nguyễn Minh An",
        email: "student@viver.vn",
        phone: "0911111111",
        passwordHash: bcrypt.hashSync("123456", 10),
        role: "student",
        status: "active",
        avatar: "",
        birthday: "",
        gender: "Nam",
        interests: "AI, Web",
        skills: "HTML, CSS",
        resetOtp: null,
        createdAt: new Date().toISOString()
      }
    ],
    courses: [
      {
        id: 1,
        title: "AI Fundamentals for Students",
        category: "AI",
        level: "Beginner",
        instructor: "Dr. ViVer AI Lab",
        duration: "8 tuần",
        image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=900&q=80",
        description: "Khóa học nền tảng AI, machine learning và ứng dụng AI trong học tập.",
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        title: "Web Development Fullstack",
        category: "Công nghệ",
        level: "Intermediate",
        instructor: "ViVer Tech Academy",
        duration: "10 tuần",
        image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
        description: "HTML, CSS, JavaScript, NodeJS và xây dựng website có database.",
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        title: "Presentation & Pitching Skills",
        category: "Thuyết trình",
        level: "Advanced",
        instructor: "ViVer Communication Lab",
        duration: "6 tuần",
        image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
        description: "Rèn luyện thuyết trình, phản biện, pitching dự án và nói trước đám đông.",
        createdAt: new Date().toISOString()
      }
    ],
    workshops: [
      {
        id: 1,
        title: "AI for Students Bootcamp",
        speaker: "ViVer AI Mentor",
        eventTime: "2026-08-05T08:00",
        location: "ViVer Innovation Space",
        seats: 80,
        image: "https://images.unsplash.com/photo-1558403194-611308249627?auto=format&fit=crop&w=900&q=80",
        description: "Workshop ứng dụng AI trong học tập, nghiên cứu và làm dự án.",
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        title: "Startup Innovation Lab",
        speaker: "ViVer Startup Mentor",
        eventTime: "2026-08-20T14:00",
        location: "Online + Offline",
        seats: 50,
        image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80",
        description: "Tư duy khởi nghiệp, phát triển ý tưởng và thuyết trình sản phẩm.",
        createdAt: new Date().toISOString()
      }
    ],
    enrollments: [],
    workshopRegistrations: []
  };
}

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb(), null, 2), "utf8");
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function nextId(items) {
  return items.length ? Math.max(...items.map(item => Number(item.id))) + 1 : 1;
}

function safeUser(user) {
  const { passwordHash, resetOtp, ...safe } = user;
  return safe;
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Bạn chưa đăng nhập." });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token không hợp lệ." });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Chỉ admin mới được truy cập." });
  }
  next();
}

app.get("/api/health", (req, res) => {
  res.json({ message: "ViVer API is running" });
});

app.post("/api/auth/register", (req, res) => {
  const { fullname, email, phone, password, confirmPassword } = req.body;
  const db = readDb();

  if (!fullname || !email || !password) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ họ tên, email và mật khẩu." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Mật khẩu tối thiểu 6 ký tự." });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Mật khẩu xác nhận không khớp." });
  }

  const existed = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existed) {
    return res.status(400).json({ message: "Email đã tồn tại." });
  }

  const user = {
    id: nextId(db.users),
    fullname,
    email,
    phone: phone || "",
    passwordHash: bcrypt.hashSync(password, 10),
    role: "student",
    status: "active",
    avatar: "",
    birthday: "",
    gender: "",
    interests: "",
    skills: "",
    resetOtp: null,
    createdAt: new Date().toISOString()
  };

  db.users.push(user);
  writeDb(db);

  res.json({ message: "Đăng ký thành công. Bạn có thể đăng nhập.", user: safeUser(user) });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const db = readDb();

  const user = db.users.find(u => u.email.toLowerCase() === String(email || "").toLowerCase());
  if (!user) {
    return res.status(400).json({ message: "Email không tồn tại." });
  }

  if (user.status === "locked") {
    return res.status(403).json({ message: "Tài khoản đã bị khóa." });
  }

  const ok = bcrypt.compareSync(password || "", user.passwordHash);
  if (!ok) {
    return res.status(400).json({ message: "Mật khẩu không đúng." });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullname: user.fullname },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ message: "Đăng nhập thành công.", token, user: safeUser(user) });
});

app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  const db = readDb();
  const user = db.users.find(u => u.email.toLowerCase() === String(email || "").toLowerCase());

  if (!user) {
    return res.status(404).json({ message: "Email không tồn tại." });
  }

  user.resetOtp = "123456";
  writeDb(db);

  res.json({ message: "OTP demo đã gửi: 123456" });
});

app.post("/api/auth/reset-password", (req, res) => {
  const { email, otp, newPassword } = req.body;
  const db = readDb();
  const user = db.users.find(u => u.email.toLowerCase() === String(email || "").toLowerCase());

  if (!user) {
    return res.status(404).json({ message: "Email không tồn tại." });
  }

  if (user.resetOtp !== otp) {
    return res.status(400).json({ message: "OTP không đúng." });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: "Mật khẩu mới tối thiểu 6 ký tự." });
  }

  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  user.resetOtp = null;
  writeDb(db);

  res.json({ message: "Đổi mật khẩu thành công." });
});

app.get("/api/profile", auth, (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === req.user.id);
  res.json(safeUser(user));
});

app.put("/api/profile", auth, (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng." });
  }

  const fields = ["fullname", "phone", "avatar", "birthday", "gender", "interests", "skills"];
  fields.forEach(field => {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  });

  writeDb(db);
  res.json({ message: "Cập nhật hồ sơ thành công.", user: safeUser(user) });
});

app.get("/api/courses", (req, res) => {
  const db = readDb();
  res.json(db.courses.sort((a, b) => b.id - a.id));
});

app.post("/api/courses/:id/enroll", auth, (req, res) => {
  const db = readDb();
  const courseId = Number(req.params.id);
  const course = db.courses.find(c => c.id === courseId);

  if (!course) {
    return res.status(404).json({ message: "Không tìm thấy khóa học." });
  }

  const existed = db.enrollments.find(e => e.userId === req.user.id && e.courseId === courseId);
  if (existed) {
    return res.status(400).json({ message: "Bạn đã đăng ký khóa học này." });
  }

  db.enrollments.push({
    id: nextId(db.enrollments),
    userId: req.user.id,
    courseId,
    progress: 0,
    status: "active",
    createdAt: new Date().toISOString()
  });

  writeDb(db);
  res.json({ message: "Đăng ký khóa học thành công." });
});

app.get("/api/workshops", (req, res) => {
  const db = readDb();
  res.json(db.workshops.sort((a, b) => b.id - a.id));
});

app.post("/api/workshops/:id/register", auth, (req, res) => {
  const db = readDb();
  const workshopId = Number(req.params.id);
  const workshop = db.workshops.find(w => w.id === workshopId);

  if (!workshop) {
    return res.status(404).json({ message: "Không tìm thấy workshop." });
  }

  const currentCount = db.workshopRegistrations.filter(r => r.workshopId === workshopId).length;
  if (currentCount >= workshop.seats) {
    return res.status(400).json({ message: "Workshop đã hết chỗ." });
  }

  const existed = db.workshopRegistrations.find(r => r.userId === req.user.id && r.workshopId === workshopId);
  if (existed) {
    return res.status(400).json({ message: "Bạn đã đăng ký workshop này." });
  }

  db.workshopRegistrations.push({
    id: nextId(db.workshopRegistrations),
    userId: req.user.id,
    workshopId,
    createdAt: new Date().toISOString()
  });

  writeDb(db);
  res.json({ message: "Đăng ký workshop thành công." });
});

app.get("/api/admin/stats", auth, adminOnly, (req, res) => {
  const db = readDb();

  res.json({
    users: db.users.length,
    students: db.users.filter(u => u.role === "student").length,
    instructors: db.users.filter(u => u.role === "instructor").length,
    courses: db.courses.length,
    workshops: db.workshops.length,
    enrollments: db.enrollments.length
  });
});

app.get("/api/admin/users", auth, adminOnly, (req, res) => {
  const db = readDb();
  res.json(db.users.map(safeUser).sort((a, b) => b.id - a.id));
});

app.put("/api/admin/users/:id", auth, adminOnly, (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === Number(req.params.id));

  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng." });
  }

  const fields = ["fullname", "phone", "role", "status"];
  fields.forEach(field => {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  });

  if (!["student", "instructor", "admin"].includes(user.role)) {
    return res.status(400).json({ message: "Quyền không hợp lệ." });
  }

  if (!["active", "locked"].includes(user.status)) {
    return res.status(400).json({ message: "Trạng thái không hợp lệ." });
  }

  writeDb(db);
  res.json({ message: "Cập nhật người dùng thành công.", user: safeUser(user) });
});

app.delete("/api/admin/users/:id", auth, adminOnly, (req, res) => {
  const id = Number(req.params.id);

  if (id === req.user.id) {
    return res.status(400).json({ message: "Không thể xóa chính tài khoản admin đang đăng nhập." });
  }

  const db = readDb();
  db.users = db.users.filter(u => u.id !== id);
  db.enrollments = db.enrollments.filter(e => e.userId !== id);
  db.workshopRegistrations = db.workshopRegistrations.filter(r => r.userId !== id);
  writeDb(db);

  res.json({ message: "Xóa người dùng thành công." });
});

app.post("/api/admin/courses", auth, adminOnly, (req, res) => {
  const db = readDb();
  const course = {
    id: nextId(db.courses),
    title: req.body.title || "Khóa học mới",
    category: req.body.category || "Công nghệ",
    level: req.body.level || "Beginner",
    instructor: req.body.instructor || "ViVer Instructor",
    duration: req.body.duration || "4 tuần",
    image: req.body.image || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    description: req.body.description || "",
    createdAt: new Date().toISOString()
  };

  db.courses.push(course);
  writeDb(db);

  res.json({ message: "Thêm khóa học thành công.", course });
});

app.put("/api/admin/courses/:id", auth, adminOnly, (req, res) => {
  const db = readDb();
  const course = db.courses.find(c => c.id === Number(req.params.id));

  if (!course) {
    return res.status(404).json({ message: "Không tìm thấy khóa học." });
  }

  ["title", "category", "level", "instructor", "duration", "image", "description"].forEach(field => {
    if (req.body[field] !== undefined) course[field] = req.body[field];
  });

  writeDb(db);
  res.json({ message: "Cập nhật khóa học thành công.", course });
});

app.delete("/api/admin/courses/:id", auth, adminOnly, (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  db.courses = db.courses.filter(c => c.id !== id);
  db.enrollments = db.enrollments.filter(e => e.courseId !== id);
  writeDb(db);

  res.json({ message: "Xóa khóa học thành công." });
});

app.post("/api/admin/workshops", auth, adminOnly, (req, res) => {
  const db = readDb();
  const workshop = {
    id: nextId(db.workshops),
    title: req.body.title || "Workshop mới",
    speaker: req.body.speaker || "ViVer Mentor",
    eventTime: req.body.eventTime || "",
    location: req.body.location || "Online",
    seats: Number(req.body.seats || 30),
    image: req.body.image || "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80",
    description: req.body.description || "",
    createdAt: new Date().toISOString()
  };

  db.workshops.push(workshop);
  writeDb(db);

  res.json({ message: "Thêm workshop thành công.", workshop });
});

app.put("/api/admin/workshops/:id", auth, adminOnly, (req, res) => {
  const db = readDb();
  const workshop = db.workshops.find(w => w.id === Number(req.params.id));

  if (!workshop) {
    return res.status(404).json({ message: "Không tìm thấy workshop." });
  }

  ["title", "speaker", "eventTime", "location", "seats", "image", "description"].forEach(field => {
    if (req.body[field] !== undefined) workshop[field] = field === "seats" ? Number(req.body[field]) : req.body[field];
  });

  writeDb(db);
  res.json({ message: "Cập nhật workshop thành công.", workshop });
});

app.delete("/api/admin/workshops/:id", auth, adminOnly, (req, res) => {
  const db = readDb();
  const id = Number(req.params.id);
  db.workshops = db.workshops.filter(w => w.id !== id);
  db.workshopRegistrations = db.workshopRegistrations.filter(r => r.workshopId !== id);
  writeDb(db);

  res.json({ message: "Xóa workshop thành công." });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

ensureDb();

app.listen(PORT, () => {
  console.log(`ViVer NIC Full System running at http://localhost:${PORT}`);
});
