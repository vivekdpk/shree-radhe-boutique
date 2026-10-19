import { useState } from 'react'
import { ArrowDown, ArrowRight, Menu, Ruler, Scissors, Sparkles, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { api } from './api'
import { useBoutiqueTheme } from './theme'
import { useWebsiteLanguage } from './language'
import { BoutiqueLogoMark } from './BoutiqueLogo'
import './public-website.css'

const services = [
  { icon: Scissors, title: 'Aapki pasand ki silai', text: 'Design, fitting aur finishing—sab aapke style aur mauke ke hisaab se.', image: '/images/boutique-service-stitching.jpg', alt: 'Karigar cream fabric par embroidery ki silai karte hue' },
  { icon: Sparkles, title: 'Perfect fitting', text: 'Jo kapde aapko pasand hain, unhe fitting aur comfort ke saath naya feel dein.', image: '/images/boutique-service-alterations.jpg', alt: 'Darzi dress form par kapde ki fitting theek karte hue' },
  { icon: Ruler, title: 'Naap lene mein help', text: 'Ghar par sahi naap lene ke liye simple step-by-step guide.', image: '/images/boutique-service-measurements.jpg', alt: 'Kapde par rakha hua darzi ka measuring tape' },
]

const storyCards = [
  { label: 'SHAADI KA DIN', title: 'Dulhe ka perfect-fit moment', problem: 'Sochiye—shaadi ke liye sherwani dhoondhte-dhoondhte bahut try kar li, par fit ya style dil ko nahi laga.', solution: 'Apne naap aur pasand ke hisaab se sherwani. Phir entry ho confidence ke saath—bilkul aapke andaaz mein.', image: '/images/story-wedding-fit.jpg', alt: 'Indian dulha apni ivory sherwani mein shaadi ke jashn ke dauran' },
  { label: 'BIRTHDAY LOOK', title: 'Birthday par apna special style', problem: 'Birthday ke liye kuch alag pehenna hai, par ready-made dress ka fit ya design waisa nahi mil raha?', solution: 'Apni pasand ka colour, design aur fit choose kijiye—taaki cake ke saath photos mein bhi aap hi shine karein.', image: '/images/story-birthday-fit.jpg', alt: 'Birthday celebration mein dusty rose custom dress pehni hui yuva mahila' },
  { label: 'COMFORT + MATCHING', title: 'Maa ke liye aaram, baby ke liye cuteness', problem: 'Pregnancy mein badalte fit ke saath comfortable aur sundar kapde dhoondhna mushkil ho sakta hai.', solution: 'Aaram ko dhyan mein rakhkar apna outfit silwayein. Baad mein apne bachche ke liye matching look bhi banwayein.', image: '/images/story-maternity-fit.jpg', alt: 'Sage green comfortable maternity outfit mein maa aur uska chhota bachcha' },
]

export default function PublicWebsite({ guideContent }: { guideContent?: ReactNode }) {
  const [theme] = useBoutiqueTheme()
  const [language] = useWebsiteLanguage()
  const text = (en: string, hn: string, hi: string) => language === 'english' ? en : language === 'hindi' ? hi : hn
  const [menuOpen, setMenuOpen] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '', website: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState('')
  const closeMenu = () => setMenuOpen(false)
  const homeHref = guideContent ? '/' : '#home'
  const storyHref = guideContent ? '/#stories' : '#stories'
  const servicesHref = guideContent ? '/#services' : '#services'
  const contactHref = guideContent ? '/#contact' : '#contact'

  async function submitContactForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true)
    setFormError('')
    try {
      await api.submitInquiry(form)
      setSent(true)
      setForm({ name: '', phone: '', email: '', message: '', website: '' })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Message nahi ja saka. Kripya dobara try karein.')
    } finally {
      setSending(false)
    }
  }

  return <div className="public-site" data-theme={theme} data-language={language} lang={language === 'hindi' ? 'hi' : 'en'}>
    <header className="public-header">
      <a className="public-brand" href={homeHref} aria-label="Shree Radhe Boutique home" onClick={closeMenu}>
        <span className="public-brand-mark"><BoutiqueLogoMark/></span>
        <span><b>Shree Radhe</b><small>BOUTIQUE</small></span>
      </a>
      <button className="public-menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button>
      <nav className={menuOpen ? 'public-nav open' : 'public-nav'} aria-label="Website navigation">
        <a href={homeHref} onClick={closeMenu}>{text('Home','Home','होम')}</a>
        <a href={storyHref} onClick={closeMenu}>{text('Our story','Hamari baat','हमारी कहानी')}</a>
        <a href={servicesHref} onClick={closeMenu}>{text('Stitching & fit','Silai & fitting','सिलाई और फिटिंग')}</a>
        <a href="/measurement-guide" onClick={closeMenu}>{text('Measurement guide','Naap guide','नाप गाइड')}</a>
        <a href={contactHref} onClick={closeMenu}>{text('Contact us','Baat karein','संपर्क करें')}</a>
      </nav>
    </header>

    <main>
      {guideContent ? <section className="public-guide-page"><div className="public-guide-inner">{guideContent}</div></section> : <>
      <section className="public-hero" id="home">
        <div className="public-hero-copy">
          <p className="public-eyebrow">{text('MADE FOR YOUR MOMENTS, MADE YOUR WAY','HAR KHAAS MAUKE KE LIYE, AAPKE STYLE MEIN','हर खास मौके के लिए, आपके अंदाज़ में')}</p>
          <h1>{language === 'english' ? <>Your clothes.<br/>Your perfect fit.</> : language === 'hindi' ? <>कपड़े आपके।<br/>फिट भी आपका।</> : <>Kapde aapke.<br/>Fit bhi aapki.</>}</h1>
          <span className="public-rule"/>
          <p className="public-hero-description">{text('Tired of trying outfit after outfit? Get the design you love, a comfortable fit, and thoughtful finishing—all in one place.','Market mein baar-baar try karke thak gaye? Apni pasand ka design, sahi fitting aur comfortable kapde—sab ek hi jagah.','बार-बार कपड़े पहनकर सही फिट नहीं मिला? अपनी पसंद का डिज़ाइन, आरामदायक फिट और बढ़िया सिलाई—सब एक ही जगह।')}</p>
          <div className="public-hero-actions"><a className="public-button" href="#stories">{text('See how we make it yours','Apni style journey dekhein','अपनी स्टाइल की कहानी देखें')} <ArrowRight size={18}/></a><a className="public-text-link" href="#contact">{text('Talk to us','Humse baat karein','हमसे बात करें')} <ArrowRight size={16}/></a></div>
        </div>
        <div className="public-hero-image" role="img" aria-label="Shree Radhe Boutique ke liye taiyaar kiya gaya khoobsurat custom outfit"/>
        <a className="public-scroll-cue" href="#services" aria-label="Scroll to services"><ArrowDown size={17}/></a>
      </section>

      <section className="public-stories" id="stories">
        <div className="public-section-heading"><p className="public-eyebrow">{text('IMAGINE YOUR MOMENT','SOCHIYE, AAPKI STORY KUCH AISI HO','सोचिए, आपकी कहानी कुछ ऐसी हो')}</p><h2>{text('Every occasion deserves your perfect fit.','Har khaas mauke ka apna perfect fit.','हर खास मौके का अपना परफेक्ट फिट।')}</h2><p>{text('Wedding, birthday, or everyday comfort—your clothes should be made for you.','Shaadi ho, birthday ya comfort ki zaroorat—kapde aapke liye banne chahiye.','शादी हो, जन्मदिन या रोज़ का आराम—कपड़े आपके लिए बनने चाहिए।')}</p></div>
        <p className="public-story-note">{text('These are illustrative examples; every customer’s needs are different.','Yeh kalpnik style examples hain—har customer ki pasand aur zaroorat alag hoti hai.','ये उदाहरण समझाने के लिए हैं—हर ग्राहक की पसंद और ज़रूरत अलग होती है।')}</p>
        <div className="public-story-cards">{storyCards.map((story, index) => {
          const localized = language === 'english' ? [
            { label: 'WEDDING DAY', title: 'A groom’s perfect-fit moment', problem: 'Tried outfit after outfit for the wedding, but the fit or style never felt quite right.', solution: 'A sherwani made around his measurements and taste. Then he walks in feeling like himself—only more confident.' },
            { label: 'BIRTHDAY LOOK', title: 'A birthday look that feels special', problem: 'Want something different for your birthday, but the ready-made fit or design is not quite you?', solution: 'Choose the colour, design, and fit you love—so you shine in every photo.' },
            { label: 'COMFORT + MATCHING', title: 'Comfort for mum, cuteness for baby', problem: 'Finding comfortable, lovely clothes as your body changes can be difficult.', solution: 'Have an outfit stitched with comfort in mind, then add a matching look for your little one.' },
          ][index] : language === 'hindi' ? [
            { label: 'शादी का दिन', title: 'दूल्हे की परफेक्ट फिट वाली एंट्री', problem: 'शादी के लिए कई कपड़े पहनकर देखे, पर फिट या डिज़ाइन मन को नहीं भाया।', solution: 'अपने नाप और पसंद की शेरवानी पहनकर आएँ—आत्मविश्वास भी आपका, अंदाज़ भी आपका।' },
            { label: 'जन्मदिन का लुक', title: 'जन्मदिन पर खास अंदाज़', problem: 'कुछ अलग पहनना है, पर रेडीमेड कपड़े का फिट या डिज़ाइन पसंद नहीं आ रहा?', solution: 'अपना रंग, डिज़ाइन और फिट चुनें—तस्वीरों में आप ही चमकेंगे।' },
            { label: 'आराम + मैचिंग', title: 'माँ के लिए आराम, बच्चे के लिए प्यारा लुक', problem: 'बदलते शरीर के साथ आरामदायक और सुंदर कपड़े ढूँढना आसान नहीं।', solution: 'आराम को ध्यान में रखकर कपड़े सिलवाएँ, फिर बच्चे के लिए मैचिंग लुक भी बनवाएँ।' },
          ][index] : story
          return <article className="public-story-card" key={story.label} style={{ animationDelay: `${index * 110}ms` }}>
          <div className="public-story-photo"><img src={story.image} alt={story.alt} loading="lazy"/><span>{localized.label}</span></div>
          <div className="public-story-card-copy"><h3>{localized.title}</h3><div className="public-story-beat problem"><span>{text('The struggle','Pareshani','दिक्कत')}</span><p>{localized.problem}</p></div><div className="public-story-beat solution"><span>{text('A Shree Radhe idea','Shree Radhe ka idea','श्री राधे का हल')}</span><p>{localized.solution}</p></div></div>
        </article>})}</div>
      </section>

      <section className="public-services" id="services">
        <div className="public-section-heading"><p className="public-eyebrow">{text('MADE WITH CARE, FOR YOU','DIL SE SILAI, AAPKE LIYE','आपके लिए, दिल से सिलाई')}</p><h2>{text('What we do','Hum kya karte hain','हमारी सेवाएँ')}</h2><p>{text('Your style, your comfort, and every little detail matter to us.','Aapki pasand, aapka comfort aur chhoti se chhoti detail—sab par dhyan.','आपकी पसंद, आपका आराम और हर छोटी-बड़ी बात—सबका ध्यान।')}</p></div>
        <div className="public-service-grid">{services.map(({ icon: Icon, title, text: description, image, alt }, index) => {
          const serviceTitle = language === 'english' ? ['Custom stitching','A better fit','Measurement help'][index] : language === 'hindi' ? ['आपकी पसंद की सिलाई','बेहतर फिटिंग','नाप लेने में मदद'][index] : title
          const serviceDescription = language === 'english' ? ['Design, fit, and finishing shaped around your style and occasion.','Give the clothes you love a fresh feel with comfort and a fit made for you.','A simple step-by-step guide to taking measurements at home.'][index] : language === 'hindi' ? ['आपके अंदाज़ और मौके के हिसाब से डिज़ाइन, फिटिंग और फिनिशिंग।','अपने पसंदीदा कपड़ों को आरामदायक और बेहतर फिट के साथ नया रूप दें।','घर पर सही नाप लेने के लिए आसान चरण-दर-चरण गाइड।'][index] : description
          return <article className="public-service-card" key={title}>
          <div className="public-service-media"><img src={image} alt={alt} loading="lazy"/></div><span className="public-service-icon"><Icon size={21}/></span><span className="public-service-number">0{index + 1}</span><h3>{serviceTitle}</h3><p>{serviceDescription}</p>
          {index === 2 && <a href="/measurement-guide">{text('Read the guide','Naap guide dekhein','नाप गाइड देखें')} <ArrowRight size={14}/></a>}
        </article>})}</div>
      </section>

      <section className="public-story" id="story"><div className="public-story-mark"><Ruler size={25}/></div><div><p className="public-eyebrow">{text('A LITTLE ABOUT US','THODA SA HAMARE BAARE MEIN','हमारे बारे में')}</p><h2>{text('Your occasion.\nYour style.','Aapka mauka.\nAapka andaaz.','आपका मौका।\nआपका अंदाज़।')}</h2><p>{text('Every outfit starts by listening: what you like, where you will wear it, and what makes you comfortable. We bring that into the stitching and finishing.','Shree Radhe Boutique mein har outfit ki shuruaat hoti hai aapki baat sunne se—aapko kya pasand hai, kis mauke ke liye chahiye, aur aapko kis fit mein comfort milta hai. Phir usi soch ko silai aur finishing mein laayein.','श्री राधे बुटीक में हर कपड़े की शुरुआत आपकी पसंद और ज़रूरत समझने से होती है। फिर उसी सोच को सिलाई और फिनिशिंग में उतारते हैं।')}</p></div><a href="#contact">{text('Let’s talk','Chaliye baat karte hain','चलिए बात करते हैं')} <ArrowRight size={16}/></a></section>

      <section className="public-guide" id="measurement-guide"><div><p className="public-eyebrow">{text('WHERE THE PERFECT FIT BEGINS','PERFECT FIT KI SHURUAAT','परफेक्ट फिट की शुरुआत')}</p><h2>{text('Taking measurements at home?','Ghar par naap lena hai?','घर पर नाप लेना है?')}</h2><p>{text('Our simple guide explains each step, with examples for women’s and men’s garments.','Hamari simple guide har step samjhati hai—women’s aur men’s garments ke examples ke saath.','हमारी आसान गाइड हर कदम समझाती है—महिलाओं और पुरुषों के कपड़ों के उदाहरणों के साथ।')}</p></div><a className="public-button light" href="/measurement-guide">{text('Open measurement guide','Naap guide kholein','नाप गाइड खोलें')} <ArrowRight size={17}/></a></section>

      <section className="public-contact" id="contact"><div className="public-contact-heading"><p className="public-eyebrow">{text('WE WOULD LOVE TO HEAR FROM YOU','AAPKI BAAT SUNNE KA INTEZAAR RAHEGA','आपकी बात सुनने का इंतज़ार रहेगा')}</p><h2>{language === 'english' ? <>Let’s create your<br/>perfect fit.</> : language === 'hindi' ? <>चलिए, आपका<br/>परफेक्ट फिट बनाते हैं।</> : <>Chaliye, aapka<br/>perfect fit banate hain.</>}</h2><p>{text('A wedding outfit, birthday dress, or alteration—tell us what you have in mind. We will get back to you soon.','Shaadi ka outfit ho, birthday dress ya alteration—humein batayein aapke mann mein kya hai. Hum jaldi aapse baat karenge.','शादी का कपड़ा हो, जन्मदिन की ड्रेस या कोई बदलाव—हमें अपनी ज़रूरत बताइए। हम जल्द आपसे संपर्क करेंगे।')}</p></div>
        {sent ? <div className="public-form-success" role="status"><span>{text('Thank you, your message is in!','Shukriya, message mil gaya!','धन्यवाद, आपका संदेश मिल गया!')}</span><b>{text('Your enquiry reached Shree Radhe Boutique. We will contact you soon.','Aapki enquiry Shree Radhe Boutique tak pahunch gayi hai. Hum jald aapse sampark karenge.','आपकी पूछताछ श्री राधे बुटीक तक पहुँच गई है। हम जल्द आपसे संपर्क करेंगे।')}</b><button type="button" onClick={() => setSent(false)}>{text('Send another message','Ek aur message bhejein','एक और संदेश भेजें')}</button></div> : <form className="public-contact-form" onSubmit={submitContactForm}>
          <div className="public-contact-fields"><label>{text('Your name','Aapka naam','आपका नाम')}<input autoComplete="name" maxLength={150} required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder={text('Name','Naam','नाम')}/></label><label>{text('Phone number','Phone number','फ़ोन नंबर')}<input autoComplete="tel" type="tel" minLength={7} maxLength={30} required value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder={text('Phone or WhatsApp','Phone ya WhatsApp','फ़ोन या WhatsApp')}/></label><label>{text('Email address','Email address','ईमेल पता')}<input autoComplete="email" type="email" maxLength={254} required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="aap@example.com"/></label><label className="public-contact-message">{text('How can we help?','Aapko kis cheez mein help chahiye?','आपको किस चीज़ में मदद चाहिए?')}<textarea rows={4} maxLength={3000} required value={form.message} onChange={event => setForm({ ...form, message: event.target.value })} placeholder={text('Tell us about the outfit, fit, or service you need','Outfit, fitting ya service ke baare mein batayein','कपड़े, फिटिंग या सेवा के बारे में बताएँ')}/></label></div>
          <label className="public-honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={event => setForm({ ...form, website: event.target.value })}/></label>
          {formError && <p className="public-form-error" role="alert">{formError}</p>}<div className="public-contact-submit"><small>{text('Your details are used only to reply to this enquiry.','Aapki details sirf is enquiry ka jawab dene ke liye use hongi.','आपकी जानकारी केवल इस पूछताछ का जवाब देने के लिए इस्तेमाल होगी।')}</small><button className="public-button" disabled={sending}>{sending ? text('Sending…','Bhej rahe hain…','भेज रहे हैं…') : text('Send enquiry','Enquiry bhejein','पूछताछ भेजें')} <ArrowRight size={17}/></button></div>
        </form>}
      </section>
      </>}
    </main>

    <footer className="public-footer"><a className="public-brand footer-brand" href={homeHref}><span className="public-brand-mark"><BoutiqueLogoMark/></span><span><b>Shree Radhe</b><small>BOUTIQUE</small></span></a><span>{text('A personal touch in every stitch.','Har silai mein apnapan.','हर सिलाई में अपनापन।')}</span><a href={homeHref}>{text('Back to top ↑','Upar chalein ↑','ऊपर जाएँ ↑')}</a></footer>
  </div>
}
