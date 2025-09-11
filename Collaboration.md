# 👥 Inventory Management Team Git Workflow

Welcome to the Inventory Management System project!
This document explains exactly how our team will collaborate using Git and GitHub.

---

## 📌 Branching Structure

* **main** → Production-ready code only
* **dev** → Active development, integration of features
* **feature/<your-feature-name>** → One branch per task/person
# KINDLY DO NOT PUSH CODE TO DEV OR MAIN BRANCH
---

## 👥 For Team Members

### 🛠️ One-Time Setup

```bash
git clone https://github.com/TusharVaishnaw/InventorymgmtV1.git
cd InventorymgmtV1
git fetch --all
git checkout dev
git pull origin dev
```

---

## ✅ Simple Git Workflow (Feature-first, Push-last)

### 1. Switch to `dev` and get the latest updates
DO this step ONLY if you need the latest code from dev copied to your local project
This will just clone the latest finalised code into your system.
```bash
git checkout dev
git pull origin dev
```
DO NOT COMMIT OR PUSH ONTO THIS BRANCH.

### 2. Create a new feature branch
For anything finalised feature you have added create a new branch like this for pushing the code.
```bash
git checkout -b feature/<your-feature-name>
```
I'll review and test the code and pull request to the dev branch.

### 3. Do all your work and test it **locally**

* Don't push anything yet
* Finish the feature completely first

### 4. When the feature is 100% ready:
Finally push your code!!
These commands will push you code to new branch: feature/<your-feature-name> 

```bash
git add .
git commit -m "Complete: <feature-name> ✅"
git checkout -b v3plusadmin    # Create and switch to new branch
git push -u origin feature/<your-feature-name>
```

### 5. Then, go to GitHub and **create a Pull Request from your feature branch to `dev`**.
Then your pull request code will be reviewed and then merged if approved by at least one of the team members
---

## 🚫 Don't Do This

* ❌ Don’t push half-done work
* ❌ Don’t work directly on `main` or `dev`
* ❌ Don’t make random commits during a task

---

## 🧠 Need Help?

Checkout the resources and documentations: https://chatgpt.com/share/68c2923c-ca64-800c-ac0f-3fb06fd39d76

![image](https://github.com/user-attachments/assets/ab9d3919-69de-4177-af33-40f453d9e005)




