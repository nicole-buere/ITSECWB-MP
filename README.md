# 🚨 Branch Rules
1. Always branch from `development` ⚠ **Never create a branch based on `ignore-branch`**  
2. NEVER push directly to the main branch.
3. Only the feature owner merges into main.
4. All merges must be reviewed by another teammate.
5. Pull the latest main branch updates before starting or merging work.
6. Use clear, meaningful commit messages (fix: resolve broken redirect on login).
7. Manually test all features before merge request.

# 📁 Branching Guidelines
Follow these naming conventions to keep the repo clean and trackable:

## 🔧 Backend Features
feature/authentication
feature/input-validation

## 🎨 Frontend UI/UX
view/loginPage
view/adminLogs

## 🐞 Bug Fixes
fix/loginFailBug
fix/formValidationError

# 🚀 Getting Started
1. **Check if Node.js is installed**  
   - Open **Command Prompt** (Windows) or **Terminal** (Mac/Linux).  
   - Type:  
     ```bash
     node -v
     ```  
   - If you see a version number (e.g., `v18.17.0`), Node.js is installed.  
   - If you get an error like *"node is not recognized"*, download and install Node.js from [https://nodejs.org](https://nodejs.org).  

2. **Install dependencies**  
   - In the project folder, run:  
     ```bash
     npm install
     ```  
     or  
     ```bash
     npm i
     ```  

3. **Run the application**  
   - Start the app by running:  
     ```bash
     npm run start
     ```  

4. **Access the server**  
   - Open your browser and go to:  
     ```
     http://localhost:3000
     ```