// Shared between Navbar and Footer so both stay pointed at the same
// section ids instead of drifting out of sync (Navbar used to derive hrefs
// by slugifying the label, which silently broke for "Contacts" since the
// Contact section's id is singular).
// Ordered to match the sections' actual top-to-bottom order on the page
// (Hero -> EcosystemAlt -> Geography -> Product -> Faq -> Contact).
const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'About Us', href: '#about-us' },
  { label: 'Product', href: '#product' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contacts', href: '#contact' },
]

export default NAV_LINKS
