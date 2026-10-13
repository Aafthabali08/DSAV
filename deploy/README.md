# Cloud compiler for the live site

Vercel serves the static frontend. Python and JavaScript run in the visitor's browser. C, C++ and Java need GCC/GDB and the JVM, so they run on a small server you control, using the same Docker sandbox as local development.

## 1. Create a server

- Ubuntu 24.04 or Debian 12, **2 GB RAM or more**, a public IPv4 address.
- Examples: Hetzner CX22 (about €4/month) or a DigitalOcean 2 GB droplet (about $12/month).
- Add your SSH key when creating it.

## 2. Run the setup script

```sh
ssh root@YOUR_SERVER_IP
git clone --depth 1 https://github.com/Aafthabali08/DSAV.git /opt/sortscope
sudo bash /opt/sortscope/deploy/setup.sh https://sortscopea.vercel.app
```

The script installs Docker, Node.js 22 (checksum-verified) and Caddy, builds the sandbox image, starts the `sortscope-runner` systemd service and enables a firewall (SSH, HTTP, HTTPS only). Without a domain argument it uses `YOUR-IP.sslip.io`, which resolves to your server with no DNS setup, and Caddy obtains an HTTPS certificate automatically. To use your own domain, point an A record at the server and pass it as the second argument:

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
- Per visitor IP: 10 runs per minute and 120 per hour. At most 2 programs run at once; extra requests get a “busy” message.
- Every run uses a fresh container: no network, read-only filesystem, non-root user, 512 MB memory, 1 CPU, 64 processes, 12-second phases, 25-second hard deadline.
- The Node service listens only on 127.0.0.1 behind Caddy; request bodies are capped at 200 KB.

Settings live in `/etc/systemd/system/sortscope-runner.service`. After editing, run `systemctl daemon-reload && systemctl restart sortscope-runner`.

This is a reasonable setup for a personal learning site, not a hardened multi-tenant platform. The service user can start Docker containers, which is root-equivalent on that server, so use the server only for SortScope. The rate limits slow abuse but don't stop a determined attacker. Watch usage with `journalctl -u sortscope-runner` and lower the limits if needed.
