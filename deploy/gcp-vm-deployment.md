# GCP VM Deployment Guide

This app is designed to stay lightweight:

```text
Browser -> Nginx on 80/443 -> Python app on 127.0.0.1:8000 -> SQLite + uploads on VM
```

The original HTML/CSS/JavaScript UI is served by `server.py`. Member submissions are stored in SQLite, and uploaded images are stored on the VM.

## 1. Create a VM

Recommended starting point:

- Ubuntu LTS
- `e2-micro` or `e2-small`
- HTTP traffic enabled
- HTTPS traffic enabled if you will add TLS
- SSH enabled for admin access
- Restrict access by company VPN/IP ranges if this is internal-only

If you manage firewall rules with `gcloud`, Google Cloud uses `gcloud compute firewall-rules create` for opening ports such as `tcp:80` and `tcp:443`.

Example:

```bash
gcloud compute firewall-rules create allow-aapin-web \
  --allow=tcp:80,tcp:443 \
  --direction=INGRESS \
  --source-ranges=0.0.0.0/0 \
  --target-tags=aapin-web
```

For internal-only access, replace `0.0.0.0/0` with your company VPN or office CIDR ranges.

## 2. SSH Into the VM

```bash
ssh YOUR_VM_USER@YOUR_VM_EXTERNAL_IP
```

## 3. Install Runtime Packages

```bash
sudo apt update
sudo apt install -y python3 git nginx
```

No third-party Python packages are required for the current backend.

## 4. Clone the Repo

```bash
cd /opt
sudo git clone https://github.com/xiaoyanzhuo/heritage-meets-innovations-ai.git
sudo chown -R $USER:$USER /opt/heritage-meets-innovations-ai
cd /opt/heritage-meets-innovations-ai
```

## 5. Test the App Manually

Choose a private admin key. Admins use this key on `/admin.html` to recover soft-deleted submissions and reset shared data.

```bash
AAPIN_ADMIN_KEY='choose-a-private-admin-key' HOST=127.0.0.1 PORT=8000 python3 server.py
```

In a second SSH session:

```bash
curl http://127.0.0.1:8000/
curl http://127.0.0.1:8000/api/ideas
curl http://127.0.0.1:8000/api/showcase
```

Stop the manual server with `Ctrl+C` after testing.

## 6. Create a Systemd Service

```bash
sudo nano /etc/systemd/system/aapin-heritage.service
```

Paste this service definition:

```ini
[Unit]
Description=AAPIN Heritage Meets Innovation App
After=network.target

[Service]
WorkingDirectory=/opt/heritage-meets-innovations-ai
ExecStart=/usr/bin/python3 /opt/heritage-meets-innovations-ai/server.py
Restart=always
Environment=HOST=127.0.0.1
Environment=PORT=8000
Environment=AAPIN_ADMIN_KEY=choose-a-private-admin-key

[Install]
WantedBy=multi-user.target
```

Start and enable the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable aapin-heritage
sudo systemctl start aapin-heritage
sudo systemctl status aapin-heritage
```

Useful service commands:

```bash
sudo systemctl restart aapin-heritage
sudo journalctl -u aapin-heritage -f
```

## 7. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/aapin-heritage
```

Paste:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_VM_IP;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/aapin-heritage /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Open:

```text
http://YOUR_DOMAIN_OR_VM_IP/
```

Admin recovery page:

```text
http://YOUR_DOMAIN_OR_VM_IP/admin.html
```

## 8. Optional HTTPS

If this site is exposed beyond a private network, add HTTPS. Common options:

- Company-managed internal certificate
- Google Cloud load balancer with managed certificate
- Certbot/Let's Encrypt, if the VM has a public domain name

If using an internal company site, follow your IT/security team's certificate process.

## 9. Data and Backups

Runtime data lives here:

```text
/opt/heritage-meets-innovations-ai/data/aapin_live.db
/opt/heritage-meets-innovations-ai/uploads/
```

Back these up regularly. Example local backup script:

