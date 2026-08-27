cd /home/bricx/dev/wedding-invitation
{
echo '=== init ==='
git init -b main 2>&1
git config user.name 'Bricx Carasco' 2>&1
git config user.email 'bricxraincarasco21@gmail.com' 2>&1
echo '=== identity (local) ==='
git config user.name
git config user.email
echo '=== add ==='
git add -A 2>&1
echo '=== what is staged (count) ==='
git diff --cached --name-only | wc -l
echo '=== node_modules/dist excluded? ==='
git ls-files | grep -E '^(node_modules|dist)/' | head -3 || echo 'none tracked - good'
echo '=== commit ==='
git -c commit.gpgsign=false commit -m 'Wedding invitation website for Bricx and Mae' 2>&1
echo '=== remote ==='
git remote add origin git@github.com:bricxcarasco/wedding-invitation-site.git 2>&1
git remote -v
} > /tmp/push.log 2>&1
rm -f push.sh
