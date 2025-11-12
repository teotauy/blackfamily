# Family Tree Project

This project aims to create an interactive family tree application.

## Features

*   Visualize family relationships in a tree structure.
*   Drill down into individuals to view biographic and contact information.
*   Display a list of upcoming birthdays.

## Tech Stack (Initial)

*   HTML
*   CSS
*   JavaScript
*   JSON (for data storage) 

# Trigger redeploy

Last redeploy trigger: 2025-07-21 

## GitHub Authentication Notes

When working in this environment the assistant does not have stored GitHub credentials. To allow pushing from here:

1. **Preferred (HTTPS + personal access token)**  
   - Generate a new PAT in GitHub with at least `repo` scope.  
   - In the terminal run `git config --global credential.helper store` once.  
   - Execute `git push`; when prompted, enter your GitHub username and paste the PAT as the password.  
   - Git caches the token locally so the assistant can push in later sessions without seeing it.

2. **Alternative (SSH)**  
   - Run `ssh-keygen -t ed25519 -C "your-email"` and accept the defaults.  
   - Add the contents of `~/.ssh/id_ed25519.pub` to your GitHub SSH keys.  
   - Switch the remote to SSH (`git remote set-url origin git@github.com:USERNAME/REPO.git`).  
   - Future pushes succeed without prompting for a password.

If a token is ever exposed, revoke it immediately in GitHub and create a replacement before reconfiguring the helper.