```bash
mkdir -p /opt/aapin-backups
timestamp=$(date +%Y%m%d-%H%M%S)
sqlite3 /opt/heritage-meets-innovations-ai/data/aapin_live.db ".backup '/opt/aapin-backups/aapin_live-$timestamp.db'"
tar -czf "/opt/aapin-backups/uploads-$timestamp.tar.gz" -C /opt/heritage-meets-innovations-ai uploads
```

For production, copy backups to durable storage such as a restricted Google Cloud Storage bucket.

## 10. Update the App

On the VM:

```bash
cd /opt/heritage-meets-innovations-ai
git pull origin main
sudo systemctl restart aapin-heritage
```

## 11. No Sudo Or Admin Permission

If you do not have `root` or `sudo` access on the VM, you cannot:

- Install packages with `apt`
- Create a system-level `systemd` service in `/etc/systemd/system`
- Configure Nginx in `/etc/nginx`
- Bind directly to privileged ports like `80` or `443`

You can still run the app from your home directory as a user process.

### Clone To A User-Owned Folder

```bash
cd ~
git clone https://github.com/xiaoyanzhuo/heritage-meets-innovations-ai.git
cd heritage-meets-innovations-ai
mkdir -p logs
```

If `python3` is already installed, no extra Python packages are needed.

### Choose A Non-System Port

Use a port above `1024`, such as:

- `8080`
- `8501`
- `8888`
- `9000`

Example using `8501`:

```bash
AAPIN_ADMIN_KEY='choose-a-private-admin-key' HOST=0.0.0.0 PORT=8501 python3 server.py
```

Members would access:

```text
http://YOUR_VM_IP:8501/
```

The GCP firewall must allow the selected port. If you cannot change firewall rules, ask the VM/cloud admin to allow the port or proxy traffic to your app.

### Keep It Running With Nohup

```bash
cd ~/heritage-meets-innovations-ai
mkdir -p logs

AAPIN_ADMIN_KEY='choose-a-private-admin-key' HOST=0.0.0.0 PORT=8501 \
nohup python3 server.py > logs/aapin-heritage.log 2>&1 &
```

Check it:

```bash
curl http://127.0.0.1:8501/
tail -f logs/aapin-heritage.log
```

Stop it:

```bash
pkill -f "python3 server.py"
```

### Keep It Running With Tmux

If `tmux` is available:

```bash
tmux new -s aapin
```

Inside the tmux session:

```bash
cd ~/heritage-meets-innovations-ai
AAPIN_ADMIN_KEY='choose-a-private-admin-key' HOST=0.0.0.0 PORT=8501 python3 server.py
```

Detach without stopping the app:

```text
Ctrl+B
D
```

Reconnect:

```bash
tmux attach -t aapin
```

### Ask Admin Team For A Reverse Proxy

For a cleaner internal URL, ask the VM or platform admin to proxy a standard internal site URL to your user process.

Example request:

```text
Please proxy https://YOUR_INTERNAL_SITE/ to http://127.0.0.1:8501/ on this VM.
The app is a Python HTTP server run by my user account.
Uploads are limited to 8 MB by the app; 10 MB proxy limit is enough.
```

If they use Nginx, the proxy block is the same as the earlier Nginx section, except `proxy_pass` should point to your chosen port:

```nginx
location / {
    proxy_pass http://127.0.0.1:8501;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### No-Sudo Tradeoffs

This mode is good for testing or small internal usage, but it has tradeoffs:

- The app may stop if the VM reboots.
- Port `80/443` and HTTPS usually need admin support.
- Firewall rules may require cloud admin support.
- A user process is less robust than a managed `systemd` service.

For a live ERG event, ask for either `systemd` setup or an admin-managed reverse proxy once the app is ready.

## 12. Permission Model

- Each member browser receives a contributor ID stored in `localStorage`.
- Members can edit or soft-delete only submissions created from that browser.
- Soft-deleted items disappear from the public gallery/wall.
- Admins can recover soft-deleted submissions from `/admin.html`.
- Admin recovery and shared reset actions require `AAPIN_ADMIN_KEY`.

This is lightweight and good for the planned internal VM deployment. If the app later needs stronger identity, the next step is to place it behind company SSO or add authenticated user accounts.
