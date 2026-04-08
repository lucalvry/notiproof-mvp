# NotiProof

**Website**: notiproof.com  |  **App:** app.notiproof.com
An intelligent notification campaign platform with smart template matching and auto-generation.

## Campaign Template System
NotiProof includes an intelligent campaign template matching system that automatically recommends the best notification templates based on your campaign type.

### Key Features
- **Smart Filtering** – Templates are automatically filtered by campaign type
- **Auto-Generation** – Fallback templates are generated for unmapped campaign types
- **Best Match Indicators** – Top-ranked templates are highlighted for easy selection
- **Show All Toggle** – Option to browse all templates regardless of campaign type
- **Comprehensive Documentation** – See CAMPAIGN_TEMPLATES.md for the full user guide


### Getting Started
**Prerequisites**
- Node.js & npm (install via nvm recommended)

**Installation**
```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Step 3: Install dependencies
npm i

# Step 4: Set up environment variables
cp .env.example .env
# Edit .env and fill in your Supabase credentials

# Step 5: Start the development server
npm run dev
```
**Environment Setup**
- Copy .env.example to .env
- Fill in your Supabase credentials from the Supabase Dashboard
- Never commit the .env file — it contains sensitive credentials


Tech Stack
TechnologyRoleViteBuild tool & dev serverTypeScriptType safetyReactUI frameworkshadcn/uiComponent libraryTailwind CSSUtility-first styling

How to Edit the Code
Using your preferred IDE
Clone the repo and push changes directly. Any pushed changes will be reflected in your deployment.
Edit directly in GitHub

Navigate to the file you want to edit
Click the pencil (edit) icon at the top right
Make your changes and commit

Using GitHub Codespaces

Go to the main page of the repository
Click the green Code button
Select the Codespaces tab
Click New codespace
Edit files and commit/push when done


Deployment
Build for production:
bashnpm run build
The output will be in the dist/ folder, ready to be deployed.

Main site: notiproof.com
App: app.notiproof.com

Custom Domain
Configure your custom domain through your hosting provider's domain settings.

Contributing

Fork the repository
Create a feature branch (git checkout -b feature/my-feature)
Commit your changes (git commit -m 'Add my feature')
Push to the branch (git push origin feature/my-feature)
Open a Pull Request
