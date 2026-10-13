# Cloud compiler for the live site

Vercel serves the static frontend. Python and JavaScript run in the visitor's browser. C, C++ and Java need GCC/GDB and the JVM, so they run on a small server you control, using the same Docker sandbox as local development.

## 1. Create a free server

**Oracle Cloud Always Free (recommended):** an Ampere A1 (ARM) VM. The free allowance is 2 OCPUs and 12 GB RAM in total; 1 OCPU / 6 GB is plenty. Sign-up asks for a card to verify identity; an Always Free account is not charged unless you upgrade it.

1. Create the account and choose a home region (it cannot be changed later; if A1 capacity is unavailable, retry later or pick a less busy region).
2. **Compute → Instances → Create instance**: image **Canonical Ubuntu 24.04**, shape **VM.Standard.A1.Flex**, 1 OCPU / 6 GB. Under SSH keys, upload your public key (or let Oracle generate one and download the private key).
3. **Networking → Virtual cloud networks →** your VCN **→ Security Lists → Default**: add ingress rules for TCP **80** and **443** from `0.0.0.0/0`.

**Google Cloud e2-micro (fallback):** always free in us-west1, us-central1 or us-east1 only, 1 GB RAM. The script adds swap and runs one program at a time. Also needs a card; set a billing budget alert.

Free extras used: HTTPS certificates from Let's Encrypt (via Caddy), a hostname from sslip.io, and Vercel Hobby.

## 2. Run the setup script

```sh
ssh ubuntu@YOUR_SERVER_IP
sudo git clone --depth 1 https://github.com/Aafthabali08/DSAV.git /opt/sortscope
sudo bash /opt/sortscope/deploy/setup.sh https://sortscopea.vercel.app
```

The script installs Docker, Node.js 22 (checksum-verified) and Caddy, builds the sandbox image, starts the `sortscope-runner` systemd service and allows only SSH, HTTP and HTTPS through the server firewall (including Oracle's preinstalled iptables rules). Without a domain argument it uses `YOUR-IP.sslip.io`, which resolves to your server with no DNS setup, and Caddy obtains an HTTPS certificate automatically. To use your own domain, point an A record at the server and pass it as the second argument:

```sh
sudo bash /opt/sortscope/deploy/setup.sh https://sortscopea.vercel.app compiler.example.com
```

It finishes by printing the URL, for example `https://203-0-113-9.sslip.io`.

## 3. Connect Vercel

In the Vercel project: **Settings → Environment Variables**, add `VITE_RUNTIME_URL` with the printed URL (Production), then **Deployments → Redeploy**. The Code Lab badge then reads “Browser + cloud runtime · all 5 languages”.

## Updating

After pushing changes to GitHub:

```sh
sudo bash /opt/sortscope/deploy/update.sh
```

## Protection and limits

- Only the origins passed to `setup.sh` receive CORS access (`ALLOWED_ORIGINS`); other sites are refused.
- Per visitor IP: 10 runs per minute and 120 per hour. At most 2 programs run at once (1 on servers under 2 GB RAM); extra requests get a “busy” message.
- Every run uses a fresh container: no network, read-only filesystem, non-root user, 512 MB memory, 1 CPU, 64 processes, 12-second phases, 25-second hard deadline.
- The Node service listens only on 127.0.0.1 behind Caddy; request bodies are capped at 200 KB.

Settings live in `/etc/systemd/system/sortscope-runner.service`. After editing, run `systemctl daemon-reload && systemctl restart sortscope-runner`.

This is a reasonable setup for a personal learning site, not a hardened multi-tenant platform. The service user can start Docker containers, which is root-equivalent on that server, so use the server only for SortScope. The rate limits slow abuse but don't stop a determined attacker. Watch usage with `journalctl -u sortscope-runner` and lower the limits if needed.
