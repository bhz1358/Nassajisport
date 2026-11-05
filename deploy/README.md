# راه‌اندازی روی سرور اوبونتو

اسکریپت `install.sh` همه‌چیز را خودکار انجام می‌دهد: Node.js، ساخت سایت، سرویس دائمی، nginx، HTTPS (اختیاری) و پشتیبان‌گیری روزانه.
روی Ubuntu 22.04 و 24.04 کار می‌کند.

## ۱. کد را روی سرور بیاورید

با SSH وارد سرور شوید و یکی از این دو راه:

**از گیت‌هاب (اگر سرور به github.com دسترسی دارد):**

```bash
apt-get install -y git
git clone https://github.com/bhz1358/Nassajisport.git nassaji
cd nassaji
```

اگر مخزن خصوصی است، گیت نام کاربری و یک Personal Access Token می‌خواهد (نه رمز گیت‌هاب).

**یا با فایل زیپ:** در صفحه‌ی مخزن در گیت‌هاب، دکمه‌ی Code ← Download ZIP را بزنید، بعد از کامپیوتر خودتان:

```bash
scp Nassajisport-main.zip user@172.27.110.7:~
ssh user@172.27.110.7
sudo apt-get install -y unzip && unzip Nassajisport-main.zip && cd Nassajisport-main/
```

## ۲. نصب

```bash
sudo bash deploy/install.sh
```

در پایان، آدرس سایت و **نام کاربری و رمز پنل مدیریت** نمایش داده می‌شود. بعد از اولین ورود، رمز را از بخش «مدیران» عوض کنید.

### اگر دانلودها کند است یا خطا می‌دهد

```bash
# آینه‌ی npm (مثلاً آینه‌ی داخلی دیتاسنتر یا https://registry.npmmirror.com)
sudo NPM_REGISTRY=https://registry.npmmirror.com bash deploy/install.sh

# اگر سرور از پروکسی استفاده می‌کند
sudo HTTPS_PROXY=http://proxy:port bash deploy/install.sh
```

### با دامنه و HTTPS

وقتی دامنه به IP عمومی این سرور اشاره کرد و پورت ۸۰ از اینترنت باز بود:

```bash
sudo DOMAIN=nassajisport.com EMAIL=you@example.com bash deploy/install.sh
```

بدون HTTPS هم سایت و پنل کار می‌کنند، ولی رمز پنل رمزنگاری‌نشده جابه‌جا می‌شود. برای سایت عمومی حتماً HTTPS بگیرید.

## به‌روزرسانی

نسخه‌ی جدید کد را مثل مرحله‌ی ۱ بگیرید (یا در همان پوشه `git pull`)، بعد:

```bash
sudo bash deploy/update.sh
```

قبل از هر به‌روزرسانی از داده‌ها پشتیبان گرفته می‌شود. داده‌ها، رمزها و تنظیمات دست نمی‌خورند.

## کجا چیست

| | مسیر |
|---|---|
| کد سایت | `/opt/nassaji/app` |
| داده‌ها (خبرها، جدول، بازیکنان، تنظیمات، عکس‌ها) | `/var/lib/nassaji/data` |
| پشتیبان روزانه (۱۴ روز آخر) | `/var/backups/nassaji` |
| تنظیمات سرور (رمز اولیه، کلید نشست) | `/etc/nassaji.env` |

```bash
sudo systemctl status nassaji     # وضعیت
sudo systemctl restart nassaji    # راه‌اندازی دوباره
sudo journalctl -u nassaji -f     # لاگ‌ها
```

**عکس‌های وردپرس:** محتوای پوشه‌ی `wp-content/uploads` سایت قدیم را در `/var/lib/nassaji/data/uploads/` کپی کنید و مالکیت را درست کنید:

```bash
sudo chown -R nassaji:nassaji /var/lib/nassaji/data/uploads
```

**برگرداندن پشتیبان:**

```bash
sudo systemctl stop nassaji
sudo tar -xzf /var/backups/nassaji/data-YYYY-MM-DD.tar.gz -C /var/lib/nassaji
sudo chown -R nassaji:nassaji /var/lib/nassaji/data
sudo systemctl start nassaji
```

پشتیبان‌ها روی همین سرورند. یک نسخه را هر از گاهی جای دیگری هم نگه دارید.
