import { Children, cloneElement, isValidElement, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { Search, UserPlus, Ruler, Users, LogOut, ArrowLeft, Plus, History, Check, Shirt, AlertCircle, Pencil, Archive, X, CalendarDays, ClipboardList, Download, Printer, Trash2, Clock3, Home, Menu, BarChart3, ChevronRight, ReceiptText, Star, Repeat2, MapPin, UserX, TrendingUp, CircleDollarSign, Wallet, BookOpen, Info, MessageSquareText, Palette } from 'lucide-react'
import { api, Customer, CustomerOrderTotals, Template, Profile, Measurement, Field, Order, OrderStatus, ProfileIndex, OrderPayment, CustomerInsights, InsightCustomer, Inquiry, InquiryStatus } from './api'
import { convertMeasurementValues, validateMeasurementValues } from './measurementValidation'
import PublicWebsite from './PublicWebsite'
import { BOUTIQUE_THEMES, useBoutiqueTheme } from './theme'
import { WEBSITE_LANGUAGES, useWebsiteLanguage } from './language'
import { BoutiqueLogoMark } from './BoutiqueLogo'

type View = 'home' | 'customers' | 'customer' | 'measure' | 'history' | 'orders' | 'measurements' | 'guide' | 'reports' | 'insights' | 'inquiries'

const ADMIN_TEXT: Record<string, [string, string]> = {
  'Open navigation menu':['Menu kholein','नेविगेशन मेन्यू खोलें'],'Close navigation menu':['Menu band karein','नेविगेशन मेन्यू बंद करें'],'Log out':['Logout','लॉग आउट'],
  'Dismiss':['Hata dein','हटाएँ'],'Open orders':['Khule orders','खुले ऑर्डर'],'Due today':['Aaj dena hai','आज की डिलीवरी'],'Overdue':['Der ho gayi','देरी से'],'Balance due':['Baaki rakam','बाकी रकम'],
  'Enable reminders while app is open':['App khula ho toh reminders chalu karein','ऐप खुला हो तो रिमाइंडर चालू करें'],'Upcoming deliveries':['Aane wali delivery','आने वाली डिलीवरी'],'View all':['Sab dekhein','सभी देखें'],'Order':['Order','ऑर्डर'],'Customer':['Customer','ग्राहक'],'Due':['Tareekh','तारीख'],'Status':['Status','स्थिति'],
  'No open orders':['Koi khula order nahi','कोई खुला ऑर्डर नहीं'],'New tailoring orders will appear here.':['Naye silai ke orders yahan dikhenge.','नए सिलाई के ऑर्डर यहाँ दिखाई देंगे।'],'Unpaid balances':['Baaki payment','बाकी भुगतान'],'No outstanding balances':['Koi payment baaki nahi','कोई भुगतान बाकी नहीं'],'Customer book':['Customer register','ग्राहक रजिस्टर'],
  'Matching customers':['Search se mile customers','खोज से मिले ग्राहक'],'Orders':['Orders','ऑर्डर'],'Order value':['Order ki rakam','ऑर्डर की रकम'],'Paid':['Jama','जमा'],'Totals cover all customers matching the current search and gender filter, across every page. Cancelled orders are excluded.':['Yeh totals search aur gender filter se mile sabhi customers ke hain. Cancelled orders shamil nahi hain.','ये कुल आँकड़े खोज और लिंग फ़िल्टर से मिले सभी ग्राहकों के हैं। रद्द ऑर्डर शामिल नहीं हैं।'],
  'City not added':['Shehar nahi diya','शहर नहीं दिया'],'No phone':['Phone nahi diya','फ़ोन नहीं दिया'],'No customers found':['Koi customer nahi mila','कोई ग्राहक नहीं मिला'],'Try another search or add a customer.':['Kuch aur search karein ya customer add karein.','दूसरी खोज करें या ग्राहक जोड़ें।'],'Previous':['Pichhla','पिछला'],'Next':['Agla','अगला'],'Page':['Page','पृष्ठ'],'of':['mein se','में से'],'Showing':['Dikha rahe hain','दिखाए जा रहे हैं'],
  'Edit customer':['Customer badlein','ग्राहक बदलें'],'Export records':['Records export karein','रिकॉर्ड एक्सपोर्ट करें'],'Print profile':['Profile print karein','प्रोफ़ाइल प्रिंट करें'],'Archive':['Archive karein','आर्काइव करें'],'Delete permanently':['Hamesha ke liye delete karein','हमेशा के लिए मिटाएँ'],'Contact & notes':['Sampark aur notes','संपर्क और नोट'],'Alternate phone:':['Doosra phone:','वैकल्पिक फ़ोन:'],'Customer code stays the same.':['Customer code nahi badlega.','ग्राहक कोड नहीं बदलेगा।'],'Customer name':['Customer ka naam','ग्राहक का नाम'],'All genders':['Sabhi','सभी'],'Female':['Mahila','महिला'],'Male':['Purush','पुरुष'],
  'Create the first order above.':['Upar se pehla order banayein.','ऊपर से पहला ऑर्डर बनाएँ।'],'New measurement profile':['Nayi naap profile','नई नाप प्रोफ़ाइल'],'Choose a garment and fitting style.':['Kapda aur fitting style chunein.','कपड़ा और फिटिंग का प्रकार चुनें।'],'Garment template':['Kapde ka template','कपड़े का टेम्पलेट'],'Choose garment…':['Kapda chunein…','कपड़ा चुनें…'],'Profile name':['Profile ka naam','प्रोफ़ाइल का नाम'],'Create profile':['Profile banayein','प्रोफ़ाइल बनाएँ'],
  'Historical records are read-only.':['Purane records sirf dekh sakte hain.','पुराने रिकॉर्ड केवल देखे जा सकते हैं।'],'Saved':['Save ho gaya','सेव है'],'No saved measurements yet.':['Abhi koi naap save nahi hai.','अभी कोई नाप सेव नहीं है।'],'Print measurement sheet':['Naap sheet print karein','नाप शीट प्रिंट करें'],
  'No measurement profiles found':['Naap ki profile nahi mili','नाप की प्रोफ़ाइल नहीं मिली'],'Create a profile from a customer record.':['Customer record se profile banayein.','ग्राहक रिकॉर्ड से प्रोफ़ाइल बनाएँ।'],'new enquiry':['nayi enquiry','नई पूछताछ'],'new enquiries':['nayi enquiries','नई पूछताछ'],'Show':['Dikhayein','दिखाएँ'],'All enquiries':['Sabhi enquiries','सभी पूछताछ'],'Read':['Padhi gayi','पढ़ी गई'],'Archived':['Archive ki gayi','आर्काइव की गई'],'Mark read':['Padha hua mark karein','पढ़ा हुआ चिह्नित करें'],'Mark new':['Naya mark karein','नया चिह्नित करें'],'Restore':['Wapas laayein','वापस लाएँ'],'Reply by email':['Email se jawab dein','ईमेल से जवाब दें'],'No enquiries here':['Yahan koi enquiry nahi','यहाँ कोई पूछताछ नहीं'],'New messages sent from the website will appear here.':['Website se aaye naye messages yahan dikhenge.','वेबसाइट से आए नए संदेश यहाँ दिखाई देंगे।'],
  'Customer segments':['Customer ke groups','ग्राहक समूह'],'VIP customers':['VIP customers','VIP ग्राहक'],'Repeat customers':['Dobara order karne wale','बार-बार ऑर्डर करने वाले'],'Recently added':['Abhi add hue','हाल में जोड़े गए'],'Recently active':['Haal mein active','हाल में सक्रिय'],'At risk of going quiet':['Dobara sampark karein','फिर संपर्क करें'],'Never ordered':['Abhi order nahi kiya','जिन्होंने ऑर्डर नहीं किया'],'Find in this group by name, city, phone, or code':['Naam, shehar, phone ya code se khojein','नाम, शहर, फ़ोन या कोड से खोजें'],'Top cities':['Sabse zyada customers wale shehar','सबसे ज़्यादा ग्राहक वाले शहर'],
  'Reports & exports':['Reports aur export','रिपोर्ट और एक्सपोर्ट'],'Download current customer and order records for your own files.':['Customer aur order records download karein.','अपने ग्राहक और ऑर्डर रिकॉर्ड डाउनलोड करें।'],'Download your data':['Apna data download karein','अपना डेटा डाउनलोड करें'],'Exports include customer contact details or order/payment summaries.':['Export mein customer details aur order/payment summary hogi.','एक्सपोर्ट में ग्राहक जानकारी और ऑर्डर/भुगतान सारांश होगा।'],'Export customers CSV':['Customers CSV export karein','ग्राहकों की CSV डाउनलोड करें'],'Export orders CSV':['Orders CSV export karein','ऑर्डर की CSV डाउनलोड करें'],
  'All orders':['Sabhi orders','सभी ऑर्डर'],'Review status, delivery dates and balances.':['Status, delivery date aur baaki payment dekhein.','स्थिति, डिलीवरी की तारीख और बाकी भुगतान देखें।'],'Edit details':['Details badlein','विवरण बदलें'],'Print slip':['Slip print karein','पर्ची प्रिंट करें'],'Payments':['Payments','भुगतान'],'Add payment':['Payment jodein','भुगतान जोड़ें'],'Payment history':['Payment history','भुगतान इतिहास'],'Cash':['Cash','नकद'],'Bank transfer':['Bank transfer','बैंक ट्रांसफर'],'Card':['Card','कार्ड'],'Other':['Other','अन्य'],'Cancel':['Cancel','रद्द करें'],'Close':['Band karein','बंद करें'],'Save payment':['Payment save karein','भुगतान सेव करें'],'Amount received today':['Aaj mili payment','आज मिली रकम'],'Payment method':['Payment ka tareeka','भुगतान का तरीका'],'Transaction reference or note':['Transaction reference ya note','लेन-देन का संदर्भ या नोट']
}

function localizeAdminTree(children: ReactNode, language: 'english' | 'hinglish' | 'hindi'): ReactNode {
  if (language === 'english') return children
  const translated = (value: unknown) => typeof value === 'string' && ADMIN_TEXT[value] ? ADMIN_TEXT[value][language === 'hindi' ? 1 : 0] : value
  return Children.map(children, child => {
    if (typeof child === 'string') {
      const trimmed = child.trim()
      const result = translated(trimmed)
      return result === trimmed ? child : `${child.match(/^\s*/)?.[0] ?? ''}${result}${child.match(/\s*$/)?.[0] ?? ''}`
    }
    if (!isValidElement(child)) return child
    const props = child.props as Record<string, unknown>
    const localProps: Record<string, unknown> = {}
    for (const key of ['title', 'aria-label', 'placeholder']) if (typeof props[key] === 'string') localProps[key] = translated(props[key])
    return cloneElement(child as ReactElement<Record<string, unknown>>, localProps, localizeAdminTree(props.children as ReactNode, language))
  })
}

function LocalizedAdminText({ children, language }: { children: ReactNode; language: 'english' | 'hinglish' | 'hindi' }) {
  return <>{localizeAdminTree(children, language)}</>
}

function whatsappHref(phone: string, name: string) {
  let recipient = phone.replace(/\D/g, '')
  if (recipient.startsWith('00')) recipient = recipient.slice(2)
  if (recipient.length === 10) recipient = `91${recipient}`
  else if (recipient.length === 11 && recipient.startsWith('0')) recipient = `91${recipient.slice(1)}`
  const message = `Hi ${name}, thank you for contacting Shree Radhe Boutique. We received your enquiry and would be happy to help.`
  return `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`
}
type InsightSegment = 'vip' | 'repeat' | 'new' | 'active' | 'risk' | 'never'
type GuideCategory = 'start' | 'blouse' | 'shirt' | 'trouser' | 'lehenga'
type GuideBodyType = 'women' | 'men'
type GuideMark = 'neck' | 'bust' | 'underbust' | 'waist' | 'hip' | 'shoulder' | 'vertical' | 'sleeve' | 'upper-arm' | 'armhole' | 'apex' | 'rise' | 'thigh' | 'knee' | 'calf' | 'hem' | 'inseam' | 'outseam' | 'circumference'
const CUSTOMER_PAGE_SIZE = 25
const LIST_PAGE_SIZE = 20
const HISTORY_PAGE_SIZE = 10
const INQUIRY_PAGE_SIZE = 20
const initialAdminView: View = window.location.hash === '#guide' ? 'guide' : 'home'

const MEASUREMENT_GUIDE: Record<GuideCategory, { label: string; bodyType: GuideBodyType; intro: string; steps: { name: string; mark: GuideMark; where: string; tip: string }[] }> = {
  start: { label: 'Getting started', bodyType: 'women', intro: 'Use these basics for every garment. Your tailor will use the garment-specific measurements in the tabs below.', steps: [
    { name: 'Chest / bust', mark: 'bust', where: 'Wrap the tape around the fullest part of the chest or bust and across the shoulder blades. Keep it level at the front and back.', tip: 'Wear the usual undergarment for the garment. Breathe normally; keep the tape snug without compressing.' },
    { name: 'Natural waist', mark: 'waist', where: 'Tie a thin thread around your waist and bend gently to each side. Measure around where the body creases, usually near the navel.', tip: 'Do not pull in your stomach. Keep the tape parallel to the floor.' },
    { name: 'Hip / seat', mark: 'hip', where: 'Measure around the fullest part of the hips and seat. Check in a mirror that the tape is level all the way around.', tip: 'Stand with feet together and keep pockets empty.' },
    { name: 'Shoulder width', mark: 'shoulder', where: 'Measure across the back from the outer shoulder point where a sleeve seam normally sits to the same point on the other side.', tip: 'Ask someone to help. Keep the tape straight across the back; do not measure around the shoulders.' },
  ] },
  blouse: { label: 'Blouse & kurti', bodyType: 'women', intro: 'These measurements cover the blouse and kurti profiles in Shree Radhe Boutique. For neck depth and finished length, confirm the design with the boutique.', steps: [
    { name: 'Underbust', mark: 'underbust', where: 'Wrap around the body directly below the bust, where the band of a close-fitting blouse would sit.', tip: 'Keep the tape level and comfortable. Do not use a bra band size as a substitute.' },
    { name: 'Shoulder', mark: 'shoulder', where: 'Measure across the back between the shoulder points where the sleeve seams should end.', tip: 'Have another person measure so you can stand relaxed.' },
    { name: 'Front neck depth', mark: 'vertical', where: 'From the shoulder-neck point, measure straight down the centre front to the depth agreed for the neckline.', tip: 'Discuss the neckline design first. This is a design depth, not a circumference.' },
    { name: 'Back neck depth', mark: 'vertical', where: 'From the shoulder-neck point, measure down the centre back to the agreed neckline depth.', tip: 'Confirm the desired back design with the boutique before recording.' },
    { name: 'Blouse / kurti length', mark: 'vertical', where: 'Starting at the high shoulder beside the neck, measure down the front to the chosen hem. For a kurti, note the desired finished length.', tip: 'Wear the footwear you expect to pair with a long kurti; ask the boutique about side-slit placement.' },
    { name: 'Sleeve length', mark: 'sleeve', where: 'Measure from the shoulder point down the outside of the arm to the sleeve end you want. Keep the elbow slightly bent.', tip: 'Name the intended sleeve end (short, elbow, 3/4, or wrist) in the design notes.' },
    { name: 'Upper arm', mark: 'upper-arm', where: 'Measure around the fullest part of the upper arm with the arm relaxed at your side.', tip: 'Keep the tape snug but leave room for comfortable movement.' },
    { name: 'Armhole', mark: 'armhole', where: 'With help, pass the tape around the shoulder and underarm where the sleeve joins the body.', tip: 'Keep the arm relaxed. The boutique may recheck this measurement to allow movement.' },
    { name: 'Apex to apex', mark: 'apex', where: 'Measure horizontally between the fullest points of the bust.', tip: 'Stand naturally and use the same undergarment you measured the bust in.' },
    { name: 'Shoulder to apex', mark: 'vertical', where: 'Measure from the shoulder-neck point down to the fullest point of the bust.', tip: 'Have someone else take this vertical measurement while you stand straight.' },
  ] },
  shirt: { label: 'Shirt & kurta', bodyType: 'men', intro: 'Measure over a thin shirt or the layer you expect to wear underneath. Relax your arms and confirm the finished lengths with the boutique.', steps: [
    { name: 'Neck', mark: 'neck', where: 'Wrap around the base of the neck where a shirt collar sits. Keep one finger under the tape for comfort.', tip: 'Do not measure tightly or use a shirt collar size as a direct body measurement.' },
    { name: 'Chest', mark: 'bust', where: 'Wrap around the fullest chest, under the arms and across the shoulder blades.', tip: 'Stand normally and keep the tape level; do not puff out the chest.' },
    { name: 'Waist', mark: 'waist', where: 'Measure around the natural waistline, keeping the tape horizontal.', tip: 'Do not hold your breath or pull the tape tight.' },
    { name: 'Shoulder', mark: 'shoulder', where: 'Measure across the back between the shoulder points where the seams should sit.', tip: 'Ask someone to measure; keep your shoulders relaxed.' },
    { name: 'Shirt / kurta length', mark: 'vertical', where: 'From the high shoulder beside the neck, measure down the front to the desired hem.', tip: 'Decide if the kurta should finish at the hip, knee, or another point before measuring.' },
    { name: 'Sleeve length', mark: 'sleeve', where: 'From the shoulder point, follow the outside of a slightly bent arm to the desired cuff position.', tip: 'A slight bend allows room to move; state whether the cuff should reach the wrist bone.' },
    { name: 'Bicep', mark: 'upper-arm', where: 'Measure around the fullest part of the upper arm with the arm relaxed.', tip: 'Allow natural movement; do not flex the arm.' },
    { name: 'Cuff', mark: 'circumference', where: 'Measure around the wrist where the cuff should close. If the cuff will go over a watch, mention it.', tip: 'Do not make the tape tight. The final cuff ease is set by the tailor.' },
    { name: 'Armhole', mark: 'armhole', where: 'With assistance, measure around the shoulder and underarm at the sleeve joining line.', tip: 'The tailor may verify this for comfortable arm movement.' },
    { name: 'Wrist', mark: 'circumference', where: 'Measure around the wrist bone at the point where the sleeve is intended to finish.', tip: 'Keep the hand relaxed and mention if you prefer a close or loose cuff.' },
  ] },
  trouser: { label: 'Trousers', bodyType: 'men', intro: 'Measure over light clothing. For inseam, outseam, and rise, ask someone to help and agree on the waistband position first.', steps: [
    { name: 'Waist', mark: 'waist', where: 'Measure around the exact height where you want the trouser waistband to sit, not automatically at the natural waist.', tip: 'Tell the boutique whether you prefer a high, natural, or low rise.' },
    { name: 'Hip / seat', mark: 'hip', where: 'Measure around the fullest part of the seat with feet together and the tape level.', tip: 'Keep pockets empty and stand straight without squeezing the tape.' },
    { name: 'Thigh', mark: 'thigh', where: 'Measure around the fullest part of one upper thigh, close to the body but without pulling tight.', tip: 'Stand with weight balanced and muscles relaxed.' },
    { name: 'Knee', mark: 'knee', where: 'Measure around the knee at the height where the trouser knee should fall.', tip: 'Keep the leg straight but not locked. The tailor chooses the finished ease.' },
    { name: 'Calf', mark: 'calf', where: 'Measure around the fullest part of the calf.', tip: 'Measure both sides if there is a noticeable difference.' },
    { name: 'Bottom / hem', mark: 'hem', where: 'Measure around the ankle or the opening size you want at the trouser hem.', tip: 'Confirm the style (straight, narrow, or wide) with the boutique.' },
    { name: 'Inseam length', mark: 'inseam', where: 'Measure from the crotch junction down the inside leg to the desired hem. Wear the footwear planned for the trousers.', tip: 'Have someone help; do not estimate this by measuring an existing pair unless the fit is right.' },
    { name: 'Outseam length', mark: 'outseam', where: 'From the waistband top at the side, measure down the outside leg to the desired hem.', tip: 'Agree where the waistband will sit before measuring.' },
    { name: 'Front rise', mark: 'rise', where: 'Measure from the front waistband top, between the legs, to the back waistband top.', tip: 'This is easier with a helper. Keep the tape following the body without pulling tight.' },
    { name: 'Back rise', mark: 'rise', where: 'Measure from the back waistband top, between the legs, to the front waistband top.', tip: 'The boutique may verify front and back rise together for a comfortable fit.' },
  ] },
  lehenga: { label: 'Lehenga & gown', bodyType: 'women', intro: 'Measure body points first, then confirm the skirt or gown design and finished lengths with the boutique.', steps: [
    { name: 'Bust', mark: 'bust', where: 'Wrap around the fullest part of the bust and across the shoulder blades, keeping the tape level.', tip: 'Wear the undergarment you plan to wear with the finished outfit.' },
    { name: 'Underbust', mark: 'underbust', where: 'Measure around the ribcage directly below the bust.', tip: 'Keep it level and comfortable; do not substitute a clothing label size.' },
    { name: 'Waist', mark: 'waist', where: 'Measure around the natural waist where the outfit waistband or waist seam should sit.', tip: 'Confirm the intended waist placement for the lehenga or gown first.' },
    { name: 'High hip', mark: 'hip', where: 'Measure around the upper hip, a short distance below the natural waist.', tip: 'The boutique can mark the exact high-hip level for your design.' },
    { name: 'Full hip', mark: 'hip', where: 'Measure around the fullest part of the hips and seat, tape level to the floor.', tip: 'Keep feet together and stand naturally.' },
    { name: 'Bodice length', mark: 'vertical', where: 'From the shoulder-neck point, measure down to the waist seam position agreed for the bodice.', tip: 'Discuss the neckline and waist seam design before measuring.' },
    { name: 'Skirt length', mark: 'inseam', where: 'From the waistband position, measure down to the desired skirt hem while wearing the planned footwear.', tip: 'Keep the tape vertical; state whether the hem should touch the floor or sit above it.' },
    { name: 'Skirt circumference', mark: 'circumference', where: 'This is usually a design/finished-garment measurement, not a body measurement. Share the desired flare or reference style with the boutique.', tip: 'Do not wrap the tape around your body for this field; confirm the final value with the tailor.' },
  ] },
}

const MEASUREMENT_GUIDE_HINGLISH: Record<GuideCategory, { label: string; intro: string; steps: Record<string, { name: string; where: string; tip: string }> }> = {
  start: { label: 'Shuruaat yahan se', intro: 'Yeh basic naap har outfit mein kaam aate hain. Neeche apne garment ka tab chuniye—har kapde ka apna chhota sa rulebook hota hai.', steps: {
    'Chest / bust': { name: 'Chest / bust (seena)', where: 'Tape ko chest ya bust ke sabse bhare hisse ke around ghumayein aur peeth ke shoulder blades se le jaayein. Aage-peeche tape seedhi aur level rahe.', tip: 'Wahi undergarment pehnein jo outfit ke saath pehnenge. Normal saans lein; tape snug ho, par body ko dabaaye nahi.' },
    'Natural waist': { name: 'Natural waist (kamar)', where: 'Kamar par patla dhaga baandhein, phir halka sa dono taraf jhukein. Jahan body fold hoti hai—aksar naabhi ke paas—wahi natural waist hai.', tip: 'Pet andar kheenchkar superhero measurement mat banaiye. Tape floor ke parallel rakhein.' },
    'Hip / seat': { name: 'Hip / seat (hip)', where: 'Hip aur seat ke sabse bhare hisse ke around naap lein. Mirror se check karein ki tape poori tarah seedhi chal rahi hai.', tip: 'Pair saath rakhein aur pockets khaali—phone bhi bahar, warna extra hip ka credit usko mil jayega.' },
    'Shoulder width': { name: 'Shoulder width (kandhe)', where: 'Peeth par ek shoulder ke outer point se doosre outer point tak seedha naap lein—jahan aam taur par sleeve ki silai aati hai.', tip: 'Kisi ki help lein. Tape peeth par seedhi rahe; shoulders ke around ghumakar naap nahi lena.' },
  } },
  blouse: { label: 'Blouse aur kurti', intro: 'Blouse ya kurti banwane ke liye yeh naap kaam aayenge. Neck depth aur finished length ka design boutique ke saath pehle pakka kar lein—baad mein “thoda aur deep” wali emergency na ho.', steps: {
    Underbust: { name: 'Underbust', where: 'Bust ke bilkul neeche, jahan blouse ka band aata hai, wahan body ke around tape le jaayein.', tip: 'Tape seedhi aur comfortable rakhein. Bra band ka size body measurement ka shortcut nahi hai.' },
    Shoulder: { name: 'Shoulder (kandha)', where: 'Peeth par dono shoulder points ke beech naap lein—jahan sleeve ki silai khatam honi chahiye.', tip: 'Kisi aur se naap dilwayein; aap aaram se seedhe khade reh paayenge.' },
    'Front neck depth': { name: 'Front neck depth', where: 'Shoulder aur neck ke milne wale point se, saamne beech mein seedha neeche tak naap lein—jitni neckline depth design mein chahiye.', tip: 'Pehle neckline design decide karein. Yeh seedha length naap hai, gol ghera nahi.' },
    'Back neck depth': { name: 'Back neck depth', where: 'Shoulder-neck point se peeth ke beech mein neeche tak, agreed back-neck depth naap lein.', tip: 'Naap likhne se pehle back design boutique ke saath confirm kar lein.' },
    'Blouse / kurti length': { name: 'Blouse / kurti length', where: 'Gardan ke paas high shoulder se saamne neeche, apne pasand ke hem tak naap lein. Kurti ke liye final length bhi note karein.', tip: 'Long kurti ke saath jo footwear pehnenge, wahi pehenkar length decide karein. Side slit par bhi boutique se baat kar lein.' },
    'Sleeve length': { name: 'Sleeve length (baazu)', where: 'Shoulder point se baazu ke bahar ki taraf, sleeve ke desired end tak naap lein. Elbow halka sa moda rakhein.', tip: 'Sleeve short, elbow, 3/4 ya wrist tak—design notes mein likh dein. “Jo theek lage” darzi ko mind-reader nahi banata.' },
    'Upper arm': { name: 'Upper arm (baazu ka ghera)', where: 'Baazu ko relaxed rakhkar upper arm ke sabse bhare hisse ka ghera naap lein.', tip: 'Tape body se lagi ho, par movement ke liye aaram ki jagah chhode.' },
    Armhole: { name: 'Armhole', where: 'Kisi ki help se shoulder aur underarm ke around wahan naap lein jahan sleeve body se judti hai.', tip: 'Baazu relaxed rakhein. Aaram se haath hile, isliye boutique is naap ko dobara check kar sakta hai.' },
    'Apex to apex': { name: 'Apex to apex', where: 'Bust ke dono fullest points ke beech seedha horizontal distance naap lein.', tip: 'Natural posture rakhein aur wahi undergarment pehnein jiske saath bust measurement liya tha.' },
    'Shoulder to apex': { name: 'Shoulder to apex', where: 'Shoulder-neck point se bust ke fullest point tak seedha neeche naap lein.', tip: 'Seedhe khade rahein aur kisi aur se yeh vertical naap dilwayein—khud twist hokar naapna yoga challenge ban sakta hai.' },
  } },
  shirt: { label: 'Shirt aur kurta', intro: 'Patli shirt ya us layer ke upar naap lein jo andar pehenne ka plan hai. Baazu relaxed rakhein; final length boutique ke saath confirm kar lein.', steps: {
    Neck: { name: 'Neck (gardan)', where: 'Gardan ke base ke around wahan naap lein jahan shirt collar baithta hai. Comfort ke liye tape ke andar ek ungli ki jagah chhodein.', tip: 'Tape kas ke mat kheenchein aur shirt collar size ko body measurement na samjhein.' },
    Chest: { name: 'Chest (seena)', where: 'Seene ke fullest hisse ke around, underarms ke neeche se aur shoulder blades ke across tape le jaayein.', tip: 'Normal khade rahein, seena phulakar photo-pose mat banaiye; tape level rakhein.' },
    Waist: { name: 'Waist (kamar)', where: 'Natural waist ke around tape ko horizontal rakhkar naap lein.', tip: 'Saans rokne ya pet andar kheenchne ki zaroorat nahi—kapde ko asli aap ke liye fit hona hai.' },
    Shoulder: { name: 'Shoulder (kandha)', where: 'Peeth par dono shoulder points ke beech naap lein, jahan seams aani chahiye.', tip: 'Kisi se help lein aur shoulders ko relaxed rakhein.' },
    'Shirt / kurta length': { name: 'Shirt / kurta length', where: 'Gardan ke paas high shoulder se saamne desired hem tak neeche naap lein.', tip: 'Pehle decide karein kurta hip, knee ya kisi aur point tak chahiye.' },
    'Sleeve length': { name: 'Sleeve length (baazu)', where: 'Shoulder point se halka muda hua baazu follow karte hue desired cuff tak naap lein.', tip: 'Elbow halka moda rahe toh movement aasan hoti hai. Cuff wrist bone tak chahiye ya nahi, bata dein.' },
    Bicep: { name: 'Bicep (upper arm)', where: 'Baazu relaxed rakhkar upper arm ke sabse bhare hisse ka ghera naap lein.', tip: 'Muscles flex mat karein—gym ka pump baad mein; abhi comfort ka fit chahiye.' },
    Cuff: { name: 'Cuff (kalai ka ghera)', where: 'Kalai ke around wahan naap lein jahan cuff band hoga. Watch ke upar cuff chahiye toh humein bata dein.', tip: 'Tape tight na ho. Final cuff mein aaram ki extra jagah darzi set karega.' },
    Armhole: { name: 'Armhole', where: 'Kisi ki help se shoulder aur underarm ke around sleeve-joining line par naap lein.', tip: 'Haath comfortably move kare, isliye boutique is measurement ko confirm kar sakta hai.' },
    Wrist: { name: 'Wrist (kalai)', where: 'Kalai ki haddi ke around, jahan sleeve khatam hogi, wahan naap lein.', tip: 'Haath relaxed rakhein aur batayein cuff close fit chahiye ya thoda loose.' },
  } },
  trouser: { label: 'Trousers / pant', intro: 'Halki clothing ke upar naap lein. Inseam, outseam aur rise ke liye helper saath rakhein; pehle decide karein waistband kahan baithna chahiye.', steps: {
    Waist: { name: 'Waist (pant ki kamar)', where: 'Jis exact height par pant ka waistband chahiye, usi level par ghera naap lein—natural waist zaroori nahi ki wahi ho.', tip: 'High, natural ya low rise—apni pasand boutique ko bata dein.' },
    'Hip / seat': { name: 'Hip / seat', where: 'Pair saath rakhkar seat ke fullest hisse ka ghera naap lein. Tape level rahe.', tip: 'Pockets khaali rakhein aur tape ko dabaakar extra slim-fit ka sapna na banayein.' },
    Thigh: { name: 'Thigh (jaangh)', where: 'Ek upper thigh ke sabse bhare hisse ka ghera naap lein. Tape paas ho, par tight nahi.', tip: 'Dono pair par weight barabar rakhein aur muscles relaxed—bodybuilder pose baad mein.' },
    Knee: { name: 'Knee (ghutna)', where: 'Us level par ghutne ka ghera naap lein jahan pant ka knee point aayega.', tip: 'Pair seedha ho par locked nahi. Final comfort-ease darzi set karega.' },
    Calf: { name: 'Calf (pindli)', where: 'Pindli ke sabse bhare hisse ka ghera naap lein.', tip: 'Dono taraf mein farq dikhe toh left aur right dono naap bata dein.' },
    'Bottom / hem': { name: 'Bottom / hem (pant ka paaycha)', where: 'Ankle ka ghera ya pant ke hem par jitni opening chahiye, woh naap lein.', tip: 'Straight, narrow ya wide—style pehle confirm kar lein, warna paaycha apni marzi chala dega.' },
    'Inseam length': { name: 'Inseam length (andar ki lambai)', where: 'Crotch ke joint se pair ke andar ki taraf desired hem tak naap lein. Planned footwear pehenkar length decide karein.', tip: 'Helper se naap dilwayein. Purani pant se copy tabhi karein jab uska fit sach mein perfect ho.' },
    'Outseam length': { name: 'Outseam length (bahar ki lambai)', where: 'Side par waistband ke top se pair ke bahar ki taraf desired hem tak naap lein.', tip: 'Naap se pehle waistband ki height decide kar lein.' },
    'Front rise': { name: 'Front rise', where: 'Front waistband ke top se, pair ke beech se hote hue back waistband ke top tak naap lein.', tip: 'Helper se aasan rahega. Tape body ke saath chale, kheenchkar tight na karein.' },
    'Back rise': { name: 'Back rise', where: 'Back waistband ke top se, pair ke beech se hote hue front waistband ke top tak naap lein.', tip: 'Aaram ke liye boutique front aur back rise ko saath mein confirm kar sakta hai.' },
  } },
  lehenga: { label: 'Lehenga aur gown', intro: 'Pehle body ke naap lein, phir skirt/gown ka design aur final length boutique ke saath pakka karein. Flare ka decision dil se ho sakta hai, naap tape se hi hoga.', steps: {
    Bust: { name: 'Bust (chest)', where: 'Bust ke fullest hisse ke around aur shoulder blades ke across tape le jaayein. Tape level rahe.', tip: 'Wahi undergarment pehnein jo final outfit ke saath pehnenge.' },
    Underbust: { name: 'Underbust', where: 'Bust ke bilkul neeche ribcage ke around naap lein.', tip: 'Tape level aur comfortable ho; clothing label ka size iska substitute nahi.' },
    Waist: { name: 'Waist (kamar)', where: 'Natural waist ke around naap lein, jahan outfit ka waistband ya waist seam baithna chahiye.', tip: 'Pehle lehenga/gown par waist placement decide karein.' },
    'High hip': { name: 'High hip', where: 'Natural waist se thoda neeche upper hip ke around naap lein.', tip: 'Aapke design ke liye boutique exact high-hip level mark karne mein help kar sakta hai.' },
    'Full hip': { name: 'Full hip (poora hip ghera)', where: 'Hip aur seat ke fullest hisse ke around naap lein; tape floor ke parallel rahe.', tip: 'Pair saath rakhein aur natural khade rahein.' },
    'Bodice length': { name: 'Bodice length (choli ki lambai)', where: 'Shoulder-neck point se bodice ki agreed waist seam tak neeche naap lein.', tip: 'Naap se pehle neckline aur waist seam ka design discuss kar lein.' },
    'Skirt length': { name: 'Skirt length (ghaghre ki lambai)', where: 'Planned footwear pehenkar waistband se desired skirt hem tak seedha naap lein.', tip: 'Tape vertical rakhein aur batayein hem floor ko touch kare ya thoda upar rahe.' },
    'Skirt circumference': { name: 'Skirt circumference (flare)', where: 'Yeh aksar finished garment/design ka naap hota hai, body ka nahi. Apni pasand ka flare ya reference style boutique ko dikhayein.', tip: 'Tape body ke around mat baandhein. Final flare darzi ke saath confirm karein.' },
  } },
}

const GUIDE_NAMES_HINDI: Record<string, string> = {
  'Chest / bust':'सीना / बस्ट','Natural waist':'प्राकृतिक कमर','Hip / seat':'कूल्हे / सीट','Shoulder width':'कंधों की चौड़ाई','Underbust':'बस्ट के नीचे का घेरा','Shoulder':'कंधा','Front neck depth':'आगे गले की गहराई','Back neck depth':'पीछे गले की गहराई','Blouse / kurti length':'ब्लाउज़ / कुर्ती की लंबाई','Sleeve length':'आस्तीन की लंबाई','Upper arm':'ऊपरी बाँह का घेरा','Armhole':'बाँह का जोड़','Apex to apex':'बस्ट के दोनों बिंदुओं के बीच','Shoulder to apex':'कंधे से बस्ट बिंदु तक','Neck':'गर्दन का घेरा','Chest':'सीने का घेरा','Waist':'कमर का घेरा','Shirt / kurta length':'शर्ट / कुर्ते की लंबाई','Bicep':'बाइसेप का घेरा','Cuff':'कफ़ का घेरा','Wrist':'कलाई का घेरा','Thigh':'जाँघ का घेरा','Knee':'घुटने का घेरा','Calf':'पिंडली का घेरा','Bottom / hem':'पायंचे का घेरा','Inseam length':'अंदरूनी पैर की लंबाई','Outseam length':'बाहरी पैर की लंबाई','Front rise':'आगे की राइज़','Back rise':'पीछे की राइज़','Bust':'बस्ट का घेरा','High hip':'ऊपरी कूल्हे का घेरा','Full hip':'पूरे कूल्हे का घेरा','Bodice length':'चोली की लंबाई','Skirt length':'स्कर्ट की लंबाई','Skirt circumference':'स्कर्ट का घेरा / घेराव'
}
const GUIDE_MARK_HINDI: Record<GuideMark, { where: string; tip: string }> = {
  neck:{where:'गर्दन के आधार के चारों ओर टेप रखें, जहाँ कॉलर बैठता है। टेप को आराम से रखें और गर्दन को न दबाएँ।',tip:'टेप और शरीर के बीच एक उँगली की जगह रखें। कपड़े के कॉलर का साइज़ सीधे शरीर का नाप नहीं होता।'},
  bust:{where:'टेप को सीने या बस्ट के सबसे भरे हिस्से के चारों ओर और पीठ के कंधे के नीचे से ले जाएँ। आगे और पीछे टेप सीधी रहे।',tip:'जिस कपड़े के साथ पहनना है, वही सामान्य अंदरूनी कपड़ा पहनें। सांस सामान्य रखें; टेप शरीर को दबाए नहीं।'},
  underbust:{where:'बस्ट के ठीक नीचे, पसलियों के चारों ओर टेप रखें। टेप आगे और पीछे एक ही स्तर पर रहे।',tip:'आराम से नापें और टेप कसें नहीं। ब्रा के बैंड का साइज़ इसकी जगह न लिखें।'},
  waist:{where:'कमर के उस स्तर पर नापें जहाँ कपड़े की कमर बैठनी चाहिए। टेप को ज़मीन के समानांतर रखें।',tip:'पेट अंदर न खींचें और सांस न रोकें। अपनी सामान्य मुद्रा में खड़े रहें।'},
  hip:{where:'कूल्हों और सीट के सबसे भरे हिस्से के चारों ओर नापें। आईने में देखें कि टेप चारों ओर सीधी है।',tip:'पैर पास रखें और जेबें खाली करें। टेप को शरीर में न दबाएँ।'},
  shoulder:{where:'पीठ पर एक कंधे के बाहरी बिंदु से दूसरे बाहरी बिंदु तक सीधा नापें।',tip:'किसी की मदद लें और कंधों को आराम से रखें। टेप को कंधों के चारों ओर न घुमाएँ।'},
  vertical:{where:'इस कपड़े के लिए बताए गए शुरुआती बिंदु से सीधे नीचे उस लंबाई तक नापें जो आप चाहते हैं। डिज़ाइन की लंबाई पहले तय करें।',tip:'आईने में टेप सीधी रखें। नेकलाइन, हेम या कमर की जगह बुटीक से पहले तय कर लें।'},
  sleeve:{where:'कंधे के बिंदु से बाँह के बाहरी हिस्से के साथ आस्तीन के इच्छित आखिरी बिंदु तक नापें। कोहनी थोड़ी मोड़ी रखें।',tip:'छोटी, कोहनी तक, तीन-चौथाई या कलाई तक—अपनी पसंद साफ़ बताएँ।'},
  'upper-arm':{where:'बाँह को आराम से नीचे रखकर ऊपरी बाँह के सबसे भरे हिस्से के चारों ओर नापें।',tip:'टेप आराम से लगी हो, पर हाथ हिलाने की जगह रहे। बाँह की मांसपेशियाँ न कसें।'},
  armhole:{where:'किसी की मदद से कंधे और बगल के चारों ओर, जहाँ आस्तीन कपड़े से जुड़ती है, नापें।',tip:'बाँह ढीली रखें। हाथ आराम से हिले, इसके लिए बुटीक इस नाप को दोबारा जाँच सकता है।'},
  apex:{where:'बस्ट के सबसे उभरे हुए दोनों बिंदुओं के बीच सीधी क्षैतिज दूरी नापें।',tip:'सीधे खड़े रहें और वही अंदरूनी कपड़ा पहनें जिसमें बस्ट का नाप लिया था।'},
  rise:{where:'कमरबंद के आगे या पीछे के ऊपरी किनारे से टेप को पैरों के बीच से दूसरी ओर के किनारे तक ले जाएँ।',tip:'किसी की मदद से नापना आसान है। टेप शरीर के साथ रहे, बहुत कसकर न खींचें।'},
  thigh:{where:'एक जाँघ के सबसे भरे हिस्से के चारों ओर नापें।',tip:'दोनों पैरों पर बराबर वज़न रखें और मांसपेशियों को आराम दें।'},
  knee:{where:'उस स्तर पर घुटने के चारों ओर नापें जहाँ पतलून का घुटना आएगा।',tip:'पैर सीधा रखें, पर घुटने को ज़ोर से लॉक न करें। आराम की अतिरिक्त जगह दर्ज़ी तय करेगा।'},
  calf:{where:'पिंडली के सबसे भरे हिस्से के चारों ओर नापें।',tip:'अगर दोनों पैरों के नाप में फर्क हो तो दोनों तरफ का नाप लिखें।'},
  hem:{where:'टखने के चारों ओर या पतलून के पायंचे पर जितना खुलाव चाहिए, उसका नाप लें।',tip:'सीधा, संकरा या चौड़ा—अपनी पसंद पहले तय करें।'},
  inseam:{where:'पैरों के बीच के जोड़ से पैर के अंदरूनी हिस्से के साथ इच्छित हेम तक नापें।',tip:'किसी से मदद लें और जिस जूते के साथ पहनना है, उसे पहनकर लंबाई तय करें।'},
  outseam:{where:'कमरबंद के किनारे से पैर के बाहरी हिस्से के साथ इच्छित हेम तक नापें।',tip:'पहले तय करें कि कमरबंद कहाँ बैठेगा।'},
  circumference:{where:'टेप को इस हिस्से के चारों ओर इच्छित खुलाव के अनुसार रखें। अगर यह तैयार कपड़े का डिज़ाइन नाप है, तो बुटीक से पुष्टि करें।',tip:'इस नाप में आराम और डिज़ाइन दोनों मायने रखते हैं। कपड़ा काटने से पहले दर्ज़ी से अंतिम नाप पक्का करें।'}
}

const GUIDE_INTRO_HINDI: Record<GuideCategory, string> = {
  start:'ये बुनियादी नाप हर कपड़े में काम आते हैं। नीचे कपड़े का प्रकार चुनें; हर डिज़ाइन के कुछ अलग नाप होते हैं।',
  blouse:'इन नापों से ब्लाउज़ और कुर्ती की फिटिंग तय होती है। गले की गहराई और तैयार लंबाई बुटीक के साथ डिज़ाइन देखकर तय करें।',
  shirt:'ये नाप शर्ट और कुर्ते के लिए हैं। कॉलर, कफ़ और तैयार लंबाई अपनी पसंद के अनुसार पहले तय करें।',
  trouser:'पतलून के लिए कमर की जगह, लंबाई और पायंचे का डिज़ाइन पहले तय करें। जूते पहनकर लंबाई लेना बेहतर रहता है।',
  lehenga:'पहले शरीर के नाप लें, फिर स्कर्ट या गाउन का डिज़ाइन और तैयार लंबाई बुटीक के साथ तय करें।'
}

function GuideIllustration({ mark, bodyType, hinglish = false, hindi = false }: { mark: GuideMark; bodyType: GuideBodyType; hinglish?: boolean; hindi?: boolean }) {
  const tapePaths: Record<GuideMark, string> = {
    neck: 'M68 47 Q80 54 92 47', bust: 'M48 83 Q80 75 112 83', underbust: 'M51 96 Q80 89 109 96', waist: 'M53 108 Q80 103 107 108', hip: 'M47 126 Q80 119 113 126', shoulder: 'M53 58 L107 58', vertical: 'M57 54 L57 143', sleeve: 'M54 61 L33 112', 'upper-arm': 'M43 80 Q33 84 37 94', armhole: 'M56 63 Q43 72 48 88', apex: 'M55 88 L105 88', rise: 'M80 128 L80 158', thigh: 'M61 139 Q53 145 59 154', knee: 'M60 160 L79 160', calf: 'M61 172 L78 172', hem: 'M59 181 L78 181', inseam: 'M79 129 L67 181', outseam: 'M111 125 L119 181', circumference: 'M52 108 Q80 101 108 108',
  }
  const bodyPath = bodyType === 'women'
    ? 'M68 45 Q58 47 51 55 L40 82 L49 88 L56 72 Q54 84 53 96 Q52 101 58 104 L53 112 Q52 124 58 132 L57 181 L72 181 L80 139 L88 181 L103 181 L102 132 Q108 124 107 112 L102 104 Q108 101 107 96 Q106 84 104 72 L111 88 L120 82 L109 55 Q102 47 92 45Z'
    : 'M66 44 Q57 46 48 53 L39 81 L48 87 L56 70 L55 97 Q54 105 58 110 L56 132 L57 181 L72 181 L80 139 L88 181 L103 181 L104 132 L102 110 Q106 105 105 97 L104 70 L112 87 L121 81 L112 53 Q103 46 94 44Z'
  return <svg className={`guide-illustration ${bodyType}`} viewBox="0 0 160 195" role="img" aria-label={hindi ? `${bodyType === 'women' ? 'महिला' : 'पुरुष'} के लिए नाप लेने की जगह का चित्र` : hinglish ? `${bodyType === 'women' ? 'Mahila' : 'Purush'} ke liye ${mark.replace('-', ' ')} naap ka placement example` : `Original ${bodyType === 'women' ? 'women’s' : 'men’s'} body example showing the ${mark.replace('-', ' ')} measurement position`}>
    <circle cx="80" cy="22" r="13" fill="#e9d8c2"/><path d="M69 38 L69 48 M91 38 L91 48" stroke="#b9a28b" strokeWidth="5" strokeLinecap="round"/>
    <path d={bodyPath} fill="#f4eee4" stroke="#789082" strokeWidth="2" strokeLinejoin="round"/>
    <path d={tapePaths[mark]} fill="none" stroke="#ba654b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx={mark === 'vertical' ? 57 : mark === 'shoulder' ? 53 : 49} cy={mark === 'vertical' ? 54 : mark === 'shoulder' ? 58 : 83} r="3" fill="#ba654b"/>
    <path d="M48 188 H112" stroke="#d8ddd5" strokeWidth="1" strokeDasharray="3 4"/><text x="80" y="193" textAnchor="middle" fontSize="7" fill="#849087">{hindi ? 'नाप की जगह' : hinglish ? 'NAAP KI JAGAH' : 'PLACEMENT EXAMPLE'}</text>
  </svg>
}

export function MeasurementGuideView({ onOpenMeasurements, publicLanguage }: { onOpenMeasurements?: () => void; publicLanguage?: 'english' | 'hinglish' | 'hindi' }) {
  const [savedLanguage] = useWebsiteLanguage()
  const [category, setCategory] = useState<GuideCategory>('start')
  const [bodyType, setBodyType] = useState<GuideBodyType>('women')
  const guide = MEASUREMENT_GUIDE[category]
  const effectiveLanguage = publicLanguage ?? savedLanguage
  const publicHinglish = effectiveLanguage === 'hinglish'
  const isHindi = effectiveLanguage === 'hindi'
  const hinglishGuide = publicHinglish ? MEASUREMENT_GUIDE_HINGLISH[category] : null
  return <>
    <section className="page-heading guide-heading"><div><p className="eyebrow">{isHindi ? 'श्री राधे बुटीक · सही फिट की मदद' : publicHinglish ? 'SHREE RADHE BOUTIQUE · PERFECT FIT KI HELP' : 'SHREE RADHE BOUTIQUE · FITTING HELP'}</p><h1>{isHindi ? 'नाप गाइड' : publicHinglish ? 'Naap guide' : 'Measurement guide'}</h1><p className="muted">{isHindi ? 'घर पर नाप लेने की आसान गाइड—नाप सही, फिटिंग सही!' : publicHinglish ? 'Ghar par naap lene ka step-by-step guide—tape se dosti karenge, toh fitting bhi dosti nibhayegi!' : 'A clear, step-by-step reference for taking body measurements at home.'}</p></div>{onOpenMeasurements && <button className="secondary" onClick={onOpenMeasurements}><Ruler size={16}/>{isHindi ? 'नाप खोलें' : publicHinglish ? 'Measurements kholein' : 'Open measurements'}</button>}</section>
    <section className="guide-prep panel"><div className="guide-prep-title"><span className="guide-prep-icon"><Info size={18}/></span><div><h2>{isHindi ? 'शुरू करने से पहले' : publicHinglish ? 'Shuru karne se pehle' : 'Before you begin'}</h2><p className="muted">{isHindi ? 'एक मददगार और मुलायम measuring tape रखें। tape से कुश्ती नहीं करनी है!' : publicHinglish ? 'Ek helper aur soft tape rakhein. Tape se kushti nahi—bas naap lena hai.' : 'A helper and a soft tape make measurements more accurate.'}</p></div></div><div className="guide-prep-list">{isHindi ? <><span><b>1</b> लचीली measuring tape और आईना लें।</span><span><b>2</b> पतले, फिट कपड़े पहनें।</span><span><b>3</b> आराम से सीधे खड़े रहें और सामान्य सांस लें।</span><span><b>4</b> tape सीधी और आरामदायक रखें, कसें नहीं।</span><span><b>5</b> दो बार नापें और एक ही इकाई लिखें।</span><span><b>6</b> शरीर का नाप लिखें; कपड़े की ढील दर्ज़ी तय करेगा।</span></> : publicHinglish ? <><span><b>1</b> Flexible measuring tape aur mirror le aayein.</span><span><b>2</b> Patle, fitted kapde ya usual undergarment pehnein.</span><span><b>3</b> Natural khade rahein, pair paas aur saans normal.</span><span><b>4</b> Tape level aur snug ho—tight bilkul nahi.</span><span><b>5</b> Do baar naap lein; same unit mein note karein.</span><span><b>6</b> Body ka naap note karein; garment ki extra ease darzi set karega.</span></> : <><span><b>1</b> Use a flexible tailor’s tape and a mirror.</span><span><b>2</b> Wear thin, fitted clothing or the usual undergarment.</span><span><b>3</b> Stand naturally, feet together, and breathe normally.</span><span><b>4</b> Keep the tape level, snug, and never tight.</span><span><b>5</b> Measure twice; record the same unit each time.</span><span><b>6</b> Record body measurements; the tailor adds garment ease.</span></>}</div></section>
    <section className="panel guide-lessons"><div className="section-head"><div><p className="eyebrow">{isHindi ? 'कपड़े का प्रकार चुनें' : publicHinglish ? 'APNA GARMENT CHUNEIN' : 'CHOOSE YOUR GARMENT'}</p><h2>{isHindi ? ({start:'शुरुआत',blouse:'ब्लाउज़ और कुर्ती',shirt:'शर्ट',trouser:'पतलून',lehenga:'लहंगा और गाउन'} as Record<GuideCategory,string>)[category] : hinglishGuide?.label ?? guide.label}</h2></div><BookOpen size={19}/></div>
      <div className="guide-tabs" role="tablist" aria-label={isHindi ? 'नाप गाइड के कपड़ों के विकल्प' : publicHinglish ? 'Naap guide ke garment options' : 'Measurement guide categories'}>{(Object.keys(MEASUREMENT_GUIDE) as GuideCategory[]).map(key => <button key={key} type="button" role="tab" aria-selected={category === key} className={`guide-tab ${category === key ? 'active' : ''}`} onClick={() => { setCategory(key); setBodyType(MEASUREMENT_GUIDE[key].bodyType) }}>{isHindi ? ({start:'शुरुआत',blouse:'ब्लाउज़ और कुर्ती',shirt:'शर्ट',trouser:'ट्राउज़र',lehenga:'लहंगा'} as Record<GuideCategory,string>)[key] : publicHinglish ? MEASUREMENT_GUIDE_HINGLISH[key].label : MEASUREMENT_GUIDE[key].label}</button>)}</div>
      <div className="guide-body-picker" aria-label={isHindi ? 'नाप के चित्र के लिए शरीर का उदाहरण चुनें' : publicHinglish ? 'Diagram ke liye body example chunein' : 'Choose the body example shown in the diagrams'}><span>{isHindi ? 'किसका उदाहरण देखें?' : publicHinglish ? 'Kiska example dekhein?' : 'Illustration body'}</span><div><button type="button" className={bodyType === 'women' ? 'active' : ''} aria-pressed={bodyType === 'women'} onClick={() => setBodyType('women')}>{isHindi ? 'महिला का उदाहरण' : publicHinglish ? 'Mahila ka example' : 'Women’s example'}</button><button type="button" className={bodyType === 'men' ? 'active' : ''} aria-pressed={bodyType === 'men'} onClick={() => setBodyType('men')}>{isHindi ? 'पुरुष का उदाहरण' : publicHinglish ? 'Purush ka example' : 'Men’s example'}</button></div><small>{isHindi ? 'जिस व्यक्ति का नाप ले रहे हैं, उससे मिलता-जुलता उदाहरण चुनें।' : publicHinglish ? 'Jis vyakti ka naap le rahe hain, uske sabse milta-julta example chunein.' : 'Choose the example closest to the person being measured.'}</small></div>
      <p className="muted guide-category-intro">{isHindi ? GUIDE_INTRO_HINDI[category] : hinglishGuide?.intro ?? guide.intro}</p>
      <div className="guide-step-grid">{guide.steps.map((step, index) => <article className="guide-step-card" key={`${category}-${step.name}`}>
        <div className="guide-step-art"><span className="guide-step-number">{String(index + 1).padStart(2, '0')}</span><GuideIllustration mark={step.mark} bodyType={bodyType} hinglish={publicHinglish} hindi={isHindi}/></div>
        <div className="guide-step-copy"><p className="eyebrow">{isHindi ? `चरण ${index + 1}` : publicHinglish ? `STEP ${index + 1} · AARAM SE` : `STEP ${index + 1}`}</p><h3>{isHindi ? GUIDE_NAMES_HINDI[step.name] ?? step.name : hinglishGuide?.steps[step.name]?.name ?? step.name}</h3><p>{isHindi ? GUIDE_MARK_HINDI[step.mark].where : hinglishGuide?.steps[step.name]?.where ?? step.where}</p><div className="guide-tip"><Check size={14}/><span>{isHindi ? GUIDE_MARK_HINDI[step.mark].tip : hinglishGuide?.steps[step.name]?.tip ?? step.tip}</span></div></div>
      </article>)}</div>
    </section>
    <section className="guide-video-panel panel"><div className="section-head"><div><p className="eyebrow">{isHindi ? 'वीडियो देखकर सीखें' : publicHinglish ? 'VIDEO DEKH KAR SEEKHEIN' : 'WATCH A TUTORIAL'}</p><h2>{isHindi ? 'नाप लेने के वीडियो' : publicHinglish ? 'Naap ka video tutorial' : 'Learn from tailoring video guides'}</h2><p className="muted">{isHindi ? 'वीडियो उनके मूल निर्माता के पेज पर खुलेंगे। हमने वीडियो कॉपी या दोबारा अपलोड नहीं किए हैं।' : publicHinglish ? 'Video unke original creator ke page par khulega—humne video copy ya re-upload nahi kiya.' : 'Videos open on their creators’ pages; this app does not copy or rehost them.'}</p></div><Shirt size={19}/></div><div className="guide-video-grid">
      <a className="guide-video-card" href="https://www.youtube.com/watch?v=koa6mA0Px48" target="_blank" rel="noreferrer"><span className="guide-video-icon"><Users size={18}/></span><span><b>{isHindi ? 'पूरे शरीर का नाप लेने की गाइड' : publicHinglish ? 'Poore body ka measurement tutorial' : 'Full-body measurement tutorial'}</b><small>YouTube · TECLAR Fashion School</small></span><ChevronRight size={17}/></a>
      <a className="guide-video-card" href="https://www.ravisehgal.com/measure-like-a-tailor/" target="_blank" rel="noreferrer"><span className="guide-video-icon men"><Shirt size={18}/></span><span><b>{isHindi ? 'पुरुषों की शर्ट और पतलून का नाप' : publicHinglish ? 'Men’s shirt aur trouser ka naap' : 'Men’s shirt & trouser measurements'}</b><small>Ravi Sehgal · individual video demonstrations</small></span><ChevronRight size={17}/></a>
    </div></section>
    <p className="guide-disclaimer">{isHindi ? 'चित्र केवल यह बताने के लिए हैं कि नाप कहाँ लिया जाता है; ये सही माप के अनुपात में नहीं हैं। कपड़े और डिज़ाइन के अनुसार सिलाई बदल सकती है। कोई नाप समझ न आए तो कपड़ा काटने से पहले बुटीक से पूछ लें—कटा कपड़ा वापस नहीं जुड़ता!' : publicHinglish ? 'Illustrations sirf naap ki jagah samjhane ke examples hain, exact scale par nahi. Design aur garment ke hisaab se silai ke tareeke badal sakte hain. Koi naap confuse kare toh fabric cut karne se pehle boutique se confirm kar lein—kapda wapas rewind nahi hota!' : 'Illustrations are original placement examples and are not to scale. Tailoring methods vary by garment and design. If a measurement is unclear, leave it for the boutique to confirm before cutting fabric.'}</p>
  </>
}

function ListPagination({ label, page, pageSize, total, onPage }: { label: string; page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.ceil(total / pageSize)
  if (pages <= 1) return null
  return <nav className="pagination list-pagination" aria-label={`${label} pages`}>
    <span>Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}</span>
    <div>
      <button className="secondary" onClick={() => onPage(Math.max(0, page - 1))} disabled={page === 0}>Previous</button>
      <span className="page-number">Page {page + 1} of {pages}</span>
      <button className="secondary" onClick={() => onPage(Math.min(pages - 1, page + 1))} disabled={page + 1 >= pages}>Next</button>
    </div>
  </nav>
}

function AdminApp() {
  const [theme, setTheme] = useBoutiqueTheme()
  const [language, setLanguage] = useWebsiteLanguage()
  const copy = (en: string, hi: string, hn: string) => language === 'english' ? en : language === 'hindi' ? hn : hi
  const measurementLabel = (label: string) => {
    if (language === 'english') return label
    const hindiLabels: Record<string, string> = { 'Chest / bust':'सीना / बस्ट','Chest':'सीना','Bust':'बस्ट','Natural waist':'प्राकृतिक कमर','Waist':'कमर','Hip / seat':'कूल्हे / सीट','Hip':'कूल्हे','Shoulder':'कंधा','Shoulder width':'कंधों की चौड़ाई','Neck':'गर्दन','Underbust':'बस्ट के नीचे','Front neck depth':'आगे गले की गहराई','Back neck depth':'पीछे गले की गहराई','Blouse / kurti length':'ब्लाउज़ / कुर्ती की लंबाई','Shirt / kurta length':'शर्ट / कुर्ते की लंबाई','Sleeve length':'आस्तीन की लंबाई','Upper arm':'ऊपरी बाँह','Armhole':'बाँह का जोड़','Apex to apex':'बस्ट बिंदुओं के बीच','Shoulder to apex':'कंधे से बस्ट तक','Bicep':'बाइसेप','Cuff':'कफ़','Wrist':'कलाई','Thigh':'जाँघ','Knee':'घुटना','Calf':'पिंडली','Bottom / hem':'पायंचा','Inseam length':'अंदरूनी लंबाई','Outseam length':'बाहरी लंबाई','Front rise':'आगे की राइज़','Back rise':'पीछे की राइज़','High hip':'ऊपरी कूल्हा','Full hip':'पूरा कूल्हा','Bodice length':'चोली की लंबाई','Skirt length':'स्कर्ट की लंबाई','Skirt circumference':'स्कर्ट का घेराव' }
    const hinglishLabels: Record<string, string> = { 'Chest / bust':'Chest / bust (seena)','Natural waist':'Natural waist (kamar)','Hip / seat':'Hip / seat (hip)','Shoulder width':'Shoulder width (kandhe)','Underbust':'Underbust (bust ke neeche)','Neck':'Neck (gardan)','Chest':'Chest (seena)','Waist':'Waist (kamar)','Thigh':'Thigh (jaangh)','Wrist':'Wrist (kalai)','Bottom / hem':'Bottom / hem (paaycha)','Bodice length':'Bodice length (choli ki lambai)','Skirt length':'Skirt length (ghaghre ki lambai)' }
    return language === 'hindi' ? hindiLabels[label] ?? label : hinglishLabels[label] ?? label
  }
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [view, setCurrentView] = useState<View>(initialAdminView)
  const historyInitialized = useRef(false)
  const selectedCustomerRef = useRef<Customer | null>(null)
  const selectedProfileRef = useRef<Profile | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState<'' | 'female' | 'male'>('')
  const [customers, setCustomers] = useState<(Customer & CustomerOrderTotals)[]>([])
  const [customerSummary, setCustomerSummary] = useState<CustomerOrderTotals>({ order_count: 0, order_value: 0, amount_paid: 0, balance_due: 0 })
  const [customerTotal, setCustomerTotal] = useState(0)
  const [allCustomerCount, setAllCustomerCount] = useState(0)
  const [customerPage, setCustomerPage] = useState(0)
  const [customerOrdersPage, setCustomerOrdersPage] = useState(0)
  const [profilePage, setProfilePage] = useState(0)
  const [historyPage, setHistoryPage] = useState(0)
  const [ordersPage, setOrdersPage] = useState(0)
  const [measurementPage, setMeasurementPage] = useState(0)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [history, setHistory] = useState<Measurement[]>([])
  const [customerOrders, setCustomerOrders] = useState<Order[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [measurementProfiles, setMeasurementProfiles] = useState<ProfileIndex[]>([])
  const [customerInsights, setCustomerInsights] = useState<CustomerInsights | null>(null)
  const [insightSegment, setInsightSegment] = useState<InsightSegment>('vip')
  const [insightQuery, setInsightQuery] = useState('')
  const [insightPage, setInsightPage] = useState(0)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [inquiryFilter, setInquiryFilter] = useState<'' | InquiryStatus>('')
  const [inquiryPage, setInquiryPage] = useState(0)
  const [inquiryTotal, setInquiryTotal] = useState(0)
  const [newInquiryCount, setNewInquiryCount] = useState(0)
  const [measurementQuery, setMeasurementQuery] = useState('')
  const [orderQuery, setOrderQuery] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('')
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null)
  const [orderGarment, setOrderGarment] = useState('')
  const [orderDueDate, setOrderDueDate] = useState('')
  const [orderPrice, setOrderPrice] = useState('')
  const [orderAdvance, setOrderAdvance] = useState('0')
  const [orderNotes, setOrderNotes] = useState('')
  const [orderMeasurementId, setOrderMeasurementId] = useState('')
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<OrderPayment['method']>('cash')
  const [paymentNote, setPaymentNote] = useState('')
  const [paymentHistoryOrder, setPaymentHistoryOrder] = useState<Order | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<OrderPayment[]>([])
  const [printingPayment, setPrintingPayment] = useState<{ payment: OrderPayment; order: Order } | null>(null)
  const [remindersEnabled, setRemindersEnabled] = useState(typeof Notification !== 'undefined' && Notification.permission === 'granted')
  const [reminderPulse, setReminderPulse] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [profileName, setProfileName] = useState('')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newAltPhone, setNewAltPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newCustomerNotes, setNewCustomerNotes] = useState('')
  const [newGender, setNewGender] = useState<'female' | 'male'>('female')
  const [newCity, setNewCity] = useState('')
  const [editingCustomer, setEditingCustomer] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAltPhone, setEditAltPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editGender, setEditGender] = useState<'female' | 'male'>('female')
  const [editCity, setEditCity] = useState('')
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [unit, setUnit] = useState<'inches' | 'cm'>('inches')
  const [fit, setFit] = useState('regular')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { api.me().then(() => setAuthenticated(true)).catch(() => setAuthenticated(false)) }, [])
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [search])
  useEffect(() => {
    if (!authenticated) return
    let current = true
    api.customers(debouncedSearch, genderFilter, CUSTOMER_PAGE_SIZE, customerPage * CUSTOMER_PAGE_SIZE)
      .then(r => {
        if (!current) return
        setCustomers(r.items ?? [])
        setCustomerTotal(r.total_count)
        setCustomerSummary(r.summary)
      })
      .catch(e => { if (current) setError(e.message) })
    return () => { current = false }
  }, [authenticated, debouncedSearch, genderFilter, customerPage])
  useEffect(() => {
    if (authenticated) api.templates().then(setTemplates).catch(e => setError(e.message))
  }, [authenticated])
  useEffect(() => {
    if (authenticated) api.customers('', '', 1, 0).then(result => setAllCustomerCount(result.total_count)).catch(e => setError(e.message))
  }, [authenticated])
  useEffect(() => {
    if (authenticated) api.orders().then(setAllOrders).catch(e => setError(e.message))
  }, [authenticated])
  useEffect(() => {
    if (authenticated) api.measurementProfiles().then(setMeasurementProfiles).catch(e => setError(e.message))
  }, [authenticated])
  useEffect(() => {
    if (!authenticated || view !== 'insights') return
    setInsightsLoading(true)
    api.customerInsights().then(setCustomerInsights).catch(e => setError(e.message)).finally(() => setInsightsLoading(false))
  }, [authenticated, view])
  useEffect(() => {
    if (!authenticated || view !== 'inquiries') return
    let current = true
    api.inquiries(inquiryFilter, INQUIRY_PAGE_SIZE, inquiryPage * INQUIRY_PAGE_SIZE)
      .then(result => {
        if (!current) return
        setInquiries(result.items)
        setInquiryTotal(result.total_count)
      })
      .catch(e => { if (current) setError(e.message) })
    return () => { current = false }
  }, [authenticated, view, inquiryFilter, inquiryPage])
  useEffect(() => {
    if (authenticated) api.inquiries('new', 1, 0).then(result => setNewInquiryCount(result.total_count)).catch(e => setError(e.message))
  }, [authenticated])
  useEffect(() => {
    if (!remindersEnabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const now = Date.now()
    for (const order of allOrders) {
      if (['delivered','cancelled'].includes(order.status)) continue
      const due = new Date(order.due_date).getTime()
      if (due > now + 24 * 60 * 60 * 1000 || order.balance <= 0) continue
      const key = `srb-reminder-${order.id}-${new Date(order.due_date).toISOString().slice(0, 10)}`
      if (localStorage.getItem(key)) continue
      new Notification('Shree Radhe Boutique', { body: `${order.customer_name}: ${order.garment_name} is due ${due < now ? 'overdue' : 'within 24 hours'}; balance ₹${order.balance.toFixed(2)}.` })
      localStorage.setItem(key, 'sent')
    }
  }, [remindersEnabled, allOrders, reminderPulse])
  useEffect(() => {
    if (!remindersEnabled) return
    const timer = window.setInterval(() => setReminderPulse(pulse => pulse + 1), 60_000)
    return () => window.clearInterval(timer)
  }, [remindersEnabled])
  useEffect(() => {
    if (!printingOrder && !printingPayment) return
    const timer = window.setTimeout(() => { window.print(); setPrintingOrder(null); setPrintingPayment(null) }, 120)
    return () => window.clearTimeout(timer)
  }, [printingOrder, printingPayment])

  const latestByProfile = useMemo(() => {
    const map = new Map<string, Measurement>()
    history.forEach(m => { if (!map.has(m.profile_id) || map.get(m.profile_id)!.version < m.version) map.set(m.profile_id, m) })
    return map
  }, [history])
  const visibleOrders = useMemo(() => {
    const term = orderQuery.trim().toLocaleLowerCase()
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return allOrders.filter(order => {
      const due = new Date(order.due_date); due.setHours(0, 0, 0, 0)
      const matchesFilter = orderStatusFilter === 'due_today' ? due.getTime() === today.getTime() && !['delivered','cancelled'].includes(order.status)
        : orderStatusFilter === 'overdue' ? due < today && !['delivered','cancelled'].includes(order.status)
        : orderStatusFilter === 'unpaid' ? order.balance > 0 && order.status !== 'cancelled'
        : !orderStatusFilter || order.status === orderStatusFilter
      return matchesFilter && (!term || [order.order_number, order.customer_name, order.customer_phone ?? '', order.garment_name].some(value => value.toLocaleLowerCase().includes(term)))
    })
  }, [allOrders, orderQuery, orderStatusFilter])
  const pagedOrders = useMemo(() => visibleOrders.slice(ordersPage * LIST_PAGE_SIZE, (ordersPage + 1) * LIST_PAGE_SIZE), [visibleOrders, ordersPage])
  const visibleMeasurementProfiles = useMemo(() => {
    const term = measurementQuery.trim().toLocaleLowerCase()
    return measurementProfiles.filter(profile => !term || [profile.customer_name, profile.customer_code, profile.phone ?? '', profile.profile_name, profile.template_name].some(value => value.toLocaleLowerCase().includes(term)))
  }, [measurementProfiles, measurementQuery])
  const pagedMeasurementProfiles = useMemo(() => visibleMeasurementProfiles.slice(measurementPage * LIST_PAGE_SIZE, (measurementPage + 1) * LIST_PAGE_SIZE), [visibleMeasurementProfiles, measurementPage])
  const selectedHistory = useMemo(() => history.filter(m => m.profile_id === selectedProfile?.id), [history, selectedProfile])
  const pagedHistory = useMemo(() => selectedHistory.slice(historyPage * HISTORY_PAGE_SIZE, (historyPage + 1) * HISTORY_PAGE_SIZE), [selectedHistory, historyPage])
  const pagedCustomerOrders = useMemo(() => customerOrders.slice(customerOrdersPage * LIST_PAGE_SIZE, (customerOrdersPage + 1) * LIST_PAGE_SIZE), [customerOrders, customerOrdersPage])
  const pagedProfiles = useMemo(() => profiles.slice(profilePage * LIST_PAGE_SIZE, (profilePage + 1) * LIST_PAGE_SIZE), [profiles, profilePage])
  const insightItems = useMemo(() => {
    if (!customerInsights) return []
    const records: Record<InsightSegment, InsightCustomer[]> = {
      vip: customerInsights.vip_customers, repeat: customerInsights.repeat_customers,
      new: customerInsights.new_customers, active: customerInsights.recently_active,
      risk: customerInsights.at_risk, never: customerInsights.never_ordered,
    }
    const term = insightQuery.trim().toLocaleLowerCase()
    return records[insightSegment].filter(customer => !term || [customer.name, customer.city ?? '', customer.phone ?? '', customer.customer_code].some(value => value.toLocaleLowerCase().includes(term)))
  }, [customerInsights, insightSegment, insightQuery])
  const pagedInsightItems = useMemo(() => insightItems.slice(insightPage * LIST_PAGE_SIZE, (insightPage + 1) * LIST_PAGE_SIZE), [insightItems, insightPage])
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const openOrders = allOrders.filter(order => !['delivered', 'cancelled'].includes(order.status))
  const overdueOrders = openOrders.filter(order => new Date(order.due_date).setHours(0, 0, 0, 0) < todayStart.getTime())
  const dueTodayOrders = openOrders.filter(order => new Date(order.due_date).setHours(0, 0, 0, 0) === todayStart.getTime())
  const inProgressOrders = openOrders.filter(order => order.status === 'in_progress')
  const readyOrders = openOrders.filter(order => order.status === 'ready')
  const unpaidOrders = allOrders.filter(order => order.balance > 0 && order.status !== 'cancelled')

  useEffect(() => { setOrdersPage(page => Math.min(page, Math.max(0, Math.ceil(visibleOrders.length / LIST_PAGE_SIZE) - 1))) }, [visibleOrders.length])
  useEffect(() => { setMeasurementPage(page => Math.min(page, Math.max(0, Math.ceil(visibleMeasurementProfiles.length / LIST_PAGE_SIZE) - 1))) }, [visibleMeasurementProfiles.length])
  useEffect(() => { setCustomerOrdersPage(page => Math.min(page, Math.max(0, Math.ceil(customerOrders.length / LIST_PAGE_SIZE) - 1))) }, [customerOrders.length])
  useEffect(() => { setProfilePage(page => Math.min(page, Math.max(0, Math.ceil(profiles.length / LIST_PAGE_SIZE) - 1))) }, [profiles.length])
  useEffect(() => { setHistoryPage(page => Math.min(page, Math.max(0, Math.ceil(selectedHistory.length / HISTORY_PAGE_SIZE) - 1))) }, [selectedHistory.length])
  useEffect(() => { selectedCustomerRef.current = selectedCustomer }, [selectedCustomer])
  useEffect(() => { selectedProfileRef.current = selectedProfile }, [selectedProfile])

  useEffect(() => {
    if (!historyInitialized.current) {
      window.history.replaceState({ ...(window.history.state ?? {}), srbOwner: 'shree-radhe-boutique', srbView: initialAdminView }, '', window.location.href)
      window.history.pushState({ srbOwner: 'shree-radhe-boutique', srbView: initialAdminView, srbRoot: true }, '', window.location.href)
      historyInitialized.current = true
    }
    function restoreAppView(event: PopStateEvent) {
      const storedView = (event.state as { srbOwner?: string; srbView?: string } | null)?.srbOwner === 'shree-radhe-boutique'
        ? (event.state as { srbView?: string }).srbView
        : 'home'
      const validViews: View[] = ['home', 'customers', 'customer', 'measure', 'history', 'orders', 'measurements', 'guide', 'reports', 'insights', 'inquiries']
      let next = validViews.includes(storedView as View) ? storedView as View : 'home'
      if (next === 'customer' && !selectedCustomerRef.current) next = 'customers'
      if ((next === 'measure' || next === 'history') && (!selectedCustomerRef.current || !selectedProfileRef.current)) next = selectedCustomerRef.current ? 'customer' : 'measurements'
      setCurrentView(next)
      setMobileNavOpen(false)
    }
    window.addEventListener('popstate', restoreAppView)
    return () => window.removeEventListener('popstate', restoreAppView)
  }, [])

  function setView(next: View) {
    window.history.pushState({ srbOwner: 'shree-radhe-boutique', srbView: next }, '', window.location.href)
    setCurrentView(next)
  }

  function goBack(fallback: View) {
    if ((window.history.state as { srbOwner?: string } | null)?.srbOwner === 'shree-radhe-boutique') window.history.back()
    else setView(fallback)
  }

  function navigate(next: View) {
    setView(next)
    setMobileNavOpen(false)
  }

  async function setInquiryStatus(inquiry: Inquiry, nextStatus: InquiryStatus) {
    setError('')
    try {
      await api.updateInquiry(inquiry.id, nextStatus)
      const [page, newItems] = await Promise.all([
        api.inquiries(inquiryFilter, INQUIRY_PAGE_SIZE, inquiryPage * INQUIRY_PAGE_SIZE),
        api.inquiries('new', 1, 0),
      ])
      setInquiries(page.items)
      setInquiryTotal(page.total_count)
      setNewInquiryCount(newItems.total_count)
    } catch (e) { setError((e as Error).message) }
  }

  async function doLogin(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setLoginError('')
    try { await api.login(password); setAuthenticated(true); setPassword('') }
    catch { setLoginError('Login failed. Check the owner password and try again.') }
    finally { setBusy(false) }
  }

  async function openCustomer(customer: Customer) {
    setCustomerOrdersPage(0); setProfilePage(0); setHistoryPage(0)
    setError(''); setSuccess(''); setSelectedCustomer(customer); setEditingCustomer(false); setView('customer'); setMobileNavOpen(false)
    try {
      const p = await api.profiles(customer.id)
      setProfiles(p)
      const records = await Promise.all(p.map(x => api.measurements(x.id).catch(() => [])))
      setHistory(records.flat().sort((a, b) => b.version - a.version))
      setCustomerOrders(await api.customerOrders(customer.id))
    } catch (e) { setError((e as Error).message) }
  }

  async function openMeasurementHistory(item: ProfileIndex) {
    try {
      setHistoryPage(0)
      const customer = await api.customer(item.customer_id)
      const [customerProfiles, records] = await Promise.all([api.profiles(item.customer_id), api.measurements(item.id)])
      setSelectedCustomer(customer)
      setProfiles(customerProfiles)
      setSelectedProfile(customerProfiles.find(profile => profile.id === item.id) ?? null)
      setHistory(records)
      setView('history')
      setMobileNavOpen(false)
    } catch (e) { setError((e as Error).message) }
  }

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const possibleMatches = await api.customers(newName.trim(), '', 10, 0)
      const nameKey = newName.trim().toLocaleLowerCase()
      const phoneKey = newPhone.replace(/\D/g, '')
      const exactMatches = possibleMatches.items.filter(c => c.name.trim().toLocaleLowerCase() === nameKey || (phoneKey.length >= 7 && (c.phone ?? '').replace(/\D/g, '') === phoneKey))
      if (exactMatches.length && !window.confirm(`Possible existing customer: ${exactMatches.map(c => `${c.name} (${c.customer_code})`).join(', ')}. Add another record anyway?`)) return
      const customer = await api.createCustomer({ name: newName, gender: newGender, city: newCity.trim() || undefined, phone: newPhone || undefined, alternate_phone: newAltPhone || undefined, email: newEmail || undefined, notes: newCustomerNotes || undefined })
      setNewName(''); setNewPhone(''); setNewAltPhone(''); setNewEmail(''); setNewCustomerNotes(''); setNewGender('female'); setNewCity(''); setShowAddCustomer(false)
      setCustomerPage(0)
      const result = await api.customers(search, genderFilter, CUSTOMER_PAGE_SIZE, 0)
      setCustomers(result.items); setCustomerTotal(result.total_count); setCustomerSummary(result.summary)
      api.customers('', '', 1, 0).then(all => setAllCustomerCount(all.total_count)).catch(() => {})
      await openCustomer(customer)
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  async function refreshCustomers() {
    const r = await api.customers(search, genderFilter, CUSTOMER_PAGE_SIZE, customerPage * CUSTOMER_PAGE_SIZE)
    setCustomers(r.items); setCustomerTotal(r.total_count); setCustomerSummary(r.summary)
  }

  async function createOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCustomer || !orderGarment.trim() || !orderDueDate) return
    setBusy(true); setError('')
    try {
      const order = await api.createOrder(selectedCustomer.id, {
        garment_name: orderGarment.trim(), due_date: new Date(`${orderDueDate}T23:59:00`).toISOString(),
        price: Number(orderPrice), advance: Number(orderAdvance), notes: orderNotes.trim() || undefined,
        measurement_record_id: orderMeasurementId || null,
      })
      setCustomerOrders(rows => [order, ...rows]); setCustomerOrdersPage(0); setAllOrders(rows => [order, ...rows]); setOrdersPage(0)
      setOrderGarment(''); setOrderDueDate(''); setOrderPrice(''); setOrderAdvance('0'); setOrderNotes(''); setOrderMeasurementId('')
      setSuccess(`Order ${order.order_number} created.`)
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  async function changeOrderStatus(order: Order, status: OrderStatus) {
    try {
      const updated = await api.updateOrder(order.id, { status })
      setCustomerOrders(rows => rows.map(row => row.id === order.id ? updated : row))
      setAllOrders(rows => rows.map(row => row.id === order.id ? updated : row))
    } catch (e) { setError((e as Error).message) }
  }

  function openPaymentForm(order: Order) {
    setPaymentOrder(order)
    setPaymentAmount('')
    setPaymentMethod('cash')
    setPaymentNote('')
    setError('')
  }

  async function openPaymentHistory(order: Order) {
    setPaymentHistoryOrder(order); setPaymentHistory([]); setError('')
    try { setPaymentHistory(await api.orderPayments(order.id)) }
    catch (e) { setError((e as Error).message) }
  }

  async function addOrderPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!paymentOrder) return
    const amount = Number(paymentAmount)
    const amountCents = Math.round(amount * 100)
    const balanceCents = Math.round(paymentOrder.balance * 100)
    if (!Number.isFinite(amount) || amountCents <= 0 || amountCents > balanceCents) {
      setError(`Enter an amount from ₹0.01 to ₹${paymentOrder.balance.toFixed(2)}.`)
      return
    }
    setBusy(true)
    try {
      const order = paymentOrder
      await api.createOrderPayment(order.id, { amount: amountCents / 100, method: paymentMethod, note: paymentNote.trim() || undefined })
      const updated = await api.customerOrders(order.customer_id).then(orders => orders.find(item => item.id === order.id))
      if (!updated) throw new Error('Payment saved, but the order could not be refreshed. Reload the order list.')
      setCustomerOrders(rows => rows.map(row => row.id === order.id ? updated : row))
      setAllOrders(rows => rows.map(row => row.id === order.id ? updated : row))
      setPaymentOrder(null); setPaymentAmount(''); setError('')
      setSuccess(`Payment of ₹${(amountCents / 100).toFixed(2)} recorded for ${order.order_number}.`)
      if (paymentHistoryOrder?.id === order.id) setPaymentHistory(await api.orderPayments(order.id))
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  async function editOrder(order: Order) {
    const garment = window.prompt('Garment / work description:', order.garment_name)
    if (garment === null) return
    const dueDate = window.prompt('Delivery date (YYYY-MM-DD):', new Date(order.due_date).toISOString().slice(0, 10))
    if (dueDate === null) return
    const priceText = window.prompt('Total price:', String(order.price))
    if (priceText === null) return
    const notesValue = window.prompt('Design / order notes:', order.notes ?? '')
    if (notesValue === null) return
    const price = Number(priceText)
    if (!garment.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(price) || price < order.advance) {
      setError('Check the garment name, delivery date and price. Total price must be at least the advance already received.')
      return
    }
    try {
      const updated = await api.updateOrder(order.id, { garment_name: garment.trim(), due_date: new Date(`${dueDate}T23:59:00`).toISOString(), price, notes: notesValue.trim() })
      setCustomerOrders(rows => rows.map(row => row.id === order.id ? updated : row))
      setAllOrders(rows => rows.map(row => row.id === order.id ? updated : row))
      setSuccess(`Order ${order.order_number} updated.`)
    } catch (e) { setError((e as Error).message) }
  }

  async function exportCustomer() {
    if (!selectedCustomer) return
    try {
      const data = await api.exportCustomer(selectedCustomer.id)
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a'); link.href = url; link.download = `${selectedCustomer.customer_code}-records.json`; link.click(); URL.revokeObjectURL(url)
    } catch (e) { setError((e as Error).message) }
  }

  async function permanentlyDeleteCustomer() {
    if (!selectedCustomer) return
    const confirmation = window.prompt(`This permanently deletes ${selectedCustomer.name}, all measurement history, and all orders. Export first if you need a copy. Type the customer's full name to confirm.`)
    if (confirmation !== selectedCustomer.name) { if (confirmation !== null) setError('Name did not match. Nothing was deleted.'); return }
    setBusy(true)
    try {
      await api.deleteCustomer(selectedCustomer.id, confirmation)
      setSelectedCustomer(null); setView('customers'); await refreshCustomers()
      const [orders, profiles, count] = await Promise.all([api.orders(), api.measurementProfiles(), api.customers('', '', 1, 0)])
      setAllOrders(orders); setMeasurementProfiles(profiles); setAllCustomerCount(count.total_count); setSuccess('Customer and linked records permanently deleted.')
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  function printCurrent() { window.print() }

  async function enableReminders() {
    if (!('Notification' in window)) { setError('This browser does not support notifications. Upcoming orders remain visible in the app.'); return }
    const permission = await Notification.requestPermission()
    setRemindersEnabled(permission === 'granted')
    if (permission === 'granted') {
      const today = new Date(); today.setHours(23, 59, 59, 999)
      const due = allOrders.filter(o => !['delivered','cancelled'].includes(o.status) && new Date(o.due_date) <= today && o.balance > 0)
      if (!due.length) new Notification('Shree Radhe Boutique', { body: 'Reminders are enabled while this app is open. Upcoming work is shown on the home screen.' })
    }
  }

  function exportOrdersCsv() {
    const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const rows = [['Order','Customer','Garment','Due date','Status','Price','Advance','Balance'], ...allOrders.map(o => [o.order_number,o.customer_name,o.garment_name,new Date(o.due_date).toLocaleDateString(),o.status,o.price,o.advance,o.balance])]
    const csv = rows.map(row => row.map(quote).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'shree-radhe-orders.csv'; link.click(); URL.revokeObjectURL(url)
  }

  async function exportCustomersCsv() {
    try {
      const first = await api.customers('', '', 500, 0)
      const rows = [...first.items]
      for (let offset = first.items.length; offset < first.total_count; offset += 500) {
        rows.push(...(await api.customers('', '', 500, offset)).items)
      }
      const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
      const csv = [['Customer code','Name','Gender','City','Phone','Alternate phone','Email','Notes'], ...rows.map(c => [c.customer_code,c.name,c.gender,c.city,c.phone,c.alternate_phone,c.email,c.notes])].map(row => row.map(quote).join(',')).join('\r\n')
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a'); link.href = url; link.download = 'shree-radhe-customers.csv'; link.click(); URL.revokeObjectURL(url)
    } catch (e) { setError((e as Error).message) }
  }

  function beginCustomerEdit() {
    if (!selectedCustomer) return
    setEditName(selectedCustomer.name)
    setEditPhone(selectedCustomer.phone ?? '')
    setEditAltPhone(selectedCustomer.alternate_phone ?? '')
    setEditEmail(selectedCustomer.email ?? '')
    setEditNotes(selectedCustomer.notes ?? '')
    setEditGender(selectedCustomer.gender)
    setEditCity(selectedCustomer.city ?? '')
    setEditingCustomer(true)
  }

  async function saveCustomerEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCustomer) return
    setBusy(true); setError('')
    try {
      const updated = await api.updateCustomer(selectedCustomer.id, {
        name: editName.trim(), gender: editGender, city: editCity.trim() || null, phone: editPhone.trim() || null,
        alternate_phone: editAltPhone.trim() || null, email: editEmail.trim() || null, notes: editNotes.trim() || null,
      })
      setSelectedCustomer(updated)
      setEditingCustomer(false)
      await refreshCustomers()
      setSuccess('Customer details updated.')
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  async function archiveSelectedCustomer() {
    if (!selectedCustomer || !window.confirm(`Archive ${selectedCustomer.name}? Their measurement history will be retained but the customer will leave the active list.`)) return
    setBusy(true); setError('')
    try {
      await api.archiveCustomer(selectedCustomer.id)
      setSelectedCustomer(null); setView('customers')
      const nextPage = Math.min(customerPage, Math.max(0, Math.ceil((customerTotal - 1) / CUSTOMER_PAGE_SIZE) - 1))
      setCustomerPage(nextPage)
      const result = await api.customers(search, genderFilter, CUSTOMER_PAGE_SIZE, nextPage * CUSTOMER_PAGE_SIZE)
      setCustomers(result.items); setCustomerTotal(result.total_count); setCustomerSummary(result.summary)
      const [all, profiles] = await Promise.all([api.customers('', '', 1, 0), api.measurementProfiles()])
      setAllCustomerCount(all.total_count); setMeasurementProfiles(profiles)
      setSuccess('Customer archived. Historical records have been retained.')
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  async function createProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCustomer || !selectedTemplate) return
    setBusy(true); setError('')
    try {
      const p = await api.createProfile(selectedCustomer.id, selectedTemplate.id, profileName || selectedTemplate.name)
      setProfiles(old => [p, ...old]); setProfilePage(0); setSelectedProfile(p); setProfileName('')
      api.measurementProfiles().then(setMeasurementProfiles).catch(() => {})
      setFormValues({}); setNotes(''); setView('measure')
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  async function startNewVersion(profile: Profile) {
    setSelectedProfile(profile); setError(''); setSuccess('')
    const template = templates.find(t => t.id === profile.template_id)
    if (!template) { setError('Template not found'); return }
    setSelectedTemplate(template)
    const records = await api.measurements(profile.id).catch(() => [])
    const latest = records[0]
    setFormValues(latest ? Object.fromEntries(Object.entries(latest.measurements).map(([k,v]) => [k, String(v)])) : {})
    setUnit((latest?.unit as 'inches' | 'cm') ?? 'inches')
    setFit(latest?.fit_preference ?? 'regular'); setNotes('')
    setView('measure')
  }

  function changeUnit(nextUnit: 'inches' | 'cm') {
    setFormValues(current => convertMeasurementValues(current, unit, nextUnit))
    setUnit(nextUnit)
  }

  async function saveMeasurement(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProfile || !selectedTemplate) return
    setBusy(true); setError(''); setSuccess('')
    try {
      const validationMessage = validateMeasurementValues(selectedTemplate.fields, formValues)
      if (validationMessage) throw new Error(validationMessage)
      const measurements = Object.fromEntries(
        Object.entries(formValues).filter(([,v]) => v.trim() !== '').map(([k,v]) => [k, Number(v)])
      )
      if (Object.values(measurements).some(v => !Number.isFinite(v) || v <= 0)) {
        throw new Error('Measurements must be positive numbers.')
      }
      const saved = await api.createMeasurement(selectedProfile.id, {
        template_version_id: selectedTemplate.current_version_id,
        measured_at: new Date().toISOString(),
        unit, measurements, fit_preference: fit, notes, change_reason: 'New measurement entry'
      })
      await openCustomer(selectedCustomer!)
      api.measurementProfiles().then(setMeasurementProfiles).catch(() => {})
      setSuccess(`Measurement version ${saved.version} saved.`)
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  if (authenticated === null) return <main className="center" data-theme={theme}><div className="panel">Loading Shree Radhe Boutique…</div></main>
  if (!authenticated) return (
    <main className="login-wrap" data-theme={theme} data-language={language} lang={language === 'hindi' ? 'hi' : 'en'}>
      <form className="login-card" onSubmit={doLogin}>
        <div className="brand-mark"><BoutiqueLogoMark/></div>
        <p className="eyebrow">PRIVATE WORKSPACE</p>
        <h1>Shree Radhe Boutique</h1>
        <p className="muted">Your digital measurement book</p>
        <label>Owner password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>
        {loginError && <p className="error"><AlertCircle size={16}/>{loginError}</p>}
        <button className="primary full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  )

  return (
    <div className="app-shell" data-theme={theme} data-language={language} lang={language === 'hindi' ? 'hi' : 'en'}>
      <header className="topbar">
        <button className="mobile-menu-button" aria-label="Open navigation menu" onClick={() => setMobileNavOpen(true)}><Menu size={21}/></button>
        <div className="topbar-title">{view === 'home' ? copy('Dashboard','Dashboard','डैशबोर्ड') : view === 'customers' ? copy('Customers','Customers','ग्राहक') : view === 'orders' ? copy('Orders','Orders','ऑर्डर') : view === 'measurements' ? copy('Measurements','Measurements','नाप') : view === 'guide' ? copy('Measurement guide','Naap guide','नाप गाइड') : view === 'reports' ? copy('Reports','Reports','रिपोर्ट') : view === 'insights' ? copy('Customer insights','Customer insights','ग्राहक जानकारी') : view === 'inquiries' ? copy('Website enquiries','Website enquiries','वेबसाइट पूछताछ') : selectedCustomer?.name ?? copy('Customer record','Customer record','ग्राहक रिकॉर्ड')}</div>
        <button className="icon-button" title="Log out" onClick={async () => { await api.logout().catch(() => {}); setAuthenticated(false) }}><LogOut size={18}/></button>
      </header>
      <div className="app-frame">
      {mobileNavOpen && <button className="nav-scrim" aria-label="Close navigation menu" onClick={() => setMobileNavOpen(false)}/>}
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <button className="sidebar-brand" onClick={() => navigate('home')}><span className="brand-mark"><BoutiqueLogoMark/></span><span><b>Shree Radhe</b><small>BOUTIQUE</small></span></button>
        <nav className="sidebar-nav" aria-label={copy('Main navigation','Main navigation','मुख्य मेन्यू')}>
          <button className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => navigate('home')}><Home size={18}/>{copy('Dashboard','Dashboard','डैशबोर्ड')}</button>
          <button className={`nav-item ${view === 'customers' || view === 'customer' ? 'active' : ''}`} onClick={() => navigate('customers')}><Users size={18}/>{copy('Customers','Customers','ग्राहक')}</button>
          <button className={`nav-item ${view === 'insights' ? 'active' : ''}`} onClick={() => navigate('insights')}><TrendingUp size={18}/>{copy('Customer insights','Customer insights','ग्राहक जानकारी')}</button>
          <button className={`nav-item ${view === 'orders' ? 'active' : ''}`} onClick={() => navigate('orders')}><ClipboardList size={18}/>{copy('Orders','Orders','ऑर्डर')}<span className="nav-count">{allOrders.filter(order => !['delivered','cancelled'].includes(order.status)).length}</span></button>
          <button className={`nav-item ${view === 'measurements' || view === 'measure' || view === 'history' ? 'active' : ''}`} onClick={() => navigate('measurements')}><Ruler size={18}/>{copy('Measurements','Measurements','नाप')}</button>
          <button className={`nav-item ${view === 'guide' ? 'active' : ''}`} onClick={() => navigate('guide')}><BookOpen size={18}/>{copy('Measurement guide','Naap guide','नाप गाइड')}</button>
          <button className={`nav-item ${view === 'inquiries' ? 'active' : ''}`} onClick={() => { setInquiryPage(0); navigate('inquiries') }}><MessageSquareText size={18}/>{copy('Website enquiries','Website enquiries','वेबसाइट पूछताछ')}{newInquiryCount > 0 && <span className="nav-count">{newInquiryCount}</span>}</button>
          <button className={`nav-item ${view === 'reports' ? 'active' : ''}`} onClick={() => navigate('reports')}><BarChart3 size={18}/>{copy('Reports','Reports','रिपोर्ट')}</button>
        </nav>
        <div className="sidebar-footer"><label className="theme-control"><span><Palette size={14}/>{copy('Website & app theme','Website & app theme','वेबसाइट और ऐप की थीम')}</span><select aria-label="Change website and admin theme" value={theme} onChange={event => { void setTheme(event.target.value as typeof theme).catch(e => setError(`Theme could not be saved: ${(e as Error).message}`)) }}>{BOUTIQUE_THEMES.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="theme-control"><span>🌐 {copy('Website, guide & app language','Website, guide & app language','वेबसाइट, गाइड और ऐप की भाषा')}</span><select aria-label="Change website, guide and app language" value={language} onChange={event => { void setLanguage(event.target.value as typeof language).catch(e => setError(`Language could not be saved: ${(e as Error).message}`)) }}>{WEBSITE_LANGUAGES.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><span className="sidebar-status-dot"/>{copy('Private workspace','Private workspace','निजी कार्यक्षेत्र')}<small>{copy('Customer records stay under your control','Customer records stay under your control','ग्राहकों का डेटा आपके नियंत्रण में रहता है')}</small></div>
      </aside>
      <main className="content">
        <LocalizedAdminText language={language}>
        {error && <div className="alert error"><AlertCircle size={17}/><span>{error}</span><button onClick={() => setError('')}>Dismiss</button></div>}
        {success && <div className="alert success"><Check size={17}/>{success}</div>}

        {view === 'home' && <>
          <section className="dashboard-welcome">
            <div><p className="eyebrow">{copy('YOUR SHOP','YOUR SHOP','आपकी दुकान')}</p><h1>{copy('Good morning','Good morning','सुप्रभात')}</h1></div>
            <div className="dashboard-actions"><button className="secondary" onClick={() => { setView('customers'); setShowAddCustomer(true) }}><UserPlus size={16}/>{copy('Add customer','Add customer','ग्राहक जोड़ें')}</button><button className="primary" onClick={() => { setView('customers'); setSuccess(copy('Choose a customer to start a new order.','Choose a customer to start a new order.','नया ऑर्डर शुरू करने के लिए ग्राहक चुनें।')) }}><Plus size={16}/>{copy('New order','New order','नया ऑर्डर')}</button></div>
          </section>
          <section className="dashboard-stats">
            <div className="stat-card"><span className="stat-icon stat-green"><ClipboardList size={18}/></span><b>{openOrders.length}</b><small>{copy('Open orders','Open orders','खुले ऑर्डर')}</small></div>
            <div className="stat-card"><span className="stat-icon stat-gold"><CalendarDays size={18}/></span><b>{allOrders.filter(o => new Date(o.due_date).toDateString() === new Date().toDateString() && !['delivered','cancelled'].includes(o.status)).length}</b><small>{copy('Due today','Due today','आज की डिलीवरी')}</small></div>
            <div className="stat-card"><span className="stat-icon stat-red"><AlertCircle size={18}/></span><b>{overdueOrders.length}</b><small>{copy('Overdue','Overdue','देरी से')}</small></div>
            <div className="stat-card"><span className="stat-icon stat-green"><span className="rupee-mark">₹</span></span><b>₹{allOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.balance, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b><small>{copy('Balance due','Balance due','बाकी रकम')}</small></div>
          </section>
          {!remindersEnabled && 'Notification' in window && <button className="secondary reminder-button" onClick={enableReminders}>Enable reminders while app is open</button>}
          <div className="dashboard-panels">
            <section className="panel dashboard-panel">
              <div className="section-head"><div><h2>{copy('Upcoming deliveries','Upcoming deliveries','आने वाली डिलीवरी')}</h2></div><button className="text-link" onClick={() => navigate('orders')}>{copy('View all','View all','सभी देखें')} <ChevronRight size={15}/></button></div>
              <div className="dashboard-table-head"><span>Order</span><span>Customer</span><span>Due</span><span>Status</span></div>
              {openOrders.slice(0, 5).map(order => <div className="dashboard-order-row" key={order.id}>
                <b>{order.order_number}</b><span className="dashboard-customer-cell"><span>{order.customer_name}</span><small>{order.garment_name}</small></span><span>{new Date(order.due_date).toLocaleDateString()}</span><span className={`status-pill status-${order.status}`}>{order.status.replace('_',' ')}</span>
              </div>)}
              {!openOrders.length && <div className="empty"><Clock3 size={22}/><b>{copy('No open orders','No open orders','कोई खुला ऑर्डर नहीं')}</b><span>{copy('New tailoring orders will appear here.','New tailoring orders will appear here.','नए सिलाई के ऑर्डर यहाँ दिखाई देंगे।')}</span></div>}
            </section>
            <section className="panel dashboard-panel">
              <div className="section-head"><div><h2>{copy('Unpaid balances','Unpaid balances','बाकी भुगतान')}</h2></div><button className="text-link" onClick={() => navigate('orders')}>{copy('View all','View all','सभी देखें')} <ChevronRight size={15}/></button></div>
              {allOrders.filter(o => o.balance > 0 && o.status !== 'cancelled').slice(0, 5).map(order => <div className="balance-row" key={order.id}>
                <span className="balance-avatar">{order.customer_name.slice(0,1).toUpperCase()}</span><span className="balance-customer"><b>{order.customer_name}</b><small>{order.order_number} · {order.garment_name}</small></span><b className="balance-value">₹{order.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b>
                <button className="payment-quick" aria-label={`Add payment to ${order.order_number}`} onClick={() => openPaymentForm(order)}><Plus size={16}/></button>
              </div>)}
              {!allOrders.some(o => o.balance > 0 && o.status !== 'cancelled') && <div className="empty"><Check size={22}/><b>{copy('No outstanding balances','No outstanding balances','कोई बकाया नहीं')}</b></div>}
            </section>
          </div>
          <section className="dashboard-footnote"><Users size={17}/><span><b>{allCustomerCount.toLocaleString('en-IN')} customers</b></span><button className="text-link" onClick={() => navigate('customers')}>Customer book <ChevronRight size={15}/></button></section>
        </>}

        {view === 'customers' && <>
          <section className="panel">
            <div className="customer-toolbar">
              <div><p className="eyebrow">{copy('CUSTOMER BOOK','CUSTOMER BOOK','ग्राहक रजिस्टर')}</p><h1>{copy('Customers','Customers','ग्राहक')}</h1><p className="muted">{customerTotal} {copy('saved','saved','दर्ज')} · {templates.length} {copy('garment templates','garment templates','कपड़ों के डिज़ाइन')}</p></div>
              <button className="primary add-customer-toggle" onClick={() => setShowAddCustomer(value => !value)}>
                {showAddCustomer ? <X size={17}/> : <UserPlus size={17}/>} {showAddCustomer ? copy('Close','Close','बंद करें') : copy('Add customer','Add customer','ग्राहक जोड़ें')}
              </button>
            </div>
            {showAddCustomer && <form className="customer-add-form" onSubmit={addCustomer}>
              <div className="form-grid">
                <label>{copy('Customer name','Customer name','ग्राहक का नाम')}<input value={newName} onChange={e => setNewName(e.target.value)} required maxLength={150} placeholder="e.g. Rahul Sharma" autoFocus/></label>
                <label>{copy('Gender','Gender','लिंग')}<select value={newGender} onChange={e => setNewGender(e.target.value as 'female' | 'male')}><option value="female">{copy('Female','Female','महिला')}</option><option value="male">{copy('Male','Male','पुरुष')}</option></select></label>
                <label>{copy('City','City','शहर')}<input value={newCity} onChange={e => setNewCity(e.target.value)} maxLength={100} placeholder="e.g. Jaipur"/></label>
                <label>{copy('Mobile number','Mobile number','मोबाइल नंबर')} <span className="muted">{copy('(optional)','(optional)','(वैकल्पिक)')}</span><input value={newPhone} onChange={e => setNewPhone(e.target.value)} maxLength={20} placeholder="+91…"/></label>
                <label>{copy('Alternate phone','Alternate phone','वैकल्पिक फ़ोन')} <span className="muted">{copy('(optional)','(optional)','(वैकल्पिक)')}</span><input value={newAltPhone} onChange={e => setNewAltPhone(e.target.value)} maxLength={20}/></label>
                <label>{copy('Email','Email','ईमेल')} <span className="muted">{copy('(optional)','(optional)','(वैकल्पिक)')}</span><input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} maxLength={254}/></label>
                <label>{copy('Customer notes','Customer notes','ग्राहक संबंधी नोट')} <span className="muted">{copy('(optional)','(optional)','(वैकल्पिक)')}</span><input value={newCustomerNotes} onChange={e => setNewCustomerNotes(e.target.value)} maxLength={2000} placeholder={copy('Preferences or useful details','Preferences or useful details','पसंद या ज़रूरी जानकारी')}/></label>
              </div>
              <div className="form-actions"><button type="button" className="secondary" onClick={() => setShowAddCustomer(false)}>{copy('Cancel','Cancel','रद्द करें')}</button><button className="primary" disabled={busy}><Plus size={17}/>{busy ? copy('Saving…','Saving…','सेव हो रहा है…') : copy('Save customer','Save customer','ग्राहक सेव करें')}</button></div>
            </form>}
            <div className="customer-filters">
              <div className="searchbox"><Search size={18}/><input value={search} onChange={e => { setSearch(e.target.value); setCustomerPage(0) }} placeholder={copy('Search name, city, phone, or code','Search name, city, phone, or code','नाम, शहर, फ़ोन या कोड खोजें')} />{search && <button className="search-clear" type="button" aria-label={copy('Clear customer search','Clear customer search','ग्राहक खोज साफ़ करें')} onClick={() => { setSearch(''); setCustomerPage(0) }}><X size={16}/></button>}</div>
              <label className="gender-filter">{copy('Gender','Gender','लिंग')}<select value={genderFilter} onChange={e => { setGenderFilter(e.target.value as '' | 'female' | 'male'); setCustomerPage(0) }}><option value="">{copy('All genders','All genders','सभी')}</option><option value="female">{copy('Female','Female','महिला')}</option><option value="male">{copy('Male','Male','पुरुष')}</option></select></label>
            </div>
            <section className="customer-results-summary" aria-label="Totals for matching customers">
              <div><small>Matching customers</small><b>{customerTotal.toLocaleString('en-IN')}</b></div>
              <div><small>Orders</small><b>{customerSummary.order_count.toLocaleString('en-IN')}</b></div>
              <div><small>Order value</small><b>₹{customerSummary.order_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b></div>
              <div><small>Paid</small><b>₹{customerSummary.amount_paid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b></div>
              <div><small>Balance due</small><b>₹{customerSummary.balance_due.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b></div>
              <p>Totals cover all customers matching the current search and gender filter, across every page. Cancelled orders are excluded.</p>
            </section>
            <div className="customer-grid">
              {customers.map(c => <button className="customer-card" key={c.id} onClick={() => openCustomer(c)}>
                <span className="customer-card-top"><span className="avatar">{c.name.slice(0,1).toUpperCase()}</span><span className="customer-card-name"><b>{c.name}</b><small>{c.customer_code}</small></span><ChevronRight size={17}/></span>
                <span className="customer-card-contact"><span>{c.city || 'City not added'}</span><i>·</i><span>{c.gender === 'female' ? 'Female' : 'Male'}</span><i>·</i><span>{c.phone || 'No phone'}</span></span>
                <span className="customer-card-stats">
                  <span><small><ClipboardList size={13}/> Orders</small><b>{c.order_count}</b></span>
                  <span><small><TrendingUp size={13}/> Order value</small><b>₹{c.order_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b></span>
                  <span><small><Wallet size={13}/> Paid</small><b>₹{c.amount_paid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b></span>
                  <span><small><CircleDollarSign size={13}/> Balance</small><b className={c.balance_due > 0 ? 'customer-balance-due' : ''}>₹{c.balance_due.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b></span>
                </span>
              </button>)}
              {!customers.length && <div className="empty customer-grid-empty"><Users size={25}/><b>No customers found</b><span>Try another search or add a customer.</span></div>}
            </div>
            {customerTotal > CUSTOMER_PAGE_SIZE && <nav className="pagination" aria-label="Customer pages">
              <span>Showing {customerPage * CUSTOMER_PAGE_SIZE + 1}–{Math.min((customerPage + 1) * CUSTOMER_PAGE_SIZE, customerTotal)} of {customerTotal}</span>
              <div>
                <button className="secondary" onClick={() => setCustomerPage(page => Math.max(0, page - 1))} disabled={customerPage === 0}>Previous</button>
                <span className="page-number">Page {customerPage + 1} of {Math.ceil(customerTotal / CUSTOMER_PAGE_SIZE)}</span>
                <button className="secondary" onClick={() => setCustomerPage(page => Math.min(Math.ceil(customerTotal / CUSTOMER_PAGE_SIZE) - 1, page + 1))} disabled={(customerPage + 1) * CUSTOMER_PAGE_SIZE >= customerTotal}>Next</button>
              </div>
            </nav>}
          </section>
        </>}

        {view === 'customer' && selectedCustomer && <>
          <button className="back-button" onClick={() => goBack('customers')}><ArrowLeft size={16}/> Customers</button>
          <section className="hero compact">
            <p className="eyebrow">{selectedCustomer.customer_code}</p>
            <h1>{selectedCustomer.name}</h1><p className="muted">{selectedCustomer.gender === 'female' ? 'Female' : 'Male'}{selectedCustomer.city ? ` · ${selectedCustomer.city}` : ''} · {selectedCustomer.phone || 'No phone added'}</p>
            <div className="customer-actions">
              <button className="secondary" title="Edit customer" aria-label="Edit customer" onClick={beginCustomerEdit}><Pencil size={15}/><span className="action-label">Edit customer</span></button>
              <button className="secondary" title="Export records" aria-label="Export records" onClick={exportCustomer}><Download size={15}/><span className="action-label">Export records</span></button>
              <button className="secondary" title="Print profile" aria-label="Print profile" onClick={printCurrent}><Printer size={15}/><span className="action-label">Print profile</span></button>
              <button className="secondary danger-button" title="Archive customer" aria-label="Archive customer" onClick={archiveSelectedCustomer} disabled={busy}><Archive size={15}/><span className="action-label">Archive</span></button>
              <button className="secondary danger-button" title="Delete customer permanently" aria-label="Delete customer permanently" onClick={permanentlyDeleteCustomer} disabled={busy}><Trash2 size={15}/><span className="action-label">Delete permanently</span></button>
            </div>
          </section>
          {(selectedCustomer.notes || selectedCustomer.email || selectedCustomer.alternate_phone) && <section className="panel customer-contact"><h2>Contact & notes</h2>{selectedCustomer.alternate_phone && <p>Alternate phone: {selectedCustomer.alternate_phone}</p>}{selectedCustomer.email && <p>Email: {selectedCustomer.email}</p>}{selectedCustomer.notes && <p className="notes">{selectedCustomer.notes}</p>}</section>}
          {editingCustomer && <section className="panel">
            <div className="section-head"><div><h2>Edit customer</h2><p className="muted">Customer code stays the same.</p></div><button className="icon-button" type="button" title="Cancel editing" onClick={() => setEditingCustomer(false)}><X size={17}/></button></div>
            <form className="form-grid" onSubmit={saveCustomerEdit}>
              <label>Customer name<input value={editName} onChange={e => setEditName(e.target.value)} required maxLength={150}/></label>
              <label>Gender<select value={editGender} onChange={e => setEditGender(e.target.value as 'female' | 'male')}><option value="female">Female</option><option value="male">Male</option></select></label>
              <label>City<input value={editCity} onChange={e => setEditCity(e.target.value)} maxLength={100}/></label>
              <label>Mobile number<input value={editPhone} onChange={e => setEditPhone(e.target.value)} maxLength={20} placeholder="+91…"/></label>
              <label>Alternate phone<input value={editAltPhone} onChange={e => setEditAltPhone(e.target.value)} maxLength={20}/></label>
              <label>Email<input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} maxLength={254}/></label>
              <label>Customer notes<textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2}/></label>
              <button className="primary" disabled={busy}><Check size={16}/>{busy ? 'Saving…' : 'Save changes'}</button>
            </form>
          </section>}
          <section className="panel">
            <div className="section-head"><div><h2>Measurement profiles</h2><p className="muted">Separate profiles for different fits or occasions.</p></div><Ruler size={20}/></div>
            {pagedProfiles.map(p => <div className="profile-row" key={p.id}>
              <div className="profile-icon"><Shirt size={18}/></div>
              <div className="profile-main"><b>{p.profile_name}</b><small>{p.template_name} · {p.category}</small><small>{latestByProfile.get(p.id) ? `Latest version: v${latestByProfile.get(p.id)!.version}` : 'No measurements saved yet'}</small></div>
              <button className="secondary" onClick={() => startNewVersion(p)}><Ruler size={15}/> Measure</button>
              <button className="icon-button" title="View history" onClick={async () => { setHistoryPage(0); setSelectedProfile(p); setHistory(await api.measurements(p.id)); setView('history') }}><History size={17}/></button>
            </div>)}
            <ListPagination label="Measurement profile" page={profilePage} pageSize={LIST_PAGE_SIZE} total={profiles.length} onPage={setProfilePage}/>
            {!profiles.length && <div className="empty"><Ruler size={24}/><b>No measurement profiles</b><span>Create a garment profile to begin.</span></div>}
          </section>
          <section className="panel">
            <div className="section-head"><div><h2>Orders & delivery</h2><p className="muted">Track garment work, due dates, advances and balances.</p></div><ClipboardList size={20}/></div>
            <form className="order-form" onSubmit={createOrder}>
              <div className="form-grid">
                <label>Garment / work<input value={orderGarment} onChange={e => setOrderGarment(e.target.value)} required maxLength={120} placeholder="e.g. Bridal blouse"/></label>
                <label>Delivery date<input type="date" value={orderDueDate} onChange={e => setOrderDueDate(e.target.value)} required/></label>
                <label>Total price<input type="number" min="0" step="0.01" value={orderPrice} onChange={e => setOrderPrice(e.target.value)} required/></label>
                <label>Advance paid<input type="number" min="0" max={orderPrice || undefined} step="0.01" value={orderAdvance} onChange={e => setOrderAdvance(e.target.value)} required/></label>
                <label>Measurement version<select value={orderMeasurementId} onChange={e => setOrderMeasurementId(e.target.value)}><option value="">No linked version</option>{history.map(m => <option value={m.id} key={m.id}>{profiles.find(p => p.id === m.profile_id)?.profile_name ?? 'Profile'} · v{m.version} · {new Date(m.measured_at).toLocaleDateString()}</option>)}</select></label>
                <label>Design / order notes<input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} maxLength={2000} placeholder="Fabric, style, special instructions"/></label>
              </div>
              <div className="form-actions"><button className="primary" disabled={busy}><Plus size={16}/>{busy ? 'Creating…' : 'Create order'}</button></div>
            </form>
            <div className="orders-list">
              {pagedCustomerOrders.map(order => <article className="order-card" key={order.id}>
                <div className="order-row"><div className="order-main"><b>{order.garment_name} <span className="muted">· {order.order_number}</span></b><small>Due {new Date(order.due_date).toLocaleDateString()} · Total ₹{order.price.toFixed(2)} · Balance ₹{order.balance.toFixed(2)}</small></div>
                  <div className="order-controls">
                    <select aria-label={`Status for ${order.order_number}`} value={order.status} onChange={e => changeOrderStatus(order, e.target.value as OrderStatus)}><option value="new">New</option><option value="in_progress">In progress</option><option value="ready">Ready</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select>
                    <button className="secondary order-action" title="Edit order details" aria-label={`Edit ${order.order_number}`} onClick={() => editOrder(order)}><Pencil size={16}/><span className="action-label">Edit details</span></button>
                    <button className="secondary order-action" title="Print order slip" aria-label={`Print slip for ${order.order_number}`} onClick={() => setPrintingOrder(order)}><Printer size={16}/><span className="action-label">Print slip</span></button>
                    <button className="secondary order-action" title="Payment history" aria-label={`Payment history for ${order.order_number}`} onClick={() => openPaymentHistory(order)}><History size={16}/><span className="action-label">Payments</span></button>
                    {order.balance > 0 && <button className="secondary order-action" title="Add payment" aria-label={`Add payment for ${order.order_number}`} onClick={() => openPaymentForm(order)}><Plus size={17}/><span className="action-label">Add payment</span></button>}
                  </div>
                </div>
                {order.notes && <p className="notes">{order.notes}</p>}
              </article>)}
              {!customerOrders.length && <div className="empty">No orders yet. Create the first order above.</div>}
              <ListPagination label="Customer order" page={customerOrdersPage} pageSize={LIST_PAGE_SIZE} total={customerOrders.length} onPage={setCustomerOrdersPage}/>
            </div>
          </section>
          <section className="panel">
            <div className="section-head"><div><h2>New measurement profile</h2><p className="muted">Choose a garment and fitting style.</p></div></div>
            <form className="form-grid" onSubmit={createProfile}>
              <label>Garment template<select required value={selectedTemplate?.id ?? ''} onChange={e => setSelectedTemplate(templates.find(t => t.id === e.target.value) ?? null)}>
                <option value="">Choose garment…</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select></label>
              <label>Profile name<input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder={selectedTemplate?.name ?? 'e.g. Wedding regular fit'}/></label>
              <button className="primary" disabled={busy || !selectedTemplate}><Plus size={17}/>Create profile</button>
            </form>
          </section>
        </>}

        {view === 'measure' && selectedCustomer && selectedProfile && selectedTemplate && <>
          <button className="back-button" onClick={() => goBack('customer')}><ArrowLeft size={16}/> {selectedCustomer.name}</button>
          <section className="hero compact"><p className="eyebrow">{selectedTemplate.category.toUpperCase()} · {selectedProfile.profile_name}</p><h1>{copy('Measurements','Measurements','नाप')}</h1><p className="muted">{copy('A new save creates a new version. Previous records remain preserved.','A new save creates a new version. Previous records remain preserved.','हर बार सेव करने पर नया संस्करण बनेगा। पुराने रिकॉर्ड सुरक्षित रहेंगे।')}</p></section>
          <form className="panel" onSubmit={saveMeasurement}>
            <div className="form-grid">
              <label>{copy('Unit','Unit','इकाई')}<select value={unit} onChange={e => changeUnit(e.target.value as 'inches' | 'cm')}><option value="inches">{copy('Inches','Inches','इंच')}</option><option value="cm">{copy('Centimetres','Centimetres','सेंटीमीटर')}</option></select></label>
              <label>{copy('Fit preference','Fit preference','फिटिंग की पसंद')}<select value={fit} onChange={e => setFit(e.target.value)}><option value="regular">{copy('Regular','Regular','सामान्य')}</option><option value="slim">{copy('Slim','Slim','स्लिम')}</option><option value="loose">{copy('Loose','Loose','ढीली')}</option><option value="custom">{copy('Custom','Custom','कस्टम')}</option></select></label>
            </div>
            <div className="measurement-grid">
              {selectedTemplate.fields.map((field: Field) => <label key={field.key}>{measurementLabel(field.label)} ({unit})<input type="number" required={field.required} min={field.min ?? 0.1} max={field.max ?? 100} step={field.step ?? 0.25} value={formValues[field.key] ?? ''} onChange={e => setFormValues(v => ({...v, [field.key]: e.target.value}))} inputMode="decimal" placeholder="—" /></label>)}
            </div>
            <label>{copy('Fitting / design notes','Fitting / design notes','फिटिंग / डिज़ाइन नोट')}<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder={copy('Special fitting instructions…','Special fitting instructions…','फिटिंग से जुड़ी खास हिदायतें…')}/></label>
            <div className="form-actions"><button className="secondary" type="button" onClick={() => goBack('customer')}>{copy('Cancel','Cancel','रद्द करें')}</button><button className="primary" disabled={busy}><Check size={17}/>{busy ? copy('Saving…','Saving…','सेव हो रहा है…') : copy('Save measurements','Save measurements','नाप सेव करें')}</button></div>
          </form>
        </>}

        {view === 'history' && selectedCustomer && selectedProfile && <>
          <button className="back-button" onClick={() => goBack('customer')}><ArrowLeft size={16}/> {selectedCustomer.name}</button>
          <section className="hero compact"><p className="eyebrow">MEASUREMENT HISTORY</p><h1>{selectedProfile.profile_name}</h1><p className="muted">Historical records are read-only.</p></section>
          {pagedHistory.map(m => { const latest = latestByProfile.get(m.profile_id); return <section className="panel history-card" key={m.id}>
            <div className="section-head"><div><h2>Version {m.version}</h2><p className="muted">{new Date(m.measured_at).toLocaleString()} · {m.unit}</p></div><span className="pill">Saved</span></div>
            {latest && latest.id !== m.id && latest.unit === m.unit && <p className="muted">Compared with latest v{latest.version}; positive values are larger than the latest measurement.</p>}
            <div className="saved-grid">{Object.entries(m.measurements).map(([key, value]) => { const delta = latest && latest.id !== m.id && latest.unit === m.unit && latest.measurements[key] !== undefined ? Number((value - latest.measurements[key]).toFixed(2)) : null; return <div key={key}><small>{key.replaceAll('_',' ')}</small><b>{value} {m.unit === 'cm' ? 'cm' : 'in'}</b>{delta !== null && <small className="measurement-delta">{delta > 0 ? '+' : ''}{delta} vs latest</small>}</div> })}</div>
            {m.fit_preference && <p className="muted">Fit: {m.fit_preference}</p>}
            {m.notes && <p className="notes">{m.notes}</p>}
          </section>})}
          <ListPagination label="Measurement history" page={historyPage} pageSize={HISTORY_PAGE_SIZE} total={selectedHistory.length} onPage={setHistoryPage}/>
          {history.some(m => m.profile_id === selectedProfile.id) && <button className="secondary print-history" onClick={printCurrent}><Printer size={15}/> Print measurement sheet</button>}
          {!selectedHistory.length && <div className="empty">No saved measurements yet.</div>}
        </>}

        {view === 'measurements' && <>
          <section className="page-heading"><div><p className="eyebrow">{copy('MEASUREMENT BOOK','MEASUREMENT BOOK','नाप रजिस्टर')}</p><h1>{copy('Measurements','Measurements','नाप')}</h1><p className="muted">{copy("Find a customer's garment profile and open its saved history.","Find a customer's garment profile and open its saved history.",'ग्राहक का कपड़ा प्रोफ़ाइल खोजें और उसका सेव किया हुआ नाप देखें।')}</p></div></section>
          <section className="panel">
            <div className="searchbox"><Search size={18}/><input value={measurementQuery} onChange={e => { setMeasurementQuery(e.target.value); setMeasurementPage(0) }} placeholder={copy('Search customer, phone, garment, or profile','Search customer, phone, garment, or profile','ग्राहक, फ़ोन, कपड़ा या प्रोफ़ाइल खोजें')}/></div>
            <div className="measurement-index">
              {pagedMeasurementProfiles.map(profile => <button className="measurement-index-row" key={profile.id} onClick={() => openMeasurementHistory(profile)}>
                <span className="profile-icon"><Ruler size={17}/></span><span className="measurement-index-main"><b>{profile.customer_name}</b><small>{profile.customer_code} · {profile.phone || 'No phone'}</small></span><span className="measurement-index-garment"><b>{profile.profile_name}</b><small>{profile.template_name} · {profile.category}</small></span><span className="version-tag">{profile.latest_version ? `v${profile.latest_version}` : 'No record'}</span><ChevronRight size={17}/>
              </button>)}
              {!visibleMeasurementProfiles.length && <div className="empty"><Ruler size={24}/><b>{copy('No measurement profiles found','No measurement profiles found','नाप की कोई प्रोफ़ाइल नहीं मिली')}</b><span>{copy('Create a profile from a customer record.','Create a profile from a customer record.','ग्राहक रिकॉर्ड से नई प्रोफ़ाइल बनाएँ।')}</span></div>}
            </div>
            <ListPagination label="Measurement profile" page={measurementPage} pageSize={LIST_PAGE_SIZE} total={visibleMeasurementProfiles.length} onPage={setMeasurementPage}/>
          </section>
        </>}

        {view === 'guide' && <MeasurementGuideView publicLanguage={language} onOpenMeasurements={() => navigate('measurements')}/>}

        {view === 'inquiries' && <>
          <section className="page-heading"><div><p className="eyebrow">{copy('PUBLIC WEBSITE','Public website','सार्वजनिक वेबसाइट')}</p><h1>{copy('Website enquiries','Website enquiries','वेबसाइट पूछताछ')}</h1><p className="muted">{copy('Read customer questions and reply by phone, WhatsApp, or email.','Customer ke sawaal dekhein aur phone, WhatsApp ya email se jawab dein.','ग्राहकों के सवाल पढ़ें और फोन, WhatsApp या ईमेल से जवाब दें।')}</p></div></section>
          <section className="panel inquiry-list-panel">
            <div className="inquiry-toolbar"><div className="inquiry-count"><MessageSquareText size={17}/><b>{newInquiryCount}</b><span>new {newInquiryCount === 1 ? 'enquiry' : 'enquiries'}</span></div><label className="inquiry-filter">Show<select value={inquiryFilter} onChange={event => { setInquiryFilter(event.target.value as '' | InquiryStatus); setInquiryPage(0) }}><option value="">All enquiries</option><option value="new">New</option><option value="read">Read</option><option value="archived">Archived</option></select></label></div>
            <div className="inquiry-list">{inquiries.map(inquiry => <article className={`inquiry-card inquiry-${inquiry.status}`} key={inquiry.id}>
              <div className="inquiry-card-head"><div><h2>{inquiry.name}</h2><span className={`inquiry-status status-${inquiry.status}`}>{inquiry.status}</span></div><time dateTime={inquiry.created_at}>{new Date(inquiry.created_at).toLocaleString()}</time></div>
              <div className="inquiry-contact-links"><a href={`tel:${encodeURIComponent(inquiry.phone)}`}>{inquiry.phone}</a><a className="inquiry-whatsapp" href={whatsappHref(inquiry.phone, inquiry.name)} target="_blank" rel="noreferrer" aria-label={`Open WhatsApp chat with ${inquiry.name}`} title="Message on WhatsApp"><svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.02 3.2c-7.05 0-12.78 5.7-12.78 12.72 0 2.24.59 4.43 1.72 6.36L3.15 28.8l6.72-1.76a12.86 12.86 0 0 0 6.15 1.56h.01c7.04 0 12.77-5.7 12.77-12.72 0-3.4-1.33-6.6-3.74-9.01a12.7 12.7 0 0 0-9.04-3.67Zm.01 23.23h-.01c-1.9 0-3.75-.51-5.37-1.48l-.39-.23-3.99 1.04 1.07-3.86-.25-.4a10.57 10.57 0 0 1-1.63-5.58c0-5.85 4.77-10.6 10.63-10.6 2.83 0 5.5 1.1 7.5 3.1a10.52 10.52 0 0 1 3.11 7.5c0 5.85-4.77 10.6-10.67 10.6Zm5.84-7.94c-.32-.16-1.89-.93-2.18-1.04-.29-.1-.5-.16-.71.16-.22.32-.82 1.04-1 1.25-.18.22-.36.24-.68.08-.32-.16-1.35-.5-2.57-1.58-.95-.84-1.6-1.88-1.79-2.2-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.71-1.72-.97-2.35-.26-.62-.52-.53-.71-.54h-.61c-.22 0-.56.08-.85.4-.29.32-1.12 1.1-1.12 2.66s1.15 3.08 1.31 3.3c.16.21 2.25 3.43 5.45 4.81.76.33 1.36.53 1.83.68.77.24 1.47.21 2.02.13.62-.09 1.9-.77 2.17-1.51.27-.74.27-1.38.19-1.52-.08-.13-.29-.21-.61-.37Z"/></svg></a><a href={`mailto:${encodeURIComponent(inquiry.email)}`}>{inquiry.email}</a></div>
              <p className="inquiry-message">{inquiry.message}</p>
              <div className="inquiry-actions">{inquiry.status !== 'read' && inquiry.status !== 'archived' && <button className="secondary" onClick={() => setInquiryStatus(inquiry, 'read')}><Check size={14}/> Mark read</button>}{inquiry.status === 'read' && <button className="secondary" onClick={() => setInquiryStatus(inquiry, 'new')}><MessageSquareText size={14}/> Mark new</button>}{inquiry.status === 'archived' && <button className="secondary" onClick={() => setInquiryStatus(inquiry, 'new')}><ArrowLeft size={14}/> Restore</button>}{inquiry.status !== 'archived' && <button className="secondary" onClick={() => setInquiryStatus(inquiry, 'archived')}><Archive size={14}/> Archive</button>}<a className="inquiry-reply" href={`mailto:${encodeURIComponent(inquiry.email)}?subject=${encodeURIComponent('Your enquiry to Shree Radhe Boutique')}`}>Reply by email <ChevronRight size={14}/></a></div>
            </article>)}
              {!inquiries.length && <div className="empty inquiry-empty"><MessageSquareText size={24}/><b>No enquiries here</b><span>New messages sent from the website will appear here.</span></div>}
            </div>
            <ListPagination label="Website enquiry" page={inquiryPage} pageSize={INQUIRY_PAGE_SIZE} total={inquiryTotal} onPage={setInquiryPage}/>
          </section>
        </>}

        {view === 'insights' && <>
          <section className="page-heading"><div><p className="eyebrow">{copy('CUSTOMER BOOK · LIVE DATA','CUSTOMER BOOK · LIVE DATA','ग्राहक रिकॉर्ड · ताज़ा जानकारी')}</p><h1>{copy('Customer insights','Customer insights','ग्राहक जानकारी')}</h1><p className="muted">{copy('Find your most valuable customers, spot repeat business, and see who may need a follow-up.','Find your most valuable customers, spot repeat business, and see who may need a follow-up.','अपने खास ग्राहकों, बार-बार ऑर्डर करने वालों और जिनसे फिर संपर्क करना है, उन्हें देखें।')}</p></div></section>
          {!customerInsights && insightsLoading && <section className="panel"><div className="empty">Loading customer insights…</div></section>}
          {customerInsights && <>
            <section className="dashboard-stats insights-stats">
              <div className="stat-card"><span className="stat-icon stat-green"><Users size={18}/></span><b>{customerInsights.summary.customers.toLocaleString('en-IN')}</b><small>Active customer records</small></div>
              <div className="stat-card"><span className="stat-icon stat-gold"><Repeat2 size={18}/></span><b>{customerInsights.summary.repeat_customers.toLocaleString('en-IN')}</b><small>Repeat customers · 2+ orders</small></div>
              <div className="stat-card"><span className="stat-icon stat-green"><TrendingUp size={18}/></span><b>₹{customerInsights.summary.lifetime_order_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b><small>Value of non-cancelled orders</small></div>
              <div className="stat-card"><span className="stat-icon stat-red"><Clock3 size={18}/></span><b>₹{customerInsights.summary.outstanding_balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b><small>Outstanding order balance</small></div>
            </section>
            <div className="insight-secondary-stats"><span><CalendarDays size={15}/> <b>{customerInsights.summary.new_last_30_days}</b> new in 30 days</span><span><Check size={15}/> <b>{customerInsights.summary.active_last_30_days}</b> ordered in 30 days</span><span><UserX size={15}/> <b>{customerInsights.summary.at_risk_90_days}</b> inactive 90+ days</span><span><Users size={15}/> <b>{customerInsights.summary.never_ordered}</b> without an order</span></div>
            <div className="insights-layout">
              <section className="panel insights-customers">
                <div className="section-head"><div><p className="eyebrow">CUSTOMER SEGMENTS</p><h2>{insightSegment === 'vip' ? 'VIP customers' : insightSegment === 'repeat' ? 'Repeat customers' : insightSegment === 'new' ? 'Recently added' : insightSegment === 'active' ? 'Recently active' : insightSegment === 'risk' ? 'At risk of going quiet' : 'Never ordered'}</h2></div><span className="version-tag">{insightItems.length} customers</span></div>
                <div className="insight-tabs" role="tablist" aria-label="Customer segments">
                  {([
                    ['vip', 'VIP', customerInsights.vip_customers.length, Star],
                    ['repeat', 'Repeat', customerInsights.repeat_customers.length, Repeat2],
                    ['new', 'New · 30d', customerInsights.new_customers.length, UserPlus],
                    ['active', 'Active · 30d', customerInsights.recently_active.length, TrendingUp],
                    ['risk', 'At risk · 90d', customerInsights.at_risk.length, UserX],
                    ['never', 'No orders', customerInsights.never_ordered.length, ClipboardList],
                  ] as const).map(([key, label, count, Icon]) => <button type="button" role="tab" aria-selected={insightSegment === key} className={`insight-tab ${insightSegment === key ? 'active' : ''}`} key={key} onClick={() => { setInsightSegment(key); setInsightPage(0) }}><Icon size={15}/>{label}<span>{count}</span></button>)}
                </div>
                <div className="searchbox insight-search"><Search size={17}/><input value={insightQuery} onChange={e => { setInsightQuery(e.target.value); setInsightPage(0) }} placeholder="Find in this group by name, city, phone, or code"/>{insightQuery && <button className="search-clear" type="button" aria-label="Clear insight search" onClick={() => { setInsightQuery(''); setInsightPage(0) }}><X size={16}/></button>}</div>
                <p className="muted insight-definition">{insightSegment === 'vip' ? 'Top 10% by total value of non-cancelled orders; at least one customer when order data exists.' : insightSegment === 'repeat' ? 'Customers with at least two non-cancelled orders.' : insightSegment === 'new' ? 'Customer records created within the last 30 days.' : insightSegment === 'active' ? 'Customers with an order in the last 30 days.' : insightSegment === 'risk' ? 'Customers with past orders but no order in 90 days.' : 'Saved customers who do not yet have an order.'}</p>
                <div className="customer-grid insight-customer-grid">{pagedInsightItems.map(customer => <button className="customer-card insight-customer-card" key={customer.id} onClick={() => openCustomer(customer)}>
                  <span className="customer-card-top"><span className="avatar">{customer.name.slice(0,1).toUpperCase()}</span><span className="customer-card-name"><b>{customer.name}</b><small>{customer.customer_code}</small></span><ChevronRight size={17}/></span>
                  <span className="customer-card-contact"><span>{customer.city || 'City not added'}</span><i>·</i><span>{customer.phone || 'No phone'}</span></span>
                  <span className="customer-card-stats">
                    <span><small><ClipboardList size={13}/> Orders</small><b>{customer.order_count.toLocaleString('en-IN')}</b></span>
                    <span><small><TrendingUp size={13}/> Order value</small><b>₹{customer.lifetime_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b></span>
                    <span><small><CalendarDays size={13}/> Last order</small><b>{customer.days_since_order === null ? 'No orders' : customer.days_since_order === 0 ? 'Today' : `${customer.days_since_order}d ago`}</b></span>
                    <span><small><Wallet size={13}/> Balance due</small><b className={customer.outstanding > 0 ? 'customer-balance-due' : ''}>₹{customer.outstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b></span>
                  </span>
                </button>)}
                  {!insightsLoading && !insightItems.length && <div className="empty customer-grid-empty">No customers in this group for the current search.</div>}
                </div>
                <ListPagination label="Insight customer" page={insightPage} pageSize={LIST_PAGE_SIZE} total={insightItems.length} onPage={setInsightPage}/>
              </section>
              <section className="panel city-insights"><div className="section-head"><div><p className="eyebrow">WHERE YOUR CUSTOMERS ARE</p><h2>Top cities</h2></div><MapPin size={19}/></div>
                {customerInsights.top_cities.slice(0, 8).map((city, index) => {
                  const largest = Math.max(...customerInsights.top_cities.slice(0, 8).map(item => item.lifetime_value), 1)
                  return <div className="city-insight-row" key={city.city}><div className="city-insight-title"><b><span>{index + 1}</span>{city.city}</b><strong>₹{city.lifetime_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></div><div className="city-bar"><i style={{ width: `${Math.max(3, city.lifetime_value / largest * 100)}%` }}/></div><small>{city.customers} customers · {city.orders} orders</small></div>
                })}
                {!customerInsights.top_cities.length && <div className="empty">Add cities to customer records to see location trends.</div>}
              </section>
            </div>
            <p className="insights-footnote">Calculated {new Date(customerInsights.generated_at).toLocaleString()}. VIP and city value use order prices and exclude cancelled orders; payments outstanding use the current order balance.</p>
          </>}
        </>}

        {view === 'reports' && <>
          <section className="page-heading"><div><p className="eyebrow">SHOP SUMMARY</p><h1>Reports & exports</h1><p className="muted">Download current customer and order records for your own files.</p></div></section>
          <section className="dashboard-stats report-stats">
            <div className="stat-card"><span className="stat-icon stat-green"><Users size={18}/></span><b>{allCustomerCount.toLocaleString('en-IN')}</b><small>Customers</small></div>
            <div className="stat-card"><span className="stat-icon stat-gold"><ClipboardList size={18}/></span><b>{allOrders.length.toLocaleString('en-IN')}</b><small>Total orders</small></div>
            <div className="stat-card"><span className="stat-icon stat-green"><span className="rupee-mark">₹</span></span><b>₹{allOrders.reduce((sum, order) => sum + order.advance, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b><small>Advance collected</small></div>
            <div className="stat-card"><span className="stat-icon stat-red"><Clock3 size={18}/></span><b>₹{allOrders.filter(order => order.status !== 'cancelled').reduce((sum, order) => sum + order.balance, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b><small>Balance outstanding</small></div>
          </section>
          <section className="panel export-panel"><div><h2>Download your data</h2><p className="muted">Exports include customer contact details or order/payment summaries.</p></div><div className="export-actions"><button className="secondary" onClick={exportCustomersCsv}><Download size={16}/> Export customers CSV</button><button className="primary" onClick={exportOrdersCsv}><Download size={16}/> Export orders CSV</button></div></section>
        </>}

        {view === 'orders' && <>
          <button className="back-button" onClick={() => goBack('home')}><ArrowLeft size={16}/> Dashboard</button>
          <section className="hero compact"><p className="eyebrow">{copy('SHOP WORKFLOW','Shop ka kaam','दुकान का काम')}</p><h1>{copy('Orders','Orders','ऑर्डर')}</h1><p className="muted">{allOrders.filter(o => !['delivered','cancelled'].includes(o.status)).length} {copy('open','open','खुले')} · {allOrders.length} {copy('total','total','कुल')}</p></section>
          <section className="order-glance" aria-label="Order overview">
            {[
              { key: 'due_today', label: 'Due today', count: dueTodayOrders.length, icon: <CalendarDays size={17}/>, tone: 'gold' },
              { key: 'overdue', label: 'Overdue', count: overdueOrders.length, icon: <AlertCircle size={17}/>, tone: 'red' },
              { key: 'in_progress', label: 'In progress', count: inProgressOrders.length, icon: <Clock3 size={17}/>, tone: 'blue' },
              { key: 'ready', label: 'Ready', count: readyOrders.length, icon: <Check size={17}/>, tone: 'green' },
              { key: 'unpaid', label: 'Balance due', count: unpaidOrders.length, icon: <Wallet size={17}/>, tone: 'gold' },
            ].map(item => <button type="button" key={item.key} className={`order-glance-card ${orderStatusFilter === item.key ? 'selected' : ''}`} aria-pressed={orderStatusFilter === item.key} onClick={() => { setOrderStatusFilter(orderStatusFilter === item.key ? '' : item.key); setOrdersPage(0) }}>
              <span className={`order-glance-icon ${item.tone}`}>{item.icon}</span><span className="order-glance-copy"><b>{item.count.toLocaleString('en-IN')}</b><small>{item.label}</small></span><ChevronRight size={15} className="order-glance-arrow"/>
            </button>)}
          </section>
          <section className="panel"><div className="section-head"><div><h2>{copy('All orders','All orders','सभी ऑर्डर')}</h2><p className="muted">{copy('Review status, delivery dates and balances.','Status, delivery date aur baaki payment dekhein.','ऑर्डर की स्थिति, डिलीवरी की तारीख और बाकी रकम देखें।')}</p></div><button className="secondary" onClick={exportOrdersCsv}><Download size={15}/> {copy('Export CSV','Export CSV','CSV डाउनलोड')}</button></div>
            <div className="orders-filters"><div className="searchbox"><Search size={17}/><input value={orderQuery} onChange={e => { setOrderQuery(e.target.value); setOrdersPage(0) }} placeholder="Search order, customer, phone, or garment"/></div><select aria-label="Filter orders" value={orderStatusFilter} onChange={e => { setOrderStatusFilter(e.target.value); setOrdersPage(0) }}><option value="">All orders</option><option value="due_today">Due today</option><option value="overdue">Overdue</option><option value="unpaid">Unpaid balance</option><option value="new">New</option><option value="in_progress">In progress</option><option value="ready">Ready</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></div>
            {pagedOrders.map(order => { const dueDate = new Date(order.due_date); dueDate.setHours(0, 0, 0, 0); const dueTone = ['delivered', 'cancelled'].includes(order.status) ? 'settled' : dueDate.getTime() < todayStart.getTime() ? 'overdue' : dueDate.getTime() === todayStart.getTime() ? 'today' : 'upcoming'; return <article className={`order-card order-card-prominent ${dueTone}`} key={order.id}>
            <div className="order-row"><div className="order-main">
              <div className="order-card-heading"><div className="order-name-block"><b>{order.customer_name}</b><span>{order.garment_name}</span></div><span className={`order-status-badge status-${order.status}`}>{order.status.replaceAll('_', ' ')}</span></div>
              <div className="order-card-meta"><span className="order-number">{order.order_number}</span><span className={`order-due-chip due-${dueTone}`}><CalendarDays size={13}/>{dueTone === 'overdue' ? 'Overdue · ' : dueTone === 'today' ? 'Due today · ' : 'Due · '}{dueDate.toLocaleDateString()}</span></div>
              <div className="order-money-row"><div><small>Total</small><b>₹{order.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</b></div><div><small>Paid</small><b>₹{order.advance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</b></div><div className={order.balance > 0 ? 'has-balance' : 'paid-balance'}><small>{order.balance > 0 ? 'Balance due' : 'Settled'}</small><b>₹{order.balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</b></div></div>
            </div>
              <div className="order-controls">
                <select aria-label={`Status for ${order.order_number}`} value={order.status} onChange={e => changeOrderStatus(order, e.target.value as OrderStatus)}><option value="new">New</option><option value="in_progress">In progress</option><option value="ready">Ready</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select>
                    <button className="secondary order-action" title={copy('Edit order details','Order ki details badlein','ऑर्डर की जानकारी बदलें')} aria-label={`Edit ${order.order_number}`} onClick={() => editOrder(order)}><Pencil size={16}/><span className="action-label">{copy('Edit details','Edit details','विवरण बदलें')}</span></button>
                    <button className="secondary order-action" title={copy('Print order slip','Order slip print karein','ऑर्डर पर्ची प्रिंट करें')} aria-label={`Print slip for ${order.order_number}`} onClick={() => setPrintingOrder(order)}><Printer size={16}/><span className="action-label">{copy('Print slip','Print slip','पर्ची प्रिंट')}</span></button>
                    <button className="secondary order-action" title={copy('Payment history','Payment history','भुगतान इतिहास')} aria-label={`Payment history for ${order.order_number}`} onClick={() => openPaymentHistory(order)}><History size={16}/><span className="action-label">{copy('Payments','Payments','भुगतान')}</span></button>
                    {order.balance > 0 && <button className="secondary order-action" title={copy('Add payment','Add payment','भुगतान जोड़ें')} aria-label={`Add payment for ${order.order_number}`} onClick={() => openPaymentForm(order)}><Plus size={17}/><span className="action-label">{copy('Add payment','Add payment','भुगतान जोड़ें')}</span></button>}
              </div>
            </div>
          </article>})}{allOrders.length > 0 && !visibleOrders.length && <div className="empty">No orders match this search.</div>}{!allOrders.length && <div className="empty"><ClipboardList size={24}/><b>No orders yet</b><span>Create an order from a customer profile.</span></div>}<ListPagination label="Order" page={ordersPage} pageSize={LIST_PAGE_SIZE} total={visibleOrders.length} onPage={setOrdersPage}/></section>
        </>}
        </LocalizedAdminText>
      </main>
      </div>
      {paymentOrder && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setPaymentOrder(null) }}>
        <section className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title">
          <button className="icon-button modal-close" type="button" title="Close payment form" onClick={() => setPaymentOrder(null)}><X size={17}/></button>
          <p className="eyebrow">RECORD PAYMENT</p><h2 id="payment-title">Add a payment</h2>
          <p className="muted">{paymentOrder.customer_name} · {paymentOrder.order_number}</p>
          <div className="payment-balance"><span>Remaining balance</span><b>₹{paymentOrder.balance.toFixed(2)}</b></div>
          <form onSubmit={addOrderPayment}>
            <label>{copy('Amount received today','Aaj mili payment','आज मिली रकम')}<input autoFocus type="number" inputMode="decimal" min="0.01" max={paymentOrder.balance.toFixed(2)} step="0.01" value={paymentAmount} onChange={e => { setPaymentAmount(e.target.value); setError('') }} placeholder="0.00" required/></label>
            <label>{copy('Payment method','Payment ka tareeka','भुगतान का तरीका')}<select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as OrderPayment['method'])}><option value="cash">{copy('Cash','Cash','नकद')}</option><option value="upi">UPI</option><option value="bank_transfer">{copy('Bank transfer','Bank transfer','बैंक ट्रांसफर')}</option><option value="card">{copy('Card','Card','कार्ड')}</option><option value="other">{copy('Other','Other','अन्य')}</option></select></label>
            <label>{copy('Note','Note','नोट')} <span className="muted">{copy('(optional)','(optional)','(वैकल्पिक)')}</span><input value={paymentNote} onChange={e => setPaymentNote(e.target.value)} maxLength={300} placeholder={copy('Transaction reference or note','Transaction reference ya note','लेन-देन का संदर्भ या नोट')}/></label>
            <p className="payment-preview">Balance after payment <b>₹{Math.max(0, paymentOrder.balance - (Number(paymentAmount) || 0)).toFixed(2)}</b></p>
            {error && <p className="error payment-error">{error}</p>}
            <div className="form-actions"><button className="secondary" type="button" onClick={() => setPaymentOrder(null)}>{copy('Cancel','Cancel','रद्द करें')}</button><button className="primary" disabled={busy || !(Number(paymentAmount) > 0) || Number(paymentAmount) > paymentOrder.balance}><Check size={16}/>{busy ? copy('Saving…','Saving…','सेव हो रहा है…') : copy('Save payment','Save payment','भुगतान सेव करें')}</button></div>
          </form>
        </section>
      </div>}
      {paymentHistoryOrder && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setPaymentHistoryOrder(null) }}>
        <section className="payment-modal history-modal payment-history-modal" role="dialog" aria-modal="true" aria-labelledby="payment-history-title">
          <button className="icon-button modal-close" type="button" title="Close payment history" onClick={() => setPaymentHistoryOrder(null)}><X size={17}/></button>
          <p className="eyebrow">ORDER {paymentHistoryOrder.order_number}</p><h2 id="payment-history-title">Payment history</h2>
          <p className="muted">{paymentHistoryOrder.customer_name} · {paymentHistoryOrder.garment_name}</p>
          <div className="payment-summary-grid" aria-label={copy('Order payment summary','Order payment summary','ऑर्डर भुगतान सारांश')}>
            <div className="payment-summary-card"><span>{copy('Order total','Order total','ऑर्डर कुल')}</span><b>₹{paymentHistoryOrder.price.toFixed(2)}</b></div>
            <div className="payment-summary-card paid"><span>{copy('Paid so far','Paid so far','अब तक जमा')}</span><b>₹{paymentHistoryOrder.advance.toFixed(2)}</b></div>
            <div className="payment-summary-card remaining"><span>{copy('Remaining balance','Abhi baaki','बाकी रकम')}</span><b>₹{paymentHistoryOrder.balance.toFixed(2)}</b></div>
          </div>
          <div className="payment-history-list">{paymentHistory.map(payment => <article className="payment-history-row" key={payment.id}>
            <div><b>₹{payment.amount.toFixed(2)}</b><small>{payment.is_opening_balance ? 'Opening balance · original payment date unavailable' : `${new Date(payment.paid_at).toLocaleString()} · ${payment.method.replace('_',' ')}`}</small>{payment.note && <small>{payment.note}</small>}</div>
            <button className="icon-button" title="Print payment receipt" aria-label={`Print receipt for payment ₹${payment.amount.toFixed(2)}`} onClick={() => setPrintingPayment({ payment, order: paymentHistoryOrder })}><ReceiptText size={17}/></button>
          </article>)}
            {!paymentHistory.length && <div className="empty">No payments recorded for this order yet.</div>}
          </div>
          <div className="form-actions"><button className="secondary" type="button" onClick={() => setPaymentHistoryOrder(null)}>Close</button>{paymentHistoryOrder.balance > 0 && <button className="primary" type="button" onClick={() => { const order = paymentHistoryOrder; setPaymentHistoryOrder(null); openPaymentForm(order) }}><Plus size={16}/>Add payment</button>}</div>
        </section>
      </div>}
      {printingOrder && <section className="print-slip">
        <p className="eyebrow">SHREE RADHE BOUTIQUE</p><h1>Order slip</h1>
        <p><b>Order:</b> {printingOrder.order_number}</p><p><b>Customer:</b> {printingOrder.customer_name}</p>
        {printingOrder.customer_phone && <p><b>Phone:</b> {printingOrder.customer_phone}</p>}
        <p><b>Garment / work:</b> {printingOrder.garment_name}</p><p><b>Delivery date:</b> {new Date(printingOrder.due_date).toLocaleDateString()}</p>
        <p><b>Status:</b> {printingOrder.status.replace('_',' ')}</p><hr/>
        <p><b>Total:</b> ₹{printingOrder.price.toFixed(2)}</p><p><b>Advance paid:</b> ₹{printingOrder.advance.toFixed(2)}</p><p><b>Balance due:</b> ₹{printingOrder.balance.toFixed(2)}</p>
        {printingOrder.notes && <p><b>Notes:</b> {printingOrder.notes}</p>}
        <p className="receipt-thanks">Thank you</p>
      </section>}
      {printingPayment && <section className="print-slip print-receipt">
        <p className="eyebrow">SHREE RADHE BOUTIQUE</p><h1>Payment receipt</h1>
        <p><b>Receipt:</b> {printingPayment.payment.id.slice(0, 8).toUpperCase()}</p>
        <p><b>Order:</b> {printingPayment.order.order_number}</p><p><b>Customer:</b> {printingPayment.order.customer_name}</p>
        {printingPayment.order.customer_phone && <p><b>Phone:</b> {printingPayment.order.customer_phone}</p>}
        <p><b>Garment / work:</b> {printingPayment.order.garment_name}</p><p><b>{printingPayment.payment.is_opening_balance ? 'Payment date' : 'Received'}:</b> {printingPayment.payment.is_opening_balance ? 'Opening balance; original payment date not recorded' : new Date(printingPayment.payment.paid_at).toLocaleString()}</p>
        <p><b>Method:</b> {printingPayment.payment.is_opening_balance ? 'Not recorded' : printingPayment.payment.method.replace('_',' ')}</p><hr/>
        <p><b>Amount received:</b> ₹{printingPayment.payment.amount.toFixed(2)}</p>
        <p><b>Total order price:</b> ₹{printingPayment.order.price.toFixed(2)}</p>
        <p><b>Total paid:</b> ₹{printingPayment.order.advance.toFixed(2)}</p><p><b>Balance remaining:</b> ₹{printingPayment.order.balance.toFixed(2)}</p>
        {printingPayment.payment.note && <p><b>Note:</b> {printingPayment.payment.note}</p>}
        <p className="receipt-thanks">Thank you</p>
      </section>}
      <footer className="app-footer">Private workspace · Measurement records stay under your control</footer>
    </div>
  )
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  if (path === '/admin') return <AdminApp/>
  if (path === '/measurement-guide') return <PublicWebsite guideContent={<MeasurementGuideView/>}/>
  return <PublicWebsite/>
}
