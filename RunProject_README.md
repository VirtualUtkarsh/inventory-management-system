  # 🚀 How to Run This MERN Project Locally

This guide will help you clone and run the Inventory Management System project on your local machine.

---

## 🧱 Prerequisites

1. **Install [Node.js](https://nodejs.org/)** (v18+ recommended)
2. **Install Git to run any git commands** (if not already installed)
3. **Have a GitHub account** (for access to the repo)

---

## 📥 Step 1: Clone the Repo

Open your terminal and run:

```bash
git clone https://github.com/TusharVaishnaw/InventorymgmtV1.git
cd InventorymgmtV1
```

---

## ⚙️ Step 2: Set Up Environment Variables

Only the **server** folder needs a `.env` file.

### 1. Go into the server folder:

```bash
cd server
```

### 2. Create a `.env` file:

```bash
touch .env
```

### 3. Paste the following into `.env`:

```env
MONGO_URI=<your mongodb string>
JWT_SECRET=ae9cb9e34a4c4f38b4c3b1df44f0f2e4f8c4ae62b8a7f299c2fd838f673ac139c1f19f21a891499b3d11f3f26ef7c304d31bdcc4761c3c5c50fd25cb5a64a93b
PORT=5000
```

Replace `<your mongodb string>` with your actual MongoDB URI.

---

## 📦 Step 3: Install Dependencies

### 1. Client-side (React)

```bash
cd ../client
npm install
```

### 2. Server-side (Node/Express)

```bash
cd ../server
npm install
```

---

## 🏁 Step 4: Run the Project

### 1. Start the Client (in `client` folder)

```bash
cd ../client
npm start
```

### 2. Start the Server (in `server` folder)

```bash
cd ../server
npm run dev
```

---

## 🔗 App URLs (by default)

* Client: [http://localhost:3000](http://localhost:3000)
* Server/API: [http://localhost:5000/api](http://localhost:5000/api)

---

## 🤝 You're all set!
=
