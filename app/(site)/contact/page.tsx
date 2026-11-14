import type { Metadata } from "next";
import { faNum } from "@/lib/format";
import { getSettings, logoUrl } from "@/lib/settings";
import { CONTACT_PHONE, FOUNDED } from "@/lib/site";
import { SocialIcons } from "../social";

const YEARS = 19;
const DESCRIPTION = `نساجی اسپرت، قدیمی‌ترین سایت فوتبال مازندران؛ ${YEARS} سال فعالیت سالم و دلسوزانه در کنار نساجی. راه‌های ارتباط با ما.`;

export const metadata: Metadata = { title: "ارتباط با ما", description: DESCRIPTION };

/** 09391241001 -> 989391241001 (international form for WhatsApp links). */
const intl = (phone: string) => `98${phone.replace(/\D/g, "").replace(/^0/, "")}`;
/** 09391241001 -> ۰۹۳۹ ۱۲۴ ۱۰۰۱ */
const pretty = (phone: string) => phone.replace(/^(\d{4})(\d{3})(\d{4})$/, "$1 $2 $3").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

export default function ContactPage() {
  const settings = getSettings();
  const whatsapp = `https://wa.me/${intl(CONTACT_PHONE)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: settings.title,
    foundingDate: "2007",
    logo: logoUrl(settings),
    contactPoint: { "@type": "ContactPoint", telephone: `+${intl(CONTACT_PHONE)}`, contactType: "customer support", availableLanguage: "fa" },
  };

  return (
    <article className="contact">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="contact-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl(settings)} alt="" width={96} height={96} className="contact-logo" />
        <div>
          <p className="contact-kicker">ارتباط با ما</p>
          <h1>
            {faNum(YEARS)} سال <span className="gold-text">در کنار نساجی</span>
          </h1>
          <p className="contact-lead">نساجی اسپرت، قدیمی‌ترین سایت فوتبال مازندران</p>
        </div>
      </header>

      <div className="contact-grid">
        <section className="contact-about" aria-labelledby="about-title">
          <h2 id="about-title">درباره نساجی اسپرت</h2>
          <p>
            نساجی اسپرت در سال {FOUNDED} کارش را شروع کرد و امروز، پس از {faNum(YEARS)} سال، قدیمی‌ترین سایت فوتبال مازندران است. در همه‌ی این سال‌ها،
            در روزهای شیرین و در روزهای سخت، کنار نساجی و هوادارانش بوده‌ایم.
          </p>
          <p>
            ما رسانه‌ای هوادار نساجی هستیم و تلاش کرده‌ایم خبر را سالم، دقیق و منصفانه منتشر کنیم؛ بدون جنجال‌سازی و با احترام به باشگاه، بازیکنان، کادر
            فنی و هواداران. دلسوزی برای نساجی و فوتبال مازندران همیشه انگیزه‌ی اصلی ما بوده است.
          </p>
          <p>اخبار تیم، نتایج و جدول لیگ، گزارش بازی‌ها، گفت‌وگوها، تحلیل‌ها و اخبار تیم‌های پایه را در نساجی اسپرت دنبال کنید.</p>
          <dl className="contact-facts">
            <div>
              <dt>تأسیس</dt>
              <dd>{FOUNDED}</dd>
            </div>
            <div>
              <dt>سال فعالیت</dt>
              <dd>{faNum(YEARS)}</dd>
            </div>
            <div>
              <dt>همراه</dt>
              <dd>نساجی مازندران</dd>
            </div>
          </dl>
        </section>

        <aside className="contact-card" aria-labelledby="contact-title">
          <h2 id="contact-title">با ما در تماس باشید</h2>
          <p className="muted">برای ارسال خبر، پیشنهاد و انتقاد، همکاری یا سفارش تبلیغ.</p>
          <a className="contact-phone" href={`tel:${CONTACT_PHONE}`} dir="ltr">
            {pretty(CONTACT_PHONE)}
          </a>
          <div className="contact-actions">
            <a className="contact-btn is-whatsapp" href={whatsapp} target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3z"
                />
              </svg>
              پیام در واتس‌اپ
            </a>
            <a className="contact-btn" href={`tel:${CONTACT_PHONE}`}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"
                />
              </svg>
              تماس تلفنی
            </a>
          </div>
          <SocialIcons links={settings.social} className="contact-social" />
        </aside>
      </div>
    </article>
  );
}
