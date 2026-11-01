# AWS Well-Architected Framework Visualizer

An interactive, beginner-friendly guide to the six pillars of the AWS Well-Architected Framework, built with plain HTML, CSS, vanilla JavaScript and inline SVG. No frameworks, backend, build tools or paid APIs.

## Features
- **9 learning modules**: Introduction, the six pillars (Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, Sustainability), a full real-world architecture, and Reviews and Takeaways.
- **Central pillar diagram**: click a pillar for principles, design areas, AWS services and a practical example.
- **Architecture diagram** (ELB, EC2, Auto Scaling, RDS, Lambda, S3, CloudWatch, IAM) with per-pillar overlays that highlight relevant services; click any service for details.
- **Scenario simulator** (8 weaknesses): pick the pillar to improve and get instant feedback.
- **Review checklist** (12 questions) with per-pillar scores and a recommended focus area.
- **Good vs poor decisions** for each pillar and a **10-question final quiz**.
- **Beginner / Technical modes**, tooltips, searchable glossary, progress tracking (localStorage), keyboard accessible, responsive, reduced-motion friendly.

## Run locally
Open `index.html` in a browser, or serve the folder:

```bash
cd aws-well-architected-visualizer
python3 -m http.server 8000   # then visit http://localhost:8000
```

Validate the JavaScript: `node --check script.js`

## Deploy to GitHub Pages
1. Create a new GitHub repository (e.g. `aws-well-architected-visualizer`).
2. Upload `index.html`, `style.css`, `script.js` and `README.md` to the repository root (or push with git):
   ```bash
   git init
   git add .
   git commit -m "Add AWS Well-Architected Visualizer"
   git branch -M main
   git remote add origin https://github.com/<your-username>/aws-well-architected-visualizer.git
   git push -u origin main
   ```
3. In the repository, go to **Settings > Pages**.
4. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose branch `main` and folder `/ (root)`, then **Save**.
5. After a minute, your site is live at `https://<your-username>.github.io/aws-well-architected-visualizer/`.

## Notes
Pillar names, principles and design areas follow the official AWS Well-Architected Framework terminology. This is an unofficial educational project, not affiliated with AWS. Always consult the official documentation at https://aws.amazon.com/architecture/well-architected/ for current guidance.
